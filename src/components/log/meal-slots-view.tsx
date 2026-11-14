'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId } from '@/lib/db/macroai-db';
import { useLoggerStore } from '@/stores/logger-store';
import { copyYesterdayLogs, offsetIsoDate } from '@/lib/recipes/recipe-builder';
import { DEFAULT_RDA_MICROS } from '@/lib/nutrition/goals';
import { FoodRowSkeleton } from '@/components/ui/skeleton';
import { triggerHaptic } from '@/lib/motion';
import type { FoodLogEntry, UserGoals } from '@/types/nutrition';
import { Plus, RotateCcw, Trash2, Check, ChevronDown, CopyPlus } from 'lucide-react';

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
  const showUndoToast = useLoggerStore((s) => s.showUndoToast);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const feedbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowTouchStartX = useRef<number | null>(null);

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

  const isLoadingLogs = todayLogs === undefined;

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

        {isLoadingLogs ? (
          <FoodRowSkeleton count={3} />
        ) : sortedLogs.length > 0 ? (
          <ul className="rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/60">
            {sortedLogs.map((entry, idx) => {
              const entryTime = formatEntryTime(entry.createdAt);
              const isExpanded = expandedEntryId === entry.id;
              const micros = entry.nutritionSnapshot?.micros;

              return (
                <li
                  key={entry.id}
                  style={{ '--stagger-index': idx } as React.CSSProperties}
                  onTouchStart={(e) => {
                    rowTouchStartX.current = e.touches[0]?.clientX ?? null;
                  }}
                  onTouchEnd={(e) => {
                    if (rowTouchStartX.current === null) return;
                    const dx =
                      (e.changedTouches[0]?.clientX ?? rowTouchStartX.current) -
                      rowTouchStartX.current;
                    rowTouchStartX.current = null;
                    if (dx < -48) setExpandedEntryId(entry.id);
                    else if (dx > 48 && isExpanded) setExpandedEntryId(null);
                  }}
                  className="stagger-item hover:bg-surface-sub/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedEntryId((prev) =>
                          prev === entry.id ? null : entry.id
                        )
                      }
                      aria-expanded={isExpanded}
                      className="min-w-0 flex-1 text-left group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {entry.name}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-150 ${
                            isExpanded
                              ? 'rotate-180 text-foreground'
                              : 'opacity-60 group-hover:opacity-100'
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums mt-0.5 truncate">
                        {formatEntryAmount(entry.amount)} {entry.unit}
                        {entryTime ? ` · ${entryTime}` : ''}
                      </div>
                    </button>

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
                        onClick={() => void handleDeleteEntry(entry)}
                        aria-label={`Delete ${entry.name}`}
                        className="touch-target tactile-press w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-sub"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1.5 sm:px-5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground border-t border-border/40 bg-surface-sub/35">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
                        <span>
                          Fiber:{' '}
                          <strong className="text-foreground">
                            {Math.round((entry.nutritionSnapshot?.fiber ?? 0) * 10) / 10}g
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
                          {entry.source.replace('_', ' ')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleDuplicateEntry(entry)}
                        className="tactile-press inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card border border-border text-foreground font-medium hover:bg-surface-elevated"
                      >
                        <CopyPlus className="w-3 h-3" aria-hidden="true" />
                        <span>Log Again</span>
                      </button>
                    </div>
                  )}
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
            <p className="text-xs text-muted-foreground mt-1 max-w-[36ch] mx-auto">
              Search offline staples, scan a barcode, or copy yesterday&apos;s entries to build your log.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {yesterdayEntries.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyYesterday}
                  className="tactile-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-sub hover:bg-surface-elevated text-xs font-semibold text-foreground"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[var(--macro-calories)]" aria-hidden="true" />
                  <span>Copy Yesterday ({yesterdayEntries.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => openSheet('search')}
                className="tactile-press inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90"
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
