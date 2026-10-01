use axum::{Json, extract::State};
use eyre::WrapErr;
use serde::Serialize;
use tracing::warn;

use crate::error::{Result, app_error_from_maimai};
use crate::state::AppState;
use crate::tasks::utils::playlog_detail::fetch_playlog_detail;
use crate::tasks::utils::recent::fetch_recent_entries_logged_in;

#[derive(Debug, Serialize)]
pub(crate) struct BackfillDetailsResponse {
    /// Stored playlogs with no detail data at all.
    pub missing_total: usize,
    /// Of those, how many are still inside SEGA's recent-play window.
    pub candidates: usize,
    /// Detail pages successfully fetched.
    pub fetched: usize,
    /// `playlogs` rows actually updated.
    pub updated_rows: u64,
    pub failed: usize,
}

/// `POST /api/playlogs/backfill`
///
/// Re-fetches `record/playlogDetail/` for stored plays that have no detail data
/// and writes judgements, fast/late, combo and rating movement onto the existing
/// rows.
///
/// Only plays still inside SEGA's recent-play window (the newest ~50) are
/// reachable; older rows have no recorded playlog idx and cannot be recovered.
/// Safe to re-run: plays that already have details are skipped, and each fetch is
/// rate-limited to roughly one per second by the shared request limiter, so a
/// full pass takes about a minute.
pub(crate) async fn backfill_playlog_details(
    State(state): State<AppState>,
) -> Result<Json<BackfillDetailsResponse>> {
    let missing = crate::db::playlogs_missing_details(&state.db_pool)
        .await
        .wrap_err("load playlogs missing details")
        .map_err(app_error_from_maimai)?;

    let mut client = state
        .maimai_client()
        .wrap_err("create HTTP client")
        .map_err(app_error_from_maimai)?;

    client
        .ensure_logged_in()
        .await
        .wrap_err("ensure logged in")
        .map_err(app_error_from_maimai)?;

    let entries = fetch_recent_entries_logged_in(&mut client)
        .await
        .wrap_err("fetch recent entries")
        .map_err(app_error_from_maimai)?;

    let mut details = Vec::new();
    let mut candidates = 0;
    let mut failed = 0;

    for entry in &entries {
        let (Some(playlog_idx), Some(played_at_unixtime)) = (
            entry.playlog_detail_idx.as_deref(),
            entry.played_at_unixtime,
        ) else {
            continue;
        };

        if !missing.contains(&played_at_unixtime) {
            continue;
        }
        candidates += 1;

        match fetch_playlog_detail(&mut client, playlog_idx).await {
            Ok(detail) => details.push((played_at_unixtime, playlog_idx.to_string(), detail)),
            Err(err) => {
                failed += 1;
                warn!(
                    "backfill playlog detail failed: idx={playlog_idx} played_at_unixtime={played_at_unixtime} cause={err:#}"
                );
            }
        }
    }

    let fetched = details.len();
    let updated_rows = crate::db::update_playlog_details(&state.db_pool, &details)
        .await
        .wrap_err("update playlog details")
        .map_err(app_error_from_maimai)?;

    Ok(Json(BackfillDetailsResponse {
        missing_total: missing.len(),
        candidates,
        fetched,
        updated_rows,
        failed,
    }))
}
