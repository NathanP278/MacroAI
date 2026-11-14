"use client";

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { Search, X, ArrowLeft, Check, Database, Globe, Loader2, Plus } from 'lucide-react';
import { db, generateId } from '@/lib/db/macroai-db';
import { scaleNutrition } from '@/lib/nutrition/scaling';
import { useLoggerStore } from '@/stores/logger-store';
import { loadStaples, filterStaples } from '@/lib/foods/staples-search';
import { searchUsdaFoods } from '@/lib/foods/usda-adapter';
import type { FoodItem, FoodLogEntry } from '@/types/nutrition';

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

function FoodSearchContent({ date, mealSlot, onClose }: FoodSearchContentProps) {
  const storeDate = useLoggerStore((s) => s.activeDate);
  const storeMealSlot = useLoggerStore((s) => s.activeMealSlot);

  const effectiveDate = date ?? storeDate;
  const effectiveMealSlot = mealSlot ?? storeMealSlot;

  const [activeTab, setActiveTab] = useState<'staples' | 'usda'>('staples');
  const [query, setQuery] = useState('');
  const [staples, setStaples] = useState<FoodItem[]>([]);
  const [cachedFoods, setCachedFoods] = useState<FoodItem[]>([]);
  const [usdaResults, setUsdaResults] = useState<FoodItem[]>([]);
  const [isUsdaLoading, setIsUsdaLoading] = useState(false);
  const [usdaError, setUsdaError] = useState<string | null>(null);

  // Portion selection state
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [amount, setAmount] = useState<string>('100');
  const [unit, setUnit] = useState<string>('g');
  const [isLogging, setIsLogging] = useState(false);

  const [, startTransition] = useTransition();
  const searchAbortRef = useRef<AbortController | null>(null);

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
    if (!val.trim()) {
      setUsdaResults([]);
      setIsUsdaLoading(false);
      setUsdaError(null);
    }
  };

  // Debounced search for USDA online tab
  useEffect(() => {
    if (activeTab !== 'usda') return;

    const trimmed = query.trim();
    if (!trimmed) return;

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const abortController = new AbortController();
    searchAbortRef.current = abortController;

    const timer = setTimeout(async () => {
      setIsUsdaLoading(true);
      setUsdaError(null);
      try {
        const results = await searchUsdaFoods(trimmed, {
          signal: abortController.signal,
        });
        startTransition(() => {
          setUsdaResults(results);
          setIsUsdaLoading(false);
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setUsdaError('USDA search unavailable. Check internet connection or try offline staples.');
        setIsUsdaLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [query, activeTab]);

  // Combine cached foods and staples for offline tab
  const offlinePool = React.useMemo(() => {
    const cachedIds = new Set(cachedFoods.map((f) => f.id));
    const nonDuplicatedStaples = staples.filter((s) => !cachedIds.has(s.id));
    return [...cachedFoods, ...nonDuplicatedStaples];
  }, [cachedFoods, staples]);

  const displayedResults = React.useMemo(() => {
    if (activeTab === 'staples') {
      return filterStaples(offlinePool, query, 40);
    }
    return usdaResults;
  }, [activeTab, offlinePool, query, usdaResults]);

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setAmount(String(food.servingSize || 100));
    setUnit(food.servingUnit || 'g');
  };

  const parsedAmount = Math.max(0, parseFloat(amount) || 0);

  const scaledNutrition = React.useMemo(() => {
    if (!selectedFood) return null;
    return scaleNutrition(
      selectedFood.nutrientsPerBasis,
      selectedFood.micronutrientsPerBasis,
      selectedFood.basis,
      parsedAmount,
      selectedFood.servingSize
    );
  }, [selectedFood, parsedAmount]);

  const handleLogFood = async () => {
    if (!selectedFood || isLogging) return;
    setIsLogging(true);

    try {
      const scaled = scaleNutrition(
        selectedFood.nutrientsPerBasis,
        selectedFood.micronutrientsPerBasis,
        selectedFood.basis,
        parsedAmount,
        selectedFood.servingSize
      );

      const entry: FoodLogEntry = {
        id: generateId(),
        date: effectiveDate,
        mealSlot: effectiveMealSlot,
        foodId: selectedFood.id,
        name: selectedFood.name,
        source: selectedFood.source,
        amount: parsedAmount,
        unit: unit.trim() || 'g',
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

      onClose();
    } catch (err) {
      console.error('Failed to log food:', err);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Food Search"
      data-testid="food-search-drawer"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-auto bg-surface-elevated border-t border-x border-border rounded-t-3xl px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-sheet-in max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full bg-border mx-auto mb-3 shrink-0" aria-hidden="true" />
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            {selectedFood ? (
              <button
                type="button"
                onClick={() => setSelectedFood(null)}
                aria-label="Back to search results"
                className="touch-target macro-spring active:scale-90 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub mr-0.5"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-[var(--macro-carbs)]/15 flex items-center justify-center text-[var(--macro-carbs)]">
                <Search className="w-4 h-4" aria-hidden="true" />
              </div>
            )}
            <div>
              <h2 className="text-sm font-semibold text-foreground line-clamp-1">
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
            className="touch-target macro-spring active:scale-90 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Portion Selector View */}
        {selectedFood ? (
          <div className="pt-4 flex-1 overflow-y-auto space-y-4">
            <div className="bg-surface-sub border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Portion Amount</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  Basis: {selectedFood.servingSize || 100} {selectedFood.servingUnit || 'g'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    aria-label="Portion amount"
                    type="number"
                    step="any"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 text-base font-semibold tabular-nums rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  />
                </div>
                <div className="w-24">
                  <input
                    aria-label="Portion unit"
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-center"
                  />
                </div>
              </div>

              {/* Quick Gram Presets */}
              <div className="flex items-center gap-1.5 pt-1">
                {[50, 100, 150, 200, 250].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmount(String(preset));
                      setUnit('g');
                    }}
                    className={`macro-spring active:scale-95 px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                      amount === String(preset) && unit === 'g'
                        ? 'bg-foreground text-background shadow-xs'
                        : 'bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {preset}g
                  </button>
                ))}
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
                className="macro-spring active:scale-95 w-full py-2.5 px-4 rounded-full bg-foreground text-background font-semibold text-xs hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
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
        ) : (
          /* Search View */
          <div className="pt-3 flex-1 flex flex-col min-h-0 space-y-3">
            {/* Tabs */}
            <div className="grid grid-cols-2 p-1 bg-surface-sub border border-border rounded-full gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('staples')}
                className={`macro-spring active:scale-95 py-1.5 px-3 rounded-full text-xs flex items-center justify-center gap-1.5 ${
                  activeTab === 'staples'
                    ? 'bg-foreground text-background shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-[var(--macro-carbs)]" aria-hidden="true" />
                <span>Staples & Cached</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('usda')}
                className={`macro-spring active:scale-95 py-1.5 px-3 rounded-full text-xs flex items-center justify-center gap-1.5 ${
                  activeTab === 'usda'
                    ? 'bg-foreground text-background shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-[var(--macro-calories)]" aria-hidden="true" />
                <span>USDA Online</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="text"
                aria-label="Search foods"
                placeholder={
                  activeTab === 'staples'
                    ? 'Search 2,500 offline whole-food staples...'
                    : 'Search online USDA FoodData Central...'
                }
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-surface-sub border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground/50 transition-shadow"
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

            {/* Results or Loading State */}
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[260px] max-h-[360px] pr-0.5">
              {activeTab === 'usda' && isUsdaLoading && (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--macro-calories)]" aria-hidden="true" />
                  <span>Searching USDA FoodData Central...</span>
                </div>
              )}

              {activeTab === 'usda' && usdaError && (
                <div className="py-8 px-4 text-center text-xs text-[var(--neutral-over)] bg-surface-sub border border-border rounded-xl">
                  {usdaError}
                </div>
              )}

              {displayedResults.length > 0 ? (
                displayedResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectFood(item)}
                    className="macro-spring active:scale-[0.985] w-full text-left p-3 rounded-xl bg-surface-sub hover:bg-accent border border-border hover:border-border-focus group flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-foreground">
                          {item.name}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-medium ${
                            item.source === 'staple'
                              ? 'bg-[var(--macro-carbs)]/15 text-[var(--macro-carbs)]'
                              : 'bg-[var(--macro-calories)]/15 text-[var(--macro-calories)]'
                          }`}
                        >
                          {item.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground tabular-nums">
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
                          (per 100g)
                        </span>
                      </div>
                    </div>
                    <div className="p-1.5 rounded-full bg-card text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors shrink-0">
                      <Plus className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </button>
                ))
              ) : (
                !isUsdaLoading && (
                  <div className="py-12 text-center text-muted-foreground text-xs">
                    {query.trim()
                      ? 'No matching foods found.'
                      : activeTab === 'staples'
                        ? 'Type a food name or explore 2,500 whole-food staples above.'
                        : 'Enter a keyword to search online USDA database.'}
                  </div>
                )
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
