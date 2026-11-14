'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  saveCustomRecipe,
  calculateRecipeTotals,
} from '@/lib/recipes/recipe-builder';
import { searchStaples } from '@/lib/foods/staples-search';
import type {
  CustomRecipe,
  CustomRecipeIngredient,
  FoodItem,
} from '@/types/nutrition';
import {
  X,
  Plus,
  Trash2,
  ChefHat,
  Search,
  Check,
  Scale,
} from 'lucide-react';

export interface RecipeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (recipe: CustomRecipe) => void;
  initialRecipe?: CustomRecipe | null;
}

export function RecipeBuilderModal({
  isOpen,
  onClose,
  onSaved,
  initialRecipe,
}: RecipeBuilderModalProps) {
  const [name, setName] = useState('');
  const [basis, setBasis] = useState<'perServing' | 'per100g'>('perServing');
  const [defaultServings, setDefaultServings] = useState(1);
  const [ingredients, setIngredients] = useState<CustomRecipeIngredient[]>([]);

  // Manual ingredient form fields
  const [manualName, setManualName] = useState('');
  const [manualGrams, setManualGrams] = useState('');
  const [manualCals, setManualCals] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  // Food search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Initialize or reset state when modal opens or initialRecipe changes
  useEffect(() => {
    if (isOpen) {
      if (initialRecipe) {
        setName(initialRecipe.name || '');
        setBasis(initialRecipe.basis || 'perServing');
        setDefaultServings(initialRecipe.defaultServings || 1);
        setIngredients(initialRecipe.ingredients ? [...initialRecipe.ingredients] : []);
      } else {
        setName('');
        setBasis('perServing');
        setDefaultServings(1);
        setIngredients([]);
      }
      setManualName('');
      setManualGrams('');
      setManualCals('');
      setManualProtein('');
      setManualCarbs('');
      setManualFat('');
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, initialRecipe]);

  // Accessible Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Live staple search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    searchStaples(q, 10)
      .then((items) => {
        if (!cancelled) {
          setSearchResults(items);
          setIsSearching(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('Search staples failed:', err);
          setIsSearching(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  // Live totals
  const totals = useMemo(() => calculateRecipeTotals(ingredients), [ingredients]);

  const previewNutrients = useMemo(() => {
    const servings = Math.max(1, defaultServings);
    if (basis === 'perServing') {
      return {
        calories: Math.round(totals.macros.calories / servings),
        protein: Math.round(totals.macros.protein / servings),
        carbs: Math.round(totals.macros.carbs / servings),
        fat: Math.round(totals.macros.fat / servings),
        fiber: Math.round(totals.macros.fiber / servings),
      };
    } else {
      const scale = totals.totalGrams > 0 ? 100 / totals.totalGrams : 1;
      return {
        calories: Math.round(totals.macros.calories * scale),
        protein: Math.round(totals.macros.protein * scale),
        carbs: Math.round(totals.macros.carbs * scale),
        fat: Math.round(totals.macros.fat * scale),
        fiber: Math.round(totals.macros.fiber * scale),
      };
    }
  }, [totals, basis, defaultServings]);

  if (!isOpen) return null;

  const handleAddManualIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = manualName.trim();
    if (!trimmedName) return;

    const grams = Number(manualGrams) || 100;
    const cals = Number(manualCals) || 0;
    const pro = Number(manualProtein) || 0;
    const carbs = Number(manualCarbs) || 0;
    const fat = Number(manualFat) || 0;

    const newIng: CustomRecipeIngredient = {
      foodId: `manual:${Date.now()}`,
      name: trimmedName,
      amount: grams,
      unit: 'g',
      nutritionSnapshot: {
        calories: cals,
        protein: pro,
        carbs: carbs,
        fat: fat,
        fiber: 0,
        micros: {},
      },
    };

    setIngredients((prev) => [...prev, newIng]);
    setManualName('');
    setManualGrams('');
    setManualCals('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
  };

  const handleAddFoodItem = (food: FoodItem) => {
    const isPerServing = food.basis === 'perServing';
    const amount = isPerServing ? 1 : food.servingSize || 100;
    const unit = isPerServing ? food.servingUnit || 'serving' : 'g';

    const snapCals = isPerServing
      ? food.nutrientsPerBasis.calories
      : (food.nutrientsPerBasis.calories * amount) / 100;
    const snapP = isPerServing
      ? food.nutrientsPerBasis.protein
      : (food.nutrientsPerBasis.protein * amount) / 100;
    const snapC = isPerServing
      ? food.nutrientsPerBasis.carbs
      : (food.nutrientsPerBasis.carbs * amount) / 100;
    const snapF = isPerServing
      ? food.nutrientsPerBasis.fat
      : (food.nutrientsPerBasis.fat * amount) / 100;
    const snapFib = isPerServing
      ? food.nutrientsPerBasis.fiber
      : (food.nutrientsPerBasis.fiber * amount) / 100;

    const micros: Record<string, number> = {};
    if (food.micronutrientsPerBasis) {
      const factor = isPerServing ? 1 : amount / 100;
      for (const [k, v] of Object.entries(food.micronutrientsPerBasis)) {
        if (typeof v === 'number') {
          micros[k] = Math.round((v * factor + Number.EPSILON) * 100) / 100;
        }
      }
    }

    const newIng: CustomRecipeIngredient = {
      foodId: food.id,
      name: food.name,
      amount: Math.round(amount),
      unit,
      nutritionSnapshot: {
        calories: Math.round(snapCals),
        protein: Math.round((snapP + Number.EPSILON) * 10) / 10,
        carbs: Math.round((snapC + Number.EPSILON) * 10) / 10,
        fat: Math.round((snapF + Number.EPSILON) * 10) / 10,
        fiber: Math.round((snapFib + Number.EPSILON) * 10) / 10,
        micros,
      },
    };

    setIngredients((prev) => [...prev, newIng]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleUpdateIngredientAmount = (index: number, newAmount: number) => {
    setIngredients((prev) => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;
      const oldAmount = Math.max(1, target.amount);
      const ratio = newAmount / oldAmount;
      const snap = target.nutritionSnapshot;

      const updatedSnap = {
        calories: Math.round(snap.calories * ratio),
        protein: Math.round((snap.protein * ratio + Number.EPSILON) * 10) / 10,
        carbs: Math.round((snap.carbs * ratio + Number.EPSILON) * 10) / 10,
        fat: Math.round((snap.fat * ratio + Number.EPSILON) * 10) / 10,
        fiber: Math.round((snap.fiber * ratio + Number.EPSILON) * 10) / 10,
        micros: { ...snap.micros },
      };
      if (snap.micros) {
        for (const [k, v] of Object.entries(snap.micros)) {
          if (typeof v === 'number') {
            updatedSnap.micros[k] = Math.round((v * ratio + Number.EPSILON) * 100) / 100;
          }
        }
      }

      next[index] = {
        ...target,
        amount: newAmount,
        nutritionSnapshot: updatedSnap,
      };
      return next;
    });
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      const saved = await saveCustomRecipe({
        id: initialRecipe?.id,
        name: name.trim(),
        ingredients,
        basis,
        defaultServings: Math.max(1, defaultServings),
      });
      onSaved?.(saved);
      onClose();
    } catch (err) {
      console.error('Failed to save recipe:', err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-builder-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] bg-card border border-border rounded-2xl flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <h2 id="recipe-builder-title" className="text-sm font-bold text-foreground">
                {initialRecipe ? 'Edit Recipe' : 'New Custom Recipe'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Composite meal with calculated offline nutrition
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Recipe Name & Servings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="recipe-title" className="font-semibold text-foreground">
                Recipe Name
              </label>
              <input
                id="recipe-title"
                type="text"
                placeholder="Recipe title (e.g. Avocado Toast)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-sub border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="recipe-servings" className="font-semibold text-foreground">
                Servings
              </label>
              <input
                id="recipe-servings"
                type="number"
                min="1"
                step="1"
                value={defaultServings}
                onChange={(e) => setDefaultServings(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full bg-surface-sub border border-border rounded-xl px-3 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-amber-400 font-mono"
              />
            </div>
          </div>

          {/* Basis Toggle */}
          <div className="space-y-1.5">
            <span className="font-semibold text-foreground">Nutrition Basis</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBasis('perServing')}
                className={`py-2 px-3 rounded-xl border font-medium text-center transition-all ${
                  basis === 'perServing'
                    ? 'bg-amber-400/10 border-amber-400 text-amber-400 font-semibold'
                    : 'bg-surface-sub border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Per Serving ({defaultServings} serving{defaultServings > 1 ? 's' : ''})
              </button>
              <button
                type="button"
                onClick={() => setBasis('per100g')}
                className={`py-2 px-3 rounded-xl border font-medium text-center transition-all ${
                  basis === 'per100g'
                    ? 'bg-amber-400/10 border-amber-400 text-amber-400 font-semibold'
                    : 'bg-surface-sub border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Per 100g ({totals.totalGrams}g total)
              </button>
            </div>
          </div>

          {/* Live Nutrition Preview Pill */}
          <div className="bg-surface-sub border border-border rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                Preview ({basis === 'perServing' ? '1 serving' : '100g'})
              </span>
              <div className="text-base font-bold text-foreground tabular-nums">
                {previewNutrients.calories}{' '}
                <span className="text-xs font-normal text-muted-foreground">kcal</span>
              </div>
            </div>
            <div className="flex gap-3 text-right font-mono text-xs">
              <div>
                <div className="text-sky-400 font-semibold tabular-nums">
                  {previewNutrients.protein}g
                </div>
                <div className="text-[10px] text-muted-foreground">Pro</div>
              </div>
              <div>
                <div className="text-emerald-400 font-semibold tabular-nums">
                  {previewNutrients.carbs}g
                </div>
                <div className="text-[10px] text-muted-foreground">Carb</div>
              </div>
              <div>
                <div className="text-rose-400 font-semibold tabular-nums">
                  {previewNutrients.fat}g
                </div>
                <div className="text-[10px] text-muted-foreground">Fat</div>
              </div>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                Ingredients ({ingredients.length})
              </span>
              <span className="text-muted-foreground font-mono text-[11px]">
                {totals.totalGrams}g total weight
              </span>
            </div>

            {ingredients.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {ingredients.map((ing, idx) => (
                  <div
                    key={`${ing.foodId}-${idx}`}
                    className="flex items-center justify-between bg-surface-sub rounded-xl px-3 py-2 border border-border/60"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-medium text-foreground truncate">{ing.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {Math.round(ing.nutritionSnapshot.calories)} kcal ·{' '}
                        {Math.round(ing.nutritionSnapshot.protein)}P ·{' '}
                        {Math.round(ing.nutritionSnapshot.carbs)}C ·{' '}
                        {Math.round(ing.nutritionSnapshot.fat)}F
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={ing.amount}
                        onChange={(e) =>
                          handleUpdateIngredientAmount(
                            idx,
                            Math.max(1, parseInt(e.target.value, 10) || 1)
                          )
                        }
                        className="w-16 bg-card border border-border rounded-lg px-2 py-1 text-center font-mono text-xs text-foreground focus:outline-hidden"
                      />
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {ing.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        aria-label={`Remove ${ing.name}`}
                        className="p-1 text-muted-foreground hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface-sub/50 border border-dashed border-border rounded-xl p-3 text-center text-muted-foreground text-[11px]">
                No ingredients added yet. Search foods or enter manual values below.
              </div>
            )}
          </div>

          {/* Search Staples to Add */}
          <div className="space-y-2 pt-1 border-t border-border/60">
            <span className="font-semibold text-foreground">Add from Food Staples</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search foods to add as ingredient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-sub border border-border rounded-xl pl-8 pr-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-amber-400"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1 bg-surface-sub/80 border border-border rounded-xl p-1.5">
                {searchResults.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => handleAddFoodItem(food)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-card flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="truncate text-foreground font-medium pr-2">
                      {food.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {food.nutrientsPerBasis.calories} kcal /{' '}
                      {food.basis === 'perServing' ? 'srv' : '100g'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual Ingredient Quick Form */}
          <form
            onSubmit={handleAddManualIngredient}
            className="space-y-2 pt-1 border-t border-border/60"
          >
            <span className="font-semibold text-foreground">Or Add Manual Ingredient</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Ingredient name (e.g. Olive Oil)"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="bg-surface-sub border border-border rounded-xl px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-hidden"
              />
              <input
                type="number"
                placeholder="Weight (g)"
                value={manualGrams}
                onChange={(e) => setManualGrams(e.target.value)}
                className="bg-surface-sub border border-border rounded-xl px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-hidden font-mono"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="number"
                placeholder="Calories"
                value={manualCals}
                onChange={(e) => setManualCals(e.target.value)}
                className="bg-surface-sub border border-border rounded-xl px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-hidden font-mono"
              />
              <input
                type="number"
                placeholder="Protein"
                value={manualProtein}
                onChange={(e) => setManualProtein(e.target.value)}
                className="bg-surface-sub border border-border rounded-xl px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-hidden font-mono"
              />
              <input
                type="number"
                placeholder="Carbs"
                value={manualCarbs}
                onChange={(e) => setManualCarbs(e.target.value)}
                className="bg-surface-sub border border-border rounded-xl px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-hidden font-mono"
              />
              <input
                type="number"
                placeholder="Fat"
                value={manualFat}
                onChange={(e) => setManualFat(e.target.value)}
                className="bg-surface-sub border border-border rounded-xl px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-hidden font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-surface-sub hover:bg-surface border border-border text-foreground font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Ingredient</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sub/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-neutral-950 text-xs font-semibold shadow-xs transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Recipe</span>
          </button>
        </div>
      </div>
    </div>
  );
}
