'use client';

import React, { useState } from 'react';
import type { DailySummary, MacroMetric } from '@/lib/nutrition/daily-summary';

export interface DayNutritionPoint {
  date: string;
  dayLetter: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  caloriesTarget: number;
  proteinTarget: number;
  fatTarget: number;
  carbsTarget: number;
  isSelected?: boolean;
}

export interface MacroBentoGridProps {
  summary: DailySummary;
  weeklyDays?: DayNutritionPoint[];
  onSelectDate?: (isoDate: string) => void;
  className?: string;
}

type DisplayMode = 'consumed' | 'remaining';
type HeroView = 'daily' | 'weekly';

function formatMacroReadout(metric: MacroMetric, mode: DisplayMode): string {
  if (mode === 'consumed') {
    return `${metric.consumed} / ${metric.target}g`;
  }
  if (metric.overTarget) {
    return `+${metric.delta} / ${metric.target}g`;
  }
  return `${metric.remaining} / ${metric.target}g`;
}

function MacroColumnBar({
  label,
  metric,
  fillVar,
  mode,
}: {
  label: string;
  metric: MacroMetric;
  fillVar: string;
  mode: DisplayMode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0">
      <span className="text-[11px] font-medium text-muted-foreground truncate">
        {label}
      </span>
      <progress
        className="macro-progress w-full h-1.5 block"
        max={100}
        value={Math.min(100, Math.max(0, metric.percent))}
        aria-label={`${label} progress`}
        style={
          {
            '--progress-bar-fill': fillVar,
            '--progress-bar-track': 'var(--surface-sub)',
          } as React.CSSProperties
        }
      />
      <span className="text-[11px] font-semibold tabular-nums text-foreground whitespace-nowrap">
        {formatMacroReadout(metric, mode)}
      </span>
    </div>
  );
}

/**
 * MacroFactor-inspired Hero Card:
 * Slide 0: Daily Nutrition semicircular arc gauge + Protein/Fat/Carbs slim bars + Consumed/Remaining toggle (Pic 1).
 * Slide 1: 7-Day Nutrition & Targets multi-bar column matrix (Pic 4).
 */
export function MacroBentoGrid({
  summary,
  weeklyDays = [],
  onSelectDate,
  className = '',
}: MacroBentoGridProps) {
  const [mode, setMode] = useState<DisplayMode>('consumed');
  const [heroView, setHeroView] = useState<HeroView>('daily');

  const { calories, protein, carbs, fat, fiber } = summary;

  // Semicircular 240-deg open horseshoe arc (bottom gap from 30deg to 150deg)
  const size = 168;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const radius = 66;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius;
  const arcSpan = circumference * (240 / 360);
  const clampedPercent = Math.min(100, Math.max(0, calories.percent));
  const activeSpan = arcSpan * (clampedPercent / 100);

  const centerPrimaryValue =
    mode === 'consumed'
      ? calories.consumed
      : calories.overTarget
      ? `+${calories.delta}`
      : calories.remaining;

  const centerSubLabel =
    mode === 'consumed'
      ? 'Consumed'
      : calories.overTarget
      ? 'Surplus'
      : 'Remaining';

  const leftFlankValue = calories.overTarget ? `+${calories.delta}` : calories.remaining;
  const leftFlankLabel = calories.overTarget ? 'Surplus' : 'Remaining';

  return (
    <section
      aria-label="Daily Nutrition Summary"
      className={`rounded-2xl bg-card p-4 sm:p-5 space-y-4 min-w-0 ${className}`}
    >
      {/* Top Card Header + Slide Switcher Dots (Pics 1 & 4) */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h2 className="text-base font-bold tracking-tight text-foreground truncate">
          {heroView === 'daily' ? 'Daily Nutrition' : 'Nutrition & Targets'}
        </h2>

        <div
          role="tablist"
          aria-label="Nutrition hero view"
          className="flex items-center gap-1 bg-surface-sub/90 px-1.5 py-1 rounded-full shrink-0"
        >
          <button
            type="button"
            role="tab"
            id="hero-daily-tab"
            aria-selected={heroView === 'daily'}
            onClick={() => setHeroView('daily')}
            className={`macro-spring active:scale-95 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
              heroView === 'daily'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            role="tab"
            id="hero-weekly-tab"
            aria-selected={heroView === 'weekly'}
            onClick={() => setHeroView('weekly')}
            className={`macro-spring active:scale-95 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
              heroView === 'weekly'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            7-Day
          </button>
        </div>
      </div>

      {/* View 0: Daily Nutrition Arc & 3 Macro Bars (Pic 1) */}
      {heroView === 'daily' ? (
        <div role="tabpanel" aria-labelledby="hero-daily-tab" className="space-y-5">
          {/* Horseshoe Arc + Flanking Numbers */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 sm:gap-3 pt-1">
            {/* Left Flanking Metric */}
            <div className="text-center min-w-0">
              <div className="text-base sm:text-xl font-bold tabular-nums text-foreground truncate">
                {leftFlankValue.toLocaleString()}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground">
                {leftFlankLabel}
              </div>
            </div>

            {/* Center Horseshoe Arc */}
            <div className="relative flex items-center justify-center w-[136px] h-[124px] sm:w-[164px] sm:h-[148px] shrink-0">
              <svg
                viewBox={`0 0 ${size} ${size}`}
                className="w-full h-full overflow-visible"
                aria-label={`Calorie intake ${calories.consumed} of ${calories.target} kcal`}
              >
                {/* Matte Track */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke="var(--surface-sub)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${arcSpan} ${circumference}`}
                  strokeLinecap="round"
                  transform={`rotate(150 ${cx} ${cy})`}
                />
                {/* Cornflower Blue Progress Stroke */}
                {activeSpan > 0 && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke="var(--macro-calories)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${arcSpan} ${circumference}`}
                    strokeDashoffset={arcSpan - activeSpan}
                    strokeLinecap="round"
                    transform={`rotate(150 ${cx} ${cy})`}
                    className="macro-arc-transition"
                  />
                )}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 text-center pointer-events-none">
                <span className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
                  {typeof centerPrimaryValue === 'number'
                    ? centerPrimaryValue.toLocaleString()
                    : centerPrimaryValue}
                </span>
                <span className="text-xs font-medium text-muted-foreground mt-0.5">
                  {centerSubLabel}
                </span>
              </div>
            </div>

            {/* Right Flanking Metric */}
            <div className="text-center min-w-0">
              <div className="text-base sm:text-xl font-bold tabular-nums text-foreground truncate">
                {calories.target.toLocaleString()}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground">
                Target
              </div>
            </div>
          </div>

          {/* 3-Column Macro Slim Progress Row (Protein, Fat, Carbs) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 min-w-0">
            <MacroColumnBar
              label="Protein"
              metric={protein}
              fillVar="var(--macro-protein)"
              mode={mode}
            />
            <MacroColumnBar
              label="Fat"
              metric={fat}
              fillVar="var(--macro-fat)"
              mode={mode}
            />
            <MacroColumnBar
              label="Carbs"
              metric={carbs}
              fillVar="var(--macro-carbs)"
              mode={mode}
            />
          </div>

          {/* Fiber subtle secondary line */}
          <div className="flex items-center justify-center text-[11px] text-muted-foreground tabular-nums">
            <span>
              Fiber:{' '}
              <strong className="text-foreground font-semibold">
                {mode === 'consumed'
                  ? fiber.consumed
                  : fiber.overTarget
                  ? `+${fiber.delta}`
                  : fiber.remaining}
              </strong>{' '}
              / {fiber.target}g
            </span>
          </div>
        </div>
      ) : (
        /* View 1: 7-Day Nutrition & Targets Columns (Pic 4 left phone) */
        <div role="tabpanel" aria-labelledby="hero-weekly-tab" className="space-y-4 pt-1">
          <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
            <div className="grid grid-cols-7 gap-1.5">
              {(weeklyDays.length > 0
                ? weeklyDays
                : [
                    {
                      date: 'today',
                      dayLetter: 'T',
                      calories: calories.consumed,
                      protein: protein.consumed,
                      fat: fat.consumed,
                      carbs: carbs.consumed,
                      caloriesTarget: calories.target,
                      proteinTarget: protein.target,
                      fatTarget: fat.target,
                      carbsTarget: carbs.target,
                      isSelected: true,
                    },
                  ]
              ).map((day) => {
                const calPct = Math.min(
                  100,
                  day.caloriesTarget > 0 ? Math.round((day.calories / day.caloriesTarget) * 100) : 0
                );
                const proPct = Math.min(
                  100,
                  day.proteinTarget > 0 ? Math.round((day.protein / day.proteinTarget) * 100) : 0
                );
                const fatPct = Math.min(
                  100,
                  day.fatTarget > 0 ? Math.round((day.fat / day.fatTarget) * 100) : 0
                );
                const carbPct = Math.min(
                  100,
                  day.carbsTarget > 0 ? Math.round((day.carbs / day.carbsTarget) * 100) : 0
                );

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => onSelectDate?.(day.date)}
                    disabled={!onSelectDate}
                    className={`flex flex-col items-center gap-1.5 py-1.5 px-1 rounded-xl transition-colors ${
                      day.isSelected
                        ? 'border border-foreground/45 bg-surface-sub/40'
                        : 'border border-transparent hover:bg-surface-sub/30'
                    }`}
                    aria-label={`Select ${day.date}`}
                  >
                    {[
                      { pct: calPct, color: 'var(--macro-calories)' },
                      { pct: proPct, color: 'var(--macro-protein)' },
                      { pct: fatPct, color: 'var(--macro-fat)' },
                      { pct: carbPct, color: 'var(--macro-carbs)' },
                    ].map((bar, idx) => (
                      <div
                        key={idx}
                        className="w-2 h-6 rounded-sm bg-surface-sub overflow-hidden flex items-end"
                      >
                        <div
                          className="w-full rounded-sm transition-all duration-300"
                          style={{ height: `${bar.pct}%`, backgroundColor: bar.color }}
                        />
                      </div>
                    ))}
                    <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                      {day.dayLetter}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Target Numeric Summary */}
            <div className="space-y-2.5 pl-1 border-l border-border/60 tabular-nums text-left">
              <div>
                <div className="text-xs font-bold text-foreground">
                  {mode === 'consumed'
                    ? calories.consumed
                    : calories.overTarget
                    ? `+${calories.delta}`
                    : calories.remaining}{' '}
                  <span className="text-[10px] font-normal text-muted-foreground">kcal</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  of {calories.target}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">
                  {mode === 'consumed'
                    ? protein.consumed
                    : protein.overTarget
                    ? `+${protein.delta}`
                    : protein.remaining}{' '}
                  <span className="text-[10px] font-semibold text-[var(--macro-protein)]">P</span>
                </div>
                <div className="text-[10px] text-muted-foreground">of {protein.target}g</div>
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">
                  {mode === 'consumed'
                    ? fat.consumed
                    : fat.overTarget
                    ? `+${fat.delta}`
                    : fat.remaining}{' '}
                  <span className="text-[10px] font-semibold text-[var(--macro-fat)]">F</span>
                </div>
                <div className="text-[10px] text-muted-foreground">of {fat.target}g</div>
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">
                  {mode === 'consumed'
                    ? carbs.consumed
                    : carbs.overTarget
                    ? `+${carbs.delta}`
                    : carbs.remaining}{' '}
                  <span className="text-[10px] font-semibold text-[var(--macro-carbs)]">C</span>
                </div>
                <div className="text-[10px] text-muted-foreground">of {carbs.target}g</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Centered Segmented White Pill Toggle: Consumed | Remaining (Pics 1 & 4) */}
      <div className="flex justify-center pt-1">
        <div
          role="group"
          aria-label="Nutrition metric display mode"
          className="inline-flex items-center p-1 rounded-full bg-surface-sub"
        >
          <button
            type="button"
            onClick={() => setMode('consumed')}
            aria-pressed={mode === 'consumed'}
            className={`macro-spring active:scale-95 px-4 py-1.5 rounded-full text-xs font-semibold ${
              mode === 'consumed'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Consumed
          </button>
          <button
            type="button"
            onClick={() => setMode('remaining')}
            aria-pressed={mode === 'remaining'}
            className={`macro-spring active:scale-95 px-4 py-1.5 rounded-full text-xs font-semibold ${
              mode === 'remaining'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Remaining
          </button>
        </div>
      </div>
    </section>
  );
}
