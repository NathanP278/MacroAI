'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId } from '@/lib/db/macroai-db';
import { useLoggerStore } from '@/stores/logger-store';
import { DEFAULT_RDA_MICROS } from '@/lib/nutrition/goals';
import { aggregateDailySummary } from '@/lib/nutrition/daily-summary';
import { MacroBentoGrid, type DayNutritionPoint } from '@/components/dashboard/macro-bento-grid';
import {
  HabitsAnalyticsGrid,
  type LoggedDayDot,
} from '@/components/dashboard/habits-analytics-grid';
import { MicronutrientPanel } from '@/components/dashboard/micronutrient-panel';
import { AppShell } from '@/components/shell/app-shell';
import { SettingsHeaderLink } from '@/components/shell/settings-header-link';
import { FoodRowSkeleton } from '@/components/ui/skeleton';
import { runViewTransition, triggerHaptic } from '@/lib/motion';
import type { FoodLogEntry, UserGoals } from '@/types/nutrition';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CopyPlus,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';

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
  const dateDirection = useLoggerStore((s) => s.dateDirection);
  const setActiveDate = useLoggerStore((s) => s.setActiveDate);
  const openSheet = useLoggerStore((s) => s.openSheet);
  const showUndoToast = useLoggerStore((s) => s.showUndoToast);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const headerTouchStartX = useRef<number | null>(null);
  const hasLoadedOnceRef = useRef(false);

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
      mealSlots: [],
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

  const handleDeleteEntry = async (entry: FoodLogEntry) => {
    const snapshot: FoodLogEntry = {
      ...entry,
      nutritionSnapshot: entry.nutritionSnapshot
        ? {
            ...entry.nutritionSnapshot,
            micros: entry.nutritionSnapshot.micros
              ? { ...entry.nutritionSnapshot.micros }
              : {},
          }
        : entry.nutritionSnapshot,
    };
    try {
      await db.foodLogs.delete(entry.id);
      triggerHaptic(12);
      setExpandedEntryId((prev) => (prev === entry.id ? null : prev));
      showUndoToast({
        message: `Removed ${entry.name}`,
        onUndo: async () => {
          await db.foodLogs.put(snapshot);
        },
      });
    } catch (err) {
      console.error('Failed to delete log entry:', err);
    }
  };

  const handleDuplicateEntry = async (entry: FoodLogEntry) => {
    try {
      await db.foodLogs.add({
        ...entry,
        id: generateId(),
        date: activeDate,
        createdAt: Date.now(),
      });
      triggerHaptic(10);
    } catch (err) {
      console.error('Failed to duplicate log entry:', err);
    }
  };

  const dateInfo = formatUpperHeaderDate(activeDate);

  const handlePrevDay = () => {
    triggerHaptic(8);
    runViewTransition(() => setActiveDate(offsetIsoDate(activeDate, -1)), {
      direction: 'backward',
    });
  };
  const handleNextDay = () => {
    triggerHaptic(8);
    runViewTransition(() => setActiveDate(offsetIsoDate(activeDate, 1)), {
      direction: 'forward',
    });
  };
  const handleToday = () => {
    triggerHaptic(8);
    const today = getTodayIsoDate();
    runViewTransition(() => setActiveDate(today), {
      direction: today > activeDate ? 'forward' : today < activeDate ? 'backward' : null,
    });
  };

  const handleHeaderTouchStart = (e: React.TouchEvent) => {
    headerTouchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleHeaderTouchEnd = (e: React.TouchEvent) => {
    if (headerTouchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? headerTouchStartX.current;
    const dx = endX - headerTouchStartX.current;
    headerTouchStartX.current = null;
    if (Math.abs(dx) < 48) return;
    if (dx > 0) handlePrevDay();
    else handleNextDay();
  };

  if (rangeLogs !== undefined) {
    hasLoadedOnceRef.current = true;
  }

  const isLoadingLogs = hasLoadedOnceRef.current && rangeLogs === undefined;
  const dateSlideClass =
    dateDirection === 'forward'
      ? 'slide-enter-right'
      : dateDirection === 'backward'
        ? 'slide-enter-left'
        : '';

  return (
    <AppShell>
      <div className="flex flex-col gap-5 sm:gap-7 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-8">
        {/* Clean MacroFactor Header (swipeable horizontally on mobile) */}
        <header
          onTouchStart={handleHeaderTouchStart}
          onTouchEnd={handleHeaderTouchEnd}
          className="flex items-end justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground truncate">
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
                className="touch-target tactile-press px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-surface-sub border border-border/50 text-foreground hover:bg-surface-elevated flex items-center gap-1 mr-1"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Today
              </button>
            )}
            <button
              type="button"
              onClick={handlePrevDay}
              aria-label="Previous day"
              className="touch-target tactile-press w-9 h-9 rounded-full flex items-center justify-center bg-card border border-border/50 hover:bg-surface-sub text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              aria-label="Next day"
              className="touch-target tactile-press w-9 h-9 rounded-full flex items-center justify-center bg-card border border-border/50 hover:bg-surface-sub text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <SettingsHeaderLink />
          </div>
        </header>

        <div style={{ viewTransitionName: 'date-stage' }} className="space-y-5 sm:space-y-6">
          {/* Top Responsive Bento Workspace: Hero (left) + Insights & Habits (right on tablet/laptop) */}
          <div
            key={`bento-${activeDate}`}
            className={`grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 md:items-stretch ${dateSlideClass || 'animate-card-enter'}`}
          >
            <div className="md:col-span-6 lg:col-span-5 flex">
              <MacroBentoGrid
                summary={summary}
                weeklyDays={weeklyDays}
                onSelectDate={setActiveDate}
                className="w-full"
              />
            </div>

            <div className="md:col-span-6 lg:col-span-7">
              <HabitsAnalyticsGrid
                summary={summary}
                weeklyDays={weeklyDays}
                thirtyDayDots={thirtyDayDots}
                onSelectDate={setActiveDate}
              />
            </div>
          </div>

          {/* Bottom Workspace: Logged Entries + Micronutrient Targets */}
          <div
            className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-start animate-card-enter"
            style={{ animationDelay: '45ms' }}
          >
            {/* Logged Entries Section */}
            <section aria-labelledby="logged-entries-heading" className="md:col-span-7 space-y-3">
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
                    className="touch-target tactile-press flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-sub hover:bg-foreground hover:text-background text-xs font-semibold text-foreground"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add</span>
                  </button>
                  <Link
                    href="/log"
                    className="touch-target py-1 px-1.5 -mr-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    See All
                  </Link>
                </div>
              </div>

              {isLoadingLogs ? (
                <FoodRowSkeleton count={3} />
              ) : sortedLogs.length > 0 ? (
                <ul className="rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/60">
                  {sortedLogs.map((log, idx) => {
                    const entryTime = formatEntryTime(log.createdAt);
                    const isExpanded = expandedEntryId === log.id;
                    const micros = log.nutritionSnapshot?.micros;

                    return (
                      <li
                        key={log.id}
                        style={{ '--stagger-index': idx } as React.CSSProperties}
                        className="stagger-item hover:bg-surface-sub/40 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-[18px] sm:py-3.5">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedEntryId((prev) =>
                                prev === log.id ? null : log.id
                              )
                            }
                            aria-expanded={isExpanded}
                            className="min-w-0 flex-1 text-left group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-foreground truncate">
                                {log.name}
                              </span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-150 ${
                                  isExpanded ? 'rotate-180 text-foreground' : 'opacity-60 group-hover:opacity-100'
                                }`}
                                aria-hidden="true"
                              />
                            </div>
                            <div className="text-xs text-muted-foreground tabular-nums mt-0.5 truncate">
                              {formatEntryAmount(log.amount)} {log.unit}
                              {entryTime ? ` · ${entryTime}` : ''}
                            </div>
                          </button>

                          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                            <div className="text-right tabular-nums">
                              <div
                                className="text-sm font-bold"
                                style={{ color: 'var(--macro-calories)' }}
                              >
                                {Math.round(log.nutritionSnapshot?.calories ?? 0)} kcal
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                <span className="text-[var(--macro-protein)]">
                                  {Math.round(log.nutritionSnapshot?.protein ?? 0)}P
                                </span>{' '}
                                ·{' '}
                                <span className="text-[var(--macro-carbs)]">
                                  {Math.round(log.nutritionSnapshot?.carbs ?? 0)}C
                                </span>{' '}
                                ·{' '}
                                <span className="text-[var(--macro-fat)]">
                                  {Math.round(log.nutritionSnapshot?.fat ?? 0)}F
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => void handleDeleteEntry(log)}
                              aria-label={`Delete ${log.name}`}
                              className="touch-target tactile-press w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-sub"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        <div
                          className="accordion-grid"
                          data-open={isExpanded ? 'true' : 'false'}
                          aria-hidden={!isExpanded}
                        >
                          <div className="accordion-inner">
                            <div className="px-4 pb-3 pt-1.5 sm:px-[18px] flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground border-t border-border/40 bg-surface-sub/35">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
                                <span>
                                  Fiber:{' '}
                                  <strong className="text-foreground">
                                    {Math.round((log.nutritionSnapshot?.fiber ?? 0) * 10) / 10}g
                                  </strong>
                                </span>
                                {micros?.sodiumMg !== undefined && (
                                  <span>
                                    Sodium:{' '}
                                    <strong className="text-foreground">
                                      {Math.round(micros.sodiumMg)}mg
                                    </strong>
                                  </span>
                                )}
                                {micros?.potassiumMg !== undefined && (
                                  <span>
                                    Potassium:{' '}
                                    <strong className="text-foreground">
                                      {Math.round(micros.potassiumMg)}mg
                                    </strong>
                                  </span>
                                )}
                                <span className="uppercase tracking-wider text-[10px]">
                                  {log.source.replace('_', ' ')}
                                </span>
                              </div>

                              <button
                                type="button"
                                tabIndex={isExpanded ? 0 : -1}
                                onClick={() => void handleDuplicateEntry(log)}
                                className="touch-target tactile-press inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card border border-border text-foreground font-medium hover:bg-surface-elevated"
                              >
                                <CopyPlus className="w-3 h-3" aria-hidden="true" />
                                <span>Log Again</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="rounded-2xl bg-card border border-border/50 p-6 sm:p-8 text-center">
                  <svg
                    viewBox="0 0 64 64"
                    className="w-12 h-12 mx-auto mb-3 text-muted-foreground/75"
                    aria-hidden="true"
                  >
                    <circle
                      cx="32"
                      cy="34"
                      r="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="84 126"
                      strokeLinecap="round"
                      transform="rotate(150 32 34)"
                    />
                    <circle
                      cx="32"
                      cy="34"
                      r="11"
                      fill="none"
                      stroke="var(--macro-calories)"
                      strokeWidth="2"
                      strokeOpacity="0.65"
                    />
                    <circle cx="32" cy="34" r="2.5" fill="var(--macro-calories)" />
                  </svg>
                  <p className="text-sm font-semibold text-foreground">No entries logged yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[34ch] mx-auto">
                    Search offline staples, scan a barcode, or snap a meal photo to log your day.
                  </p>
                  <button
                    type="button"
                    onClick={() => openSheet('search')}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90 tactile-press"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Log Food</span>
                  </button>
                </div>
              )}
            </section>

            {/* Micronutrient Targets Panel */}
            <div className="md:col-span-5 md:sticky md:top-[max(1.5rem,env(safe-area-inset-top))]">
              <MicronutrientPanel micros={summary.micros} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
