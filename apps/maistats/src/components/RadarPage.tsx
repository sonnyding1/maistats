import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useI18n } from '../app/i18n';
import {
  buildResidualRadar,
  loadRadarTagData,
  radarBaseline,
  type RadarTagData,
  type ResidualRadarResult,
} from '../app/residualRadar';
import { useEffectiveTheme } from '../app/theme';
import type { ScoreRow } from '../types';

interface RadarPageProps {
  sidebarTopContent?: ReactNode;
  rows: ScoreRow[];
  recordCollectorUrl: string;
  isLoading?: boolean;
}

const FONT_FAMILY =
  "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif";

/** Pattern traits are the skill set; the other groups describe the chart, not you. */
const DEFAULT_GROUP_ID = 1;

/** The widest group holds fourteen traits; show every qualifying one by default. */
const MAX_AXES = 14;

const SERIES_COLOR = '#8b8bf0';
const SERIES_FILL = 'rgba(139, 139, 240, 0.22)';

/** Plotly draws outside the cascade, so its colours come from the theme variables. */
function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function localizedName(names: Record<string, string> | undefined, locale: string): string {
  if (!names) return '?';
  const short = locale.toLowerCase().startsWith('zh') ? 'zh-Hans' : 'en';
  return names[short] ?? names.en ?? Object.values(names)[0] ?? '?';
}

export function RadarPage({
  sidebarTopContent,
  rows,
  recordCollectorUrl,
  isLoading,
}: RadarPageProps) {
  const { t, locale } = useI18n();
  const theme = useEffectiveTheme();
  const [tagData, setTagData] = useState<RadarTagData | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [groupId, setGroupId] = useState(DEFAULT_GROUP_ID);
  const [minCharts, setMinCharts] = useState(5);
  const [maxAxes, setMaxAxes] = useState(MAX_AXES);
  const plotRef = useRef<HTMLDivElement | null>(null);

  const loadTags = useCallback(
    async (force: boolean) => {
      setIsFetching(true);
      setTagError(null);
      try {
        setTagData(await loadRadarTagData({ collectorUrl: recordCollectorUrl, force }));
      } catch (error) {
        setTagError((error as Error).message);
      } finally {
        setIsFetching(false);
      }
    },
    [recordCollectorUrl],
  );

  useEffect(() => {
    void loadTags(false);
  }, [loadTags]);

  const result: ResidualRadarResult | null = useMemo(() => {
    if (!tagData) return null;
    return buildResidualRadar({ rows, tagData, locale, groupId, minCharts, maxAxes });
  }, [groupId, locale, maxAxes, minCharts, rows, tagData]);

  const traits = result?.traits ?? [];
  const hasEnoughAxes = traits.length >= 3;

  useEffect(() => {
    const element = plotRef.current;
    if (!element || !hasEnoughAxes || !result) return;

    let cancelled = false;

    void (async () => {
      const Plotly = (await import('plotly.js-dist-min')).default;
      if (cancelled) return;

      const ink = cssVar('--ink', '#dcdce8');
      const inkDim = cssVar('--ink-dim', '#9898b0');
      const grid = cssVar('--line-strong', '#2c2c3a');
      const baselineColor = cssVar('--muted', '#8888a0');

      const labels = result.traits.map((trait) => trait.label);
      const closedLabels = [...labels, labels[0]];
      const spokes = [...result.traits.map((trait) => trait.reach), result.traits[0].reach];
      const baseline = [...radarBaseline(labels.length), 0.5];

      const traces = [
        {
          type: 'scatterpolar',
          r: baseline,
          theta: closedLabels,
          mode: 'lines',
          line: { color: baselineColor, width: 1, dash: 'dot' },
          hoverinfo: 'skip',
          showlegend: false,
        },
        {
          type: 'scatterpolar',
          r: spokes,
          theta: closedLabels,
          fill: 'toself',
          fillcolor: SERIES_FILL,
          line: { color: SERIES_COLOR, width: 2 },
          customdata: result.traits.map((trait) => trait.charts),
          hovertemplate: '%{theta}<br>%{r:.3f} · %{customdata} charts<extra></extra>',
          showlegend: false,
        },
      ];

      const layout = {
        // A polar plot rotates on drag by default, which makes the spokes hard to
        // read back. `dragmode: false` kills rotation and panning, and the config
        // below kills wheel zoom. `fixedrange` is not a polar axis attribute -
        // Plotly accepts it and silently ignores it, so it is not used here.
        dragmode: false,
        margin: { l: 90, r: 90, t: 50, b: 50 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { family: FONT_FAMILY, color: ink, size: 12 },
        showlegend: false,
        polar: {
          bgcolor: 'rgba(0,0,0,0)',
          radialaxis: {
            visible: true,
            range: [0, 1],
            tickvals: [0.25, 0.5, 0.75, 1],
            ticktext: ['', t('radar.baseline'), '', ''],
            gridcolor: grid,
            linecolor: grid,
            tickfont: { size: 10, color: inkDim },
          },
          angularaxis: {
            gridcolor: grid,
            linecolor: grid,
            tickfont: { size: 11, color: ink },
          },
        },
      };

      // The bundled types for this module are loose, so the trace/layout shapes
      // above are the documented scatterpolar ones rather than inferred.
      const plotly = Plotly as unknown as {
        react: (el: HTMLElement, data: unknown, layout: unknown, config: unknown) => Promise<void>;
      };
      // Hover stays enabled on purpose; only the range-changing interactions go.
      await plotly.react(element, traces, layout, {
        displayModeBar: false,
        responsive: true,
        scrollZoom: false,
        doubleClick: false,
        staticPlot: false,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [hasEnoughAxes, result, t, theme]);

  useEffect(
    () => () => {
      const element = plotRef.current;
      if (!element) return;
      void (async () => {
        const Plotly = (await import('plotly.js-dist-min')).default;
        (Plotly as unknown as { purge: (el: HTMLElement) => void }).purge(element);
      })();
    },
    [],
  );

  return (
    <div className="explorer-layout">
      <aside className="sidebar-column">
        {sidebarTopContent}
        <section className="panel">
          <div className="panel-heading compact">
            <h3>{t('radar.controls')}</h3>
          </div>
          <div className="radar-controls">
            <label className="radar-control">
              <span>{t('radar.group')}</span>
              <select value={groupId} onChange={(event) => setGroupId(Number(event.target.value))}>
                {(tagData?.groups ?? []).map((group) => (
                  <option key={group.id} value={group.id}>
                    {localizedName(group.names, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className="radar-control">
              <span>{t('radar.minCharts')}</span>
              <input
                type="number"
                min={2}
                max={30}
                value={minCharts}
                onChange={(event) => setMinCharts(Math.max(2, Number(event.target.value) || 2))}
              />
            </label>
            <label className="radar-control">
              <span>{t('radar.maxAxes')}</span>
              <input
                type="number"
                min={3}
                max={MAX_AXES}
                value={maxAxes}
                onChange={(event) =>
                  setMaxAxes(Math.min(MAX_AXES, Math.max(3, Number(event.target.value) || 3)))
                }
              />
            </label>
          </div>
        </section>
      </aside>

      <div className="table-column">
        <section className="panel radar-panel">
          <div className="panel-heading">
            <div>
              <h2>{t('radar.title')}</h2>
              <p className="settings-meta">{t('radar.description')}</p>
            </div>
            <button
              type="button"
              className="radar-refresh-button"
              onClick={() => void loadTags(true)}
              disabled={isFetching}
            >
              {isFetching ? t('radar.refreshing') : t('radar.refresh')}
            </button>
          </div>

          {tagError ? (
            <p className="error-banner">
              {t('common.error')}: {tagError}
            </p>
          ) : null}

          {isLoading || isFetching || !result ? (
            <p className="settings-meta">{t('radar.loading')}</p>
          ) : !hasEnoughAxes ? (
            <p className="settings-meta">
              {t('radar.empty', { count: result.considered, min: minCharts })}
            </p>
          ) : (
            <>
              <div className="radar-plot" ref={plotRef} />
              <p className="settings-meta radar-note">{t('radar.baselineNote')}</p>
            </>
          )}
        </section>

        {result && traits.length > 0 ? (
          <section className="panel">
            <div className="panel-heading compact">
              <h3>{t('radar.tableTitle')}</h3>
            </div>
            <table className="radar-table">
              <thead>
                <tr>
                  <th>{t('radar.trait')}</th>
                  <th>{t('radar.charts')}</th>
                  <th>{t('radar.meanResidual')}</th>
                  <th>{t('radar.significance')}</th>
                </tr>
              </thead>
              <tbody>
                {traits.map((trait) => (
                  <tr key={trait.id}>
                    <td>{trait.label}</td>
                    <td className="numeric">{trait.charts}</td>
                    <td className="numeric">
                      {trait.meanResidual >= 0 ? '+' : ''}
                      {trait.meanResidual.toFixed(2)}
                    </td>
                    <td className="numeric">{trait.tStat.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="settings-meta radar-note">
              {t('radar.summary', {
                scored: result.scoredCharts,
                curve: result.curveCharts,
                points: result.curvePoints,
                sd: result.residualSd.toFixed(2),
              })}
            </p>
            {result.estimatedConstantRows > 0 ? (
              <p className="settings-meta radar-note">
                {t('radar.estimatedSkipped', { count: result.estimatedConstantRows })}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
