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
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useLoggerStore, AiDraftItem } from '@/stores/logger-store';
import { db, generateId } from '@/lib/db/macroai-db';
import { scaleNutrition } from '@/lib/nutrition/scaling';
import { RDA_MICRONUTRIENT_METADATA } from '@/lib/nutrition/daily-summary';
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
  const effectiveMealSlot = mealSlot ?? storeMealSlot ?? 'log';

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
  const [showMicros, setShowMicros] = useState(false);

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

  // Decide active stage:
  // 1) Stage 1 (Image Intake): no draft items (or rescanning) and no image yet
  // 2) Stage 2 (Pre-Scan HITL): image captured, user describes what's in it before vision scan
  // 3) Stage 3 (Post-Scan Review): draft items present and not rescanning
  const hasDraftItems = Boolean(aiDraft && aiDraft.items && aiDraft.items.length > 0);
  const showReviewStage = hasDraftItems && !isRescanning;
  const showPreScanHitl = !showReviewStage && Boolean(imageDataUrl);

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
        per100g: {
          calories: it.per100g?.calories ?? 0,
          protein: it.per100g?.protein ?? 0,
          carbs: it.per100g?.carbs ?? 0,
          fat: it.per100g?.fat ?? 0,
          fiber: it.per100g?.fiber ?? 0,
        },
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
    setImageDataUrl(null);
    setContextPrompt('');
    setScanError(null);
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
        per100g: {
          calories: it.per100g?.calories ?? 0,
          protein: it.per100g?.protein ?? 0,
          carbs: it.per100g?.carbs ?? 0,
          fat: it.per100g?.fat ?? 0,
          fiber: it.per100g?.fiber ?? 0,
        },
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
  const totalMicros: Record<string, number> = {};
  for (const key of Object.keys(RDA_MICRONUTRIENT_METADATA)) {
    totalMicros[key] = 0;
  }

  if (aiDraft?.items) {
    for (const item of aiDraft.items) {
      const { macros, micros } = scaleNutrition(
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
      for (const [k, v] of Object.entries(micros)) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          totalMicros[k] = (totalMicros[k] ?? 0) + v;
        }
      }
    }
  }

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI Meal Scanner"
        data-testid="ai-meal-scanner-sheet"
        className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg mx-auto bg-surface-elevated border-t border-x border-border rounded-t-3xl px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-sheet-in max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-9 h-1 rounded-full bg-border mx-auto mb-3 shrink-0" aria-hidden="true" />
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              {showPreScanHitl ? (
                <button
                  type="button"
                  onClick={() => {
                    setImageDataUrl(null);
                    setScanError(null);
                  }}
                  aria-label="Back to photo upload"
                  className="touch-target macro-spring active:scale-90 w-8 h-8 rounded-full bg-surface-sub border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card"
                  title="Choose a different photo"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-[var(--macro-calories)]/15 flex items-center justify-center text-[var(--macro-calories)]">
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                </div>
              )}
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {showReviewStage
                    ? 'Review AI Meal'
                    : showPreScanHitl
                      ? "What's in this meal?"
                      : 'AI Meal Scanner'}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Logging for {effectiveDate}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {showReviewStage && (
                <button
                  type="button"
                  onClick={() => setIsRescanning(true)}
                  aria-label="Re-scan or take new photo"
                  className="touch-target macro-spring active:scale-90 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub mr-0.5"
                  title="Edit meal context / re-scan"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close AI scanner"
                className="touch-target macro-spring active:scale-90 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Body: Stage 1 (Image Intake) -> Stage 2 (Pre-Scan HITL) -> Stage 3 (Review) */}
          {!showReviewStage && !showPreScanHitl ? (
            /* STAGE 1: Image Intake Only */
            <div className="pt-4 flex-1 overflow-y-auto space-y-4">
              {scanError && (
                <div className="p-3 rounded-xl bg-surface-sub border border-border text-[var(--neutral-over)] text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1">{scanError}</div>
                </div>
              )}

              <div>
                <label
                  htmlFor="meal-photo-upload"
                  aria-label="Upload meal photo"
                  className="block cursor-pointer"
                >
                  <div className="w-full h-52 rounded-2xl border-2 border-dashed border-border hover:border-[var(--macro-calories)]/60 bg-surface-sub/50 flex flex-col items-center justify-center p-4 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-[var(--macro-calories)]/15 flex items-center justify-center text-[var(--macro-calories)] mb-2.5">
                      <Camera className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                      Take photo or upload image
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-1 text-center">
                      Next, tell the AI what&apos;s in your meal before scanning for higher accuracy
                    </span>
                  </div>
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

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleStartManualDraft}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
                >
                  Skip photo &amp; log ingredients manually
                </button>
              </div>
            </div>
          ) : !showReviewStage && showPreScanHitl ? (
            /* STAGE 2: Pre-Scan Human-in-the-Loop Context */
            <div className="pt-4 flex-1 overflow-y-auto space-y-4">
              {scanError && (
                <div className="p-3 rounded-xl bg-surface-sub border border-border text-[var(--neutral-over)] text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1">{scanError}</div>
                </div>
              )}

              {/* Captured Photo Preview (tap to replace) */}
              <div>
                <label
                  htmlFor="meal-photo-upload"
                  aria-label="Upload meal photo"
                  className="block cursor-pointer"
                >
                  <div className="relative rounded-2xl overflow-hidden border border-border group">
                    <img
                      src={imageDataUrl ?? undefined}
                      alt="Meal preview"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-medium">
                      <Upload className="w-4 h-4" />
                      <span>Change Photo</span>
                    </div>
                  </div>
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

              {/* Human-in-the-Loop Pre-Scan Prompt */}
              <div className="space-y-1.5">
                <label
                  htmlFor="meal-context-prompt"
                  className="text-xs font-semibold text-foreground flex items-center justify-between"
                >
                  <span>Tell AI what&apos;s in the meal</span>
                  <span className="text-[10px] font-medium text-primary">
                    Before vision scan
                  </span>
                </label>
                <textarea
                  id="meal-context-prompt"
                  value={contextPrompt}
                  onChange={(e) => setContextPrompt(e.target.value)}
                  placeholder="List ingredients, cooking oil, sauces, prep style, or weights (e.g. 2 tbsp olive oil, grilled chicken breast, basmati rice)..."
                  rows={3}
                  autoFocus
                  className="w-full p-3 text-xs rounded-xl bg-surface-sub border border-border focus:outline-none focus:border-border-focus text-foreground placeholder:text-muted-foreground/60 resize-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  The AI combines your notes with the photo so hidden oils, sauces, and ingredients aren&apos;t guessed wrong.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 space-y-2">
                <button
                  type="button"
                  onClick={handleAnalyzeMeal}
                  disabled={!imageDataUrl || isAnalyzing}
                  className="macro-spring active:scale-95 w-full py-3 rounded-full bg-foreground text-background font-semibold text-xs hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing meal with your notes...</span>
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
                    Skip photo &amp; log ingredients manually
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STAGE 3: Post-Scan Interactive HITL Review */
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
                        className="text-xl font-bold text-[var(--macro-calories)] tabular-nums tracking-tight"
                      >
                        {Math.round(totalCalories)}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">kcal</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Total estimated meal nutrition</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-right text-xs tabular-nums text-muted-foreground">
                  <div>
                    <span className="block font-bold text-[var(--macro-protein)]">{Math.round(totalProtein * 10) / 10}g</span>
                    <span className="text-[10px] uppercase">Prot</span>
                  </div>
                  <div>
                    <span className="block font-bold text-[var(--macro-carbs)]">{Math.round(totalCarbs * 10) / 10}g</span>
                    <span className="text-[10px] uppercase">Carb</span>
                  </div>
                  <div>
                    <span className="block font-bold text-[var(--macro-fat)]">{Math.round(totalFat * 10) / 10}g</span>
                    <span className="text-[10px] uppercase">Fat</span>
                  </div>
                  <div>
                    <span className="block font-bold text-[var(--macro-fiber)]" data-testid="hitl-total-fiber">{Math.round(totalFiber * 10) / 10}g</span>
                    <span className="text-[10px] uppercase">Fib</span>
                  </div>
                </div>
              </div>

              {/* Collapsible Estimated Micronutrients Summary */}
              <div className="mb-3 rounded-2xl bg-surface-sub/60 border border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMicros((prev) => !prev)}
                  aria-expanded={showMicros}
                  className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Estimated Micronutrients (12)</span>
                  {showMicros ? (
                    <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
                {showMicros && (
                  <div
                    data-testid="hitl-micronutrients-grid"
                    className="px-3 pb-2.5 pt-1 border-t border-border/60 grid grid-cols-3 gap-x-3 gap-y-1.5 text-[11px] tabular-nums"
                  >
                    {Object.values(RDA_MICRONUTRIENT_METADATA).map((meta) => {
                      const val = Math.round((totalMicros[meta.key] ?? 0) * 10) / 10;
                      return (
                        <div key={meta.key} className="flex items-center justify-between gap-1">
                          <span className="text-muted-foreground truncate">{meta.name}</span>
                          <span className="font-semibold text-foreground shrink-0">
                            {val}{meta.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Refine Error Banner */}
              {refineError && (
                <div className="mb-2 p-2.5 rounded-xl bg-surface-sub border border-border text-[var(--neutral-over)] text-xs flex items-start gap-2 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
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
                  className="macro-spring active:scale-[0.98] w-full py-2.5 px-3 rounded-xl border border-dashed border-border hover:border-[var(--macro-calories)]/60 bg-surface-sub/40 hover:bg-surface-sub text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
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
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-surface-sub border border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="submit"
                    disabled={isRefining || !refineInstruction.trim()}
                    className="macro-spring active:scale-95 px-3.5 py-2 rounded-full bg-card border border-border text-foreground hover:bg-surface-sub font-semibold text-xs disabled:opacity-50 flex items-center gap-1 shrink-0 shadow-xs"
                  >
                    {isRefining ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-[var(--macro-calories)]" aria-hidden="true" />
                    )}
                    <span>Refine</span>
                  </button>
                </form>

                {/* Confirm & Log Button */}
                <button
                  type="button"
                  onClick={handleConfirmAndLog}
                  disabled={isSubmittingLog || !aiDraft?.items.length}
                  className="macro-spring active:scale-95 w-full py-3 rounded-full bg-foreground text-background font-semibold text-xs hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
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
