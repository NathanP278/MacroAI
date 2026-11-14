'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/macroai-db';
import { useLoggerStore } from '@/stores/logger-store';
import { DEFAULT_MEAL_SLOTS, DEFAULT_RDA_MICROS } from '@/lib/nutrition/goals';
import { aggregateDailySummary } from '@/lib/nutrition/daily-summary';
import { distributeRemainingMacros } from '@/lib/nutrition/meal-distribution';
import { MacroBentoGrid, type DayNutritionPoint } from '@/components/dashboard/macro-bento-grid';
import {
  HabitsAnalyticsGrid,
  type LoggedDayDot,
} from '@/components/dashboard/habits-analytics-grid';
import { MicronutrientPanel } from '@/components/dashboard/micronutrient-panel';
import { AppShell } from '@/components/shell/app-shell';
import type { FoodLogEntry, UserGoals } from '@/types/nutrition';
import { ChevronLeft, ChevronRight, Plus, RotateCcw, Trash2, Utensils } from 'lucide-react';

function getTodayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function offsetIsoDate(iso: string, dayOffset: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + dayOffset);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, '0');
  const nextD = String(date.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

function formatUpperHeaderDate(iso: string): { kicker: string; isToday: boolean } {
  const today = getTodayIsoDate();
  const isToday = iso === today;
  const [y, m, d] = iso.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const formatted = dateObj
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase();

  return { kicker: formatted, isToday };
}

function formatEntryTime(timestamp: number): string | null {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatEntryAmount(amount: number): string {
  if (!Number.isFinite(amount)) return '0';
  return String(Number(amount.toFixed(1)));
}

export default function HomePage() {
  const activeDate = useLoggerStore((s) => s.activeDate);
  const setActiveDate = useLoggerStore((s) => s.setActiveDate);
  const openSheet = useLoggerStore((s) => s.openSheet);

  const windowStartDate = useMemo(() => offsetIsoDate(activeDate, -29), [activeDate]);

  // Query 30 days ending on activeDate so daily metrics, 7-day stacked bars, and 30-day logging heatmap stay synced
  const rangeLogs = useLiveQuery(
    () =>
      db.foodLogs
        .where('date')
        .between(windowStartDate, activeDate, true, true)
        .toArray(),
    [windowStartDate, activeDate]
  );

  const userGoals = useLiveQuery(() => db.userGoals.get('active'), []);

  const fallbackGoals: UserGoals = useMemo(
    () => ({
      id: 'active',
      dailyCalories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 65,
      fiberG: 30,
      micronutrientTargets: { ...DEFAULT_RDA_MICROS },
      mealSlots: [...DEFAULT_MEAL_SLOTS],
      updatedAt: 0,
    }),
    []
  );

  const activeGoals = userGoals ?? fallbackGoals;

  const logsByDate = useMemo(() => {
    const grouped = new Map<string, FoodLogEntry[]>();
    for (const entry of rangeLogs ?? []) {
      const bucket = grouped.get(entry.date);
      if (bucket) {
        bucket.push(entry);
      } else {
        grouped.set(entry.date, [entry]);
      }
    }
    return grouped;
  }, [rangeLogs]);

  const activeLogs = useMemo(
    () => logsByDate.get(activeDate) ?? [],
    [logsByDate, activeDate]
  );

  const summary = useMemo(
    () => aggregateDailySummary(activeLogs, activeGoals),
    [activeLogs, activeGoals]
  );

  const mealSlots = useMemo(() => {
    return activeGoals.mealSlots && activeGoals.mealSlots.length > 0
      ? activeGoals.mealSlots
      : DEFAULT_MEAL_SLOTS;
  }, [activeGoals.mealSlots]);

  const distributedBudgets = useMemo(
    () => distributeRemainingMacros({ ...activeGoals, mealSlots }, activeLogs),
    [activeGoals, mealSlots, activeLogs]
  );

  const nextUnloggedSlot = useMemo(() => {
    const loggedIds = new Set(activeLogs.map((entry) => entry.mealSlot));
    return mealSlots.find((slot) => !loggedIds.has(slot.id)) ?? null;
  }, [mealSlots, activeLogs]);

  const allocationTarget = nextUnloggedSlot
    ? distributedBudgets[nextUnloggedSlot.id] ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
    : {
        calories: summary.calories.remaining,
        protein: summary.protein.remaining,
        carbs: summary.carbs.remaining,
        fat: summary.fat.remaining,
      };

  // Build 7-day sequence ending on activeDate (Pics 3 & 4)
  const weeklyDays: DayNutritionPoint[] = useMemo(() => {
    const days: DayNutritionPoint[] = [];
    for (let i = -6; i <= 0; i++) {
      const iso = offsetIsoDate(activeDate, i);
      const dayEntries = logsByDate.get(iso) ?? [];
      const [y, m, d] = iso.split('-').map(Number);
      const dayLetter = new Date(y, m - 1, d)
        .toLocaleDateString('en-US', { weekday: 'narrow' })
        .toUpperCase();

      let cal = 0;
      let pro = 0;
      let fat = 0;
      let carbs = 0;
      for (const e of dayEntries) {
        cal += Number(e.nutritionSnapshot?.calories) || 0;
        pro += Number(e.nutritionSnapshot?.protein) || 0;
        fat += Number(e.nutritionSnapshot?.fat) || 0;
        carbs += Number(e.nutritionSnapshot?.carbs) || 0;
      }

      days.push({
        date: iso,
        dayLetter,
        calories: Math.round(cal),
        protein: Math.round(pro),
        fat: Math.round(fat),
        carbs: Math.round(carbs),
        caloriesTarget: activeGoals.dailyCalories,
        proteinTarget: activeGoals.proteinG,
        fatTarget: activeGoals.fatG,
        carbsTarget: activeGoals.carbsG,
        isSelected: iso === activeDate,
      });
    }
    return days;
  }, [activeDate, logsByDate, activeGoals]);

  // Build 30-day logging dots ending on activeDate (Pic 1 Habits)
  const thirtyDayDots: LoggedDayDot[] = useMemo(() => {
    const dots: LoggedDayDot[] = [];
    for (let i = -29; i <= 0; i++) {
      const iso = offsetIsoDate(activeDate, i);
      const entries = logsByDate.get(iso) ?? [];
      const cal = entries.reduce(
        (sum, e) => sum + (Number(e.nutritionSnapshot?.calories) || 0),
        0
      );
      dots.push({
        date: iso,
        hasLogs: entries.length > 0,
        calories: Math.round(cal),
      });
    }
    return dots;
  }, [activeDate, logsByDate]);

  const sortedLogs = useMemo(
    () => [...activeLogs].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [activeLogs]
  );

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await db.foodLogs.delete(entryId);
    } catch (err) {
      console.error('Failed to delete log entry:', err);
    }
  };

  const dateInfo = formatUpperHeaderDate(activeDate);

  const handlePrevDay = () => setActiveDate(offsetIsoDate(activeDate, -1));
  const handleNextDay = () => setActiveDate(offsetIsoDate(activeDate, 1));
  const handleToday = () => setActiveDate(getTodayIsoDate());

  return (
    <AppShell>
      <div className="flex flex-col gap-5 sm:gap-7 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-8">
        {/* Clean MacroFactor Header (Pics 1 & 4) */}
        <header className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
              {dateInfo.kicker}
            </p>
            <div className="flex items-baseline gap-2.5 mt-0.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Dashboard
              </h1>
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                MacroAI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!dateInfo.isToday && (
              <button
                type="button"
                onClick={handleToday}
                className="touch-target macro-spring active:scale-95 px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-surface-sub border border-border/50 text-foreground hover:bg-surface-elevated flex items-center gap-1 mr-1"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Today
              </button>
            )}
            <button
              type="button"
              onClick={handlePrevDay}
              aria-label="Previous day"
              className="touch-target macro-spring active:scale-95 w-9 h-9 rounded-full flex items-center justify-center bg-card border border-border/50 hover:bg-surface-sub text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              aria-label="Next day"
              className="touch-target macro-spring active:scale-95 w-9 h-9 rounded-full flex items-center justify-center bg-card border border-border/50 hover:bg-surface-sub text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Top Responsive Bento Workspace: Hero (left) + Insights & Habits (right on tablet/laptop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 lg:items-stretch animate-card-enter">
          <div className="lg:col-span-5 flex">
            <MacroBentoGrid
              summary={summary}
              weeklyDays={weeklyDays}
              onSelectDate={setActiveDate}
              className="w-full"
            />
          </div>

          <div className="lg:col-span-7">
            <HabitsAnalyticsGrid
              summary={summary}
              weeklyDays={weeklyDays}
              thirtyDayDots={thirtyDayDots}
              nextSlotName={nextUnloggedSlot?.name ?? null}
              nextSlotBudget={allocationTarget}
              onSelectDate={setActiveDate}
            />
          </div>
        </div>

        {/* Bottom Workspace: Logged Entries + Micronutrient Targets */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-start animate-card-enter"
          style={{ animationDelay: '45ms' }}
        >
          {/* Logged Entries Section */}
          <section aria-labelledby="logged-entries-heading" className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <div className="flex items-baseline gap-2">
                <h2
                  id="logged-entries-heading"
                  className="text-base font-bold tracking-tight text-foreground"
                >
                  Logged Entries
                </h2>
                {sortedLogs.length > 0 && (
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">
                    {sortedLogs.length} {sortedLogs.length === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openSheet('search')}
                  aria-label="Add food"
                  className="touch-target macro-spring active:scale-95 flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-sub hover:bg-foreground hover:text-background text-xs font-semibold text-foreground"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add</span>
                </button>
                <Link
                  href="/log"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  See All
                </Link>
              </div>
            </div>

            {sortedLogs.length > 0 ? (
              <ul className="rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/60">
                {sortedLogs.map((log) => {
                  const entryTime = formatEntryTime(log.createdAt);

                  return (
                    <li
                      key={log.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 sm:px-[18px] sm:py-3.5 hover:bg-surface-sub/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {log.name}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums mt-0.5 truncate">
                          {formatEntryAmount(log.amount)} {log.unit}
                          {entryTime ? ` · ${entryTime}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                        <div className="text-right tabular-nums">
                          <div
                            className="text-sm font-bold"
                            style={{ color: 'var(--macro-calories)' }}
                          >
                            {Math.round(log.nutritionSnapshot?.calories ?? 0)} kcal
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {Math.round(log.nutritionSnapshot?.protein ?? 0)}P ·{' '}
                            {Math.round(log.nutritionSnapshot?.carbs ?? 0)}C ·{' '}
                            {Math.round(log.nutritionSnapshot?.fat ?? 0)}F
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(log.id)}
                          aria-label={`Delete ${log.name}`}
                          className="touch-target macro-spring active:scale-90 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-sub"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-2xl bg-card border border-border/50 p-6 sm:p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-surface-sub mx-auto mb-3 flex items-center justify-center text-muted-foreground">
                  <Utensils className="w-4 h-4" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-foreground">No entries logged yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[34ch] mx-auto">
                  Search foods, scan a barcode, or snap a meal photo to log your day.
                </p>
                <button
                  type="button"
                  onClick={() => openSheet('search')}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90 macro-spring active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Log Food</span>
                </button>
              </div>
            )}
          </section>

          {/* Micronutrient Targets Panel */}
          <div className="lg:col-span-5 lg:sticky lg:top-[max(1.5rem,env(safe-area-inset-top))]">
            <MicronutrientPanel micros={summary.micros} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
