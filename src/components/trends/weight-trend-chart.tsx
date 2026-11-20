'use client';

import { useMemo } from 'react';
import type { DailyWeightPoint } from '@/lib/nutrition/adaptive-tdee';
import {
  PAD,
  VB_H,
  VB_W,
  formatWeight,
  isFiniteNum,
  linePoints,
  niceRange,
  scale,
  toUnit,
  useScrub,
} from './chart-utils';

export interface WeightTrendChartProps {
  points: DailyWeightPoint[];
  unit: 'kg' | 'lb';
  className?: string;
}

function dayNumber(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000 : NaN;
}

export function WeightTrendChart({ points, unit, className = '' }: WeightTrendChartProps) {
  const clean = useMemo(
    () =>
      (points ?? []).filter(
        (p) => p && isFiniteNum(p.scaleKg) && isFiniteNum(p.trendKg) && isFiniteNum(dayNumber(p.date)),
      ),
    [points],
  );

  const geo = useMemo(() => {
    const ys = clean.flatMap((p) => [toUnit(p.scaleKg, unit), toUnit(p.trendKg, unit)]);
    const [y0, y1] = niceRange(ys);
    const d0 = clean.length ? dayNumber(clean[0].date) : 0;
    const d1 = clean.length ? dayNumber(clean[clean.length - 1].date) : 0;
    const innerL = PAD.l;
    const innerR = VB_W - PAD.r;
    const xs = clean.map((p) =>
      clean.length === 1 ? (innerL + innerR) / 2 : scale(dayNumber(p.date), d0, d1, innerL, innerR),
    );
    const yScale = (kg: number) => scale(toUnit(kg, unit), y0, y1, VB_H - PAD.b, PAD.t);
    return { y0, y1, xs, yScale };
  }, [clean, unit]);

  const scrub = useScrub(geo.xs);

  if (clean.length === 0) {
    return (
      <p className={`text-sm text-muted-foreground ${className}`}>
        No weigh-ins in this range yet. Add one and your trend will appear here.
      </p>
    );
  }

  const latest = clean[clean.length - 1];
  const summary = `Weight trend, ${clean.length} weigh-in${clean.length === 1 ? '' : 's'}. Latest trend ${formatWeight(latest.trendKg, unit)}, scale ${formatWeight(latest.scaleKg, unit)} on ${latest.date}.`;
  const trendPts: Array<[number, number]> = clean.map((p, i) => [geo.xs[i], geo.yScale(p.trendKg)]);
  const a = scrub.active !== null ? clean[scrub.active] : null;
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
          const y = scale(t, geo.y0, geo.y1, VB_H - PAD.b, PAD.t);
          return (
            <g key={i}>
              <line x1={PAD.l} x2={VB_W - PAD.r} y1={y} y2={y} stroke="var(--border-hairline)" strokeWidth={1} />
              <text x={PAD.l - 4} y={y + 3} textAnchor="end" fontSize={8} fill="var(--neutral-over)">
                {t.toFixed(1)}
              </text>
            </g>
          );
        })}
        {clean.map((p, i) => (
          <circle
            key={p.entryId + i}
            cx={geo.xs[i]}
            cy={geo.yScale(p.scaleKg)}
            r={2}
            fill="var(--neutral-over)"
            opacity={0.65}
            data-series="scale"
          />
        ))}
        {clean.length > 1 ? (
          <polyline
            points={linePoints(trendPts)}
            fill="none"
            stroke="var(--macro-calories)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            data-series="trend"
          />
        ) : (
          <circle cx={geo.xs[0]} cy={trendPts[0][1]} r={3.5} fill="var(--macro-calories)" data-series="trend" />
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
            <circle cx={geo.xs[scrub.active]} cy={trendPts[scrub.active][1]} r={3.5} fill="var(--macro-calories)" />
          </g>
        )}
      </svg>
      {a && (
        <div data-testid="scrub-readout" className="mt-1 text-xs tabular-nums text-foreground" aria-live="polite">
          {a.date} · scale {formatWeight(a.scaleKg, unit)} · trend {formatWeight(a.trendKg, unit)}
        </div>
      )}
      <div
        data-testid="chart-data-summary"
        tabIndex={0}
        onKeyDown={scrub.onKeyDown}
        onBlur={scrub.onBlur}
        className="sr-only focus:not-sr-only focus:mt-1 focus:text-xs focus:text-muted-foreground"
      >
        {summary} Use left and right arrow keys to read each weigh-in.
      </div>
    </div>
  );
}
