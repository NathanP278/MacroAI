"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check, Database, Sparkles, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { db, generateId } from '@/lib/db/macroai-db';
import { searchStaples } from '@/lib/foods/staples-search';
import { searchUsdaFoods } from '@/lib/foods/usda-adapter';
import type { FoodItem, MacroNutrients, Micronutrients } from '@/types/nutrition';
import type { AiDraftItem } from '@/stores/logger-store';

export interface HitlVerificationSwapModalProps {
  open: boolean;
  targetItem: AiDraftItem | null; // null when adding a missing ingredient
  onClose: () => void;
  onSwapItem: (
    targetItemId: string,
    verifiedItem: {
      name: string;
      per100g: MacroNutrients;
      microsPer100g?: Micronutrients;
      verifiedSource: string;
      verifiedFoodId: string;
    }
  ) => void;
  onAddCustomItem: (newItem: AiDraftItem) => void;
}

export function HitlVerificationSwapModal({
  open,
  targetItem,
  onClose,
  onSwapItem,
  onAddCustomItem,
}: HitlVerificationSwapModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Manual ingredient form state
  const [manualName, setManualName] = useState('');
  const [manualGrams, setManualGrams] = useState('100');
  const [manualCalories, setManualCalories] = useState('100');
  const [manualProtein, setManualProtein] = useState('0');
  const [manualCarbs, setManualCarbs] = useState('0');
  const [manualFat, setManualFat] = useState('0');

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize query with target item name when opening
  useEffect(() => {
    if (open) {
      if (targetItem) {
        setQuery(targetItem.name);
        executeSearch(targetItem.name);
      } else {
        setQuery('');
        setResults([]);
        setManualName('');
        setManualGrams('100');
        setManualCalories('100');
        setManualProtein('0');
        setManualCarbs('0');
        setManualFat('0');
      }
    }
  }, [open, targetItem]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Clean up search debounce timer on unmount and when modal closes
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open && searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
  }, [open]);

  const executeSearch = async (searchTerm: string) => {
    const q = searchTerm.trim();
    if (!q) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // 1. Search cached items in Dexie
      const cached = await db.foodsCache.toArray();
      const localMatches = cached.filter((item) =>
        item.name.toLowerCase().includes(q.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(q.toLowerCase()))
      );

      // 2. Search offline staples dataset
      let stapleMatches: FoodItem[] = [];
      try {
        stapleMatches = await searchStaples(q, 20);
      } catch (err) {
        console.warn('Staples search error:', err);
      }

      // 3. Search USDA FoodData Central online (resilient to offline/keys)
      let usdaMatches: FoodItem[] = [];
      try {
        usdaMatches = await searchUsdaFoods(q);
      } catch (err) {
        // USDA search failure is non-fatal: offline or missing key
      }

      // Deduplicate by id, prioritize local, then staples, then USDA
      const seenIds = new Set<string>();
      const combined: FoodItem[] = [];

      for (const item of [...localMatches, ...stapleMatches, ...usdaMatches]) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          combined.push(item);
        }
      }

      setResults(combined);
    } catch (err) {
      console.error('Error during food verification search:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      executeSearch(val);
    }, 200);
  };

  const handleSelectFood = (foodItem: FoodItem) => {
    let per100g: MacroNutrients = { ...foodItem.nutrientsPerBasis };
    let microsPer100g: Micronutrients = { ...(foodItem.micronutrientsPerBasis || {}) };

    // Convert perServing items with known gram/ml servingSize to true per100g density
    if (
      foodItem.basis === 'perServing' &&
      foodItem.servingSize > 0 &&
      (foodItem.servingUnit === 'g' || foodItem.servingUnit === 'ml')
    ) {
      const ratio = 100 / foodItem.servingSize;
      per100g = {
        calories: Math.round((foodItem.nutrientsPerBasis.calories * ratio + Number.EPSILON) * 100) / 100,
        protein: Math.round((foodItem.nutrientsPerBasis.protein * ratio + Number.EPSILON) * 100) / 100,
        carbs: Math.round((foodItem.nutrientsPerBasis.carbs * ratio + Number.EPSILON) * 100) / 100,
        fat: Math.round((foodItem.nutrientsPerBasis.fat * ratio + Number.EPSILON) * 100) / 100,
        fiber: Math.round((foodItem.nutrientsPerBasis.fiber * ratio + Number.EPSILON) * 100) / 100,
      };

      const convertedMicros: Micronutrients = {};
      for (const [k, v] of Object.entries(foodItem.micronutrientsPerBasis || {})) {
        if (typeof v === 'number') {
          convertedMicros[k] = Math.round((v * ratio + Number.EPSILON) * 100) / 100;
        }
      }
      microsPer100g = convertedMicros;
    }

    if (targetItem) {
      // SWAP mode: preserves target item's current grams
      onSwapItem(targetItem.id, {
        name: foodItem.name,
        per100g,
        microsPer100g,
        verifiedSource: foodItem.source,
        verifiedFoodId: foodItem.id,
      });
    } else {
      // ADD mode: add as a new item to the meal
      const grams = foodItem.servingSize > 0 ? foodItem.servingSize : 100;
      onAddCustomItem({
        id: generateId(),
        name: foodItem.name,
        grams,
        per100g,
        microsPer100g,
        verifiedSource: foodItem.source,
        verifiedFoodId: foodItem.id,
      });
    }

    onClose();
  };

  const handleAddManualIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    const name = manualName.trim();
    if (!name) return;

    const grams = parseFloat(manualGrams) || 100;
    const calories = parseFloat(manualCalories) || 0;
    const protein = parseFloat(manualProtein) || 0;
    const carbs = parseFloat(manualCarbs) || 0;
    const fat = parseFloat(manualFat) || 0;

    const newItem: AiDraftItem = {
      id: generateId(),
      name,
      grams,
      per100g: {
        calories,
        protein,
        carbs,
        fat,
        fiber: 0,
      },
      verifiedSource: 'quick_add',
    };

    onAddCustomItem(newItem);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={targetItem ? 'Verify or swap food' : 'Add ingredient'}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] mx-auto bg-surface-elevated border-t border-x border-border rounded-t-3xl p-5 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {targetItem ? `Verify or Swap "${targetItem.name}"` : 'Add Missing Ingredient'}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {targetItem
                ? 'Preserves current grams while updating nutrition facts'
                : 'Search verified database or enter manually'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="pt-3 flex-1 overflow-y-auto space-y-4 pr-0.5 min-h-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search staples, USDA, or saved foods..."
              className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-surface-sub border border-border focus:outline-none focus:border-border-focus text-foreground placeholder:text-muted-foreground/60"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-primary animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Search Results List */}
          {results.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground block">
                Search Results:
              </span>
              {results.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => handleSelectFood(food)}
                  className="w-full text-left p-3 rounded-xl bg-surface-sub border border-border hover:border-primary/50 hover:bg-muted/50 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                        {food.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-elevated border border-border text-muted-foreground uppercase font-mono">
                        {food.source}
                      </span>
                    </div>
                    {food.brand && (
                      <p className="text-[11px] text-muted-foreground truncate">{food.brand}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/80 mt-1 tabular-nums">
                      {Math.round(food.nutrientsPerBasis.calories)} kcal &bull; {food.nutrientsPerBasis.protein}g P &bull; {food.nutrientsPerBasis.carbs}g C &bull; {food.nutrientsPerBasis.fat}g F
                      <span className="text-[10px] ml-1 opacity-70">
                        ({food.basis === 'perServing' ? `${food.servingSize}${food.servingUnit}` : 'per 100g'})
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className="p-1.5 rounded-lg bg-surface-elevated text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.trim() && !isSearching && results.length === 0 && (
            <div className="py-2 text-center text-xs text-muted-foreground">
              No verified foods found matching &ldquo;{query}&rdquo;.
            </div>
          )}

          {/* Manual Entry Form (shown when adding a missing ingredient) */}
          {!targetItem && (
            <div className="pt-2 border-t border-border">
              <span className="text-[11px] font-semibold text-muted-foreground block mb-2">
                Or enter ingredient manually:
              </span>
              <form onSubmit={handleAddManualIngredient} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Ingredient Name
                  </label>
                  <input
                    type="text"
                    placeholder="Ingredient Name"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-sub border border-border focus:outline-none focus:border-border-focus text-foreground"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Portion (grams)
                    </label>
                    <input
                      type="number"
                      placeholder="Grams"
                      value={manualGrams}
                      onChange={(e) => setManualGrams(e.target.value)}
                      min="1"
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-sub border border-border focus:outline-none focus:border-border-focus text-foreground tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                      Calories per 100g
                    </label>
                    <input
                      type="number"
                      placeholder="Calories per 100g"
                      value={manualCalories}
                      onChange={(e) => setManualCalories(e.target.value)}
                      min="0"
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-sub border border-border focus:outline-none focus:border-border-focus text-foreground tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                      Protein / 100g
                    </label>
                    <input
                      type="number"
                      placeholder="Protein"
                      value={manualProtein}
                      onChange={(e) => setManualProtein(e.target.value)}
                      step="0.1"
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-surface-sub border border-border text-foreground tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                      Carbs / 100g
                    </label>
                    <input
                      type="number"
                      placeholder="Carbs"
                      value={manualCarbs}
                      onChange={(e) => setManualCarbs(e.target.value)}
                      step="0.1"
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-surface-sub border border-border text-foreground tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                      Fat / 100g
                    </label>
                    <input
                      type="number"
                      placeholder="Fat"
                      value={manualFat}
                      onChange={(e) => setManualFat(e.target.value)}
                      step="0.1"
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-surface-sub border border-border text-foreground tabular-nums"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={!manualName.trim()}
                    className="w-full py-2.5 rounded-xl bg-foreground text-background font-semibold text-xs hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Meal</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
