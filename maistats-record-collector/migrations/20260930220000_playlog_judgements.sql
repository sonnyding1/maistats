-- Per-play judgement detail scraped from record/playlogDetail/.
--
-- Only plays synced after this migration get these values: the playlog idx was
-- never stored, and the recent page exposes just the latest 50 plays, so older
-- rows cannot be backfilled from the current session.

ALTER TABLE playlogs ADD COLUMN playlog_detail_idx TEXT;
ALTER TABLE playlogs ADD COLUMN fast_count INTEGER;
ALTER TABLE playlogs ADD COLUMN late_count INTEGER;
ALTER TABLE playlogs ADD COLUMN max_combo INTEGER;
ALTER TABLE playlogs ADD COLUMN note_count INTEGER;
ALTER TABLE playlogs ADD COLUMN rating_after INTEGER;
ALTER TABLE playlogs ADD COLUMN rating_delta INTEGER;

CREATE TABLE IF NOT EXISTS playlog_judgements (
  played_at_unixtime INTEGER NOT NULL,
  note_type TEXT NOT NULL, -- 'TAP' | 'HOLD' | 'SLIDE' | 'TOUCH' | 'BREAK'
  critical_perfect INTEGER NOT NULL DEFAULT 0,
  perfect INTEGER NOT NULL DEFAULT 0,
  great INTEGER NOT NULL DEFAULT 0,
  good INTEGER NOT NULL DEFAULT 0,
  miss INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (played_at_unixtime, note_type),
  FOREIGN KEY (played_at_unixtime) REFERENCES playlogs(played_at_unixtime) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playlog_judgements_note_type ON playlog_judgements(note_type);
