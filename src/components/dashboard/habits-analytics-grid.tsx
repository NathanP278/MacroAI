'use client';

import React from 'react';
import Link from 'next/link';
import type { DailySummary } from '@/lib/nutrition/daily-summary';
import type { DayNutritionPoint } from './macro-bento-grid';
import type { SlotMacroBudget } from '@/lib/nutrition/meal-distribution';
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
  nextSlotName: string | null;
  nextSlotBudget: SlotMacroBudget;
  onSelectDate?: (isoDate: string) => void;
  className?: string;
}

/**
 * MacroFactor-aligned Bento Analytics & Habits grid (Pics 1, 2, 3):
 * - Calories Today bar with target notch tick (Pic 2 & 3)
 * - Macros Last 7 Days stacked coral/gold/emerald columns (Pic 3)
 * - Food Logging Last 30 Days 3x10 dot matrix heatmap (Pic 1)
 * - Remaining Meal Allocation budget tile (Fitia integration in MacroFactor card language)
 */
export function HabitsAnalyticsGrid({
  summary,
  weeklyDays,
  thirtyDayDots,
  nextSlotName,
  nextSlotBudget,
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
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            See All
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Calories Today Card with Target Notch (Pic 2 & 3) */}
          <Link
            href="/log"
            className="min-w-0 rounded-2xl bg-card border border-border/50 p-3.5 sm:p-4 flex flex-col justify-between gap-4 hover:bg-surface-sub/60 active:scale-[0.985] macro-spring macro-card-interactive group"
          >
            <div>
              <div className="text-sm font-semibold text-foreground">Calories</div>
              <div className="text-xs text-muted-foreground">Today</div>
            </div>

            <div className="relative w-full h-3.5 rounded-sm bg-surface-sub overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-300"
                style={{
                  width: `${fillWidthPct}%`,
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

            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-bold tabular-nums text-foreground">
                {summary.calories.consumed.toLocaleString()}{' '}
                <span className="text-xs font-normal text-muted-foreground">kcal</span>
              </span>
              <ChevronRight
                className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </div>
          </Link>

          {/* Macros Last 7 Days Stacked Bar Chart (Pic 3) */}
          <div className="min-w-0 rounded-2xl bg-card border border-border/50 p-3.5 sm:p-4 flex flex-col justify-between gap-3 macro-card-interactive">
            <div>
              <div className="text-sm font-semibold text-foreground">Macros</div>
              <div className="text-xs text-muted-foreground">Last 7 Days</div>
            </div>

            <div className="h-11 grid grid-cols-7 items-end gap-1.5 pt-1">
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
                    className="h-full flex items-end justify-center group"
                  >
                    <div
                      className={`w-full rounded-[3px] overflow-hidden flex flex-col-reverse transition-all duration-300 ease-out origin-bottom group-hover:scale-y-105 ${
                        macroSum === 0 ? 'bg-surface-sub opacity-60' : 'group-hover:opacity-90'
                      } ${day.isSelected ? 'ring-1 ring-foreground/50' : ''}`}
                      style={{ height: `${totalHeightPct}%` }}
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

            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-bold tabular-nums text-foreground">
                {summary.calories.consumed.toLocaleString()}{' '}
                <span className="text-xs font-normal text-muted-foreground">kcal</span>
              </span>
              <Link
                href="/log"
                aria-label="Open macro history"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Habits & Meal Budget Row (Pic 1 exact 2-col card anatomy) */}
      <section aria-label="Habits and remaining meal budget" className="space-y-2.5 sm:space-y-3">
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
            className="min-w-0 rounded-2xl bg-card border border-border/50 p-3.5 sm:p-4 flex flex-col justify-between gap-3 hover:bg-surface-sub/60 active:scale-[0.985] macro-spring macro-card-interactive group"
          >
            <div>
              <div className="text-sm font-semibold text-foreground">Food Logging</div>
              <div className="text-xs text-muted-foreground">Last 30 Days</div>
            </div>

            <div
              className="grid grid-cols-10 gap-1"
              aria-label={`Food logged on ${thirtyDayDots.filter((d) => d.hasLogs).length} of last 30 days`}
            >
              {thirtyDayDots.map((dot) => (
                <span
                  key={dot.date}
                  title={`${dot.date}: ${Math.round(dot.calories)} kcal`}
                  className="aspect-square rounded-[3px] transition-all duration-150 group-hover:scale-[1.04]"
                  style={{
                    backgroundColor: dot.hasLogs
                      ? 'var(--macro-calories)'
                      : 'var(--surface-sub)',
                  }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                <strong className="text-sm sm:text-base font-bold text-foreground">
                  {weekLoggedCount}/7
                </strong>{' '}
                this week
              </span>
              <ChevronRight
                className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </div>
          </Link>

          {/* Remaining Meal Allocation Tile */}
          <Link
            href="/log"
            className="min-w-0 rounded-2xl bg-card border border-border/50 p-3.5 sm:p-4 flex flex-col justify-between gap-3 hover:bg-surface-sub/60 active:scale-[0.985] macro-spring macro-card-interactive group"
          >
            <div>
              <div className="text-sm font-semibold text-foreground truncate">
                {nextSlotName ? `Next: ${nextSlotName}` : 'Daily Balance'}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                Remaining Meal Allocation
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2 tabular-nums">
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Calories</div>
                <div
                  className="text-sm font-bold"
                  style={{ color: 'var(--macro-calories)' }}
                >
                  {nextSlotBudget.calories} kcal
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Protein</div>
                <div
                  className="text-sm font-bold"
                  style={{ color: 'var(--macro-protein)' }}
                >
                  {nextSlotBudget.protein}g
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Fat</div>
                <div
                  className="text-sm font-bold"
                  style={{ color: 'var(--macro-fat)' }}
                >
                  {nextSlotBudget.fat}g
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Carbs</div>
                <div
                  className="text-sm font-bold"
                  style={{ color: 'var(--macro-carbs)' }}
                >
                  {nextSlotBudget.carbs}g
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {nextSlotName ? 'Auto-distributed' : 'All slots logged'}
              </span>
              <ChevronRight
                className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
