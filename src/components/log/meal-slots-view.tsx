'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/macroai-db';
import { useLoggerStore } from '@/stores/logger-store';
import { distributeRemainingMacros } from '@/lib/nutrition/meal-distribution';
import { copyYesterdayMeal, offsetIsoDate } from '@/lib/recipes/recipe-builder';
import { DEFAULT_MEAL_SLOTS, DEFAULT_RDA_MICROS } from '@/lib/nutrition/goals';
import type { UserGoals } from '@/types/nutrition';
import { Plus, RotateCcw, Trash2, Sparkles, Utensils, Check } from 'lucide-react';

export function MealSlotsView() {
  const activeDate = useLoggerStore((s) => s.activeDate);
  const openSheet = useLoggerStore((s) => s.openSheet);
  const [copyFeedback, setCopyFeedback] = useState<Record<string, string>>({});
  const feedbackTimersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  React.useEffect(() => {
    const timers = feedbackTimersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
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
    mealSlots: [...DEFAULT_MEAL_SLOTS],
    updatedAt: 0,
  };

  const activeGoals = userGoals ?? fallbackGoals;
  const logs = todayLogs ?? [];
  const yesterdayEntries = yesterdayLogs ?? [];
  const mealSlots = activeGoals.mealSlots?.length ? activeGoals.mealSlots : DEFAULT_MEAL_SLOTS;

  // Fitia-style remaining macro budgets
  const remainingBudgets = distributeRemainingMacros(activeGoals, logs);

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

  const handleCopyYesterday = async (slotId: string, slotName: string) => {
    try {
      const count = await copyYesterdayMeal(activeDate, slotId);
      if (count > 0) {
        setCopyFeedback((prev) => ({
          ...prev,
          [slotId]: `Copied ${count} item${count > 1 ? 's' : ''}`,
        }));
        if (feedbackTimersRef.current[slotId]) {
          clearTimeout(feedbackTimersRef.current[slotId]);
        }
        feedbackTimersRef.current[slotId] = setTimeout(() => {
          setCopyFeedback((prev) => {
            const next = { ...prev };
            delete next[slotId];
            return next;
          });
          delete feedbackTimersRef.current[slotId];
        }, 2500);
      }
    } catch (err) {
      console.error(`Failed to copy yesterday's ${slotName}:`, err);
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

      {/* Meal Slots Responsive 2-Column Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {mealSlots.map((slot) => {
          const slotLogs = logs.filter((l) => l.mealSlot === slot.id);
          const yesterdaySlotLogs = yesterdayEntries.filter((l) => l.mealSlot === slot.id);
          const isUnlogged = slotLogs.length === 0;
          const budget = remainingBudgets[slot.id];
          const hasYesterday = yesterdaySlotLogs.length > 0;
          const feedback = copyFeedback[slot.id];

          // Compute slot consumed
          let slotCalories = 0;
          let slotProtein = 0;
          let slotCarbs = 0;
          let slotFat = 0;
          for (const l of slotLogs) {
            slotCalories += Number(l.nutritionSnapshot?.calories) || 0;
            slotProtein += Number(l.nutritionSnapshot?.protein) || 0;
            slotCarbs += Number(l.nutritionSnapshot?.carbs) || 0;
            slotFat += Number(l.nutritionSnapshot?.fat) || 0;
          }

          return (
            <div
              key={slot.id}
              data-testid={`meal-slot-card-${slot.id}`}
              className="bg-card border border-border/50 macro-card-interactive rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5"
            >
              {/* Slot Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">{slot.name}</h3>
                  <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                    <span className="font-semibold text-[var(--macro-calories)]">
                      {Math.round(slotCalories)} kcal
                    </span>
                    {slotLogs.length > 0 && (
                      <span className="ml-1.5 text-[11px] text-muted-foreground">
                        ({Math.round(slotProtein)}P · {Math.round(slotCarbs)}C ·{' '}
                        {Math.round(slotFat)}F)
                      </span>
                    )}
                  </p>
                </div>

                {/* Per-Slot Add Action */}
                <button
                  type="button"
                  onClick={() => openSheet('search', slot.id)}
                  aria-label={`Add food to ${slot.name}`}
                  className="touch-target macro-spring active:scale-95 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-sub hover:bg-foreground hover:text-background text-xs font-semibold text-foreground"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add</span>
                </button>
              </div>

              {/* Fitia-Style Recommendation Chip on Unlogged Slot */}
              {isUnlogged && budget && (
                <div
                  data-testid={`budget-chip-${slot.id}`}
                  className="bg-surface-sub rounded-xl px-3 py-2.5 flex flex-col gap-1.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[var(--macro-calories)] font-medium">
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Recommended</span>
                    </div>
                    <span className="text-[11px] font-semibold text-foreground tabular-nums">
                      ~{budget.calories} kcal
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] tabular-nums">
                    <span className="text-[var(--macro-protein)] font-semibold">
                      {budget.protein}g P
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-[var(--macro-carbs)] font-semibold">
                      {budget.carbs}g C
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-[var(--macro-fat)] font-semibold">
                      {budget.fat}g F
                    </span>
                  </div>
                </div>
              )}

              {/* 1-Tap Copy Yesterday's Meal Slot */}
              {hasYesterday && (
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleCopyYesterday(slot.id, slot.name)}
                    aria-label={`Copy Yesterday's ${slot.name}`}
                    className="macro-spring active:scale-95 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-sub hover:bg-surface-elevated text-xs text-foreground font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[var(--macro-calories)]" aria-hidden="true" />
                    <span>Copy Yesterday&apos;s {slot.name}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      ({yesterdaySlotLogs.length})
                    </span>
                  </button>
                  {feedback && (
                    <span className="animate-check-pop text-[11px] text-[var(--macro-carbs)] flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      {feedback}
                    </span>
                  )}
                </div>
              )}

              {/* Logged Entries in this Slot */}
              {slotLogs.length > 0 ? (
                <div className="space-y-2 pt-1.5 border-t border-border/60">
                  {slotLogs.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between bg-surface-sub/60 hover:bg-surface-sub rounded-xl px-3 py-2.5 text-xs transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-medium text-foreground truncate">{entry.name}</div>
                        <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                          {entry.amount} {entry.unit} · {Math.round(entry.nutritionSnapshot?.calories || 0)} kcal ·{' '}
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
                        className="touch-target macro-spring active:scale-90 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                !hasYesterday && (
                  <div className="text-xs text-muted-foreground py-2 text-center flex items-center justify-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                    <span>No entries logged yet</span>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
