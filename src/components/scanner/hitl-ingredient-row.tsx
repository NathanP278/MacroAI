"use client";

import React, { useState } from 'react';
import { Trash2, CheckCircle2, HelpCircle, RefreshCw } from 'lucide-react';
import type { AiDraftItem } from '@/stores/logger-store';
import { scaleNutrition } from '@/lib/nutrition/scaling';

export interface HitlIngredientRowProps {
  item: AiDraftItem;
  draftRevision?: number;
  onChangeGrams: (itemId: string, newGrams: number) => void;
  onDeleteItem: (itemId: string) => void;
  onOpenVerifySwap: (item: AiDraftItem) => void;
}

const MULTIPLIERS = [0.5, 1, 1.5, 2] as const;

export const HitlIngredientRow = React.memo(function HitlIngredientRow({
  item,
  draftRevision,
  onChangeGrams,
  onDeleteItem,
  onOpenVerifySwap,
}: HitlIngredientRowProps) {
  // Baseline initial grams for non-compounding multiplier calculation
  const [tracking, setTracking] = useState({
    id: item.id,
    name: item.name,
    draftRevision,
  });
  const [baselineGrams, setBaselineGrams] = useState<number>(
    item.grams > 0 ? item.grams : 100
  );

  if (
    item.id !== tracking.id ||
    item.name !== tracking.name ||
    draftRevision !== tracking.draftRevision
  ) {
    setTracking({
      id: item.id,
      name: item.name,
      draftRevision,
    });
    setBaselineGrams(item.grams > 0 ? item.grams : 100);
  }

  const { macros } = scaleNutrition(
    item.per100g,
    item.microsPer100g ?? {},
    'per100g',
    item.grams
  );

  const handleMultiplierClick = (m: number) => {
    const base = baselineGrams > 0 ? baselineGrams : 100;
    const newGrams = Math.round(base * m);
    onChangeGrams(item.id, newGrams);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    onChangeGrams(item.id, Math.max(0, val));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onChangeGrams(item.id, isNaN(val) ? 0 : Math.max(0, val));
  };

  const maxSlider = Math.max(
    500,
    Math.round(item.grams * 2),
    Math.round((baselineGrams || 100) * 2.5)
  );

  return (
    <div className="bg-surface-sub/80 border border-border rounded-2xl p-3.5 space-y-3 shadow-sm hover:border-border-focus/40 transition-colors">
      {/* Top Header: Name, Source Badge, Verify/Swap trigger, Delete button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground truncate">
            {item.name}
          </span>
          {item.verifiedSource ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--macro-carbs)]/15 text-[var(--macro-carbs)] font-semibold shrink-0"
              title={`Verified against ${item.verifiedSource}`}
            >
              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
              <span>Verified</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated text-muted-foreground font-medium shrink-0"
              title="Estimated by AI vision"
            >
              <HelpCircle className="w-3 h-3" aria-hidden="true" />
              <span>AI Estimated</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenVerifySwap(item)}
            className="macro-spring active:scale-95 px-2.5 py-1 text-[11px] font-medium rounded-full bg-surface-elevated border border-border text-foreground hover:bg-card flex items-center gap-1 shadow-xs"
          >
            <RefreshCw className="w-3 h-3 text-[var(--macro-calories)]" aria-hidden="true" />
            <span>Verify / Swap</span>
          </button>
          <button
            type="button"
            onClick={() => onDeleteItem(item.id)}
            className="touch-target macro-spring active:scale-90 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-surface-elevated"
            aria-label={`Delete ${item.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Row Nutrition Summary */}
      <div className="flex items-baseline justify-between text-xs text-muted-foreground pt-0.5">
        <div className="flex items-baseline gap-1">
          <span className="font-bold text-sm text-[var(--macro-calories)] tabular-nums">
            {Math.round(macros.calories)}
          </span>
          <span className="text-[11px]">kcal</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] tabular-nums">
          <span><strong className="text-[var(--macro-protein)]">{macros.protein}</strong>P</span>
          <span>&bull;</span>
          <span><strong className="text-[var(--macro-carbs)]">{macros.carbs}</strong>C</span>
          <span>&bull;</span>
          <span><strong className="text-[var(--macro-fat)]">{macros.fat}</strong>F</span>
          <span>&bull;</span>
          <span><strong className="text-[var(--macro-fiber)]">{macros.fiber}</strong>Fib</span>
        </div>
      </div>

      {/* Live Gram Controls: Range Slider + Direct Numeric Input */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <input
            type="range"
            aria-label={`Gram slider for ${item.name}`}
            min="0"
            max={maxSlider}
            step="1"
            value={item.grams}
            onChange={handleSliderChange}
            className="w-full accent-primary h-1.5 bg-border rounded-lg cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            aria-label={`Grams for ${item.name}`}
            min="0"
            max="5000"
            value={item.grams === 0 ? '' : item.grams}
            placeholder="0"
            onChange={handleNumberChange}
            className="w-16 px-2 py-1 text-xs font-semibold text-right tabular-nums bg-surface-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          />
          <span className="text-xs font-medium text-muted-foreground">g</span>
        </div>
      </div>

      {/* Quick Multiplier Chips (Row-specific) */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <span className="text-[10px] text-muted-foreground font-medium mr-1">Scale:</span>
        {MULTIPLIERS.map((m) => {
          const targetGrams = Math.round((baselineGrams || 100) * m);
          const isSelected = item.grams === targetGrams;
          return (
            <button
              key={m}
              type="button"
              onClick={() => handleMultiplierClick(m)}
              className={`macro-spring active:scale-95 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${
                isSelected
                  ? 'bg-foreground text-background border-foreground shadow-xs'
                  : 'bg-surface-elevated border-border text-foreground/80 hover:text-foreground'
              }`}
            >
              {m}x
            </button>
          );
        })}
      </div>
    </div>
  );
});
