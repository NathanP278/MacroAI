'use client';

import React from 'react';
import Link from 'next/link';
import type { DailySummary, MacroMetric } from '@/lib/nutrition/daily-summary';
import type { DayNutritionPoint } from './macro-bento-grid';
import { ChevronRight } from 'lucide-react';

export interface LoggedDayDot {
  date: string;
  hasLogs: boolean;
  calories: number;
}

export interface HabitsAnalyticsGridProps {
  summary: DailySummary;
  weeklyDays: DayNutritionPoint[];
  thirtyDayDots: LoggedDayDot[];
  onSelectDate?: (isoDate: string) => void;
  className?: string;
}

function formatRemainingParts(
  metric: MacroMetric,
  unit: string
): { numText: string; unitText: string } {
  if (metric.overTarget) {
    return { numText: `+${metric.delta.toLocaleString()}`, unitText: unit };
  }
  return { numText: metric.remaining.toLocaleString(), unitText: unit };
}

/**
 * MacroFactor-aligned Bento Analytics & Habits grid (Pics 1, 2, 3):
 * - Calories Today bar with target notch tick (Pic 2 & 3)
 * - Macros Last 7 Days stacked coral/gold/emerald columns (Pic 3)
 * - Food Logging Last 30 Days 3x10 dot matrix heatmap (Pic 1)
 * - Daily Balance remaining/surplus telemetry tile
 */
export function HabitsAnalyticsGrid({
  summary,
  weeklyDays,
  thirtyDayDots,
  onSelectDate,
  className = '',
}: HabitsAnalyticsGridProps) {
  const weekLoggedCount = thirtyDayDots.slice(-7).filter((d) => d.hasLogs).length;

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

  const calParts = formatRemainingParts(summary.calories, 'kcal');
  const proParts = formatRemainingParts(summary.protein, 'g');
  const fatParts = formatRemainingParts(summary.fat, 'g');
  const carbParts = formatRemainingParts(summary.carbs, 'g');

  return (
    <div className={`h-full flex flex-col justify-between gap-4 sm:gap-5 ${className}`}>
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
              <div
                className="w-full h-full rounded-sm macro-bar-fill"
                style={{
                  transform: `scaleX(${fillWidthPct / 100})`,
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
                {summary.calories.consumed.toLocaleString()}{' '}
                <span className="text-xs font-normal text-muted-foreground">kcal</span>
              </span>
              <ChevronRight
                className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0"
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
              {weeklyDays.map((day) => {
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
                    <div
                      className={`w-full h-full rounded-[3px] overflow-hidden flex flex-col-reverse macro-bar-fill-y ${
                        macroSum === 0 ? 'bg-surface-sub opacity-65' : 'group-hover:opacity-90'
                      }`}
                      style={{ transform: `scaleY(${totalHeightPct / 100})` }}
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
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-1">
              <span className="text-sm sm:text-base font-bold tabular-nums text-foreground whitespace-nowrap">
                {summary.calories.consumed.toLocaleString()}{' '}
                <span className="text-xs font-normal text-muted-foreground">kcal</span>
              </span>
              <Link
                href="/log"
                aria-label="Open macro history"
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

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Food Logging 30-Day Heatmap Grid (Pic 1 right card) */}
          <Link
            href="/log"
            className="min-w-0 rounded-2xl bg-card border border-border/50 p-3.5 sm:p-4 flex flex-col justify-between gap-3 hover:bg-surface-sub/60 tactile-press macro-card-interactive group"
          >
            <div>
              <div className="text-sm font-semibold text-foreground">Food Logging</div>
              <div className="text-xs text-muted-foreground">Last 30 Days</div>
            </div>

            <div
              className="grid grid-cols-10 gap-1"
              aria-label={`Food logged on ${thirtyDayDots.filter((d) => d.hasLogs).length} of last 30 days`}
            >
              {thirtyDayDots.map((dot, idx) => (
                <span
                  key={dot.date}
                  title={`${dot.date}: ${Math.round(dot.calories)} kcal`}
                  className={`aspect-square rounded-[3px] transition-colors duration-150 ${
                    idx === thirtyDayDots.length - 1
                      ? 'ring-1 ring-foreground/45 ring-offset-1 ring-offset-card'
                      : ''
                  }`}
                  style={{
                    backgroundColor: dot.hasLogs
                      ? 'var(--macro-calories)'
                      : 'var(--surface-sub)',
                  }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-muted-foreground tabular-nums truncate">
                <strong className="text-sm sm:text-base font-bold text-foreground">
                  {weekLoggedCount}/7
                </strong>{' '}
                this week
              </span>
              <ChevronRight
                className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0"
                aria-hidden="true"
              />
            </div>
          </Link>

          {/* Daily Balance Tile */}
          <Link
            href="/log"
            className="min-w-0 rounded-2xl bg-card border border-border/50 p-3.5 sm:p-4 flex flex-col justify-between gap-3 hover:bg-surface-sub/60 tactile-press macro-card-interactive group"
          >
            <div>
              <div className="text-sm font-semibold text-foreground truncate">
                Daily Balance
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {summary.calories.overTarget ? 'Surplus Today' : 'Remaining Today'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-2 sm:gap-x-3 gap-y-2 tabular-nums">
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-muted-foreground">Calories</div>
                <div
                  className="text-[13px] sm:text-sm font-bold whitespace-nowrap truncate"
                  style={{ color: 'var(--macro-calories)' }}
                >
                  {calParts.numText}
                  <span className="text-[10px] font-medium text-muted-foreground ml-0.5">
                    {calParts.unitText}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-muted-foreground">Protein</div>
                <div
                  className="text-[13px] sm:text-sm font-bold whitespace-nowrap truncate"
                  style={{ color: 'var(--macro-protein)' }}
                >
                  {proParts.numText}
                  <span className="text-[10px] font-medium text-muted-foreground ml-0.5">
                    {proParts.unitText}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-muted-foreground">Fat</div>
                <div
                  className="text-[13px] sm:text-sm font-bold whitespace-nowrap truncate"
                  style={{ color: 'var(--macro-fat)' }}
                >
                  {fatParts.numText}
                  <span className="text-[10px] font-medium text-muted-foreground ml-0.5">
                    {fatParts.unitText}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-muted-foreground">Carbs</div>
                <div
                  className="text-[13px] sm:text-sm font-bold whitespace-nowrap truncate"
                  style={{ color: 'var(--macro-carbs)' }}
                >
                  {carbParts.numText}
                  <span className="text-[10px] font-medium text-muted-foreground ml-0.5">
                    {carbParts.unitText}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-muted-foreground tabular-nums truncate">
                {summary.logsCount > 0
                  ? `${summary.logsCount} ${summary.logsCount === 1 ? 'entry' : 'entries'} logged`
                  : 'Ready to log'}
              </span>
              <ChevronRight
                className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0"
                aria-hidden="true"
              />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
