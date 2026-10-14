import { describe, expect, it } from 'vitest';

import { buildResidualRadar, chartTagKey, type RadarTagData } from './residualRadar';
import type { ScoreRow } from '../types';

function buildScoreRow(title: string, achievementPercent: number): ScoreRow {
  return {
    key: title,
    songKey: title,
    title,
    genre: 'Genre',
    artist: 'Artist',
    aliases: {},
    chartType: 'DX',
    difficulty: 'MASTER',
    achievementX10000: Math.round(achievementPercent * 10000),
    achievementPercent,
    rank: 'SSS',
    fc: null,
    sync: null,
    dxScore: 1000,
    dxScoreMax: 1200,
    dxRatio: 0.8,
    rating: 15,
    level: '13',
    internalLevel: 13,
    isInternalLevelEstimated: false,
    version: 'DX',
    imageName: null,
    latestPlayedAtUnix: 100,
    latestPlayedAtLabel: null,
    daysSinceLastPlayed: 1,
    playCount: 1,
  };
}

// Every chart sits on one constant, so the curve is just their mean and a
// trait's residual is how far its charts sit from that. The pairs are chosen so
// each trait has a distinct mean: Swing -8, Umiyuri +7, Deciphering +3,
// Cross-hand -2.
const CHARTS: [string, number, number[]][] = [
  ['A', 100, [1]],
  ['B', 99, [1]],
  ['C', 97, [20]],
  ['D', 94, [20]],
  ['E', 92, [9]],
  ['F', 89, [9]],
  ['G', 87, [17]],
  ['H', 82, [17]],
];

const TAGS = [
  { id: 1, groupId: 1, names: { en: 'Umiyuri' } },
  { id: 9, groupId: 1, names: { en: 'Cross-hand' } },
  { id: 17, groupId: 1, names: { en: 'Swing' } },
  { id: 20, groupId: 1, names: { en: 'Deciphering' } },
];

const ROWS = CHARTS.map(([title, achievement]) => buildScoreRow(title, achievement));

function buildTagData(extraTags: typeof TAGS = []): RadarTagData {
  const byChart = new Map<string, number[]>();
  for (const [title, , tagIds] of CHARTS) {
    byChart.set(chartTagKey(title, 'DX', 'MASTER'), tagIds);
  }
  return {
    tags: [...TAGS, ...extraTags],
    groups: [{ id: 1, names: { en: 'Patterns' } }],
    byChart,
    fetchedAt: 0,
  };
}

function build(tagData: RadarTagData, overrides: { minCharts?: number; maxAxes?: number } = {}) {
  return buildResidualRadar({
    rows: ROWS,
    tagData,
    locale: 'en-US',
    groupId: 1,
    minCharts: overrides.minCharts ?? 2,
    maxAxes: overrides.maxAxes ?? 99,
  });
}

describe('buildResidualRadar spoke order', () => {
  it('places spokes by relatedness, not by significance', () => {
    // Significance alone would order these 17, 1, 20, 9.
    expect(build(buildTagData()).traits.map((trait) => trait.id)).toEqual([17, 9, 20, 1]);
  });

  it('still picks the strongest traits when the wheel is capped', () => {
    expect(build(buildTagData(), { maxAxes: 2 }).traits.map((trait) => trait.id)).toEqual([17, 1]);
  });

  it('keeps tags outside the known order after it', () => {
    const tagData = buildTagData([{ id: 999, groupId: 1, names: { en: 'Unknown' } }]);
    tagData.byChart.set(chartTagKey('A', 'DX', 'MASTER'), [1, 999]);

    expect(build(tagData, { minCharts: 1 }).traits.map((trait) => trait.id)).toEqual([
      17, 9, 20, 1, 999,
    ]);
  });
});
