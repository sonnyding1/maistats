import type { KeyboardEvent } from 'react';

import { useI18n } from '../app/i18n';
import { formatNumber, formatPercent } from '../app/utils';
import { toIntegerRating } from '../derive';
import type { ScoreRow } from '../types';
import { DifficultyLabel, getDifficultyToneClass } from './DifficultyLabel';
import { Jacket } from './Jacket';
import { LevelCell } from './LevelCell';

interface SongRecordCardProps {
  row: ScoreRow;
  songInfoUrl: string;
  topLeft: string;
  onOpenHistory: (row: ScoreRow) => void;
}

function handleCardKeyDown(event: KeyboardEvent<HTMLElement>, onOpenHistory: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }

  event.preventDefault();
  onOpenHistory();
}

/**
 * Compact B50 tile: small jacket on the left, three short lines on the right.
 * Deliberately dense — the rating page renders 50 of these, so every extra line
 * multiplies the page height.
 */
export function SongRecordCard({ row, songInfoUrl, topLeft, onOpenHistory }: SongRecordCardProps) {
  const { locale, t } = useI18n();
  const handleOpenHistory = () => onOpenHistory(row);

  return (
    <article
      className={`rating-song-tile ${getDifficultyToneClass(row.difficulty)}`}
      role="button"
      tabIndex={0}
      aria-label={t('history.openChartHistory', { title: row.title })}
      onClick={handleOpenHistory}
      onKeyDown={(event) => handleCardKeyDown(event, handleOpenHistory)}
    >
      <div className="rating-song-tile-jacket">
        <Jacket
          songInfoUrl={songInfoUrl}
          imageName={row.imageName}
          title={row.title}
          className="rating-song-tile-cover"
        />
        <span className="rating-song-tile-rank">{topLeft}</span>
      </div>

      <div className="rating-song-tile-body">
        <h3 className="rating-song-tile-title" title={row.title}>
          {row.title}
        </h3>

        <div className="rating-song-tile-meta">
          <span className="rating-song-tile-achievement">
            {formatPercent(row.achievementPercent)}
          </span>
          <span className="rating-song-tile-score-rank">{row.rank ?? '-'}</span>
          {row.fc ? <span className="rating-song-tile-flag">{row.fc}</span> : null}
          {row.sync ? <span className="rating-song-tile-flag">{row.sync}</span> : null}
        </div>

        <div className="rating-song-tile-footer">
          <DifficultyLabel
            difficulty={row.difficulty}
            short
            className="rating-difficulty-chip"
          />
          <LevelCell
            internalLevel={row.internalLevel}
            isInternalLevelEstimated={row.isInternalLevelEstimated}
            difficulty={row.difficulty}
          />
          <strong className="rating-song-tile-value">
            {formatNumber(toIntegerRating(row.rating), locale)}
          </strong>
        </div>
      </div>
    </article>
  );
}
