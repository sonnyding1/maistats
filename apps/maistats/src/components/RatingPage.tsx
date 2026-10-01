import { useCallback, useRef, useState, type ReactNode } from 'react';

import type { PlayerProfile } from '../api';
import { useI18n } from '../app/i18n';
import { formatNumber, formatVersionLabel } from '../app/utils';
import type { ScoreRow } from '../types';
import { SongRecordCard } from './SongRecordCard';

type ExportState =
  | 'idle'
  | 'working'
  | 'saved'
  | 'copied'
  | 'render-error'
  | 'clipboard-error';

interface RatingPageProps {
  sidebarTopContent?: ReactNode;
  songInfoUrl: string;
  ratingTotal: number;
  newRatingTotal: number;
  oldRatingTotal: number;
  newRows: ScoreRow[];
  oldRows: ScoreRow[];
  /** Latest known season; rendered once in the header, not per song. */
  seasonVersion: string | null;
  playerProfile: PlayerProfile | null;
  onOpenHistory: (row: ScoreRow) => void;
}

function formatRatingAvg(total: number, count: number): string {
  if (count === 0) return '-';
  return (total / count).toFixed(2);
}

function formatRatingProjection(total: number, count: number, locale: string): string {
  if (count === 0) return '-';
  const avg = total / count;
  return Math.round(avg * 50).toLocaleString(locale);
}

function RatingCardSection({
  title,
  summary,
  rows,
  songInfoUrl,
  onOpenHistory,
}: {
  title: string;
  summary: string;
  rows: ScoreRow[];
  songInfoUrl: string;
  onOpenHistory: (row: ScoreRow) => void;
}) {
  return (
    <section className="panel rating-section-panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
        </div>
        <span className="panel-count">{summary}</span>
      </div>
      <div className="rating-card-grid">
        {rows.map((row, index) => (
          <SongRecordCard
            key={row.key}
            row={row}
            songInfoUrl={songInfoUrl}
            topLeft={`#${index + 1}`}
            onOpenHistory={onOpenHistory}
          />
        ))}
      </div>
    </section>
  );
}

export function RatingPage({
  sidebarTopContent,
  songInfoUrl,
  newRatingTotal,
  oldRatingTotal,
  newRows,
  oldRows,
  seasonVersion,
  playerProfile,
  onOpenHistory,
}: RatingPageProps) {
  const { locale, t } = useI18n();
  const exportRef = useRef<HTMLDivElement>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');

  const combinedRatingTotal = newRatingTotal + oldRatingTotal;
  const combinedAverage = formatRatingAvg(combinedRatingTotal, newRows.length + oldRows.length);
  const newSummary = `AVG ${formatRatingAvg(newRatingTotal, newRows.length)} (~${formatRatingProjection(newRatingTotal, newRows.length, locale)})`;
  const oldSummary = `AVG ${formatRatingAvg(oldRatingTotal, oldRows.length)} (~${formatRatingProjection(oldRatingTotal, oldRows.length, locale)})`;
  const seasonLabel = seasonVersion ? formatVersionLabel(seasonVersion) : null;
  const todayLabel = new Date().toLocaleDateString(locale);

  // html-to-image walks the DOM and inlines styles/images. Jackets come from the
  // public song database, which sends `access-control-allow-origin: *`, so the
  // canvas is not tainted and the PNG can be read back.
  const renderPng = useCallback(async () => {
    const node = exportRef.current;
    if (!node) throw new Error('Nothing to export');

    const { toBlob } = await import('html-to-image');
    const background =
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff';
    // No `cacheBust`: appending a query string to the cover URLs made the song
    // database fail those requests, so html-to-image silently dropped most
    // jackets (export dropped from ~1.3 MB to ~130 KB).
    const blob = await toBlob(node, {
      pixelRatio: 2,
      backgroundColor: background,
    });
    if (!blob) throw new Error('Render produced no image');
    return blob;
  }, []);

  const handleSaveImage = useCallback(async () => {
    setExportState('working');
    try {
      const blob = await renderPng();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `maistats-b50-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportState('saved');
    } catch {
      setExportState('render-error');
    }
  }, [renderPng]);

  const handleCopyImage = useCallback(async () => {
    setExportState('working');

    let blob: Blob;
    try {
      blob = await renderPng();
    } catch {
      setExportState('render-error');
      return;
    }

    // Browsers gate image clipboard writes behind a permission; on localhost it
    // is normally auto-granted, but a denial is a different failure from a render
    // failure and deserves its own message.
    try {
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
        throw new Error('Clipboard images unsupported');
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setExportState('copied');
    } catch {
      setExportState('clipboard-error');
    }
  }, [renderPng]);

  const isWorking = exportState === 'working';
  const saveLabel = exportState === 'saved' ? t('rating.exportSaved') : t('rating.exportSave');
  const copyLabel = exportState === 'copied' ? t('rating.exportCopied') : t('rating.exportCopy');

  const exportControls = (
    <section className="panel rating-export-panel">
      <div className="panel-heading compact">
        <div>
          <h2>{t('rating.exportPanelTitle')}</h2>
        </div>
      </div>
      <div className="rating-export-bar">
        <button
          type="button"
          className="rating-export-button"
          onClick={handleSaveImage}
          disabled={isWorking}
        >
          {isWorking ? t('rating.exportWorking') : saveLabel}
        </button>
        <button
          type="button"
          className="rating-export-button"
          onClick={handleCopyImage}
          disabled={isWorking}
        >
          {isWorking ? t('rating.exportWorking') : copyLabel}
        </button>
      </div>
      {exportState === 'render-error' || exportState === 'clipboard-error' ? (
        <span className="rating-export-status error">
          {exportState === 'clipboard-error'
            ? t('rating.exportClipboardFailed')
            : t('rating.exportFailed')}
        </span>
      ) : null}
    </section>
  );

  return (
    <div className="explorer-layout">
      <aside className="sidebar-column">
        {sidebarTopContent}
        {exportControls}
      </aside>

      <div className="table-column rating-table-column">
        {/* The sidebar is hidden below 1201px, so the controls need a second home. */}
        <div className="rating-export-mobile">{exportControls}</div>

        {/* Everything inside this node is captured by the PNG export. */}
        <div className="rating-export-area" ref={exportRef}>
          <section className="panel rating-b50-header">
            <div className="rating-b50-header-top">
              <h1 className="rating-b50-header-name">{playerProfile?.user_name ?? '-'}</h1>
              <div className="rating-b50-header-rating">
                <span className="rating-b50-header-rating-label">{t('rating.current')}</span>
                <strong>{formatNumber(combinedRatingTotal, locale)}</strong>
                <small className="rating-stat-breakdown">
                  NEW {formatNumber(newRatingTotal, locale)} + OLD{' '}
                  {formatNumber(oldRatingTotal, locale)}
                </small>
                <small>AVG {combinedAverage}</small>
              </div>
            </div>

            <dl className="rating-b50-header-stats">
              <div>
                <dt>{t('rating.version')}</dt>
                <dd>{seasonLabel ?? '-'}</dd>
              </div>
              <div>
                <dt>{t('rating.playCountVersion')}</dt>
                <dd>
                  {typeof playerProfile?.current_version_play_count === 'number'
                    ? formatNumber(playerProfile.current_version_play_count, locale)
                    : '-'}
                </dd>
              </div>
              <div>
                <dt>{t('rating.playCountTotal')}</dt>
                <dd>
                  {typeof playerProfile?.total_play_count === 'number'
                    ? formatNumber(playerProfile.total_play_count, locale)
                    : '-'}
                </dd>
              </div>
              <div>
                <dt>{t('rating.date')}</dt>
                <dd>{todayLabel}</dd>
              </div>
            </dl>
          </section>

          <RatingCardSection
            title={t('rating.oldTop35')}
            summary={oldSummary}
            rows={oldRows}
            songInfoUrl={songInfoUrl}
            onOpenHistory={onOpenHistory}
          />
          <RatingCardSection
            title={t('rating.newTop15')}
            summary={newSummary}
            rows={newRows}
            songInfoUrl={songInfoUrl}
            onOpenHistory={onOpenHistory}
          />
        </div>
      </div>
    </div>
  );
}
