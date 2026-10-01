use axum::extract::{Query, State};
use axum::http::{StatusCode, header};
use axum::response::{IntoResponse, Response};
use eyre::WrapErr;
use reqwest::Url;
use serde::Deserialize;

use crate::error::{AppError, Result, app_error_from_maimai};
use crate::state::AppState;
use crate::tasks::utils::auth::fetch_html_with_auth_recovery;
use crate::tasks::utils::source::ExpectedPage;

const MAIMAI_ORIGIN: &str = "https://maimaidx-eng.com";
const MAIMAI_MOBILE_PREFIX: &str = "/maimai-mobile/";

#[derive(Debug, Deserialize)]
pub(crate) struct RawFetchQuery {
    /// Path under `/maimai-mobile/`, e.g. `/maimai-mobile/record/playlogDetail/`.
    path: String,
    /// Raw query string to append, e.g. `idx=123,456`.
    #[serde(default)]
    query: Option<String>,
}

/// `GET /api/debug/raw?path=...&query=...`
///
/// Fetches a maimai DX NET page through the collector's authenticated session and
/// returns the untouched HTML, so parser work can inspect real markup rather than
/// guessing at it. The session is re-established automatically when SEGA reports
/// the connection time as expired.
///
/// Off unless `DEBUG_RAW_HTML` is truthy. The response body is never logged: it
/// contains personal play data.
pub(crate) async fn get_raw_html(
    State(state): State<AppState>,
    Query(params): Query<RawFetchQuery>,
) -> Result<Response> {
    let path = params.path.trim();

    if !path.starts_with(MAIMAI_MOBILE_PREFIX) || path.contains("..") {
        return Err(AppError::BadRequest(format!(
            "path must start with {MAIMAI_MOBILE_PREFIX} and must not contain '..'"
        )));
    }

    let mut raw_url = format!("{MAIMAI_ORIGIN}{path}");
    if let Some(query) = params
        .query
        .as_deref()
        .map(str::trim)
        .filter(|query| !query.is_empty())
    {
        raw_url.push('?');
        raw_url.push_str(query);
    }

    let url = Url::parse(&raw_url)
        .wrap_err("parse debug fetch url")
        .map_err(|err| AppError::BadRequest(err.to_string()))?;

    let mut client = state
        .maimai_client()
        .wrap_err("create HTTP client")
        .map_err(app_error_from_maimai)?;

    client
        .ensure_logged_in()
        .await
        .wrap_err("ensure logged in")
        .map_err(app_error_from_maimai)?;

    let html = fetch_html_with_auth_recovery(
        &mut client,
        &url,
        ExpectedPage::Raw {
            path: path.to_string(),
        },
    )
    .await
    .wrap_err("fetch raw html")
    .map_err(app_error_from_maimai)?;

    Ok((
        StatusCode::OK,
        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
        html,
    )
        .into_response())
}
