'use client';

import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/macroai-db';
import { useLoggerStore } from '@/stores/logger-store';
import { copyYesterdayLogs, offsetIsoDate } from '@/lib/recipes/recipe-builder';
import { DEFAULT_RDA_MICROS } from '@/lib/nutrition/goals';
import type { UserGoals } from '@/types/nutrition';
import { Plus, RotateCcw, Trash2, Utensils, Check } from 'lucide-react';

function formatEntryTime(timestamp: number): string | null {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatEntryAmount(amount: number): string {
  if (!Number.isFinite(amount)) return '0';
  return String(Number(amount.toFixed(1)));
}

export function MealSlotsView() {
  const activeDate = useLoggerStore((s) => s.activeDate);
  const openSheet = useLoggerStore((s) => s.openSheet);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const feedbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  // Query today's logs
  const todayLogs = useLiveQuery(
    () => db.foodLogs.where('date').equals(activeDate).toArray(),
    [activeDate]
  );

  // Query yesterday's logs to detect Copy Yesterday availability
  const yesterdayDate = offsetIsoDate(activeDate, -1);
  const yesterdayLogs = useLiveQuery(
    () => db.foodLogs.where('date').equals(yesterdayDate).toArray(),
    [yesterdayDate]
  );

  // Query active goals
  const userGoals = useLiveQuery(() => db.userGoals.get('active'), []);

  const fallbackGoals: UserGoals = {
    id: 'active',
    dailyCalories: 2000,
    proteinG: 150,
    carbsG: 200,
    fatG: 65,
    fiberG: 30,
    micronutrientTargets: { ...DEFAULT_RDA_MICROS },
    mealSlots: [],
    updatedAt: 0,
  };

  const activeGoals = userGoals ?? fallbackGoals;
  const logs = useMemo(() => todayLogs ?? [], [todayLogs]);
  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [logs]
  );
  const yesterdayEntries = yesterdayLogs ?? [];

  // Compute daily totals
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  for (const entry of logs) {
    if (entry.nutritionSnapshot) {
      totalCalories += Number(entry.nutritionSnapshot.calories) || 0;
      totalProtein += Number(entry.nutritionSnapshot.protein) || 0;
      totalCarbs += Number(entry.nutritionSnapshot.carbs) || 0;
      totalFat += Number(entry.nutritionSnapshot.fat) || 0;
      totalFiber += Number(entry.nutritionSnapshot.fiber) || 0;
    }
  }

  const remainingCal = Math.round(activeGoals.dailyCalories - totalCalories);

  const handleCopyYesterday = async () => {
    try {
      const count = await copyYesterdayLogs(activeDate);
      if (count > 0) {
        setCopyFeedback(`Copied ${count} ${count === 1 ? 'item' : 'items'}`);
        if (feedbackTimerRef.current) {
          clearTimeout(feedbackTimerRef.current);
        }
        feedbackTimerRef.current = setTimeout(() => {
          setCopyFeedback(null);
          feedbackTimerRef.current = null;
        }, 2500);
      }
    } catch (err) {
      console.error("Failed to copy yesterday's logs:", err);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await db.foodLogs.delete(entryId);
    } catch (err) {
      console.error('Failed to delete log entry:', err);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-card-enter">
      {/* Top Daily Consumed Bento Summary */}
      <aside
        aria-label="Daily nutrition totals"
        className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 lg:items-center"
      >
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs text-muted-foreground font-medium">Daily Consumed</span>
              <div className="text-2xl sm:text-[26px] font-bold tabular-nums text-foreground mt-0.5">
                {Math.round(totalCalories).toLocaleString()}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  / {activeGoals.dailyCalories.toLocaleString()} kcal
                </span>
              </div>
            </div>
            <span
              className={`text-xs font-semibold tabular-nums px-2.5 py-1 rounded-full bg-surface-sub shrink-0 ${
                remainingCal < 0
                  ? 'text-[var(--neutral-over)]'
                  : 'text-[var(--macro-calories)]'
              }`}
            >
              {remainingCal < 0
                ? `+${Math.abs(remainingCal).toLocaleString()} surplus`
                : `${remainingCal.toLocaleString()} left`}
            </span>
          </div>

          <progress
            className="macro-progress progress-calories w-full h-2 block"
            max={Math.max(1, activeGoals.dailyCalories)}
            value={Math.min(activeGoals.dailyCalories, Math.max(0, Math.round(totalCalories)))}
            aria-label="Daily calorie progress"
          />
        </div>

        <div className="lg:col-span-7 space-y-3 lg:border-l lg:border-border/60 lg:pl-6">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-baseline justify-between gap-1 text-xs tabular-nums">
                <span className="text-muted-foreground font-medium truncate">Protein</span>
                <span className="font-semibold text-[var(--macro-protein)] whitespace-nowrap">
                  {Math.round(totalProtein)}
                  <span className="text-[11px] text-muted-foreground font-normal">
                    /{activeGoals.proteinG}g
                  </span>
                </span>
              </div>
              <progress
                className="macro-progress progress-protein w-full h-1.5 block"
                max={Math.max(1, activeGoals.proteinG)}
                value={Math.min(activeGoals.proteinG, Math.max(0, Math.round(totalProtein)))}
                aria-label="Protein progress"
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-baseline justify-between gap-1 text-xs tabular-nums">
                <span className="text-muted-foreground font-medium truncate">Fat</span>
                <span className="font-semibold text-[var(--macro-fat)] whitespace-nowrap">
                  {Math.round(totalFat)}
                  <span className="text-[11px] text-muted-foreground font-normal">
                    /{activeGoals.fatG}g
                  </span>
                </span>
              </div>
              <progress
                className="macro-progress progress-fat w-full h-1.5 block"
                max={Math.max(1, activeGoals.fatG)}
                value={Math.min(activeGoals.fatG, Math.max(0, Math.round(totalFat)))}
                aria-label="Fat progress"
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-baseline justify-between gap-1 text-xs tabular-nums">
                <span className="text-muted-foreground font-medium truncate">Carbs</span>
                <span className="font-semibold text-[var(--macro-carbs)] whitespace-nowrap">
                  {Math.round(totalCarbs)}
                  <span className="text-[11px] text-muted-foreground font-normal">
                    /{activeGoals.carbsG}g
                  </span>
                </span>
              </div>
              <progress
                className="macro-progress progress-carbs w-full h-1.5 block"
                max={Math.max(1, activeGoals.carbsG)}
                value={Math.min(activeGoals.carbsG, Math.max(0, Math.round(totalCarbs)))}
                aria-label="Carbs progress"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs tabular-nums">
            <span className="text-muted-foreground">Fiber</span>
            <span className="font-semibold text-[var(--macro-fiber)]">
              {Math.round(totalFiber)}g{' '}
              <span className="text-muted-foreground font-normal">/ {activeGoals.fiberG}g</span>
            </span>
          </div>
        </div>
      </aside>

      {/* Unified Logged Entries List */}
      <section aria-labelledby="food-log-entries-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <div className="flex items-baseline gap-2">
            <h2
              id="food-log-entries-heading"
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

          <div className="flex items-center gap-2">
            {copyFeedback && (
              <span className="animate-check-pop text-[11px] text-[var(--macro-carbs)] flex items-center gap-1 font-semibold">
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                {copyFeedback}
              </span>
            )}
            {yesterdayEntries.length > 0 && (
              <button
                type="button"
                onClick={handleCopyYesterday}
                aria-label="Copy Yesterday"
                className="macro-spring active:scale-95 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-sub hover:bg-surface-elevated text-xs text-foreground font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[var(--macro-calories)]" aria-hidden="true" />
                <span>Copy Yesterday</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  ({yesterdayEntries.length})
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openSheet('search')}
              aria-label="Add food"
              className="touch-target macro-spring active:scale-95 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-sub hover:bg-foreground hover:text-background text-xs font-semibold text-foreground"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {sortedLogs.length > 0 ? (
          <ul className="rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/60">
            {sortedLogs.map((entry) => {
              const entryTime = formatEntryTime(entry.createdAt);

              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 hover:bg-surface-sub/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {entry.name}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums mt-0.5 truncate">
                      {formatEntryAmount(entry.amount)} {entry.unit}
                      {entryTime ? ` · ${entryTime}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                    <div className="text-right tabular-nums">
                      <div
                        className="text-sm font-bold"
                        style={{ color: 'var(--macro-calories)' }}
                      >
                        {Math.round(entry.nutritionSnapshot?.calories || 0)} kcal
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        <span className="text-[var(--macro-protein)]">
                          {Math.round(entry.nutritionSnapshot?.protein || 0)}P
                        </span>{' '}
                        ·{' '}
                        <span className="text-[var(--macro-carbs)]">
                          {Math.round(entry.nutritionSnapshot?.carbs || 0)}C
                        </span>{' '}
                        ·{' '}
                        <span className="text-[var(--macro-fat)]">
                          {Math.round(entry.nutritionSnapshot?.fat || 0)}F
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      aria-label={`Delete ${entry.name}`}
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
            <p className="text-xs text-muted-foreground mt-1 max-w-[36ch] mx-auto">
              Search foods, scan a barcode, or copy yesterday&apos;s entries to build your log.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {yesterdayEntries.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyYesterday}
                  className="macro-spring active:scale-95 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-sub hover:bg-surface-elevated text-xs font-semibold text-foreground"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[var(--macro-calories)]" aria-hidden="true" />
                  <span>Copy Yesterday ({yesterdayEntries.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => openSheet('search')}
                className="macro-spring active:scale-95 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Log Food</span>
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
