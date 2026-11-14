"use client";

import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Zap, AlertCircle } from 'lucide-react';
import { db, generateId } from '@/lib/db/macroai-db';
import { computeMacroCalories } from '@/lib/nutrition/scaling';
import { useLoggerStore } from '@/stores/logger-store';
import type { FoodLogEntry } from '@/types/nutrition';

export interface QuickAddDrawerProps {
  open: boolean;
  date?: string;
  mealSlot?: string;
  onClose: () => void;
}

interface QuickAddContentProps {
  date?: string;
  mealSlot?: string;
  onClose: () => void;
}

function QuickAddContent({ date, mealSlot, onClose }: QuickAddContentProps) {
  const storeDate = useLoggerStore((s) => s.activeDate);
  const storeMealSlot = useLoggerStore((s) => s.activeMealSlot);

  const effectiveDate = date ?? storeDate;
  const effectiveMealSlot = mealSlot ?? storeMealSlot;

  const [name, setName] = useState('Quick Add');
  const [protein, setProtein] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [fat, setFat] = useState<string>('');
  const [fiber, setFiber] = useState<string>('');
  const [calories, setCalories] = useState<string>('0');
  const [isCalorieOverridden, setIsCalorieOverridden] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const parseSafe = (val: string): number => {
    const num = parseFloat(val);
    return Number.isFinite(num) && num > 0 ? num : 0;
  };

  const handleMacroChange = (macro: 'p' | 'c' | 'f', val: string) => {
    const newP = macro === 'p' ? val : protein;
    const newC = macro === 'c' ? val : carbs;
    const newF = macro === 'f' ? val : fat;

    if (macro === 'p') setProtein(val);
    if (macro === 'c') setCarbs(val);
    if (macro === 'f') setFat(val);

    if (!isCalorieOverridden) {
      const p = parseSafe(newP);
      const c = parseSafe(newC);
      const f = parseSafe(newF);
      setCalories(String(computeMacroCalories(p, c, f)));
    }
  };

  const handleCaloriesChange = (val: string) => {
    setIsCalorieOverridden(true);
    setCalories(val);
  };

  const handleSyncToMacros = () => {
    setIsCalorieOverridden(false);
    const p = parseSafe(protein);
    const c = parseSafe(carbs);
    const f = parseSafe(fat);
    setCalories(String(computeMacroCalories(p, c, f)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const safeP = parseSafe(protein);
      const safeC = parseSafe(carbs);
      const safeF = parseSafe(fat);
      const safeFiber = parseSafe(fiber);
      const safeCal = parseSafe(calories);

      const entry: FoodLogEntry = {
        id: generateId(),
        date: effectiveDate,
        mealSlot: effectiveMealSlot,
        foodId: `quick-add-${generateId()}`,
        name: name.trim() || 'Quick Add',
        source: 'quick_add',
        amount: 1,
        unit: 'serving',
        nutritionSnapshot: {
          calories: safeCal,
          protein: safeP,
          carbs: safeC,
          fat: safeF,
          fiber: safeFiber,
          micros: {},
        },
        createdAt: Date.now(),
      };

      await db.foodLogs.add(entry);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to log quick add entry:', err);
      setErrorMessage('Unable to save log entry offline. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick Add Macros"
      data-testid="quick-add-drawer"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-auto bg-surface-elevated border-t border-x border-border rounded-t-3xl px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-sheet-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full bg-border mx-auto mb-3" aria-hidden="true" />
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--macro-fat)]/15 flex items-center justify-center text-[var(--macro-fat)]">
              <Zap className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Quick Add Macros</h2>
              <p className="text-[11px] text-muted-foreground capitalize">
                Logging to {effectiveMealSlot} &bull; {effectiveDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick add"
            className="touch-target macro-spring active:scale-90 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="pt-4 space-y-4">
          <div>
            <label htmlFor="quick-add-name" className="block text-[11px] font-medium text-muted-foreground mb-1">
              Description (Optional)
            </label>
            <input
              id="quick-add-name"
              aria-label="Description"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Protein shake, Snack"
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-sub border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground/50 transition-shadow"
            />
          </div>

          {/* Calories row with override indicator & sync */}
          <div className="bg-surface-sub border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="quick-add-calories" className="text-xs font-semibold text-foreground">
                Calories (kcal)
              </label>
              <button
                type="button"
                onClick={handleSyncToMacros}
                aria-label="Sync to macros"
                className="macro-spring active:scale-95 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-full bg-card border border-border"
              >
                <RefreshCw
                  className={`w-2.5 h-2.5 ${isCalorieOverridden ? 'text-[var(--macro-calories)]' : ''}`}
                  aria-hidden="true"
                />
                <span>Sync to macros</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="quick-add-calories"
                aria-label="Calories"
                type="number"
                step="any"
                value={calories}
                onChange={(e) => handleCaloriesChange(e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold tabular-nums rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
            {isCalorieOverridden && (
              <p className="text-[10px] text-[var(--macro-calories)] font-medium">
                Manual calorie override active (does not recalculate from macros)
              </p>
            )}
          </div>

          {/* Macro grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface-sub border border-border rounded-xl p-2.5">
              <label htmlFor="quick-add-protein" className="block text-[10px] font-semibold text-[var(--macro-protein)] mb-1">
                Protein (g)
              </label>
              <input
                id="quick-add-protein"
                aria-label="Protein"
                type="number"
                step="any"
                value={protein}
                onChange={(e) => handleMacroChange('p', e.target.value)}
                placeholder="0"
                className="w-full px-2 py-1.5 text-xs font-semibold tabular-nums rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            <div className="bg-surface-sub border border-border rounded-xl p-2.5">
              <label htmlFor="quick-add-carbs" className="block text-[10px] font-semibold text-[var(--macro-carbs)] mb-1">
                Carbs (g)
              </label>
              <input
                id="quick-add-carbs"
                aria-label="Carbs"
                type="number"
                step="any"
                value={carbs}
                onChange={(e) => handleMacroChange('c', e.target.value)}
                placeholder="0"
                className="w-full px-2 py-1.5 text-xs font-semibold tabular-nums rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>

            <div className="bg-surface-sub border border-border rounded-xl p-2.5">
              <label htmlFor="quick-add-fat" className="block text-[10px] font-semibold text-[var(--macro-fat)] mb-1">
                Fat (g)
              </label>
              <input
                id="quick-add-fat"
                aria-label="Fat"
                type="number"
                step="any"
                value={fat}
                onChange={(e) => handleMacroChange('f', e.target.value)}
                placeholder="0"
                className="w-full px-2 py-1.5 text-xs font-semibold tabular-nums rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
          </div>

          {/* Optional Fiber */}
          <div className="bg-surface-sub border border-border rounded-xl p-2.5 flex items-center justify-between">
            <label htmlFor="quick-add-fiber" className="text-[11px] font-medium text-muted-foreground">
              Fiber (g, optional)
            </label>
            <input
              id="quick-add-fiber"
              aria-label="Fiber"
              type="number"
              step="any"
              value={fiber}
              onChange={(e) => setFiber(e.target.value)}
              placeholder="0"
              className="w-24 px-2 py-1 text-xs tabular-nums text-right rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="p-2.5 rounded-xl bg-surface-sub border border-border text-[var(--neutral-over)] text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSaving}
            className="macro-spring active:scale-95 w-full py-2.5 px-4 rounded-full bg-foreground text-background font-semibold text-xs hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Zap className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Log Quick Add</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export function QuickAddDrawer({ open, date, mealSlot, onClose }: QuickAddDrawerProps) {
  if (!open) return null;
  return <QuickAddContent key={`${date}-${mealSlot}`} date={date} mealSlot={mealSlot} onClose={onClose} />;
}
