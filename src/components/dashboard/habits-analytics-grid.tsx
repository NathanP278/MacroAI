'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import type { DailySummary } from '@/lib/nutrition/daily-summary';
import { computeLoggingStreak } from '@/lib/nutrition/analytics';
import type { DayNutritionPoint } from './macro-bento-grid';
import { AnimatedNumber } from '@/components/motion/motion-primitives';
import { EASE_EXPRESSIVE, isTestEnvironment } from '@/lib/motion';
import { ChevronRight } from 'lucide-react';

export interface LoggedDayDot {
  date: string;
  hasLogs: boolean;
  intensity?: 'none' | 'partial' | 'logged';
  calories?: number;
  targetCalories?: number;
}

type DotIntensity = 'none' | 'partial' | 'logged';

function resolveDotIntensity(dot: LoggedDayDot, fallbackTargetCalories: number): DotIntensity {
  if (!dot.hasLogs || dot.intensity === 'none') return 'none';
  if (dot.intensity === 'partial') return 'partial';
  if (dot.intensity === 'logged') return 'logged';
  const target = dot.targetCalories ?? fallbackTargetCalories;
  if (target > 0 && dot.calories !== undefined && dot.calories < target * 0.5) {
    return 'partial';
  }
  return 'logged';
}

function dotStatusLabel(intensity: DotIntensity): string {
  if (intensity === 'logged') return 'logged';
  if (intensity === 'partial') return 'partially logged';
  return 'not logged';
}

function dotToneClass(intensity: DotIntensity): string {
  if (intensity === 'logged') return 'bg-[var(--macro-calories)]';
  if (intensity === 'partial') return 'bg-[var(--macro-calories)]/45';
  return 'bg-surface-sub border border-border/40';
}

export interface HabitsAnalyticsGridProps {
  summary: DailySummary;
  weeklyDays: DayNutritionPoint[];
  thirtyDayDots: LoggedDayDot[];
  onSelectDate?: (isoDate: string) => void;
  className?: string;
}

/**
 * MacroFactor-aligned Bento Analytics & Habits grid (Pics 1, 2, 3):
 * - Calories Today bar with target notch tick (Pic 2 & 3)
 * - Macros Last 7 Days stacked coral/gold/emerald columns with 7D kcal average (Pic 3)
 * - Food Logging Last 30 Days 3x10 dot matrix heatmap (Pic 1)
 * - 7-Day Pace tile (Weekly Calorie Bank delta + 7D P/F/C averages, zero duplication with Today)
 */
export function HabitsAnalyticsGrid({
  summary,
  weeklyDays,
  thirtyDayDots,
  onSelectDate,
  className = '',
}: HabitsAnalyticsGridProps) {
  const { currentStreak, loggedCount, consistencyPct } = computeLoggingStreak(thirtyDayDots);

  // Target tick position cleanly allows slight headroom up to 120% when surplus occurs
  const calTarget = Math.max(1, summary.calories.target);
  const calConsumed = summary.calories.consumed;
  const maxCalAxis = Math.max(calTarget * 1.15, calConsumed, 1);
  const fillWidthPct = Math.min(100, Math.round((calConsumed / maxCalAxis) * 100));
  const targetMarkerPct = Math.min(96, Math.round((calTarget / maxCalAxis) * 100));

  // Normalize 7-day stacked column chart height
  const maxStackKcal = Math.max(
    calTarget,
    ...weeklyDays.map((d) => Math.max(d.calories, d.protein * 4 + d.fat * 9 + d.carbs * 4)),
    1
  );

  // Compute distinct 7-day rolling averages (over logged days) so 7-day cards never echo today's 0 kcal
  const loggedWeeklyDays = weeklyDays.filter(
    (d) => d.calories > 0 || d.protein > 0 || d.fat > 0 || d.carbs > 0
  );
  const loggedWeeklyCount = loggedWeeklyDays.length;
  const avg7dCalories =
    loggedWeeklyCount > 0
      ? Math.round(
          loggedWeeklyDays.reduce((sum, d) => sum + d.calories, 0) / loggedWeeklyCount
        )
      : 0;
  const avg7dProtein =
    loggedWeeklyCount > 0
      ? Math.round(
          loggedWeeklyDays.reduce((sum, d) => sum + d.protein, 0) / loggedWeeklyCount
        )
      : 0;
  const avg7dFat =
    loggedWeeklyCount > 0
      ? Math.round(
          loggedWeeklyDays.reduce((sum, d) => sum + d.fat, 0) / loggedWeeklyCount
        )
      : 0;
  const avg7dCarbs =
    loggedWeeklyCount > 0
      ? Math.round(
          loggedWeeklyDays.reduce((sum, d) => sum + d.carbs, 0) / loggedWeeklyCount
        )
      : 0;
  const weeklyBankDelta =
    loggedWeeklyCount > 0
      ? Math.round(
          loggedWeeklyDays.reduce((sum, d) => sum + d.calories, 0) -
            calTarget * loggedWeeklyCount
        )
      : 0;

  return (
    <div className={`@container/habits h-full flex flex-col justify-between gap-4 sm:gap-5 ${className}`}>
      {/* Insights & Nutrition Bento Section (Pic 3) */}
      <section aria-label="Nutrition analytics" className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            Nutrition
          </h2>
          <Link
            href="/log"
            className="touch-target py-1 px-1.5 -mr-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            See All
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Calories Today Card with Target Notch (Pic 2 & 3) */}
          <Link
            href="/log"
            className="min-w-0 rounded-2xl bg-card border border-border/50 p-3.5 sm:p-4 flex flex-col justify-between gap-4 hover:bg-surface-sub/60 tactile-press macro-card-interactive group"
          >
            <div>
              <div className="text-sm font-semibold text-foreground">Calories</div>
              <div className="text-xs text-muted-foreground">Today</div>
            </div>

            <div className="relative w-full h-3.5 rounded-sm bg-surface-sub overflow-hidden">
              <motion.div
                initial={isTestEnvironment() ? false : { scaleX: 0 }}
                animate={{ scaleX: fillWidthPct / 100 }}
                transition={{ duration: 0.65, ease: EASE_EXPRESSIVE }}
                className="w-full h-full rounded-sm"
                style={{
                  transformOrigin: 'left center',
                  backgroundColor: 'var(--macro-calories)',
                }}
              />
              {/* Vertical Target Reference Marker */}
              <div
                aria-hidden="true"
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/75"
                style={{ left: `${targetMarkerPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-1">
              <span className="text-sm sm:text-base font-bold tabular-nums text-foreground whitespace-nowrap">
                <AnimatedNumber value={summary.calories.consumed} />{' '}
                <span className="text-xs font-normal text-muted-foreground">kcal</span>
              </span>
              <ChevronRight
                className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200 shrink-0"
                aria-hidden="true"
              />
            </div>
          </Link>

          {/* Macros Last 7 Days Stacked Bar Chart (Pic 3) */}
          <div className="min-w-0 rounded-2xl bg-card border border-border/50 p-3.5 sm:p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">Macros</div>
              <div className="text-xs text-muted-foreground">Last 7 Days</div>
            </div>

            <div className="h-11 grid grid-cols-7 items-end gap-1 sm:gap-1.5 pt-1">
              {weeklyDays.map((day, idx) => {
                const proCal = day.protein * 4;
                const fatCal = day.fat * 9;
                const carbCal = day.carbs * 4;
                const macroSum = proCal + fatCal + carbCal;
                const totalHeightPct =
                  macroSum > 0
                    ? Math.max(14, Math.min(100, Math.round((macroSum / maxStackKcal) * 100)))
                    : 16;
                const carbShare = macroSum > 0 ? (carbCal / macroSum) * 100 : 34;
                const fatShare = macroSum > 0 ? (fatCal / macroSum) * 100 : 33;
                const proShare = macroSum > 0 ? (proCal / macroSum) * 100 : 33;

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => onSelectDate?.(day.date)}
                    title={`${day.date}: ${Math.round(day.calories)} kcal`}
                    aria-label={`View ${day.date} (${Math.round(day.calories)} kcal)`}
                    className={`h-full flex items-end justify-center group rounded-md px-0.5 py-0.5 transition-colors ${
                      day.isSelected
                        ? 'bg-surface-sub/70 ring-1 ring-foreground/30'
                        : 'hover:bg-surface-sub/45'
                    }`}
                  >
                    <motion.div
                      initial={isTestEnvironment() ? false : { scaleY: 0 }}
                      animate={{ scaleY: totalHeightPct / 100 }}
                      transition={{
                        duration: 0.52,
                        delay: isTestEnvironment() ? 0 : idx * 0.045,
                        ease: EASE_EXPRESSIVE,
                      }}
                      className={`w-full h-full rounded-[3px] overflow-hidden flex flex-col-reverse ${
                        macroSum === 0 ? 'bg-surface-sub opacity-65' : 'group-hover:opacity-90'
                      }`}
                      style={{ transformOrigin: 'bottom center' }}
                    >
                      {macroSum > 0 && (
                        <>
                          <div
                            style={{
                              height: `${carbShare}%`,
                              backgroundColor: 'var(--macro-carbs)',
                            }}
                          />
                          <div
                            style={{
                              height: `${fatShare}%`,
                              backgroundColor: 'var(--macro-fat)',
                            }}
                          />
                          <div
                            style={{
                              height: `${proShare}%`,
                              backgroundColor: 'var(--macro-protein)',
                            }}
                          />
                        </>
                      )}
                    </motion.div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-1">
              <span className="text-sm sm:text-base font-bold tabular-nums text-foreground whitespace-nowrap">
                {avg7dCalories.toLocaleString()}{' '}
                <span className="text-xs font-normal text-muted-foreground">kcal avg</span>
              </span>
              <Link
                href="/trends"
                aria-label="Open 7-day macro history"
                className="touch-target p-1 -mr-1 rounded-full text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Habits & Daily Balance Row (Pic 1 exact 2-col card anatomy) */}
      <section aria-label="Habits and daily balance" className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            Habits
          </h2>
          <span className="text-xs font-medium text-muted-foreground">
            Adherence Neutral
          </span>
        </div>

        <div className="grid grid-cols-1 @[420px]/habits:grid-cols-2 gap-3 sm:gap-4">
          {/* Food Logging 30-Day Interactive Heatmap Grid */}
          <div className="min-w-0 rounded-2xl bg-card border border-border/50 p-3.5 sm:p-4 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  Food Logging
                </div>
                <div className="text-xs text-muted-foreground">Last 30 Days</div>
              </div>
              <Link
                href="/trends"
                aria-label="Open logging trends"
                className="touch-target p-1 -mr-1 -mt-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>

            <div
              role="group"
              className="grid grid-cols-10 gap-1.5 sm:gap-1"
              aria-label={`Food logging 30-day heatmap: ${loggedCount} of ${thirtyDayDots.length} days logged`}
            >
              {thirtyDayDots.map((dot, idx) => {
                const intensity = resolveDotIntensity(dot, calTarget);
                const status = dotStatusLabel(intensity);
                const kcalText =
                  dot.calories !== undefined ? `, ${Math.round(dot.calories)} kcal` : '';
                return (
                  <button
                    key={dot.date}
                    type="button"
                    onClick={() => onSelectDate?.(dot.date)}
                    data-intensity={intensity}
                    title={`${dot.date}: ${status}${kcalText}`}
                    aria-label={`${dot.date}: ${status}${kcalText}`}
                    className={`aspect-square w-full rounded-[3px] transition-all duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground ${dotToneClass(
                      intensity
                    )} ${
                      idx === thirtyDayDots.length - 1
                        ? 'ring-1 ring-foreground/45 ring-offset-1 ring-offset-card'
                        : ''
                    }`}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-1.5 text-xs tabular-nums">
              <span className="font-semibold text-foreground truncate">
                {currentStreak} day streak
              </span>
              <span className="font-medium text-muted-foreground shrink-0">
                {consistencyPct}%
              </span>
            </div>
          </div>

          {/* 7-Day Pace Tile (high-density multi-day horizon — zero dead space) */}
          <Link
            href="/trends"
            className="min-w-0 rounded-2xl bg-card border border-border/50 p-3.5 sm:p-4 flex flex-col justify-between gap-3.5 hover:bg-surface-sub/60 tactile-press macro-card-interactive group"
          >
            {/* Header + 7D Bank readout */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  7-Day Pace
                </div>
                <div className="text-xs text-muted-foreground truncate tabular-nums">
                  {loggedWeeklyCount > 0
                    ? `${loggedWeeklyCount}/7 days logged`
                    : 'No days logged yet'}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="text-right tabular-nums">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-none">
                    7D Bank
                  </div>
                  <div
                    className="text-sm font-bold whitespace-nowrap mt-0.5 leading-tight"
                    style={{
                      color:
                        weeklyBankDelta > 0
                          ? 'var(--neutral-over)'
                          : 'var(--macro-calories)',
                    }}
                  >
                    {weeklyBankDelta > 0
                      ? `+${weeklyBankDelta.toLocaleString()}`
                      : weeklyBankDelta < 0
                        ? `-${Math.abs(weeklyBankDelta).toLocaleString()}`
                        : '0'}
                    <span className="text-[10px] font-medium text-muted-foreground ml-0.5">
                      kcal
                    </span>
                  </div>
                </div>
                <ChevronRight
                  className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* 7-Day Daily Calorie Cadence Strip */}
            <div className="grid grid-cols-7 gap-1.5 items-end pt-0.5">
              {weeklyDays.map((day) => {
                const target = Math.max(1, day.caloriesTarget || calTarget);
                const pct = day.calories > 0 ? Math.min(100, Math.round((day.calories / target) * 100)) : 0;
                const isOver = day.calories > target;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1 min-w-0">
                    <div className="w-full h-8 rounded-[4px] bg-surface-sub/80 overflow-hidden flex items-end p-[1px]">
                      {pct > 0 && (
                        <div
                          className="w-full rounded-[3px] transition-all duration-300"
                          style={{
                            height: `${Math.max(16, pct)}%`,
                            backgroundColor: isOver
                              ? 'var(--neutral-over)'
                              : 'var(--macro-calories)',
                          }}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-medium leading-none ${
                        day.isSelected ? 'text-foreground font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      {day.dayLetter}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 3-Column Macro Averages with Target Bars */}
            <div className="grid grid-cols-3 gap-2.5 tabular-nums pt-0.5">
              {[
                {
                  label: 'Protein',
                  avg: avg7dProtein,
                  target: Math.max(1, summary.protein.target),
                  color: 'var(--macro-protein)',
                },
                {
                  label: 'Fat',
                  avg: avg7dFat,
                  target: Math.max(1, summary.fat.target),
                  color: 'var(--macro-fat)',
                },
                {
                  label: 'Carbs',
                  avg: avg7dCarbs,
                  target: Math.max(1, summary.carbs.target),
                  color: 'var(--macro-carbs)',
                },
              ].map((m) => {
                const pct = Math.min(100, Math.round((m.avg / m.target) * 100));
                return (
                  <div key={m.label} className="min-w-0 space-y-1">
                    <div className="flex items-baseline justify-between gap-1 text-[11px]">
                      <span className="font-medium text-muted-foreground truncate">
                        {m.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground/80 shrink-0">
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-sub overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: m.color,
                        }}
                      />
                    </div>
                    <div
                      className="text-xs font-bold whitespace-nowrap truncate"
                      style={{ color: m.color }}
                    >
                      {m.avg.toLocaleString()}
                      <span className="text-[10px] font-medium text-muted-foreground ml-0.5">
                        g avg
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Pace Summary */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs tabular-nums">
              <span className="font-semibold text-foreground truncate">
                {loggedWeeklyCount > 0
                  ? `${avg7dCalories.toLocaleString()} kcal/day avg`
                  : 'Log meals to track pace'}
              </span>
              <span className="text-[11px] text-muted-foreground shrink-0">
                Target {calTarget.toLocaleString()}
              </span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
