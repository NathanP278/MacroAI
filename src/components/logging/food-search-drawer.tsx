"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Search, X, ArrowLeft, Check, Globe, Loader2, Plus } from 'lucide-react';
import { db, generateId } from '@/lib/db/macroai-db';
import {
  formatPortionUnit,
  getServingOptionsForFood,
  scaleFoodByOption,
} from '@/lib/nutrition/scaling';
import { useLoggerStore } from '@/stores/logger-store';
import { loadStaples, filterStaples } from '@/lib/foods/staples-search';
import { searchUsdaFoods } from '@/lib/foods/usda-adapter';
import { searchOffFoods } from '@/lib/foods/off-adapter';
import { FoodRowSkeleton } from '@/components/ui/skeleton';
import { runViewTransition, triggerHaptic } from '@/lib/motion';
import type { FoodItem, FoodLogEntry, FoodServingOption } from '@/types/nutrition';

const onlineQueryCache = new Map<string, FoodItem[]>();
const onlineItemPool = new Map<string, FoodItem>();

/**
 * Clears in-memory online food query caches (intended for tests/reset).
 */
export function clearOnlineSearchCache(): void {
  onlineQueryCache.clear();
  onlineItemPool.clear();
}

export interface FoodSearchDrawerProps {
  open: boolean;
  date?: string;
  mealSlot?: string;
  onClose: () => void;
}

interface FoodSearchContentProps {
  date?: string;
  mealSlot?: string;
  onClose: () => void;
}

function formatFoodBasisLabel(item: FoodItem): string {
  const firstOpt = item.servingOptions?.find((o) => o.unit !== 'g' && o.unit !== 'ml');
  if (item.basis === 'perServing') {
    const count = item.servingSize > 0 ? item.servingSize : 1;
    const unitLabel = formatPortionUnit(count, item.servingUnit || 'serving');
    const gramNote = item.servingWeightGrams ? ` · ${item.servingWeightGrams}g` : '';
    return `(per ${count} ${unitLabel}${gramNote})`;
  }
  if (item.basis === 'per100ml') {
    return firstOpt ? `(per 100ml · 1 ${firstOpt.unit} = ${firstOpt.grams}ml)` : '(per 100ml)';
  }
  return firstOpt ? `(per 100g · 1 ${firstOpt.unit} = ${firstOpt.grams}g)` : '(per 100g)';
}

function FoodSearchContent({ date, mealSlot, onClose }: FoodSearchContentProps) {
  const storeDate = useLoggerStore((s) => s.activeDate);
  const storeMealSlot = useLoggerStore((s) => s.activeMealSlot);
  const searchInitialQuery = useLoggerStore((s) => s.searchInitialQuery);
  const setSearchInitialQuery = useLoggerStore((s) => s.setSearchInitialQuery);

  const effectiveDate = date ?? storeDate;
  const effectiveMealSlot = mealSlot ?? storeMealSlot;

  const [query, setQuery] = useState(() => searchInitialQuery || '');
  const [staples, setStaples] = useState<FoodItem[]>([]);
  const [cachedFoods, setCachedFoods] = useState<FoodItem[]>([]);
  const [onlineResults, setOnlineResults] = useState<FoodItem[]>([]);
  const [isOnlineLoading, setIsOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Portion selection state
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [amount, setAmount] = useState<string>('100');
  const [unit, setUnit] = useState<string>('g');
  const [isLogging, setIsLogging] = useState(false);

  const searchAbortRef = useRef<AbortController | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTopRef = useRef<number>(0);

  // Load offline staples and Dexie foodsCache on mount
  useEffect(() => {
    let isMounted = true;
    async function initOfflineData() {
      try {
        const [loadedStaples, cached] = await Promise.all([
          loadStaples(),
          db.foodsCache.toArray(),
        ]);
        if (isMounted) {
          setStaples(loadedStaples);
          setCachedFoods(cached);
        }
      } catch (err) {
        console.error('Failed to load offline staples/cache:', err);
      }
    }
    initOfflineData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setHighlightedIndex(-1);
    if (!val && searchInitialQuery) {
      setSearchInitialQuery('');
    }
    const normKey = val.trim().toLowerCase();
    if (!normKey) {
      setOnlineResults([]);
      setIsOnlineLoading(false);
      setOnlineError(null);
      return;
    }
    const cachedHit = onlineQueryCache.get(normKey);
    if (cachedHit) {
      setOnlineResults(cachedHit);
      setIsOnlineLoading(false);
      setOnlineError(null);
    }
  };

  // Progressive streaming online search across Open Food Facts (PH + Global) and USDA
  useEffect(() => {
    const trimmed = query.trim();
    const normKey = trimmed.toLowerCase();
    if (!trimmed) return;

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const abortController = new AbortController();
    searchAbortRef.current = abortController;

    const cachedHit = onlineQueryCache.get(normKey);
    if (cachedHit) {
      setOnlineResults(cachedHit);
      setIsOnlineLoading(false);
      setOnlineError(null);
      return () => {
        abortController.abort();
      };
    }

    setOnlineResults([]);
    setIsOnlineLoading(true);
    setOnlineError(null);

    const runOnlineSearch = () => {
      if (abortController.signal.aborted) return;

      const mergedMap = new Map<string, FoodItem>();
      const seenNames = new Set<string>();
      let settledCount = 0;
      let failureCount = 0;

      const providers = [
        searchOffFoods(trimmed, { country: 'ph', signal: abortController.signal }),
        searchUsdaFoods(trimmed, { signal: abortController.signal, includeBranded: true }),
        searchOffFoods(trimmed, { country: 'world', signal: abortController.signal }),
      ];

      const markSettled = () => {
        if (abortController.signal.aborted) return;
        settledCount += 1;
        if (settledCount === providers.length) {
          const finalList = Array.from(mergedMap.values()).slice(0, 40);
          if (failureCount === providers.length) {
            setOnlineError('Online search unavailable. Showing local & cached matches.');
          } else {
            onlineQueryCache.set(normKey, finalList);
          }
          setIsOnlineLoading(false);
        }
      };

      for (const promise of providers) {
        promise
          .then((items) => {
            if (abortController.signal.aborted) return;
            let added = false;
            for (const item of items) {
              onlineItemPool.set(item.id, item);
              const nameKey = `${(item.name || '').toLowerCase().trim()}|${(item.brand || '').toLowerCase().trim()}`;
              if (mergedMap.has(item.id) || (nameKey !== '|' && seenNames.has(nameKey))) {
                continue;
              }
              seenNames.add(nameKey);
              mergedMap.set(item.id, item);
              added = true;
            }
            if (added) {
              setOnlineResults(Array.from(mergedMap.values()).slice(0, 40));
            }
          })
          .catch(() => {
            if (!abortController.signal.aborted) {
              failureCount += 1;
            }
          })
          .finally(markSettled);
      }
    };

    const timer = setTimeout(runOnlineSearch, 60);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [query]);

  // Unified pool combining local Dexie cache, offline staples + PH foods, and streamed online results
  const combinedPool = React.useMemo(() => {
    const map = new Map<string, FoodItem>();
    for (const item of cachedFoods) {
      map.set(item.id, item);
    }
    for (const item of staples) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    for (const item of onlineResults) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    if (query.trim()) {
      for (const [id, item] of onlineItemPool) {
        if (!map.has(id)) {
          map.set(id, item);
        }
      }
    }
    return Array.from(map.values());
  }, [cachedFoods, staples, onlineResults, query]);

  const displayedResults = React.useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return filterStaples(combinedPool, '', 40);
    }

    const ranked = filterStaples(combinedPool, trimmed, 40);
    const seenIds = new Set(ranked.map((r) => r.id));
    const seenNames = new Set(
      ranked.map(
        (r) => `${(r.name || '').toLowerCase().trim()}|${(r.brand || '').toLowerCase().trim()}`
      )
    );

    const combined = [...ranked];
    for (const item of onlineResults) {
      if (combined.length >= 48) break;
      const nameKey = `${(item.name || '').toLowerCase().trim()}|${(item.brand || '').toLowerCase().trim()}`;
      if (seenIds.has(item.id) || (nameKey !== '|' && seenNames.has(nameKey))) {
        continue;
      }
      seenIds.add(item.id);
      seenNames.add(nameKey);
      combined.push(item);
    }

    return combined;
  }, [combinedPool, query, onlineResults]);

  const servingOptions = React.useMemo(
    () => (selectedFood ? getServingOptionsForFood(selectedFood) : []),
    [selectedFood]
  );

  const activeServingOption = React.useMemo(
    () =>
      servingOptions.find((o) => o.id === selectedOptionId) ?? servingOptions[0],
    [servingOptions, selectedOptionId]
  );

  const handleSelectServingOption = (opt: FoodServingOption) => {
    setSelectedOptionId(opt.id);
    const nextAmount =
      opt.defaultAmount ?? (opt.unit === 'g' || opt.unit === 'ml' ? 100 : 1);
    setAmount(String(nextAmount));
    setUnit(formatPortionUnit(nextAmount, opt.unit));
  };

  const handleSelectFood = (food: FoodItem) => {
    const options = getServingOptionsForFood(food);
    const preferred =
      food.servingUnit !== 'g' && food.servingUnit !== 'ml'
        ? options.find((o) => o.unit === food.servingUnit) ??
          options.find((o) => o.unit !== 'g' && o.unit !== 'ml') ??
          options[0]
        : options.find(
            (o) =>
              o.unit !== 'g' &&
              o.unit !== 'ml' &&
              o.id === food.servingOptions?.[0]?.id
          ) ?? options[0];

    const initialAmount =
      preferred?.defaultAmount ??
      (preferred?.unit === 'g' || preferred?.unit === 'ml'
        ? food.servingSize || 100
        : food.servingSize || 1);
    const initialUnit = formatPortionUnit(
      initialAmount,
      preferred?.unit || food.servingUnit || 'g'
    );

    if (resultsContainerRef.current) {
      savedScrollTopRef.current = resultsContainerRef.current.scrollTop;
    }
    triggerHaptic(8);
    runViewTransition(
      () => {
        setSelectedFood(food);
        setSelectedOptionId(preferred?.id ?? '');
        setAmount(String(initialAmount));
        setUnit(initialUnit);
      },
      { direction: 'forward' }
    );
  };

  const handleBackToResults = () => {
    triggerHaptic(6);
    runViewTransition(
      () => {
        setSelectedFood(null);
      },
      { direction: 'backward' }
    );
  };

  useLayoutEffect(() => {
    if (!selectedFood && resultsContainerRef.current) {
      resultsContainerRef.current.scrollTop = savedScrollTopRef.current;
    }
  }, [selectedFood]);

  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (
      activeServingOption &&
      activeServingOption.unit !== 'g' &&
      activeServingOption.unit !== 'ml'
    ) {
      const parsed = parseFloat(val);
      if (Number.isFinite(parsed) && parsed > 0) {
        setUnit(formatPortionUnit(parsed, activeServingOption.unit));
      }
    }
  };

  const parsedAmount = Math.max(0, parseFloat(amount) || 0);

  const scaledNutrition = React.useMemo(() => {
    if (!selectedFood) return null;
    return scaleFoodByOption(selectedFood, parsedAmount, activeServingOption);
  }, [selectedFood, parsedAmount, activeServingOption]);

  const handleLogFood = async () => {
    if (!selectedFood || isLogging) return;
    setIsLogging(true);

    try {
      const scaled = scaleFoodByOption(
        selectedFood,
        parsedAmount,
        activeServingOption
      );
      const normalizedUnit = formatPortionUnit(
        parsedAmount,
        unit.trim() || activeServingOption?.unit || 'g'
      );

      const entry: FoodLogEntry = {
        id: generateId(),
        date: effectiveDate,
        mealSlot: effectiveMealSlot,
        foodId: selectedFood.id,
        name: selectedFood.name,
        source: selectedFood.source,
        amount: parsedAmount,
        unit: normalizedUnit,
        nutritionSnapshot: {
          calories: scaled.macros.calories,
          protein: scaled.macros.protein,
          carbs: scaled.macros.carbs,
          fat: scaled.macros.fat,
          fiber: scaled.macros.fiber,
          micros: scaled.micros,
        },
        createdAt: Date.now(),
      };

      await db.foodLogs.add(entry);
      // Ensure food is cached for instant future offline recall
      await db.foodsCache.put(selectedFood);

      triggerHaptic(10);
      if (searchInitialQuery) {
        setSearchInitialQuery('');
      }
      onClose();
    } catch (err) {
      console.error('Failed to log food:', err);
    } finally {
      setIsLogging(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedFood) {
          handleBackToResults();
        } else {
          onClose();
        }
        return;
      }

      if (!selectedFood && displayedResults.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < displayedResults.length - 1 ? prev + 1 : 0
          );
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : displayedResults.length - 1
          );
          return;
        }
        if (e.key === 'Enter' && highlightedIndex >= 0 && displayedResults[highlightedIndex]) {
          e.preventDefault();
          handleSelectFood(displayedResults[highlightedIndex]);
          return;
        }
      }

      if (
        selectedFood &&
        e.key === 'Enter' &&
        (e.target as HTMLElement | null)?.tagName !== 'BUTTON' &&
        parsedAmount > 0 &&
        !isLogging
      ) {
        e.preventDefault();
        void handleLogFood();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Food Search"
      data-testid="food-search-drawer"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-6 bg-black/70 backdrop-blur-xs animate-backdrop-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-auto surface-elevated-sheet rounded-t-3xl sm:rounded-3xl px-4 sm:px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 animate-sheet-in sm:animate-modal-in max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full bg-border mx-auto mb-3 shrink-0 sm:hidden" aria-hidden="true" />
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            {selectedFood ? (
              <button
                type="button"
                onClick={handleBackToResults}
                aria-label="Back to search results"
                className="touch-target tactile-press p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub mr-0.5"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-[var(--macro-carbs)]/15 flex items-center justify-center text-[var(--macro-carbs)]">
                <Search className="w-4 h-4" aria-hidden="true" />
              </div>
            )}
            <div>
              <h2
                style={{ viewTransitionName: 'selected-food-header' }}
                className="text-sm font-semibold text-foreground line-clamp-1"
              >
                {selectedFood ? selectedFood.name : 'Search Foods'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Logging for {effectiveDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close food search"
            className="touch-target tactile-press p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Portion Selector View */}
        {selectedFood ? (() => {
          const metricUnit =
            activeServingOption?.unit === 'ml' || selectedFood.basis === 'per100ml'
              ? 'ml'
              : 'g';
          const isMetricMode =
            !activeServingOption ||
            activeServingOption.unit === 'g' ||
            activeServingOption.unit === 'ml';
          const countablePresets = [0.5, 1, 1.5, 2, 3];
          const metricPresets = [50, 100, 150, 200, 250];

          return (
          <div key={selectedFood.id} className="pt-4 flex-1 overflow-y-auto overscroll-contain space-y-4 animate-panel-switch">
            <div className="bg-surface-sub border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">Portion Amount</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {activeServingOption && !isMetricMode
                    ? `Basis: 1 ${activeServingOption.unit}${activeServingOption.grams > 0 ? ` (${activeServingOption.grams}g)` : ''}`
                    : `Basis: ${selectedFood.servingSize || 100} ${selectedFood.servingUnit || 'g'}`}
                </span>
              </div>

              {/* Serving Unit Selector Pills (ONLY when countable options apply) */}
              {servingOptions.length > 1 && (
                <div
                  role="group"
                  aria-label="Serving unit options"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  {servingOptions.map((opt) => {
                    const isActive = activeServingOption?.id === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectServingOption(opt)}
                        aria-pressed={isActive}
                        className={`tactile-press px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                          isActive
                            ? 'bg-foreground text-background border-foreground shadow-xs'
                            : 'bg-card text-muted-foreground border-border hover:text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    aria-label="Portion amount"
                    type="number"
                    step="any"
                    min="0"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full px-3 py-2 text-base font-semibold tabular-nums rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  />
                </div>
                <div className="w-24">
                  <input
                    aria-label="Portion unit"
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs font-medium rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-center"
                  />
                </div>
              </div>

              {/* Quick Portion Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {isMetricMode
                    ? metricPresets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setAmount(String(preset));
                            setUnit(metricUnit);
                          }}
                          className={`tactile-press px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                            amount === String(preset) && unit === metricUnit
                              ? 'bg-foreground text-background shadow-xs'
                              : 'bg-card text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {preset}{metricUnit}
                        </button>
                      ))
                    : countablePresets.map((preset) => {
                        const presetUnit = formatPortionUnit(
                          preset,
                          activeServingOption.unit
                        );
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setAmount(String(preset));
                              setUnit(presetUnit);
                            }}
                            className={`tactile-press px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                              parsedAmount === preset
                                ? 'bg-foreground text-background shadow-xs'
                                : 'bg-card text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {preset} {presetUnit}
                          </button>
                        );
                      })}
                </div>
                {!isMetricMode && scaledNutrition?.effectiveGrams !== undefined && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    &asymp; {scaledNutrition.effectiveGrams}g
                  </span>
                )}
              </div>
            </div>

            {/* Scaled Macro Summary */}
            {scaledNutrition && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-foreground">Scaled Nutrition</span>
                  <span className="text-xs font-bold text-[var(--macro-calories)] tabular-nums">
                    {scaledNutrition.macros.calories} kcal
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-surface-sub border border-border rounded-xl p-2">
                    <span className="text-[10px] text-[var(--macro-protein)] font-semibold block">Protein</span>
                    <span className="text-xs font-semibold tabular-nums text-foreground">
                      {scaledNutrition.macros.protein}g
                    </span>
                  </div>
                  <div className="bg-surface-sub border border-border rounded-xl p-2">
                    <span className="text-[10px] text-[var(--macro-carbs)] font-semibold block">Carbs</span>
                    <span className="text-xs font-semibold tabular-nums text-foreground">
                      {scaledNutrition.macros.carbs}g
                    </span>
                  </div>
                  <div className="bg-surface-sub border border-border rounded-xl p-2">
                    <span className="text-[10px] text-[var(--macro-fat)] font-semibold block">Fat</span>
                    <span className="text-xs font-semibold tabular-nums text-foreground">
                      {scaledNutrition.macros.fat}g
                    </span>
                  </div>
                  <div className="bg-surface-sub border border-border rounded-xl p-2">
                    <span className="text-[10px] text-[var(--macro-fiber)] font-semibold block">Fiber</span>
                    <span className="text-xs font-semibold tabular-nums text-foreground">
                      {scaledNutrition.macros.fiber}g
                    </span>
                  </div>
                </div>

                {/* Micronutrients Pill Row (if any available) */}
                {Object.keys(scaledNutrition.micros).length > 0 && (
                  <div className="bg-surface-sub/50 border border-border rounded-xl p-2.5 text-[10px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                    {scaledNutrition.micros.potassiumMg !== undefined && (
                      <span>Potassium: <strong className="text-foreground tabular-nums">{scaledNutrition.micros.potassiumMg}mg</strong></span>
                    )}
                    {scaledNutrition.micros.sodiumMg !== undefined && (
                      <span>Sodium: <strong className="text-foreground tabular-nums">{scaledNutrition.micros.sodiumMg}mg</strong></span>
                    )}
                    {scaledNutrition.micros.calciumMg !== undefined && (
                      <span>Calcium: <strong className="text-foreground tabular-nums">{scaledNutrition.micros.calciumMg}mg</strong></span>
                    )}
                    {scaledNutrition.micros.ironMg !== undefined && (
                      <span>Iron: <strong className="text-foreground tabular-nums">{scaledNutrition.micros.ironMg}mg</strong></span>
                    )}
                    {scaledNutrition.micros.magnesiumMg !== undefined && (
                      <span>Magnesium: <strong className="text-foreground tabular-nums">{scaledNutrition.micros.magnesiumMg}mg</strong></span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Confirm Log Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogFood}
                disabled={isLogging || parsedAmount <= 0}
                className="tactile-press w-full py-2.5 px-4 rounded-full bg-foreground text-background font-semibold text-xs hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isLogging ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>Log Food</span>
              </button>
            </div>
          </div>
          );
        })() : (
          /* Search View */
          <div className="pt-3 flex-1 flex flex-col min-h-0 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="text"
                aria-label="Search foods"
                placeholder="Search foods, brands, PH staples & online databases..."
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-8 py-2 text-base sm:text-sm rounded-xl bg-surface-sub border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground/50 transition-shadow"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => handleQueryChange('')}
                  aria-label="Clear search query"
                  className="touch-target absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Non-Blocking Online Status Indicator */}
            {query.trim() && (isOnlineLoading || onlineError) && (
              <div className="flex items-center gap-1.5 px-1 text-[11px]">
                {isOnlineLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-[var(--macro-calories)] shrink-0" aria-hidden="true" />
                    <span className="text-muted-foreground">Searching Open Food Facts &amp; USDA...</span>
                  </>
                ) : (
                  <span className="text-[var(--neutral-over)]">{onlineError}</span>
                )}
              </div>
            )}

            {/* Results */}
            <div
              ref={resultsContainerRef}
              data-testid="food-search-results"
              className="flex-1 overflow-y-auto overscroll-contain space-y-1.5 min-h-[200px] sm:min-h-[280px] max-h-[52dvh] sm:max-h-[420px] pr-0.5"
            >
              {displayedResults.length > 0 ? (
                displayedResults.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    data-highlighted={highlightedIndex === idx ? 'true' : undefined}
                    style={{ animationDelay: `${Math.min(idx, 8) * 25}ms` }}
                    onClick={() => handleSelectFood(item)}
                    className={`tactile-press stagger-item w-full text-left p-3 rounded-xl border group flex items-center justify-between gap-3 ${
                      highlightedIndex === idx
                        ? 'bg-accent border-border-focus'
                        : 'bg-surface-sub hover:bg-accent border-border hover:border-border-focus'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-foreground">
                          {item.name}
                        </span>
                        {item.region === 'PH' && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-semibold bg-emerald-500/15 text-emerald-500 shrink-0">
                            PH
                          </span>
                        )}
                        <span
                          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-medium shrink-0 inline-flex items-center gap-1 ${
                            item.source === 'staple'
                              ? 'bg-[var(--macro-carbs)]/15 text-[var(--macro-carbs)]'
                              : 'bg-[var(--macro-calories)]/15 text-[var(--macro-calories)]'
                          }`}
                        >
                          {(item.source === 'off' || item.source === 'usda') && (
                            <Globe className="w-2.5 h-2.5" aria-hidden="true" />
                          )}
                          {item.source}
                        </span>
                      </div>
                      {item.brand && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {item.brand}
                        </p>
                      )}
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[11px] text-muted-foreground tabular-nums">
                        <span className="text-[var(--macro-calories)] font-semibold">
                          {item.nutrientsPerBasis.calories} kcal
                        </span>
                        <span>&bull;</span>
                        <span className="text-[var(--macro-protein)]">
                          P: {item.nutrientsPerBasis.protein}g
                        </span>
                        <span className="text-[var(--macro-carbs)]">
                          C: {item.nutrientsPerBasis.carbs}g
                        </span>
                        <span className="text-[var(--macro-fat)]">
                          F: {item.nutrientsPerBasis.fat}g
                        </span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {formatFoodBasisLabel(item)}
                        </span>
                      </div>
                    </div>
                    <div className="p-1.5 rounded-full bg-card text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors shrink-0">
                      <Plus className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </button>
                ))
              ) : isOnlineLoading ? (
                <FoodRowSkeleton count={4} />
              ) : (
                <div className="py-10 text-center text-muted-foreground text-xs flex flex-col items-center gap-2.5">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 36 36"
                    fill="none"
                    aria-hidden="true"
                    className="text-muted-foreground/45"
                  >
                    <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M23.5 23.5L31 31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <p>
                    {query.trim()
                      ? 'No matching foods found.'
                      : 'Search offline staples, PH foods, or online Open Food Facts & USDA databases above.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FoodSearchDrawer({ open, date, mealSlot, onClose }: FoodSearchDrawerProps) {
  if (!open) return null;
  return (
    <FoodSearchContent
      key={`${date}-${mealSlot}`}
      date={date}
      mealSlot={mealSlot}
      onClose={onClose}
    />
  );
}
