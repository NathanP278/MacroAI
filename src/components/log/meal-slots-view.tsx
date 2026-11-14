'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/macroai-db';
import { useLoggerStore } from '@/stores/logger-store';
import { distributeRemainingMacros } from '@/lib/nutrition/meal-distribution';
import { copyYesterdayMeal, offsetIsoDate } from '@/lib/recipes/recipe-builder';
import { DEFAULT_MEAL_SLOTS, DEFAULT_RDA_MICROS } from '@/lib/nutrition/goals';
import type { UserGoals, FoodLogEntry } from '@/types/nutrition';
import { Plus, RotateCcw, Trash2, Sparkles, Utensils, Check } from 'lucide-react';

export function MealSlotsView() {
  const activeDate = useLoggerStore((s) => s.activeDate);
  const openSheet = useLoggerStore((s) => s.openSheet);
  const [copyFeedback, setCopyFeedback] = useState<Record<string, string>>({});
  const feedbackTimersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  React.useEffect(() => {
    return () => {
      Object.values(feedbackTimersRef.current).forEach((timer) => clearTimeout(timer));
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

  for (const entry of logs) {
    if (entry.nutritionSnapshot) {
      totalCalories += Number(entry.nutritionSnapshot.calories) || 0;
      totalProtein += Number(entry.nutritionSnapshot.protein) || 0;
      totalCarbs += Number(entry.nutritionSnapshot.carbs) || 0;
      totalFat += Number(entry.nutritionSnapshot.fat) || 0;
    }
  }

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
    <div className="flex flex-col gap-4">
      {/* Daily Consumed Summary Banner (Adherence-Neutral) */}
      <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-xs">
        <div>
          <span className="text-xs text-muted-foreground font-medium">Daily Consumed</span>
          <div className="text-xl font-bold tabular-nums text-foreground mt-0.5">
            {Math.round(totalCalories).toLocaleString()}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              / {activeGoals.dailyCalories.toLocaleString()} kcal
            </span>
          </div>
        </div>
        <div className="flex gap-3 text-right font-mono text-xs">
          <div>
            <div className="text-sky-400 font-semibold tabular-nums">
              {Math.round(totalProtein)}g
            </div>
            <div className="text-[10px] text-muted-foreground">Pro</div>
          </div>
          <div>
            <div className="text-emerald-400 font-semibold tabular-nums">
              {Math.round(totalCarbs)}g
            </div>
            <div className="text-[10px] text-muted-foreground">Carb</div>
          </div>
          <div>
            <div className="text-rose-400 font-semibold tabular-nums">
              {Math.round(totalFat)}g
            </div>
            <div className="text-[10px] text-muted-foreground">Fat</div>
          </div>
        </div>
      </div>

      {/* Meal Slots List */}
      <div className="space-y-4">
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
              className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 shadow-xs"
            >
              {/* Slot Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">{slot.name}</h3>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {Math.round(slotCalories)} kcal
                    {slotLogs.length > 0 && (
                      <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                        ({Math.round(slotProtein)}P · {Math.round(slotCarbs)}C ·{' '}
                        {Math.round(slotFat)}F)
                      </span>
                    )}
                  </p>
                </div>

                {/* Per-Slot Add Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openSheet('search', slot.id)}
                    aria-label={`Add food to ${slot.name}`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface-sub hover:bg-surface border border-border text-xs font-medium text-foreground transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Fitia-Style Recommendation Chip on Unlogged Slot */}
              {isUnlogged && budget && (
                <div
                  data-testid={`budget-chip-${slot.id}`}
                  className="bg-surface-sub border border-border/80 rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Recommended</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-foreground">
                    <span className="font-semibold tabular-nums">~{budget.calories} kcal</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-sky-400 tabular-nums">{budget.protein}g P</span>
                    <span className="text-emerald-400 tabular-nums">{budget.carbs}g C</span>
                    <span className="text-rose-400 tabular-nums">{budget.fat}g F</span>
                  </div>
                </div>
              )}

              {/* 1-Tap Copy Yesterday's Meal Slot */}
              {hasYesterday && (
                <div className="flex items-center justify-between pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleCopyYesterday(slot.id, slot.name)}
                    aria-label={`Copy Yesterday's ${slot.name}`}
                    className="flex items-center gap-1.5 text-xs text-amber-400/90 hover:text-amber-300 font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Copy Yesterday's {slot.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ({yesterdaySlotLogs.length})
                    </span>
                  </button>
                  {feedback && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <Check className="w-3 h-3" />
                      {feedback}
                    </span>
                  )}
                </div>
              )}

              {/* Logged Entries in this Slot */}
              {slotLogs.length > 0 ? (
                <div className="space-y-2 pt-1 border-t border-border/50">
                  {slotLogs.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between bg-surface-sub/50 hover:bg-surface-sub rounded-xl px-3 py-2 text-xs transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-medium text-foreground truncate">{entry.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {entry.amount} {entry.unit} · {Math.round(entry.nutritionSnapshot?.calories || 0)} kcal ·{' '}
                          {Math.round(entry.nutritionSnapshot?.protein || 0)}P ·{' '}
                          {Math.round(entry.nutritionSnapshot?.carbs || 0)}C ·{' '}
                          {Math.round(entry.nutritionSnapshot?.fat || 0)}F
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry.id)}
                        aria-label={`Delete ${entry.name}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                !hasYesterday && (
                  <div className="text-[11px] text-muted-foreground py-1 text-center flex items-center justify-center gap-1">
                    <Utensils className="w-3 h-3 opacity-60" />
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
