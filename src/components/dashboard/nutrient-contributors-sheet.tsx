'use client';

import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { computeNutrientContributors } from '@/lib/nutrition/analytics';
import { MotionModalOverlay } from '@/components/motion/motion-primitives';
import type { FoodLogEntry } from '@/types/nutrition';

export interface NutrientContributorsSheetProps {
  open: boolean;
  nutrientKey: string;
  nutrientLabel: string;
  unit: string;
  windowLabel?: string;
  logs: FoodLogEntry[];
  onClose: () => void;
}

function formatContributorAmount(amount: number): string {
  if (!Number.isFinite(amount)) return '0';
  const rounded = amount >= 100 ? Math.round(amount) : Math.round(amount * 10) / 10;
  return rounded.toLocaleString();
}

export function NutrientContributorsSheet({
  open,
  nutrientKey,
  nutrientLabel,
  unit,
  windowLabel = 'Today',
  logs,
  onClose,
}: NutrientContributorsSheetProps) {
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

  const contributors = useMemo(() => {
    if (!open || !nutrientKey) return [];
    return computeNutrientContributors(logs, nutrientKey, 8);
  }, [open, logs, nutrientKey]);

  const totalAmount = useMemo(() => {
    return contributors.reduce((sum, item) => sum + item.amount, 0);
  }, [contributors]);

  return (
    <MotionModalOverlay
      open={open}
      onClose={onClose}
      ariaLabel={`Top Contributors: ${nutrientLabel}`}
      align="sheet"
      panelClassName="w-full max-w-md mx-auto surface-elevated-sheet rounded-t-3xl sm:rounded-3xl px-4 sm:px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 max-h-[85dvh] flex flex-col"
    >
      <div
        className="w-9 h-1 rounded-full bg-border mx-auto mb-3 shrink-0 sm:hidden"
        aria-hidden="true"
      />

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-foreground truncate">
              Top Contributors · {nutrientLabel}
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
              {windowLabel}
              {contributors.length > 0
                ? ` · ${formatContributorAmount(totalAmount)} ${unit} across top ${contributors.length}`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close top contributors"
            className="touch-target tactile-press w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-sub shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto pt-3 space-y-3">
          {contributors.length === 0 ? (
            <div className="py-8 text-center space-y-1">
              <p className="text-sm font-medium text-foreground">
                No logged foods contributed {nutrientLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                Items containing {nutrientLabel.toLowerCase()} in this window will appear here ranked by contribution.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {contributors.map((item, idx) => {
                const pct = Math.min(100, Math.max(0, Math.round(item.sharePct)));
                return (
                  <li key={`${item.foodId}-${idx}`} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-foreground truncate">{item.name}</span>
                        <span className="text-[11px] font-medium text-muted-foreground bg-surface-sub px-1.5 py-0.5 rounded-md tabular-nums shrink-0">
                          {item.count}×
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        <span className="font-semibold text-foreground">
                          {formatContributorAmount(item.amount)}{' '}
                          <span className="font-normal text-muted-foreground">{unit}</span>
                        </span>
                        <span className="text-muted-foreground min-w-[34px] text-right">
                          {pct}%
                        </span>
                      </div>
                    </div>

                    <div
                      className="w-full h-1.5 rounded-[3px] bg-surface-sub overflow-hidden"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-[3px] bg-foreground/75 transition-transform duration-200 origin-left"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
    </MotionModalOverlay>
  );
}
