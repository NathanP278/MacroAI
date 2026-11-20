'use client';

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/macroai-db';
import { AppShell } from '@/components/shell/app-shell';
import { RecipeBuilderModal } from '@/components/recipes/recipe-builder-modal';
import { RecipeCardSkeleton } from '@/components/ui/skeleton';
import { logCustomRecipe } from '@/lib/recipes/recipe-builder';
import { triggerHaptic } from '@/lib/motion';
import { useLoggerStore } from '@/stores/logger-store';
import type { CustomRecipe } from '@/types/nutrition';
import {
  Plus,
  Search,
  Trash2,
  Edit,
  Utensils,
  Check,
  X,
} from 'lucide-react';

export default function RecipesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<CustomRecipe | null>(null);
  const [loggedFeedback, setLoggedFeedback] = useState<Record<string, string>>({});
  const feedbackTimersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  React.useEffect(() => {
    const timers = feedbackTimersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const activeDate = useLoggerStore((s) => s.activeDate);
  const showUndoToast = useLoggerStore((s) => s.showUndoToast);

  // Live query for custom recipes
  const recipes = useLiveQuery(() => db.customRecipes.toArray(), []);

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

  const handleDeleteRecipe = async (recipe: CustomRecipe) => {
    const snapshot: CustomRecipe = {
      ...recipe,
      ingredients: recipe.ingredients ? [...recipe.ingredients] : [],
      nutrientsPerBasis: { ...recipe.nutrientsPerBasis },
      micronutrientsPerBasis: { ...(recipe.micronutrientsPerBasis ?? {}) },
    };
    try {
      await db.customRecipes.delete(recipe.id);
      triggerHaptic(12);
      showUndoToast({
        message: `Removed recipe "${recipe.name}"`,
        onUndo: async () => {
          await db.customRecipes.put(snapshot);
        },
      });
    } catch (err) {
      console.error('Failed to delete custom recipe:', err);
    }
  };

  const handleLogRecipe = async (recipe: CustomRecipe) => {
    try {
      await logCustomRecipe(recipe, {
        date: activeDate,
        servings: 1,
      });

      setLoggedFeedback((prev) => ({
        ...prev,
        [recipe.id]: 'Logged!',
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
              Recipes & Custom Foods
            </h1>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5">
              Offline recipe book and custom ingredients
              {recipes && recipes.length > 0 && (
                <span className="sm:hidden tabular-nums"> · {filteredRecipes.length} saved</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="touch-target tactile-press shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground hover:opacity-90 text-background text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Create</span>
          </button>
        </header>

        {/* Search Bar & Count Summary */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search
              className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              aria-label="Search saved recipes"
              placeholder="Search saved recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 sm:h-12 bg-card border border-border/50 rounded-2xl pl-10 pr-10 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring transition-shadow"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear recipe search"
                className="touch-target tactile-press absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
          {recipes && recipes.length > 0 && (
            <div className="hidden sm:flex items-center h-11 sm:h-12 px-4 rounded-2xl bg-card border border-border/50 text-xs font-medium text-muted-foreground tabular-nums shrink-0">
              {filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'}
            </div>
          )}
        </div>

        {/* Recipes Bento Grid */}
        {recipes === undefined ? (
          <RecipeCardSkeleton count={3} />
        ) : filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredRecipes.map((recipe, idx) => {
              const feedback = loggedFeedback[recipe.id];

              return (
                <div
                  key={recipe.id}
                  data-testid={`recipe-card-${recipe.id}`}
                  style={{ '--stagger-index': idx } as React.CSSProperties}
                  className="stagger-item bg-card border border-border/50 macro-card-interactive rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4"
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
                        onClick={() => void handleDeleteRecipe(recipe)}
                        aria-label={`Delete recipe ${recipe.name}`}
                        className="touch-target tactile-press p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Nutrition Summary Pill */}
                  <div className="bg-surface-sub rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Per {recipe.basis === 'perServing' ? 'Serving' : '100g'}
                      </span>
                      <div className="text-base font-bold text-[var(--macro-calories)] tabular-nums truncate">
                        {recipe.nutrientsPerBasis.calories} kcal
                      </div>
                    </div>
                    <div className="flex gap-2.5 sm:gap-3 text-xs tabular-nums shrink-0">
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
                  <div className="flex items-center justify-end pt-2 border-t border-border/60 gap-2">
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
                      className="touch-target tactile-press flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground hover:opacity-90 text-background text-xs font-semibold shadow-xs"
                    >
                      <Utensils className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Log</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-card border border-border/50 rounded-2xl px-6 py-10 sm:p-14 text-center space-y-4 animate-card-enter">
            <svg
              viewBox="0 0 64 64"
              className="w-12 h-12 mx-auto text-muted-foreground/75"
              aria-hidden="true"
            >
              <rect
                x="14"
                y="16"
                width="36"
                height="34"
                rx="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="22"
                y1="27"
                x2="42"
                y2="27"
                stroke="var(--macro-calories)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="22"
                y1="35"
                x2="38"
                y2="35"
                stroke="var(--macro-protein)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="22"
                y1="43"
                x2="33"
                y2="43"
                stroke="var(--macro-carbs)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
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
                className="tactile-press inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground hover:opacity-90 text-background text-xs font-semibold shadow-xs"
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
