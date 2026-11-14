"use client";

import React, { useEffect, useRef } from "react";
import { Sparkles, ScanBarcode, Search, Zap, X } from "lucide-react";
import { triggerHaptic } from "@/lib/motion";

export type QuickActionType = "ai-scan" | "barcode" | "search" | "quick-add";

export interface QuickActionDockProps {
  onAction: (action: QuickActionType) => void;
  onClose?: () => void;
}

interface ActionItem {
  id: QuickActionType;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const ACTION_ITEMS: ActionItem[] = [
  {
    id: "ai-scan",
    label: "AI Meal Scan",
    sublabel: "Photo or description estimate",
    icon: Sparkles,
    accentColor:
      "text-[var(--macro-calories)] bg-[var(--macro-calories)]/12 border-[var(--macro-calories)]/25",
  },
  {
    id: "barcode",
    label: "Barcode Scan",
    sublabel: "Instant packaged food lookup",
    icon: ScanBarcode,
    accentColor:
      "text-[var(--macro-protein)] bg-[var(--macro-protein)]/12 border-[var(--macro-protein)]/25",
  },
  {
    id: "search",
    label: "Quick Search",
    sublabel: "Verified USDA & custom foods",
    icon: Search,
    accentColor:
      "text-[var(--macro-carbs)] bg-[var(--macro-carbs)]/12 border-[var(--macro-carbs)]/25",
  },
  {
    id: "quick-add",
    label: "Quick Add Macros",
    sublabel: "Direct calories and macro entry",
    icon: Zap,
    accentColor:
      "text-[var(--macro-fat)] bg-[var(--macro-fat)]/12 border-[var(--macro-fat)]/25",
  },
];

export function QuickActionDock({ onAction, onClose }: QuickActionDockProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const firstBtn = buttonRefs.current[0];
    if (firstBtn) {
      firstBtn.focus();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
        return;
      }

      const activeIdx = buttonRefs.current.findIndex(
        (el) => el === document.activeElement
      );
      if (activeIdx === -1) return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = (activeIdx + 1) % ACTION_ITEMS.length;
        buttonRefs.current[next]?.focus();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = (activeIdx - 1 + ACTION_ITEMS.length) % ACTION_ITEMS.length;
        buttonRefs.current[prev]?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick Actions"
      data-testid="quick-action-dock"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/65 backdrop-blur-xs animate-backdrop-in"
      onClick={onClose}
    >
      <div
        style={{ transformOrigin: "bottom center" }}
        className="w-full max-w-lg mx-auto bg-surface-elevated/92 border-t border-x border-border surface-elevated-sheet border-b-0 rounded-t-3xl px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-sheet-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-9 h-1 rounded-full bg-border mx-auto mb-3"
          aria-hidden="true"
        />
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-[var(--macro-calories)] rounded-full" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Log Food &amp; Nutrients
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick actions"
            className="touch-target tactile-press p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-3 pt-4 pb-2">
          {ACTION_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  buttonRefs.current[idx] = el;
                }}
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  onAction(item.id);
                  onClose?.();
                }}
                aria-label={item.label}
                style={{ "--stagger-index": idx } as React.CSSProperties}
                className="stagger-item tactile-press flex flex-col items-start p-3.5 rounded-2xl bg-surface-sub hover:bg-accent border border-border hover:border-border-focus text-left group"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-2.5 transition-transform group-hover:scale-105 ${item.accentColor}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-foreground tracking-tight">
                  {item.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {item.sublabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
