import type { ScoreRow } from '../types';

/**
 * Residual radar.
 *
 * Other maimai radars count what you *play* (chart tags over your B50), which
 * says nothing about whether you are any good at those patterns. This measures
 * the opposite: how each chart's result compares to your own expected result at
 * that chart constant, then averages that deviation per chart trait.
 *
 * A spoke pointing outward means "relative to everything else I play, I am
 * unusually good at charts carrying this trait". The middle of the wheel is your
 * own average, not an absolute zero.
 *
 * Trait data is the DXRating community tag DB, reached through the collector's
 * `/api/radar/tags` proxy: DXRating only sends CORS headers for origins on its
 * allowlist, so a browser served from anywhere else cannot fetch it directly.
 * Note that its `song_id` is the song TITLE, not a numeric id, so no extra
 * lookup table is needed.
 */

const CACHE_KEY = 'maistats.radar-tag-data';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** A constant needs at least this many of your charts before it seeds the curve. */
const MIN_CURVE_CHARTS = 5;
/**
 * Radial scale, in achievement points: a mean residual of half this value
 * reaches an outer ring.
 *
 * Spoke length is the raw gap, so the wheel and the trait table agree. How well
 * that gap is evidenced is carried by the point colour instead - the two were
 * previously conflated into the radius via the t-statistic.
 */
const MEAN_FULL_SCALE = 4;

/**
 * Angular order for the spokes, as tag ids.
 *
 * This is the leaf order of an average-linkage clustering over chart
 * co-occurrence in the DXRating tag database, so traits that tend to appear on
 * the same charts sit next to each other on the wheel. Tags missing from this
 * list keep a stable place after the known ones.
 */
const TRAIT_DISPLAY_ORDER: readonly number[] = [17, 9, 20, 1, 10, 23, 24, 18, 4, 19, 7, 3, 6, 8];
const TRAIT_DISPLAY_RANK = new Map(TRAIT_DISPLAY_ORDER.map((id, index) => [id, index]));

function displayRank(tagId: number): number {
  return TRAIT_DISPLAY_RANK.get(tagId) ?? TRAIT_DISPLAY_ORDER.length + tagId;
}

const DIFFICULTY_KEY: Record<string, string> = {
  BASIC: 'basic',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
  MASTER: 'master',
  'Re:MASTER': 'remaster',
};

export interface RadarTagDefinition {
  id: number;
  groupId: number;
  names: Record<string, string>;
}

export interface RadarTagGroup {
  id: number;
  names: Record<string, string>;
}

interface TagSongRow {
  song_id: string;
  sheet_type: string;
  sheet_difficulty: string;
  tag_id: number;
}

export interface RadarTagData {
  tags: RadarTagDefinition[];
  groups: RadarTagGroup[];
  /** `${title}|${chartType}|${difficulty}` -> tag ids */
  byChart: Map<string, number[]>;
  fetchedAt: number;
}

interface RemotePayload {
  tags?: { id: number; group_id: number; localized_name?: Record<string, string> }[];
  tagGroups?: { id: number; localized_name?: Record<string, string> }[];
  tagSongs?: TagSongRow[];
}

export function chartTagKey(title: string, chartType: string, difficulty: string): string {
  const diff = DIFFICULTY_KEY[difficulty] ?? difficulty.toLowerCase();
  return `${title}|${chartType.toLowerCase()}|${diff}`;
}

function toTagData(payload: RemotePayload): RadarTagData {
  const tags = (payload.tags ?? []).map((tag) => ({
    id: tag.id,
    groupId: tag.group_id,
    names: tag.localized_name ?? {},
  }));
  const groups = (payload.tagGroups ?? []).map((group) => ({
    id: group.id,
    names: group.localized_name ?? {},
  }));

  const byChart = new Map<string, number[]>();
  for (const row of payload.tagSongs ?? []) {
    // Utage sheets are one-off novelty charts with no comparable constant.
    if (row.sheet_type !== 'std' && row.sheet_type !== 'dx') continue;
    const key = `${row.song_id}|${row.sheet_type}|${row.sheet_difficulty}`;
    const existing = byChart.get(key);
    if (existing) existing.push(row.tag_id);
    else byChart.set(key, [row.tag_id]);
  }

  return { tags, groups, byChart, fetchedAt: Date.now() };
}

/** Loads the tag database, preferring a week-old browser cache over the network. */
export async function loadRadarTagData(options: {
  collectorUrl: string;
  force?: boolean;
}): Promise<RadarTagData> {
  if (!options?.force && typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as RemotePayload & { fetchedAt?: number };
        const fetchedAt = parsed.fetchedAt ?? 0;
        if (Date.now() - fetchedAt < CACHE_TTL_MS) return toTagData(parsed);
      }
    } catch {
      // A corrupt cache should never block the page; fall through to the network.
    }
  }

  // Same normalisation the API layer applies: trim and drop trailing slashes.
  const base = options.collectorUrl.trim().replace(/\/+$/, '');
  if (!base) throw new Error('No record collector URL is configured');

  const response = await fetch(`${base}/api/radar/tags`);
  if (!response.ok) {
    throw new Error(`Tag database request failed (HTTP ${response.status})`);
  }
  const payload = (await response.json()) as RemotePayload;

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, fetchedAt: Date.now() }));
    } catch {
      // Quota or private mode: the analysis still works, it just refetches.
    }
  }

  return toTagData(payload);
}

export interface ResidualTrait {
  id: number;
  label: string;
  /** How many of your charts carry this trait. */
  charts: number;
  /** Mean achievement deviation against your own curve, in percentage points. */
  meanResidual: number;
  /** Mean deviation in units of the standard error; how well evidenced it is. */
  tStat: number;
  /** 0..1 radial position from the mean residual alone; 0.5 is your average. */
  reach: number;
}

export interface ResidualRadarResult {
  traits: ResidualTrait[];
  /** Traits in the group that had enough charts to be considered. */
  considered: number;
  /** Charts that carried at least one trait and had a usable constant. */
  scoredCharts: number;
  /** Charts that seeded the accuracy curve. */
  curveCharts: number;
  curvePoints: number;
  residualSd: number;
  /** How far the tagged population sits below the raw curve, in points. */
  populationMean: number;
  /** Played charts dropped because their constant is only estimated. */
  estimatedConstantRows: number;
}

export interface BuildRadarInput {
  rows: ScoreRow[];
  tagData: RadarTagData;
  locale: string;
  groupId: number;
  minCharts: number;
  maxAxes: number;
}

function pickName(names: Record<string, string>, locale: string): string {
  const short = locale.toLowerCase().startsWith('zh') ? 'zh-Hans' : 'en';
  return names[short] ?? names.en ?? Object.values(names)[0] ?? '?';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function buildResidualRadar(input: BuildRadarInput): ResidualRadarResult {
  const { rows, tagData, locale, groupId, minCharts, maxAxes } = input;

  // Only real constants can anchor the curve; the level+0.6 fallback is too
  // coarse to compare charts against each other.
  const played = rows.filter(
    (row): row is ScoreRow & { achievementPercent: number } => row.achievementPercent !== null,
  );
  const usable = played.filter(
    (row): row is ScoreRow & { achievementPercent: number; internalLevel: number } =>
      row.internalLevel !== null && !row.isInternalLevelEstimated,
  );
  // Played charts dropped because their only constant is the level+0.6 estimate.
  const estimatedConstantRows = played.length - usable.length;

  const byConstant = new Map<number, number[]>();
  for (const row of usable) {
    const key = Math.round(row.internalLevel * 10) / 10;
    const bucket = byConstant.get(key);
    if (bucket) bucket.push(row.achievementPercent);
    else byConstant.set(key, [row.achievementPercent]);
  }

  const expected = new Map<number, number>();
  for (const [constant, values] of byConstant) {
    if (values.length < MIN_CURVE_CHARTS) continue;
    expected.set(constant, values.reduce((sum, v) => sum + v, 0) / values.length);
  }

  const residuals: { row: ScoreRow; residual: number; tagIds: number[] }[] = [];
  for (const row of usable) {
    const key = Math.round(row.internalLevel * 10) / 10;
    const mean = expected.get(key);
    if (mean === undefined) continue;
    const tags = tagData.byChart.get(chartTagKey(row.title, row.chartType, row.difficulty));
    if (!tags || tags.length === 0) continue;
    residuals.push({ row, residual: row.achievementPercent - mean, tagIds: tags });
  }

  // Charts carrying a community tag are not a random sample - gimmick charts are
  // harder than their constant suggests - so the whole tagged population sits
  // below the curve. Centre on that population so the wheel shows relative
  // strengths AND weaknesses rather than every spoke leaning inward.
  const all = residuals.map((entry) => entry.residual);
  const populationMean = all.length > 0 ? all.reduce((s, v) => s + v, 0) / all.length : 0;

  const centred = residuals.map((entry) => ({ ...entry, residual: entry.residual - populationMean }));
  const values = centred.map((entry) => entry.residual);
  const variance =
    values.length > 1
      ? values.reduce((sum, v) => sum + v ** 2, 0) / (values.length - 1)
      : 0;
  const residualSd = Math.sqrt(variance);

  const perTag = new Map<number, number[]>();
  for (const entry of centred) {
    for (const tagId of entry.tagIds) {
      const bucket = perTag.get(tagId);
      if (bucket) bucket.push(entry.residual);
      else perTag.set(tagId, [entry.residual]);
    }
  }

  const candidates: ResidualTrait[] = [];
  for (const tag of tagData.tags) {
    if (tag.groupId !== groupId) continue;
    const values = perTag.get(tag.id);
    if (!values || values.length < minCharts) continue;

    const meanResidual = values.reduce((s, v) => s + v, 0) / values.length;
    // One-sample t against zero, using the pooled spread of all residuals so a
    // trait with a handful of charts cannot look certain by having low variance.
    const standardError = residualSd > 0 ? residualSd / Math.sqrt(values.length) : 0;
    const tStat = standardError > 0 ? meanResidual / standardError : 0;

    candidates.push({
      id: tag.id,
      label: pickName(tag.names, locale),
      charts: values.length,
      meanResidual,
      tStat,
      reach: clamp(0.5 + meanResidual / MEAN_FULL_SCALE, 0.1, 1),
    });
  }

  candidates.sort((left, right) => Math.abs(right.tStat) - Math.abs(left.tStat));

  // Selection is by significance, but the drawing order is not: sorting the
  // spokes by |t| as well would put the radius and the angle on the same
  // variable, which reads as a spiral, and would reshuffle the wheel on every
  // sync. Keep the strongest `maxAxes` traits, then place them by relatedness.
  const selected = candidates.slice(0, maxAxes);
  selected.sort((left, right) => displayRank(left.id) - displayRank(right.id));

  return {
    traits: selected,
    considered: candidates.length,
    scoredCharts: residuals.length,
    curveCharts: usable.filter(
      (row) => expected.get(Math.round(row.internalLevel * 10) / 10) !== undefined,
    ).length,
    curvePoints: expected.size,
    residualSd,
    populationMean,
    estimatedConstantRows,
  };
}

/** The frame of reference drawn behind the spokes: your own average. */
export function radarBaseline(count: number): number[] {
  return Array.from({ length: count }, () => 0.5);
}
