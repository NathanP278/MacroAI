"use client";

import React, { useState, useEffect } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  X,
  AlertTriangle,
  Loader2,
  Plus,
  Send,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { useLoggerStore, AiDraftItem } from '@/stores/logger-store';
import { db, generateId } from '@/lib/db/macroai-db';
import { scaleNutrition } from '@/lib/nutrition/scaling';
import { compressImageToJpeg } from '@/lib/media/image-compress';
import { HitlIngredientRow } from './hitl-ingredient-row';
import { HitlVerificationSwapModal } from './hitl-verification-swap-modal';
import type { FoodLogEntry, FoodSource, MacroNutrients, Micronutrients } from '@/types/nutrition';

export interface AiMealScannerSheetProps {
  open: boolean;
  date?: string;
  mealSlot?: string;
  onClose: () => void;
}

export function AiMealScannerSheet({
  open,
  date,
  mealSlot,
  onClose,
}: AiMealScannerSheetProps) {
  const storeDate = useLoggerStore((s) => s.activeDate);
  const storeMealSlot = useLoggerStore((s) => s.activeMealSlot);
  const effectiveDate = date ?? storeDate ?? '2026-11-14';
  const effectiveMealSlot = mealSlot ?? storeMealSlot ?? 'lunch';

  const aiDraft = useLoggerStore((s) => s.aiDraft);
  const setAiDraft = useLoggerStore((s) => s.setAiDraft);
  const resetDraft = useLoggerStore((s) => s.resetDraft);

  // Stage 1 Local State
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [contextPrompt, setContextPrompt] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Stage 2 Refinement & Verification State
  const [refineInstruction, setRefineInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  // Verification / Swap Modal State
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapTargetItem, setSwapTargetItem] = useState<AiDraftItem | null>(null);

  // User explicitly wants to re-scan with a new photo
  const [isRescanning, setIsRescanning] = useState(false);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [draftRevision, setDraftRevision] = useState(0);

  // Sync draft data into local stage 1 state if present
  const [prevDraft, setPrevDraft] = useState(aiDraft);
  if (aiDraft !== prevDraft) {
    setPrevDraft(aiDraft);
    if (aiDraft?.imageDataUrl) {
      setImageDataUrl(aiDraft.imageDataUrl);
    }
    if (aiDraft?.contextPrompt) {
      setContextPrompt(aiDraft.contextPrompt);
    }
  }

  // Reset transient local state when sheet closes
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setIsAnalyzing(false);
      setIsRefining(false);
      setScanError(null);
      setRefineError(null);
      setRefineInstruction('');
      setIsSwapModalOpen(false);
      setSwapTargetItem(null);
      setIsRescanning(false);
      setIsSubmittingLog(false);
      if (!aiDraft) {
        setImageDataUrl(null);
        setContextPrompt('');
      }
    }
  }

  // Escape key listener to close sheet (guarded when swap modal is open)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSwapModalOpen) return;
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isSwapModalOpen, onClose]);

  if (!open) return null;

  // Decide active stage
  const hasDraftItems = Boolean(aiDraft && aiDraft.items && aiDraft.items.length > 0);
  const showStage2 = hasDraftItems && !isRescanning;

  // Image upload handling (Stage 1)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScanError(null);
      const compressed = await compressImageToJpeg(file, 1024, 0.8);
      setImageDataUrl(compressed);
    } catch (err: unknown) {
      console.error('Failed to compress image:', err);
      setScanError('Failed to process image. Please try again with another photo.');
    }
  };

  // Analyze meal POST /api/ai/meal-scan (Stage 1)
  const handleAnalyzeMeal = async () => {
    if (!imageDataUrl) return;

    setIsAnalyzing(true);
    setScanError(null);

    try {
      const res = await fetch('/api/ai/meal-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl,
          contextPrompt: contextPrompt.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Meal scan failed with status ${res.status}`);
      }

      if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error('No food items detected in image. Please try again or add items manually.');
      }

      const itemsWithIds: AiDraftItem[] = data.items.map((it: Partial<AiDraftItem>) => ({
        id: it.id || generateId(),
        name: it.name || 'Unknown food',
        grams: typeof it.grams === 'number' && it.grams > 0 ? it.grams : 100,
        per100g: it.per100g || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        microsPer100g: it.microsPer100g || {},
        verifiedSource: null,
      }));

      setAiDraft({
        imageDataUrl,
        contextPrompt: contextPrompt.trim(),
        items: itemsWithIds,
      });
      setIsRescanning(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze meal';
      setScanError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Manual draft creation without photo
  const handleStartManualDraft = () => {
    setAiDraft({
      imageDataUrl: null,
      contextPrompt: '',
      items: [],
    });
    setSwapTargetItem(null);
    setIsSwapModalOpen(true);
    setIsRescanning(false);
  };

  // Stage 2: Item manipulation (cleanly updates useLoggerStore.aiDraft locally)
  const handleChangeGrams = (itemId: string, newGrams: number) => {
    if (!aiDraft) return;
    setAiDraft({
      ...aiDraft,
      items: aiDraft.items.map((it) => (it.id === itemId ? { ...it, grams: newGrams } : it)),
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!aiDraft) return;
    setAiDraft({
      ...aiDraft,
      items: aiDraft.items.filter((it) => it.id !== itemId),
    });
  };

  const handleOpenSwapModal = (item: AiDraftItem) => {
    setSwapTargetItem(item);
    setIsSwapModalOpen(true);
  };

  const handleSwapItem = (
    targetItemId: string,
    verifiedItem: {
      name: string;
      per100g: MacroNutrients;
      microsPer100g?: Micronutrients;
      verifiedSource: string;
      verifiedFoodId: string;
    }
  ) => {
    if (!aiDraft) return;
    setAiDraft({
      ...aiDraft,
      items: aiDraft.items.map((it) =>
        it.id === targetItemId
          ? {
              ...it,
              name: verifiedItem.name,
              per100g: verifiedItem.per100g,
              microsPer100g: verifiedItem.microsPer100g,
              verifiedSource: verifiedItem.verifiedSource,
              verifiedFoodId: verifiedItem.verifiedFoodId,
              // row's current it.grams is preserved!
            }
          : it
      ),
    });
  };

  const handleAddCustomItem = (newItem: AiDraftItem) => {
    const currentDraft = aiDraft || {
      imageDataUrl: null,
      contextPrompt: '',
      items: [],
    };
    setAiDraft({
      ...currentDraft,
      items: [...currentDraft.items, newItem],
    });
  };

  // Conversational Refine with AI POST /api/ai/refine
  const handleRefineAi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const instruction = refineInstruction.trim();
    if (!instruction || !aiDraft || aiDraft.items.length === 0 || isRefining) return;

    setIsRefining(true);
    setRefineError(null);

    try {
      const res = await fetch('/api/ai/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: aiDraft.items,
          instruction,
          contextPrompt: aiDraft.contextPrompt,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Refinement failed with status ${res.status}`);
      }

      if (!Array.isArray(data.items)) {
        throw new Error('Invalid response received from refinement service');
      }

      const refinedItems: AiDraftItem[] = data.items.map((it: Partial<AiDraftItem>) => ({
        id: it.id || generateId(),
        name: it.name || 'Refined item',
        grams: typeof it.grams === 'number' && it.grams > 0 ? it.grams : 100,
        per100g: it.per100g || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        microsPer100g: it.microsPer100g || {},
        verifiedSource: it.verifiedSource ?? null,
        verifiedFoodId: it.verifiedFoodId,
      }));

      setAiDraft({
        ...aiDraft,
        items: refinedItems,
      });
      setDraftRevision((r) => r + 1);
      setRefineInstruction('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to refine meal';
      setRefineError(msg);
    } finally {
      setIsRefining(false);
    }
  };

  // Confirm & Log: Dexie bulkAdd in one transaction
  const handleConfirmAndLog = async () => {
    if (!aiDraft || aiDraft.items.length === 0 || isSubmittingLog) return;

    setIsSubmittingLog(true);
    try {
      const now = Date.now();
      const entries: FoodLogEntry[] = aiDraft.items.map((item) => {
        const scaled = scaleNutrition(
          item.per100g,
          item.microsPer100g ?? {},
          'per100g',
          item.grams
        );

        const validSource: FoodSource =
          item.verifiedSource === 'staple' ||
          item.verifiedSource === 'usda' ||
          item.verifiedSource === 'off' ||
          item.verifiedSource === 'custom_barcode' ||
          item.verifiedSource === 'quick_add' ||
          item.verifiedSource === 'recipe'
            ? item.verifiedSource
            : 'ai_scan';

        return {
          id: generateId(),
          date: effectiveDate,
          mealSlot: effectiveMealSlot,
          foodId: item.verifiedFoodId || item.id,
          name: item.name,
          source: validSource,
          amount: item.grams,
          unit: 'g',
          nutritionSnapshot: {
            ...scaled.macros,
            micros: scaled.micros,
          },
          createdAt: now,
        };
      });

      await db.transaction('rw', db.foodLogs, async () => {
        await db.foodLogs.bulkAdd(entries);
      });

      resetDraft();
      setImageDataUrl(null);
      setContextPrompt('');
      setRefineInstruction('');
      setScanError(null);
      setRefineError(null);
      setIsSwapModalOpen(false);
      setSwapTargetItem(null);
      setIsRescanning(false);
      onClose();
    } catch (err) {
      console.error('Failed to log meal entries:', err);
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // Compute Stage 2 totals
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  if (aiDraft?.items) {
    for (const item of aiDraft.items) {
      const { macros } = scaleNutrition(
        item.per100g,
        item.microsPer100g ?? {},
        'per100g',
        item.grams
      );
      totalCalories += macros.calories;
      totalProtein += macros.protein;
      totalCarbs += macros.carbs;
      totalFat += macros.fat;
      totalFiber += macros.fiber;
    }
  }

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI Meal Scanner"
        data-testid="ai-meal-scanner-sheet"
        className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      >
        <div
          className="w-full max-w-[430px] mx-auto bg-surface-elevated border-t border-x border-border rounded-t-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {showStage2 ? 'Review AI Meal' : 'AI Meal Scanner'}
                </h2>
                <p className="text-[10px] text-muted-foreground capitalize">
                  Logging to {effectiveMealSlot} &bull; {effectiveDate}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {showStage2 && (
                <button
                  type="button"
                  onClick={() => setIsRescanning(true)}
                  aria-label="Re-scan or take new photo"
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-1"
                  title="Take new photo / re-scan"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close AI scanner"
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body: Stage 1 or Stage 2 */}
          {!showStage2 ? (
            /* STAGE 1: Pre-Scan Context & Image Upload */
            <div className="pt-4 flex-1 overflow-y-auto space-y-4">
              {scanError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">{scanError}</div>
                </div>
              )}

              {/* Photo Upload Area */}
              <div>
                <label
                  htmlFor="meal-photo-upload"
                  aria-label="Upload meal photo"
                  className="block cursor-pointer"
                >
                  {imageDataUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-border group">
                      <img
                        src={imageDataUrl}
                        alt="Meal preview"
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-medium">
                        <Upload className="w-4 h-4" />
                        <span>Change Photo</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-44 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-surface-sub/50 flex flex-col items-center justify-center p-4 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                        <Camera className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        Take photo or upload image
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        High quality JPEG compressed on-device
                      </span>
                    </div>
                  )}
                  <input
                    id="meal-photo-upload"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    aria-label="Upload meal photo"
                    onChange={handleImageFileChange}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Prep / Hidden Context Textarea */}
              <div className="space-y-1.5">
                <label
                  htmlFor="meal-context-prompt"
                  className="text-xs font-semibold text-foreground flex items-center justify-between"
                >
                  <span>Tell what&apos;s in the meal (Optional)</span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    Prep & hidden ingredients
                  </span>
                </label>
                <textarea
                  id="meal-context-prompt"
                  value={contextPrompt}
                  onChange={(e) => setContextPrompt(e.target.value)}
                  placeholder="Cooking oil, sauces, prep style, portion hints (e.g. 2 tbsp olive oil, grilled chicken, basmati rice)..."
                  rows={3}
                  className="w-full p-3 text-xs rounded-xl bg-surface-sub border border-border focus:outline-none focus:border-border-focus text-foreground placeholder:text-muted-foreground/60 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleAnalyzeMeal}
                  disabled={!imageDataUrl || isAnalyzing}
                  className="w-full py-3 rounded-xl bg-foreground text-background font-semibold text-xs hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing meal components...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze Meal</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleStartManualDraft}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
                  >
                    Skip photo & log ingredients manually
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STAGE 2: Post-Scan Interactive HITL Review */
            <div className="pt-3 flex-1 flex flex-col min-h-0">
              {/* Summary Totals Banner */}
              <div className="bg-surface-sub rounded-2xl p-3 border border-border mb-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  {aiDraft?.imageDataUrl && (
                    <img
                      src={aiDraft.imageDataUrl}
                      alt="Scanned meal thumbnail"
                      className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
                    />
                  )}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span
                        data-testid="hitl-total-calories"
                        className="text-xl font-bold text-foreground tabular-nums tracking-tight"
                      >
                        {Math.round(totalCalories)}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">kcal</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Total estimated meal nutrition</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-right text-xs tabular-nums text-muted-foreground">
                  <div>
                    <span className="block font-bold text-foreground">{Math.round(totalProtein * 10) / 10}g</span>
                    <span className="text-[10px] uppercase">Prot</span>
                  </div>
                  <div>
                    <span className="block font-bold text-foreground">{Math.round(totalCarbs * 10) / 10}g</span>
                    <span className="text-[10px] uppercase">Carb</span>
                  </div>
                  <div>
                    <span className="block font-bold text-foreground">{Math.round(totalFat * 10) / 10}g</span>
                    <span className="text-[10px] uppercase">Fat</span>
                  </div>
                  {totalFiber > 0 && (
                    <div>
                      <span className="block font-bold text-foreground">{Math.round(totalFiber * 10) / 10}g</span>
                      <span className="text-[10px] uppercase">Fib</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Refine Error Banner */}
              {refineError && (
                <div className="mb-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="flex-1">{refineError}</span>
                </div>
              )}

              {/* Ingredient Rows List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
                {aiDraft?.items.map((item) => (
                  <HitlIngredientRow
                    key={item.id}
                    item={item}
                    draftRevision={draftRevision}
                    onChangeGrams={handleChangeGrams}
                    onDeleteItem={handleDeleteItem}
                    onOpenVerifySwap={handleOpenSwapModal}
                  />
                ))}

                {/* Add Missing Ingredient Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setSwapTargetItem(null);
                    setIsSwapModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-border hover:border-primary/60 bg-surface-sub/40 hover:bg-surface-sub text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Missing Ingredient</span>
                </button>
              </div>

              {/* Bottom Actions Area: Conversational Refine Bar + Confirm & Log */}
              <div className="pt-3 mt-2 border-t border-border space-y-2.5 shrink-0">
                {/* Conversational "Refine with AI" Input Bar */}
                <form onSubmit={handleRefineAi} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={refineInstruction}
                    onChange={(e) => setRefineInstruction(e.target.value)}
                    placeholder="E.g., remove the cheese, make the chicken 200g..."
                    disabled={isRefining}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-surface-sub border border-border focus:outline-none focus:border-border-focus text-foreground placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="submit"
                    disabled={isRefining || !refineInstruction.trim()}
                    className="px-3 py-2 rounded-xl bg-surface-elevated border border-border text-foreground hover:bg-muted font-semibold text-xs transition-all disabled:opacity-50 flex items-center gap-1 shrink-0 shadow-xs"
                  >
                    {isRefining ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span>Refine</span>
                  </button>
                </form>

                {/* Confirm & Log Button */}
                <button
                  type="button"
                  onClick={handleConfirmAndLog}
                  disabled={isSubmittingLog || !aiDraft?.items.length}
                  className="w-full py-3 rounded-xl bg-foreground text-background font-semibold text-xs hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSubmittingLog ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Logging meal entries...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm &amp; Log</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verification / Swap Modal */}
      {isSwapModalOpen && (
        <HitlVerificationSwapModal
          open={isSwapModalOpen}
          targetItem={swapTargetItem}
          onClose={() => {
            setIsSwapModalOpen(false);
            setSwapTargetItem(null);
          }}
          onSwapItem={handleSwapItem}
          onAddCustomItem={handleAddCustomItem}
        />
      )}
    </>
  );
}
