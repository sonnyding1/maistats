use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::{Duration, Instant};

use axum::extract::{Path as UrlPath, State};
use axum::http::header;
use axum::response::{IntoResponse, Response};
use eyre::WrapErr;
use tokio::sync::Mutex;

use crate::error::{AppError, Result};
use crate::state::AppState;

const DATA_JSON: &str = "data.json";
const RAVEILLE_JSON: &str = "raveille_user_tier.json";

/// Upstream rebuilds these once a day, so a day of staleness is not worth a
/// fetch on every page load.
const CACHE_TTL: Duration = Duration::from_secs(24 * 60 * 60);

struct CachedPayload {
    fetched_at: Instant,
    body: String,
}

fn cache() -> &'static Mutex<HashMap<String, CachedPayload>> {
    static CACHE: OnceLock<Mutex<HashMap<String, CachedPayload>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new())
    })
}

fn upstream_base(state: &AppState) -> &str {
    state.config.song_database_url.trim_end_matches('/')
}

fn cache_dir(data_dir: &str) -> PathBuf {
    PathBuf::from(data_dir).join("songdb")
}

/// `GET /api/song-db/data.json`
///
/// Proxies the shared song database so the dashboard keeps its levels, versions
/// and jackets when upstream is unreachable.
pub(crate) async fn get_data_json(State(state): State<AppState>) -> Result<Response> {
    serve_json(&state, DATA_JSON).await
}

/// `GET /api/song-db/raveille_user_tier.json`
pub(crate) async fn get_raveille_user_tier(State(state): State<AppState>) -> Result<Response> {
    serve_json(&state, RAVEILLE_JSON).await
}

/// `GET /api/song-db/cover/{name}`
///
/// Passed through rather than cached: covers are ~95 MB in total, are addressed
/// by content hash, and the browser already keeps them for a year.
pub(crate) async fn get_cover(
    State(state): State<AppState>,
    UrlPath(name): UrlPath<String>,
) -> Result<Response> {
    // Covers live in one flat directory upstream, so anything that could climb
    // out of it is rejected before the name reaches the URL.
    if name.is_empty() || name.contains('/') || name.contains('\\') || name.contains("..") {
        return Err(AppError::BadRequest("invalid cover name".to_string()));
    }

    let response = client()
        .get(format!("{}/cover/{name}", upstream_base(&state)))
        .send()
        .await
        .wrap_err("request cover image")?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(AppError::NotFound(format!("no cover named {name}")));
    }

    let response = response
        .error_for_status()
        .wrap_err("cover image returned an error status")?;
    let bytes = response.bytes().await.wrap_err("read cover image body")?;

    Ok((
        [
            (header::CONTENT_TYPE, "image/png"),
            (header::CACHE_CONTROL, "public, max-age=31536000, immutable"),
        ],
        bytes,
    )
        .into_response())
}

async fn serve_json(state: &AppState, file: &str) -> Result<Response> {
    if let Some(body) = fresh_from_memory(file).await {
        return Ok(json_response(body));
    }

    match fetch_upstream(state, file).await {
        Ok(body) => {
            store_memory(file, &body).await;
            persist_to(&cache_dir(&state.config.data_dir), file, &body).await;
            Ok(json_response(body))
        }
        Err(err) => {
            tracing::warn!("song database fetch failed for {file}: {err:#}");
            // Upstream is the source of truth but not the only copy we hold.
            if let Some(stale) = any_from_memory(file).await {
                tracing::warn!("serving cached {file} from memory");
                return Ok(json_response(stale));
            }
            if let Some(disk) = read_disk_cache(&cache_dir(&state.config.data_dir), file).await {
                tracing::warn!("serving {file} from the last snapshot on disk");
                store_memory(file, &disk).await;
                return Ok(json_response(disk));
            }
            Err(AppError::InternalError(format!(
                "song database unreachable and no cached copy of {file}: {err}"
            )))
        }
    }
}

async fn fresh_from_memory(file: &str) -> Option<String> {
    let guard = cache().lock().await;
    let cached = guard.get(file)?;
    (cached.fetched_at.elapsed() < CACHE_TTL).then(|| cached.body.clone())
}

async fn any_from_memory(file: &str) -> Option<String> {
    cache()
        .lock()
        .await
        .get(file)
        .map(|cached| cached.body.clone())
}

async fn store_memory(file: &str, body: &str) {
    cache().lock().await.insert(
        file.to_string(),
        CachedPayload {
            fetched_at: Instant::now(),
            body: body.to_string(),
        },
    );
}

async fn fetch_upstream(state: &AppState, file: &str) -> eyre::Result<String> {
    client()
        .get(format!("{}/{file}", upstream_base(state)))
        .send()
        .await
        .wrap_err("request song database")?
        .error_for_status()
        .wrap_err("song database returned an error status")?
        .text()
        .await
        .wrap_err("read song database body")
}

/// Keeps the last good copy beside the database, never inside it: the SQLite
/// file holds the player's own records and should stay small and cheap to back
/// up.
async fn persist_to(dir: &Path, file: &str, body: &str) {
    // spawn_blocking needs an owned path to move into the closure.
    let dir = dir.to_path_buf();
    let path = dir.join(file);
    let body = body.to_string();
    let result = tokio::task::spawn_blocking(move || -> eyre::Result<()> {
        std::fs::create_dir_all(&dir).wrap_err("create song database cache dir")?;
        std::fs::write(&path, &body).wrap_err("write song database cache file")
    })
    .await;

    match result {
        Ok(Ok(())) => {}
        Ok(Err(err)) => tracing::warn!("could not persist {file}: {err:#}"),
        Err(err) => tracing::warn!("could not persist {file}: {err}"),
    }
}

async fn read_disk_cache(dir: &Path, file: &str) -> Option<String> {
    let path = dir.join(file);
    tokio::task::spawn_blocking(move || std::fs::read_to_string(path))
        .await
        .ok()
        .and_then(|result| result.ok())
}

fn json_response(body: String) -> Response {
    (
        [
            (header::CONTENT_TYPE, "application/json"),
            // The collector revalidates upstream, so browsers should ask it.
            (header::CACHE_CONTROL, "no-cache"),
        ],
        body,
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch_dir(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("maistats-songdb-{}-{name}", std::process::id()))
    }

    #[tokio::test]
    async fn disk_cache_round_trips() {
        let dir = scratch_dir("round-trip");
        let _ = std::fs::remove_dir_all(&dir);
        let payload = r#"{"songs":[{"title":"Example"}]}"#;

        persist_to(&dir, DATA_JSON, payload).await;

        assert_eq!(
            read_disk_cache(&dir, DATA_JSON).await.as_deref(),
            Some(payload)
        );
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn disk_cache_miss_is_none() {
        let dir = scratch_dir("missing");
        let _ = std::fs::remove_dir_all(&dir);

        assert!(read_disk_cache(&dir, DATA_JSON).await.is_none());
    }
}
