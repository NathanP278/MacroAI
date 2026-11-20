'use client';

import React, { useState, useRef } from 'react';
import type { DailySummary, MacroMetric } from '@/lib/nutrition/daily-summary';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { triggerHaptic } from '@/lib/motion';

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
    return `${metric.consumed.toLocaleString()} / ${metric.target.toLocaleString()}g`;
  }
  if (metric.overTarget) {
    return `+${metric.delta.toLocaleString()} / ${metric.target.toLocaleString()}g`;
  }
  return `${metric.remaining.toLocaleString()} / ${metric.target.toLocaleString()}g`;
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
      <span className="text-xs font-medium text-muted-foreground truncate">
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
      <span className="hero-macro-readout font-semibold tabular-nums text-foreground whitespace-nowrap">
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
  const swipeStartX = useRef<number | null>(null);

  const switchHeroView = (nextView: HeroView) => {
    if (nextView === heroView) return;
    triggerHaptic(8);
    setHeroView(nextView);
  };

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

  const centerPrimaryText =
    mode === 'consumed'
      ? calories.consumed.toLocaleString()
      : calories.overTarget
      ? `+${calories.delta.toLocaleString()}`
      : calories.remaining.toLocaleString();

  const centerSubLabel =
    mode === 'consumed'
      ? 'Consumed'
      : calories.overTarget
      ? 'Surplus'
      : 'Remaining';

  const leftFlankText = calories.overTarget
    ? `+${calories.delta.toLocaleString()}`
    : calories.remaining.toLocaleString();
  const leftFlankLabel = calories.overTarget ? 'Surplus' : 'Remaining';

  return (
    <section
      aria-label="Daily Nutrition Summary"
      onTouchStart={(e) => {
        swipeStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (swipeStartX.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? swipeStartX.current) - swipeStartX.current;
        swipeStartX.current = null;
        if (Math.abs(dx) < 52) return;
        if (dx < 0 && heroView === 'daily') switchHeroView('weekly');
        if (dx > 0 && heroView === 'weekly') switchHeroView('daily');
      }}
      className={`hero-container rounded-2xl bg-card border border-border/50 p-4 sm:p-5 lg:p-6 flex flex-col justify-between gap-4 min-w-0 ${className}`}
    >
      {/* Top Card Header + Slide Switcher Dots (Pics 1 & 4) */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h2 className="flex-1 text-base font-bold tracking-tight text-foreground truncate min-w-0">
          {heroView === 'daily' ? 'Daily Nutrition' : 'Nutrition & Targets'}
        </h2>

        <SegmentedControl
          role="tablist"
          ariaLabel="Nutrition hero view"
          value={heroView}
          onChange={switchHeroView}
          className="bg-surface-sub/90 p-1 shrink-0"
          buttonClassName="px-3 py-1.5 sm:py-1 text-xs sm:text-[11px]"
          options={[
            { value: 'daily', id: 'hero-daily-tab', label: 'Today' },
            { value: 'weekly', id: 'hero-weekly-tab', label: '7-Day' },
          ]}
        />
      </div>

      {/* Stacked CSS Grid Stage keeps both tabpanels mounted for seamless cross-slides */}
      <div className="grid overflow-hidden">
        {/* View 0: Daily Nutrition Arc & 3 Macro Bars (Pic 1) */}
        <div
          role="tabpanel"
          aria-labelledby="hero-daily-tab"
          aria-hidden={heroView !== 'daily'}
          inert={heroView !== 'daily' ? true : undefined}
          className={`[grid-area:1/1] space-y-5 hero-panel-slide ${
            heroView === 'daily'
              ? 'hero-panel-active'
              : 'hero-panel-off-left pointer-events-none select-none'
          }`}
        >
          {/* Horseshoe Arc + Flanking Numbers */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 sm:gap-3 pt-1">
            {/* Left Flanking Metric */}
            <div className="text-center min-w-0">
              <div className="hero-flank-value font-bold tabular-nums text-foreground truncate">
                {leftFlankText}
              </div>
              <div className="text-xs font-medium text-muted-foreground mt-0.5">
                {leftFlankLabel}
              </div>
            </div>

            {/* Center Horseshoe Arc */}
            <div className="relative flex items-center justify-center hero-arc-box shrink-0">
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

              <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 px-4 text-center pointer-events-none">
                <span
                  data-digits={centerPrimaryText.length >= 6 ? 'long' : undefined}
                  className="hero-center-value font-bold tracking-tight tabular-nums text-foreground"
                >
                  {centerPrimaryText}
                </span>
                <span className="text-xs font-medium text-muted-foreground mt-0.5">
                  {centerSubLabel}
                </span>
              </div>
            </div>

            {/* Right Flanking Metric */}
            <div className="text-center min-w-0">
              <div className="hero-flank-value font-bold tabular-nums text-foreground truncate">
                {calories.target.toLocaleString()}
              </div>
              <div className="text-xs font-medium text-muted-foreground mt-0.5">
                Target
              </div>
            </div>
          </div>

          {/* 3-Column Macro Slim Progress Row (Protein, Fat, Carbs) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3.5 min-w-0">
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
          <div className="flex items-center justify-center text-xs text-muted-foreground tabular-nums">
            <span>
              Fiber:{' '}
              <strong className="text-foreground font-semibold">
                {mode === 'consumed'
                  ? fiber.consumed.toLocaleString()
                  : fiber.overTarget
                  ? `+${fiber.delta.toLocaleString()}`
                  : fiber.remaining.toLocaleString()}
              </strong>{' '}
              / {fiber.target.toLocaleString()}g
            </span>
          </div>
        </div>

        {/* View 1: 7-Day Nutrition & Targets Columns (Pic 4 left phone) */}
        <div
          role="tabpanel"
          aria-labelledby="hero-weekly-tab"
          aria-hidden={heroView !== 'weekly'}
          inert={heroView !== 'weekly' ? true : undefined}
          className={`[grid-area:1/1] space-y-4 pt-1 hero-panel-slide ${
            heroView === 'weekly'
              ? 'hero-panel-active'
              : 'hero-panel-off-right pointer-events-none select-none'
          }`}
        >
          <div className="hero-weekly-grid">
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 min-w-0">
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
                    tabIndex={heroView === 'weekly' ? 0 : -1}
                    onClick={() => onSelectDate?.(day.date)}
                    disabled={!onSelectDate}
                    className={`tactile-press min-h-[44px] flex flex-col items-center gap-1.5 py-1.5 px-1 rounded-xl transition-colors ${
                      day.isSelected
                        ? 'border border-foreground/45 bg-surface-sub/45'
                        : 'border border-transparent hover:bg-surface-sub/35'
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
                        className="w-2 h-6 rounded-sm bg-surface-sub overflow-hidden"
                      >
                        <div
                          className="w-full h-full rounded-sm macro-bar-fill-y"
                          style={{
                            transform: `scaleY(${bar.pct / 100})`,
                            backgroundColor: bar.color,
                          }}
                        />
                      </div>
                    ))}
                    <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                      {day.dayLetter}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right / Stacked Target Numeric Summary */}
            <div className="hero-weekly-summary tabular-nums">
              <div>
                <div className="text-xs font-bold text-foreground">
                  {mode === 'consumed'
                    ? calories.consumed.toLocaleString()
                    : calories.overTarget
                    ? `+${calories.delta.toLocaleString()}`
                    : calories.remaining.toLocaleString()}{' '}
                  <span className="text-[11px] font-normal text-muted-foreground">kcal</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  of {calories.target.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">
                  {mode === 'consumed'
                    ? protein.consumed.toLocaleString()
                    : protein.overTarget
                    ? `+${protein.delta.toLocaleString()}`
                    : protein.remaining.toLocaleString()}{' '}
                  <span className="text-[11px] font-semibold text-[var(--macro-protein)]">P</span>
                </div>
                <div className="text-[11px] text-muted-foreground">of {protein.target.toLocaleString()}g</div>
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">
                  {mode === 'consumed'
                    ? fat.consumed.toLocaleString()
                    : fat.overTarget
                    ? `+${fat.delta.toLocaleString()}`
                    : fat.remaining.toLocaleString()}{' '}
                  <span className="text-[11px] font-semibold text-[var(--macro-fat)]">F</span>
                </div>
                <div className="text-[11px] text-muted-foreground">of {fat.target.toLocaleString()}g</div>
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">
                  {mode === 'consumed'
                    ? carbs.consumed.toLocaleString()
                    : carbs.overTarget
                    ? `+${carbs.delta.toLocaleString()}`
                    : carbs.remaining.toLocaleString()}{' '}
                  <span className="text-[11px] font-semibold text-[var(--macro-carbs)]">C</span>
                </div>
                <div className="text-[11px] text-muted-foreground">of {carbs.target.toLocaleString()}g</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Centered Segmented White Pill Toggle: Consumed | Remaining (Pics 1 & 4) */}
      <div className="flex justify-center pt-1">
        <SegmentedControl
          role="group"
          ariaLabel="Nutrition metric display mode"
          value={mode}
          onChange={(next) => {
            triggerHaptic(6);
            setMode(next);
          }}
          className="bg-surface-sub p-1"
          buttonClassName="px-4 py-2 sm:py-1.5 text-xs"
          options={[
            { value: 'consumed', label: 'Consumed' },
            { value: 'remaining', label: 'Remaining' },
          ]}
        />
      </div>
    </section>
  );
}
