'use client';

import { useMemo } from 'react';
import type { AdaptiveTdeeResult } from '@/lib/nutrition/adaptive-tdee';
import {
  PAD,
  VB_H,
  VB_W,
  formatInt,
  isFiniteNum,
  linePoints,
  niceRange,
  scale,
  useScrub,
} from './chart-utils';

export interface TdeeChartProps {
  result: AdaptiveTdeeResult;
  className?: string;
}

function ProgressRow({ label, value, max }: { label: string; value: number; max: number }) {
  const v = isFiniteNum(value) ? Math.max(0, Math.min(max, value)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">
          {v} / {max}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={v}
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--surface-sub)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${(v / max) * 100}%`, background: 'var(--macro-calories)' }}
        />
      </div>
    </div>
  );
}

export function TdeeChart({ result, className = '' }: TdeeChartProps) {
  const series = useMemo(
    () => (result?.tdeeSeries ?? []).filter((p) => p && isFiniteNum(p.observedTdee)),
    [result],
  );
  const mifflin = isFiniteNum(result?.mifflinEstimate) ? result.mifflinEstimate : null;

  const geo = useMemo(() => {
    const ys = [...series.map((p) => p.observedTdee), ...(mifflin !== null ? [mifflin] : [])];
    const [y0, y1] = niceRange(ys);
    const xs = series.map((_, i) =>
      series.length === 1 ? (PAD.l + VB_W - PAD.r) / 2 : scale(i, 0, series.length - 1, PAD.l, VB_W - PAD.r),
    );
    const yAt = (v: number) => scale(v, y0, y1, VB_H - PAD.b, PAD.t);
    return { y0, y1, xs, yAt };
  }, [series, mifflin]);

  const scrub = useScrub(geo.xs);

  if (!result || result.status === 'calibrating') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Calibrating your TDEE</h3>
          <p className="text-xs text-muted-foreground">
            A few more days of food logs and weigh-ins will unlock your observed TDEE. No rush.
          </p>
        </div>
        <ProgressRow
          label="Logged food days"
          value={result?.loggedFoodDays ?? 0}
          max={result?.requiredFoodDays ?? 10}
        />
        <ProgressRow
          label="Weigh-in days"
          value={result?.weighInDays ?? 0}
          max={result?.requiredWeighInDays ?? 4}
        />
        <ProgressRow
          label="Days spanned"
          value={result?.spanDays ?? 0}
          max={result?.requiredSpanDays ?? 10}
        />
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <p className={`text-sm text-muted-foreground ${className}`}>
        Not enough history to chart your TDEE yet.
      </p>
    );
  }

  const last = series[series.length - 1];
  const summary = `Observed TDEE trend, ${series.length} point${series.length === 1 ? '' : 's'}. Latest ${formatInt(last.observedTdee)} kcal${mifflin !== null ? `; formula estimate ${formatInt(mifflin)} kcal` : ''}.`;
  const pts: Array<[number, number]> = series.map((p, i) => [geo.xs[i], geo.yAt(p.observedTdee)]);
  const a = scrub.active !== null ? series[scrub.active] : null;
  const ticks = [geo.y0, (geo.y0 + geo.y1) / 2, geo.y1];

  return (
    <div className={`relative tabular-nums ${className}`}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        style={{ width: '100%', height: 'auto', touchAction: 'pan-y' }}
        role="img"
        aria-label={summary}
        onPointerMove={scrub.onPointerMove}
        onPointerDown={scrub.onPointerMove}
        onPointerLeave={scrub.onPointerLeave}
      >
        {ticks.map((t, i) => {
          const y = geo.yAt(t);
          return (
            <g key={i}>
              <line x1={PAD.l} x2={VB_W - PAD.r} y1={y} y2={y} stroke="var(--border-hairline)" strokeWidth={1} />
              <text x={PAD.l - 4} y={y + 3} textAnchor="end" fontSize={8} fill="var(--neutral-over)">
                {formatInt(t)}
              </text>
            </g>
          );
        })}
        {mifflin !== null && (
          <line
            x1={PAD.l}
            x2={VB_W - PAD.r}
            y1={geo.yAt(mifflin)}
            y2={geo.yAt(mifflin)}
            stroke="var(--neutral-over)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            data-series="mifflin"
          />
        )}
        {series.length > 1 ? (
          <polyline
            points={linePoints(pts)}
            fill="none"
            stroke="var(--macro-calories)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            data-series="observed"
          />
        ) : (
          <circle cx={pts[0][0]} cy={pts[0][1]} r={3.5} fill="var(--macro-calories)" data-series="observed" />
        )}
        {a && scrub.active !== null && (
          <g pointerEvents="none">
            <line
              x1={geo.xs[scrub.active]}
              x2={geo.xs[scrub.active]}
              y1={PAD.t}
              y2={VB_H - PAD.b}
              stroke="var(--border-focus)"
              strokeWidth={1}
            />
            <circle cx={pts[scrub.active][0]} cy={pts[scrub.active][1]} r={3.5} fill="var(--macro-calories)" />
          </g>
        )}
      </svg>
      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-3" style={{ background: 'var(--macro-calories)' }} /> Observed
        </span>
        {mifflin !== null && (
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block w-3 border-t border-dashed"
              style={{ borderColor: 'var(--neutral-over)' }}
            />{' '}
            Formula estimate
          </span>
        )}
      </div>
      {a && (
        <div data-testid="scrub-readout" className="mt-1 text-xs tabular-nums text-foreground" aria-live="polite">
          {a.date} · observed {formatInt(a.observedTdee)} kcal · avg intake {formatInt(a.avgCalories)} kcal
        </div>
      )}
      <div
        data-testid="chart-data-summary"
        tabIndex={0}
        onKeyDown={scrub.onKeyDown}
        onBlur={scrub.onBlur}
        className="sr-only focus:not-sr-only focus:mt-1 focus:text-xs focus:text-muted-foreground"
      >
        {summary} Use left and right arrow keys to read each point.
      </div>
    </div>
  );
}
