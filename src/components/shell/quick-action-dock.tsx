"use client";

import React from "react";
import { Sparkles, ScanBarcode, Search, Zap, X } from "lucide-react";

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
    accentColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  {
    id: "barcode",
    label: "Barcode Scan",
    sublabel: "Instant packaged food lookup",
    icon: ScanBarcode,
    accentColor: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  },
  {
    id: "search",
    label: "Quick Search",
    sublabel: "Verified USDA & custom foods",
    icon: Search,
    accentColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  {
    id: "quick-add",
    label: "Quick Add Macros",
    sublabel: "Direct calories and macro entry",
    icon: Zap,
    accentColor: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  },
];

export function QuickActionDock({ onAction, onClose }: QuickActionDockProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick Actions"
      data-testid="quick-action-dock"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] mx-auto bg-surface-elevated border-t border-x border-border rounded-t-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle / Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-400 rounded-full" />
            <h2 className="text-sm font-semibold tracking-wide text-foreground">
              Log Food & Nutrients
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick actions"
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-3 pt-4 pb-2">
          {ACTION_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onAction(item.id);
                  onClose?.();
                }}
                aria-label={item.label}
                className="flex flex-col items-start p-3.5 rounded-2xl bg-surface-sub hover:bg-accent active:scale-[0.98] border border-border hover:border-border-focus transition-all text-left group"
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
