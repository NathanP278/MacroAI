'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { RangeDay } from '@/lib/nutrition/analytics';
import { PAD, VB_H, VB_W, formatInt, isFiniteNum, niceRange, scale, useScrub } from './chart-utils';

export interface IntakeTrendChartProps {
  /** Every day of the range (oldest → newest), as returned by `computeRangeAnalytics().days`. */
  days: RangeDay[];
  mode: 'calories' | 'macros';
  className?: string;
}

const MACRO_SEGMENTS = [
  { key: 'protein', color: 'var(--macro-protein)', kcalPerG: 4 },
  { key: 'carbs', color: 'var(--macro-carbs)', kcalPerG: 4 },
  { key: 'fat', color: 'var(--macro-fat)', kcalPerG: 9 },
] as const;

function num(v: unknown): number {
  return isFiniteNum(v) ? Math.max(0, v) : 0;
}

export function IntakeTrendChart({ days, mode, className = '' }: IntakeTrendChartProps) {
  const clean = useMemo(() => (days ?? []).filter((d) => d && typeof d.date === 'string'), [days]);
  const anyLogged = clean.some((d) => d.logged);

  const geo = useMemo(() => {
    const n = clean.length;
    const innerW = VB_W - PAD.l - PAD.r;
    const slot = n > 0 ? innerW / n : innerW;
    const barW = Math.max(1, slot * 0.7);
    const xs = clean.map((_, i) => PAD.l + slot * i + slot / 2);
    const tops = clean.map((d) => {
      const stack = num(d.protein) * 4 + num(d.carbs) * 4 + num(d.fat) * 9;
      return Math.max(mode === 'calories' ? num(d.calories) : stack, num(d.targetCalories));
    });
    const [, hi] = niceRange([0, ...tops], 0.08);
    const yMax = Math.max(hi, 1);
    const yAt = (v: number) => scale(v, 0, yMax, VB_H - PAD.b, PAD.t);
    return { xs, barW, yMax, yAt };
  }, [clean, mode]);

  const scrub = useScrub(geo.xs);

  if (!anyLogged) {
    return (
      <p className={`text-sm text-muted-foreground ${className}`}>
        No logged days in this range yet. Your intake columns will appear once you log food.
      </p>
    );
  }

  const loggedDays = clean.filter((d) => d.logged);
  const avg = loggedDays.reduce((s, d) => s + num(d.calories), 0) / loggedDays.length;
  const summary = `${mode === 'calories' ? 'Daily calories' : 'Daily macros'} over ${clean.length} days, ${loggedDays.length} logged, averaging ${formatInt(avg)} kcal on logged days.`;
  const a = scrub.active !== null ? clean[scrub.active] : null;
  const ticks = [0, geo.yMax / 2, geo.yMax];
  const baseY = VB_H - PAD.b;

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
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.l}
              x2={VB_W - PAD.r}
              y1={geo.yAt(t)}
              y2={geo.yAt(t)}
              stroke="var(--border-hairline)"
              strokeWidth={1}
            />
            <text x={PAD.l - 4} y={geo.yAt(t) + 3} textAnchor="end" fontSize={8} fill="var(--neutral-over)">
              {formatInt(t)}
            </text>
          </g>
        ))}
        {clean.map((d, i) => {
          const x = geo.xs[i] - geo.barW / 2;
          const opacity = scrub.active === null || scrub.active === i ? 1 : 0.55;
          const elements: ReactNode[] = [];
          if (d.logged) {
            if (mode === 'calories') {
              const h = Math.max(0, baseY - geo.yAt(num(d.calories)));
              const over = num(d.calories) > num(d.targetCalories);
              elements.push(
                <rect
                  key="cal"
                  data-bar="calories"
                  x={x}
                  y={baseY - h}
                  width={geo.barW}
                  height={h}
                  rx={Math.min(2, geo.barW / 2)}
                  fill={over ? 'var(--neutral-over)' : 'var(--macro-calories)'}
                  opacity={opacity}
                />,
              );
            } else {
              let acc = 0;
              for (const seg of MACRO_SEGMENTS) {
                const kcal = num(d[seg.key]) * seg.kcalPerG;
                const yTop = geo.yAt(acc + kcal);
                const yBot = geo.yAt(acc);
                acc += kcal;
                elements.push(
                  <rect
                    key={seg.key}
                    data-bar={seg.key}
                    x={x}
                    y={yTop}
                    width={geo.barW}
                    height={Math.max(0, yBot - yTop)}
                    fill={seg.color}
                    opacity={opacity}
                  />,
                );
              }
            }
          }
          const ty = geo.yAt(num(d.targetCalories));
          elements.push(
            <line
              key="notch"
              data-notch=""
              x1={x - 1}
              x2={x + geo.barW + 1}
              y1={ty}
              y2={ty}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.7}
            />,
          );
          return <g key={d.date + i}>{elements}</g>;
        })}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-3" style={{ background: 'currentColor' }} /> Daily target
        </span>
        {mode === 'macros' && (
          <>
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-xs"
                style={{ background: 'var(--macro-protein)' }}
              />{' '}
              Protein
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-xs"
                style={{ background: 'var(--macro-carbs)' }}
              />{' '}
              Carbs
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-xs"
                style={{ background: 'var(--macro-fat)' }}
              />{' '}
              Fat
            </span>
          </>
        )}
      </div>
      {a && (
        <div data-testid="scrub-readout" className="mt-1 text-xs tabular-nums text-foreground" aria-live="polite">
          {a.date} ·{' '}
          {a.logged ? (
            <>
              {formatInt(num(a.calories))} kcal (target {formatInt(num(a.targetCalories))}) · P{' '}
              {Math.round(num(a.protein))}g · C {Math.round(num(a.carbs))}g · F {Math.round(num(a.fat))}g
            </>
          ) : (
            <>not logged (target {formatInt(num(a.targetCalories))} kcal)</>
          )}
        </div>
      )}
      <div
        data-testid="chart-data-summary"
        tabIndex={0}
        onKeyDown={scrub.onKeyDown}
        onBlur={scrub.onBlur}
        className="sr-only focus:not-sr-only focus:mt-1 focus:text-xs focus:text-muted-foreground"
      >
        {summary} Use left and right arrow keys to read each day.
      </div>
    </div>
  );
}
