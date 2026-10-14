use std::sync::OnceLock;
use std::time::{Duration, Instant};

use axum::http::header;
use axum::response::IntoResponse;
use eyre::WrapErr;
use tokio::sync::Mutex;

use crate::error::Result;

const DX_RATING_TAGS_URL: &str = "https://miruku.dxrating.net/api/v1/tags";
const CACHE_TTL: Duration = Duration::from_secs(24 * 60 * 60);

struct CachedPayload {
    fetched_at: Instant,
    body: String,
}

fn cache() -> &'static Mutex<Option<CachedPayload>> {
    static CACHE: OnceLock<Mutex<Option<CachedPayload>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(None))
}

/// `GET /api/radar/tags`
///
/// Proxies the DXRating community chart-tag database.
///
/// It has to go through the collector: DXRating only answers CORS for the
/// origins on its allowlist, so a browser served from anything else (a phone
/// over Tailscale, for instance) receives no `access-control-allow-origin`
/// header and the fetch is blocked outright.
///
/// Proxying also means every device shares one cached copy instead of each
/// pulling roughly 650 KB over the network.
pub(crate) async fn get_radar_tags() -> Result<impl IntoResponse> {
    {
        let guard = cache().lock().await;
        let fresh = guard
            .as_ref()
            .filter(|cached| cached.fetched_at.elapsed() < CACHE_TTL);
        if let Some(cached) = fresh {
            return Ok((
                [(header::CONTENT_TYPE, "application/json")],
                cached.body.clone(),
            ));
        }
    }

    let body = reqwest::Client::new()
        .get(DX_RATING_TAGS_URL)
        .send()
        .await
        .wrap_err("request DXRating tag database")?
        .error_for_status()
        .wrap_err("DXRating tag database returned an error status")?
        .text()
        .await
        .wrap_err("read DXRating tag database body")?;

    *cache().lock().await = Some(CachedPayload {
        fetched_at: Instant::now(),
        body: body.clone(),
    });

    Ok(([(header::CONTENT_TYPE, "application/json")], body))
}
