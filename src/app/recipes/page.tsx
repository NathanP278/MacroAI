'use client';

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/macroai-db';
import { AppShell } from '@/components/shell/app-shell';
import { RecipeBuilderModal } from '@/components/recipes/recipe-builder-modal';
import { logCustomRecipe } from '@/lib/recipes/recipe-builder';
import { useLoggerStore } from '@/stores/logger-store';
import { DEFAULT_MEAL_SLOTS } from '@/lib/nutrition/goals';
import type { CustomRecipe } from '@/types/nutrition';
import {
  ChefHat,
  Plus,
  Search,
  Trash2,
  Edit,
  Utensils,
  Check,
  Scale,
} from 'lucide-react';

export default function RecipesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<CustomRecipe | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const [loggedFeedback, setLoggedFeedback] = useState<Record<string, string>>({});
  const feedbackTimersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  React.useEffect(() => {
    return () => {
      Object.values(feedbackTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const activeDate = useLoggerStore((s) => s.activeDate);
  const activeMealSlot = useLoggerStore((s) => s.activeMealSlot);

  // Live queries for custom recipes and user goals
  const recipes = useLiveQuery(() => db.customRecipes.toArray(), []);
  const userGoals = useLiveQuery(() => db.userGoals.get('active'), []);

  const mealSlots = userGoals?.mealSlots?.length
    ? userGoals.mealSlots
    : DEFAULT_MEAL_SLOTS;

  // Filter recipes by live search query
  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.name.toLowerCase().includes(q));
  }, [recipes, searchQuery]);

  const handleOpenCreate = () => {
    setEditingRecipe(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (recipe: CustomRecipe) => {
    setEditingRecipe(recipe);
    setIsModalOpen(true);
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      await db.customRecipes.delete(id);
    } catch (err) {
      console.error('Failed to delete custom recipe:', err);
    }
  };

  const handleLogRecipe = async (recipe: CustomRecipe) => {
    const slot = selectedSlots[recipe.id] || activeMealSlot || 'lunch';
    try {
      await logCustomRecipe(recipe, {
        date: activeDate,
        mealSlot: slot,
        servings: 1,
      });

      setLoggedFeedback((prev) => ({
        ...prev,
        [recipe.id]: `Logged to ${slot}!`,
      }));

      if (feedbackTimersRef.current[recipe.id]) {
        clearTimeout(feedbackTimersRef.current[recipe.id]);
      }
      feedbackTimersRef.current[recipe.id] = setTimeout(() => {
        setLoggedFeedback((prev) => {
          const next = { ...prev };
          delete next[recipe.id];
          return next;
        });
        delete feedbackTimersRef.current[recipe.id];
      }, 2500);
    } catch (err) {
      console.error('Failed to log custom recipe:', err);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-4">
        {/* Header */}
        <header className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground">
              Recipes & Custom Foods
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Offline recipe book and custom ingredients
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>
        </header>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search saved recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-amber-400"
          />
        </div>

        {/* Recipes Feed */}
        {filteredRecipes.length > 0 ? (
          <div className="space-y-3">
            {filteredRecipes.map((recipe) => {
              const currentSlot = selectedSlots[recipe.id] || activeMealSlot || 'lunch';
              const feedback = loggedFeedback[recipe.id];

              return (
                <div
                  key={recipe.id}
                  data-testid={`recipe-card-${recipe.id}`}
                  className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 shadow-xs"
                >
                  {/* Card Title & Edit/Delete */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-foreground tracking-tight">
                        {recipe.name}
                      </h2>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>
                          {recipe.ingredients?.length || 0} ingredient
                          {recipe.ingredients?.length === 1 ? '' : 's'}
                        </span>
                        <span>·</span>
                        <span>
                          {recipe.basis === 'perServing'
                            ? `${recipe.defaultServings} serving${recipe.defaultServings > 1 ? 's' : ''}`
                            : `${recipe.totalGrams}g total`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(recipe)}
                        aria-label={`Edit recipe ${recipe.name}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecipe(recipe.id)}
                        aria-label={`Delete recipe ${recipe.name}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Nutrition Summary Pill */}
                  <div className="bg-surface-sub border border-border/70 rounded-xl px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Per {recipe.basis === 'perServing' ? 'Serving' : '100g'}
                      </span>
                      <div className="text-sm font-bold text-foreground tabular-nums">
                        {recipe.nutrientsPerBasis.calories} kcal
                      </div>
                    </div>
                    <div className="flex gap-2.5 font-mono text-xs">
                      <div>
                        <span className="text-sky-400 font-semibold tabular-nums">
                          {recipe.nutrientsPerBasis.protein}g
                        </span>{' '}
                        <span className="text-[10px] text-muted-foreground">P</span>
                      </div>
                      <div>
                        <span className="text-emerald-400 font-semibold tabular-nums">
                          {recipe.nutrientsPerBasis.carbs}g
                        </span>{' '}
                        <span className="text-[10px] text-muted-foreground">C</span>
                      </div>
                      <div>
                        <span className="text-rose-400 font-semibold tabular-nums">
                          {recipe.nutrientsPerBasis.fat}g
                        </span>{' '}
                        <span className="text-[10px] text-muted-foreground">F</span>
                      </div>
                    </div>
                  </div>

                  {/* 1-Tap Log Action Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50 gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Slot:</span>
                      <select
                        value={currentSlot}
                        onChange={(e) =>
                          setSelectedSlots((prev) => ({
                            ...prev,
                            [recipe.id]: e.target.value,
                          }))
                        }
                        className="bg-surface-sub border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-hidden"
                      >
                        {mealSlots.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      {feedback && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                          <Check className="w-3 h-3" />
                          {feedback}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleLogRecipe(recipe)}
                        aria-label={`Log ${recipe.name}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-semibold shadow-xs transition-colors"
                      >
                        <Utensils className="w-3.5 h-3.5" />
                        <span>Log</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3 mt-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 mx-auto flex items-center justify-center text-amber-400">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {searchQuery ? 'No matching recipes' : 'Recipe Book Empty'}
              </h2>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto mt-1">
                {searchQuery
                  ? 'Try a different recipe name or create a new recipe with this title.'
                  : 'Build custom composite meals with calculated macro targets and serving portions. Stored 100% offline in IndexedDB.'}
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Recipe</span>
              </button>
            </div>
          </div>
        )}

        {/* Recipe Builder Modal */}
        <RecipeBuilderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialRecipe={editingRecipe}
        />
      </div>
    </AppShell>
  );
}
