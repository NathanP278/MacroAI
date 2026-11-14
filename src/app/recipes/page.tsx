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
} from 'lucide-react';

export default function RecipesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<CustomRecipe | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const [loggedFeedback, setLoggedFeedback] = useState<Record<string, string>>({});
  const feedbackTimersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  React.useEffect(() => {
    const timers = feedbackTimersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
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
      <div className="flex flex-col gap-5 sm:gap-6 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-8">
        {/* Header matching Dashboard Obsidian Aesthetic */}
        <header className="flex items-center sm:items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
              Recipes & Custom Foods
            </h1>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5">
              Offline recipe book and custom ingredients
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="touch-target macro-spring active:scale-95 shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground hover:opacity-90 text-background text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Create</span>
          </button>
        </header>

        {/* Search Bar & Count Summary */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search saved recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 sm:h-12 bg-card rounded-2xl pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>
          {recipes && recipes.length > 0 && (
            <div className="hidden sm:flex items-center h-11 sm:h-12 px-4 rounded-2xl bg-card text-xs font-medium text-muted-foreground tabular-nums shrink-0">
              {filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'}
            </div>
          )}
        </div>

        {/* Recipes Bento Grid */}
        {filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 animate-card-enter">
            {filteredRecipes.map((recipe) => {
              const currentSlot = selectedSlots[recipe.id] || activeMealSlot || 'lunch';
              const feedback = loggedFeedback[recipe.id];

              return (
                <div
                  key={recipe.id}
                  data-testid={`recipe-card-${recipe.id}`}
                  className="bg-card border border-border/50 macro-card-interactive rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4"
                >
                  {/* Card Title & Edit/Delete */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-foreground tracking-tight truncate">
                        {recipe.name}
                      </h2>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 tabular-nums">
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

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(recipe)}
                        aria-label={`Edit recipe ${recipe.name}`}
                        className="touch-target macro-spring active:scale-90 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub"
                      >
                        <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecipe(recipe.id)}
                        aria-label={`Delete recipe ${recipe.name}`}
                        className="touch-target macro-spring active:scale-90 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Nutrition Summary Pill */}
                  <div className="bg-surface-sub rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Per {recipe.basis === 'perServing' ? 'Serving' : '100g'}
                      </span>
                      <div className="text-base font-bold text-[var(--macro-calories)] tabular-nums">
                        {recipe.nutrientsPerBasis.calories} kcal
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs tabular-nums">
                      <div className="text-right">
                        <span className="text-[var(--macro-protein)] font-semibold">
                          {recipe.nutrientsPerBasis.protein}g
                        </span>
                        <span className="block text-[10px] text-muted-foreground">Pro</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[var(--macro-carbs)] font-semibold">
                          {recipe.nutrientsPerBasis.carbs}g
                        </span>
                        <span className="block text-[10px] text-muted-foreground">Carb</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[var(--macro-fat)] font-semibold">
                          {recipe.nutrientsPerBasis.fat}g
                        </span>
                        <span className="block text-[10px] text-muted-foreground">Fat</span>
                      </div>
                    </div>
                  </div>

                  {/* 1-Tap Log Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60 gap-2">
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
                        className="bg-surface-sub rounded-full px-2.5 py-1 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
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
                        <span className="animate-check-pop text-[11px] text-[var(--macro-carbs)] flex items-center gap-1 font-semibold">
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          {feedback}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleLogRecipe(recipe)}
                        aria-label={`Log ${recipe.name}`}
                        className="macro-spring active:scale-95 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-foreground hover:opacity-90 text-background text-xs font-semibold shadow-xs"
                      >
                        <Utensils className="w-3.5 h-3.5" aria-hidden="true" />
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
          <div className="bg-card border border-border/50 rounded-2xl px-6 py-10 sm:p-14 text-center space-y-4 animate-card-enter">
            <div className="w-12 h-12 rounded-2xl bg-[var(--macro-calories)]/15 mx-auto flex items-center justify-center text-[var(--macro-calories)]">
              <ChefHat className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {searchQuery ? 'No matching recipes' : 'Recipe Book Empty'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-1.5 leading-relaxed">
                {searchQuery
                  ? 'Try a different recipe name or create a new recipe with this title.'
                  : 'Build custom composite meals with calculated macro targets and serving portions. Stored 100% offline in IndexedDB.'}
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="macro-spring active:scale-95 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground hover:opacity-90 text-background text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
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
