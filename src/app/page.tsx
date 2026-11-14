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
import { ChevronLeft, ChevronRight, Plus, RotateCcw } from 'lucide-react';

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

function formatSlotTime(timestamps: number[]): string | null {
  if (timestamps.length === 0) return null;
  const latest = Math.max(...timestamps);
  if (!Number.isFinite(latest) || latest <= 0) return null;
  return new Date(latest).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  const dateInfo = formatUpperHeaderDate(activeDate);

  const handlePrevDay = () => setActiveDate(offsetIsoDate(activeDate, -1));
  const handleNextDay = () => setActiveDate(offsetIsoDate(activeDate, 1));
  const handleToday = () => setActiveDate(getTodayIsoDate());

  return (
    <AppShell>
      <div className="flex flex-col gap-5 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
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

          <div className="flex items-center gap-1 shrink-0">
            {!dateInfo.isToday && (
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-sub text-foreground hover:bg-surface-elevated transition-colors flex items-center gap-1 mr-1"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Today
              </button>
            )}
            <button
              type="button"
              onClick={handlePrevDay}
              aria-label="Previous day"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-card hover:bg-surface-sub text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              aria-label="Next day"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-card hover:bg-surface-sub text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Top Responsive Bento Workspace: Hero (left) + Insights & Habits (right on tablet/laptop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-5">
            <MacroBentoGrid
              summary={summary}
              weeklyDays={weeklyDays}
              onSelectDate={setActiveDate}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Logged Entries Section */}
          <section className="lg:col-span-7 space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Logged Entries
              </h2>
              <Link
                href="/log"
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                See All
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              {mealSlots.map((slot) => {
                const slotLogs = activeLogs.filter((entry) => entry.mealSlot === slot.id);
                const slotTotals = slotLogs.reduce(
                  (acc, entry) => ({
                    calories: acc.calories + (entry.nutritionSnapshot?.calories ?? 0),
                    protein: acc.protein + (entry.nutritionSnapshot?.protein ?? 0),
                    carbs: acc.carbs + (entry.nutritionSnapshot?.carbs ?? 0),
                    fat: acc.fat + (entry.nutritionSnapshot?.fat ?? 0),
                  }),
                  { calories: 0, protein: 0, carbs: 0, fat: 0 }
                );
                const latestTime = formatSlotTime(slotLogs.map((l) => l.createdAt));
                const slotBudget = distributedBudgets[slot.id];

                return (
                  <div
                    key={slot.id}
                    className="p-4 rounded-2xl bg-card space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {slot.name}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {slotLogs.length > 0
                            ? `${latestTime ? `${latestTime} · ` : ''}${slotLogs.length} ${
                                slotLogs.length === 1 ? 'item' : 'items'
                              }`
                            : `Unlogged${
                                slotBudget ? ` · ${slotBudget.calories} kcal budget` : ''
                              }`}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right tabular-nums">
                          <div
                            className="text-sm font-bold"
                            style={{ color: 'var(--macro-calories)' }}
                          >
                            {Math.round(slotTotals.calories)} kcal
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            P {Math.round(slotTotals.protein)}g · C {Math.round(slotTotals.carbs)}g · F{' '}
                            {Math.round(slotTotals.fat)}g
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openSheet('search', slot.id)}
                          aria-label={`Add food to ${slot.name}`}
                          className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-sub hover:bg-surface-elevated text-foreground transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {slotLogs.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-border/60">
                        {slotLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between text-xs py-1 text-foreground"
                          >
                            <span className="truncate pr-2">
                              {log.name}{' '}
                              <span className="text-muted-foreground text-[11px]">
                                ({Math.round(log.amount)}
                                {log.unit})
                              </span>
                            </span>
                            <span className="text-muted-foreground tabular-nums shrink-0">
                              {Math.round(log.nutritionSnapshot.calories)} kcal
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Micronutrient Targets Panel */}
          <div className="lg:col-span-5">
            <MicronutrientPanel micros={summary.micros} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
