'use client';

import React from 'react';
import type { DailySummary, MacroMetric } from '@/lib/nutrition/daily-summary';
import { SlidersHorizontal } from 'lucide-react';

export interface MacroBentoGridProps {
  summary: DailySummary;
  className?: string;
}

interface MacroBarRowProps {
  label: string;
  unit: string;
  metric: MacroMetric;
  badgeTextClass: string;
  fillCssVar: string;
}

function MacroBarRow({
  label,
  unit,
  metric,
  badgeTextClass,
  fillCssVar,
}: MacroBarRowProps) {
  const pillClass = metric.overTarget ? 'text-muted-foreground' : badgeTextClass;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-foreground text-[13px] truncate">
            {label}
          </span>
          <span
            className={`text-[10px] font-mono font-medium tabular-nums px-1.5 py-0.5 rounded bg-surface-sub border border-border ${pillClass}`}
          >
            {metric.rawPercent}%
          </span>
        </div>

        <div className="font-mono tabular-nums text-xs shrink-0">
          <strong className="text-foreground">
            {metric.consumed.toLocaleString()}
            {unit}
          </strong>
          <span className="text-muted-foreground">
            {' / '}
            {metric.target.toLocaleString()}
            {unit}
          </span>
        </div>
      </div>

      <progress
        className="macro-progress w-full h-2 block"
        max={100}
        value={Math.min(100, Math.max(0, metric.percent))}
        aria-label={`${label} progress`}
        style={
          {
            '--progress-bar-fill': metric.overTarget ? 'var(--neutral-over)' : fillCssVar,
            '--progress-bar-track': 'var(--surface-sub)',
          } as React.CSSProperties
        }
      />

      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground tabular-nums">
        <span>{metric.rawPercent}% fulfilled</span>
        <span>
          {metric.overTarget
            ? `+${metric.delta.toLocaleString()}${unit} over target`
            : `${metric.remaining.toLocaleString()}${unit} left`}
        </span>
      </div>
    </div>
  );
}

/**
 * Macro Bars Summary Module (Daily Energy Target + Macronutrient Breakdown).
 * Displays MacroFactor-inspired horizontal progress telemetry with strict
 * adherence-neutrality and light/dark semantic token support.
 */
export function MacroBentoGrid({ summary, className = '' }: MacroBentoGridProps) {
  const { calories, protein, carbs, fat, fiber } = summary;

  return (
    <section
      aria-label="Daily energy and macronutrient bars"
      className={`space-y-4 ${className}`}
    >
      {/* Headline Daily Energy Target Banner */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Daily Energy Target
          </span>
          <span
            className={`text-xs font-mono font-medium tabular-nums ${
              calories.overTarget
                ? 'text-muted-foreground'
                : 'text-amber-500 dark:text-amber-400'
            }`}
          >
            {calories.overTarget
              ? `+${calories.delta.toLocaleString()} kcal surplus`
              : `${calories.remaining.toLocaleString()} kcal remaining`}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
            {calories.consumed.toLocaleString()}
          </span>
          <span className="text-xs font-mono text-muted-foreground tabular-nums">
            / {calories.target.toLocaleString()} kcal
          </span>
        </div>

        <progress
          className="macro-progress w-full h-2.5 block"
          max={100}
          value={Math.min(100, Math.max(0, calories.percent))}
          aria-label="Daily energy target progress"
          style={
            {
              '--progress-bar-fill': calories.overTarget
                ? 'var(--neutral-over)'
                : 'var(--macro-calories)',
              '--progress-bar-track': 'var(--surface-sub)',
            } as React.CSSProperties
          }
        />
      </div>

      {/* Stacked Macronutrient Breakdown Module */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Macronutrient Breakdown
          </h2>
          <SlidersHorizontal
            className="w-3.5 h-3.5 text-muted-foreground"
            aria-hidden="true"
          />
        </div>

        <MacroBarRow
          label="Calories"
          unit="kcal"
          metric={calories}
          badgeTextClass="text-amber-500 dark:text-amber-400"
          fillCssVar="var(--macro-calories)"
        />
        <MacroBarRow
          label="Protein"
          unit="g"
          metric={protein}
          badgeTextClass="text-sky-500 dark:text-sky-400"
          fillCssVar="var(--macro-protein)"
        />
        <MacroBarRow
          label="Carbohydrates"
          unit="g"
          metric={carbs}
          badgeTextClass="text-emerald-500 dark:text-emerald-400"
          fillCssVar="var(--macro-carbs)"
        />
        <MacroBarRow
          label="Fat"
          unit="g"
          metric={fat}
          badgeTextClass="text-rose-500 dark:text-rose-400"
          fillCssVar="var(--macro-fat)"
        />
        <MacroBarRow
          label="Fiber"
          unit="g"
          metric={fiber}
          badgeTextClass="text-purple-500 dark:text-purple-400"
          fillCssVar="var(--macro-fiber)"
        />
      </div>
    </section>
  );
}
