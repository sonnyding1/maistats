import { buildCoverUrl, type PlayerProfile } from './api';
import { formatDifficultyShort, formatNumber, formatPercent } from './app/utils';
import { toIntegerRating } from './derive';
import type { DifficultyCategory, ScoreRow } from './types';

/**
 * Renders the B50 to a canvas and returns a PNG blob.
 *
 * Deliberately does not touch the DOM layout: the output is a fixed 1728px wide,
 * five-column poster no matter what viewport the page is open in. It also avoids
 * the html-to-image SVG pipeline, which fails outright on tall content.
 */

const WIDTH = 1728;
const PAD = 24;
const GAP = 6;
const COLS = 5;
const TILE_H = 72;
const JACKET = 54;
const PIXEL_RATIO = 2;
const SECTION_GAP = 16;

const FONT =
  "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif";

export interface B50ExportInput {
  oldRows: ScoreRow[];
  newRows: ScoreRow[];
  playerProfile: PlayerProfile | null;
  seasonLabel: string | null;
  oldRatingTotal: number;
  newRatingTotal: number;
  oldSummary: string;
  newSummary: string;
  average: string;
  locale: string;
  songInfoUrl: string;
  labels: {
    oldTitle: string;
    newTitle: string;
    currentRating: string;
    version: string;
    playsVersion: string;
    playsAllTime: string;
    date: string;
  };
}

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function difficultyColor(difficulty: DifficultyCategory | null | undefined): string {
  switch (difficulty) {
    case 'BASIC':
      return cssVar('--diff-basic', '#4cc874');
    case 'ADVANCED':
      return cssVar('--diff-advanced', '#f0b429');
    case 'EXPERT':
      return cssVar('--diff-expert', '#f47070');
    case 'MASTER':
      return cssVar('--diff-master', '#a65cdf');
    case 'Re:MASTER':
      return cssVar('--diff-remaster', '#d8d8d8');
    default:
      return cssVar('--muted', '#8888a0');
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
}

function loadJacket(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    // Covers are served with `access-control-allow-origin: *`, so the canvas
    // stays untainted and can still be exported.
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'left',
): void {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  row: ScoreRow,
  rank: number,
  jacket: HTMLImageElement | null,
  input: B50ExportInput,
): void {
  const panel = cssVar('--panel', '#111116');
  const ink = cssVar('--ink', '#dcdce8');
  const inkDim = cssVar('--ink-dim', '#9898b0');
  const muted = cssVar('--muted', '#8888a0');
  const line = cssVar('--line', '#26262f');
  const accent = difficultyColor(row.difficulty);

  ctx.fillStyle = panel;
  roundRect(ctx, x, y, w, TILE_H, 2);
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.fillRect(x, y, 3, TILE_H);

  const jacketY = y + (TILE_H - JACKET) / 2;
  if (jacket) {
    ctx.save();
    roundRect(ctx, x + 6, jacketY, JACKET, JACKET, 2);
    ctx.clip();
    ctx.drawImage(jacket, x + 6, jacketY, JACKET, JACKET);
    ctx.restore();
  } else {
    ctx.fillStyle = '#1b1b22';
    roundRect(ctx, x + 6, jacketY, JACKET, JACKET, 2);
    ctx.fill();
    drawText(
      ctx,
      row.title.slice(0, 1).toUpperCase(),
      x + 6 + JACKET / 2,
      jacketY + JACKET / 2 + 9,
      `700 22px ${FONT}`,
      muted,
      'center',
    );
  }

  // Rank badge, bottom-left of the sleeve.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.74)';
  ctx.fillRect(x + 6, jacketY + JACKET - 15, 27, 15);
  drawText(ctx, `#${rank}`, x + 9, jacketY + JACKET - 4, `700 9px ${FONT}`, '#f8fafc');

  const tx = x + 6 + JACKET + 8;
  const tw = x + w - 8 - tx;

  ctx.save();
  ctx.beginPath();
  ctx.rect(tx, y, tw, TILE_H);
  ctx.clip();

  ctx.font = `600 13px ${FONT}`;
  drawText(ctx, ellipsize(ctx, row.title, tw), tx, y + 21, `600 13px ${FONT}`, ink);

  let mx = tx;
  const achievement = formatPercent(row.achievementPercent);
  ctx.font = `700 11px ${FONT}`;
  drawText(ctx, achievement, mx, y + 38, `700 11px ${FONT}`, ink);
  mx += ctx.measureText(achievement).width + 7;

  if (row.rank) {
    drawText(ctx, row.rank, mx, y + 38, `700 11px ${FONT}`, muted);
    mx += ctx.measureText(row.rank).width + 7;
  }

  ctx.font = `700 9px ${FONT}`;
  for (const flag of [row.fc, row.sync]) {
    if (!flag) continue;
    const cw = ctx.measureText(flag).width + 8;
    if (mx + cw > tx + tw) break;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    roundRect(ctx, mx, y + 29, cw, 12, 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    drawText(ctx, flag, mx + 4, y + 38, `700 9px ${FONT}`, muted);
    mx += cw + 5;
  }

  const fy = y + 57;
  const diffLabel = row.difficulty ? formatDifficultyShort(row.difficulty) : '-';
  ctx.font = `700 10px ${FONT}`;
  const chipW = ctx.measureText(diffLabel).width + 10;
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = accent;
  roundRect(ctx, tx, fy - 10, chipW, 14, 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  drawText(ctx, diffLabel, tx + 5, fy, `700 10px ${FONT}`, ink);

  drawText(
    ctx,
    `Lv ${row.level ?? '-'}`,
    tx + chipW + 7,
    fy,
    `700 10px ${FONT}`,
    inkDim,
  );

  drawText(
    ctx,
    formatNumber(toIntegerRating(row.rating), input.locale),
    x + w - 8,
    fy + 1,
    `700 14px ${FONT}`,
    ink,
    'right',
  );

  ctx.restore();
}

export async function renderB50Png(input: B50ExportInput): Promise<Blob> {
  const ink = cssVar('--ink', '#dcdce8');
  const inkDim = cssVar('--ink-dim', '#9898b0');
  const muted = cssVar('--muted', '#8888a0');
  const line = cssVar('--line', '#26262f');
  const bg = cssVar('--bg', '#0b0b0f');
  const panel = cssVar('--panel', '#111116');
  const accent = cssVar('--accent', '#8b8bf0');

  const contentW = WIDTH - PAD * 2;
  const tileW = (contentW - (COLS - 1) * GAP) / COLS;

  const headerH = 150;
  const sectionHeadingH = 30;
  const sectionHeight = (rows: number) =>
    sectionHeadingH + Math.ceil(rows / COLS) * (TILE_H + GAP) - GAP;

  const oldH = sectionHeight(input.oldRows.length);
  const newH = sectionHeight(input.newRows.length);
  const height = PAD + headerH + SECTION_GAP + oldH + SECTION_GAP + newH + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * PIXEL_RATIO;
  canvas.height = height * PIXEL_RATIO;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, height);

  // --- header panel ---
  ctx.fillStyle = panel;
  roundRect(ctx, PAD, PAD, contentW, headerH, 2);
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.stroke();

  const name = input.playerProfile?.user_name ?? '-';
  drawText(ctx, name, PAD + 18, PAD + 42, `800 30px ${FONT}`, ink);

  const ratingX = WIDTH - PAD - 18;
  drawText(
    ctx,
    input.labels.currentRating.toUpperCase(),
    ratingX,
    PAD + 18,
    `700 11px ${FONT}`,
    muted,
    'right',
  );
  const total = input.oldRatingTotal + input.newRatingTotal;
  drawText(
    ctx,
    formatNumber(total, input.locale),
    ratingX,
    PAD + 48,
    `800 34px ${FONT}`,
    ink,
    'right',
  );
  drawText(
    ctx,
    `NEW ${formatNumber(input.newRatingTotal, input.locale)} + OLD ${formatNumber(input.oldRatingTotal, input.locale)}`,
    ratingX,
    PAD + 68,
    `700 11px ${FONT}`,
    inkDim,
    'right',
  );
  drawText(ctx, `AVG ${input.average}`, ratingX, PAD + 84, `700 11px ${FONT}`, inkDim, 'right');

  ctx.strokeStyle = line;
  ctx.beginPath();
  ctx.moveTo(PAD + 18, PAD + 98);
  ctx.lineTo(WIDTH - PAD - 18, PAD + 98);
  ctx.stroke();

  const stats: [string, string][] = [
    [input.labels.version, input.seasonLabel ?? '-'],
    [
      input.labels.playsVersion,
      typeof input.playerProfile?.current_version_play_count === 'number'
        ? formatNumber(input.playerProfile.current_version_play_count, input.locale)
        : '-',
    ],
    [
      input.labels.playsAllTime,
      typeof input.playerProfile?.total_play_count === 'number'
        ? formatNumber(input.playerProfile.total_play_count, input.locale)
        : '-',
    ],
    [input.labels.date, new Date().toLocaleDateString(input.locale)],
  ];
  const statW = contentW / stats.length;
  stats.forEach(([label, value], index) => {
    const sx = PAD + 18 + index * statW;
    drawText(ctx, label.toUpperCase(), sx, PAD + 118, `700 10px ${FONT}`, muted);
    drawText(ctx, value, sx, PAD + 136, `700 15px ${FONT}`, ink);
  });

  // --- sections ---
  const sections: [string, string, ScoreRow[]][] = [
    [input.labels.oldTitle, input.oldSummary, input.oldRows],
    [input.labels.newTitle, input.newSummary, input.newRows],
  ];

  // Preload every sleeve once, up front.
  const jackets = new Map<string, HTMLImageElement | null>();
  const allRows = [...input.oldRows, ...input.newRows];
  await Promise.all(
    allRows.map(async (row) => {
      if (!row.imageName || jackets.has(row.imageName)) return;
      const url = buildCoverUrl(input.songInfoUrl, row.imageName);
      jackets.set(row.imageName, await loadJacket(url));
    }),
  );

  let y = PAD + headerH + SECTION_GAP;

  for (const [title, summary, rows] of sections) {
    drawText(ctx, title, PAD, y + 18, `700 17px ${FONT}`, ink);
    drawText(ctx, summary, WIDTH - PAD, y + 18, `700 10px ${FONT}`, muted, 'right');
    y += sectionHeadingH;

    rows.forEach((row, index) => {
      const col = index % COLS;
      const rowIndex = Math.floor(index / COLS);
      drawTile(
        ctx,
        PAD + col * (tileW + GAP),
        y + rowIndex * (TILE_H + GAP),
        tileW,
        row,
        index + 1,
        row.imageName ? (jackets.get(row.imageName) ?? null) : null,
        input,
      );
    });

    y += Math.ceil(rows.length / COLS) * (TILE_H + GAP) - GAP + SECTION_GAP;
  }

  void accent;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      blob ? resolve(blob) : reject(new Error('Canvas produced no image'));
    }, 'image/png');
  });
}
