"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  ScanBarcode,
  Search,
  Zap,
  Scale,
  ChevronRight,
  X,
} from "lucide-react";
import {
  SPRING_EXPRESSIVE,
  SPRING_SNAPPY,
  isTestEnvironment,
  triggerHaptic,
} from "@/lib/motion";
import { MotionModalOverlay } from "@/components/motion/motion-primitives";
import { useFocusTrap } from "@/hooks/use-focus-trap";

export type QuickActionType =
  | "ai-scan"
  | "barcode"
  | "search"
  | "quick-add"
  | "weight";

export interface QuickActionDockProps {
  open?: boolean;
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
    accentColor: "text-foreground liquid-pill-glass",
  },
  {
    id: "barcode",
    label: "Barcode Scan",
    sublabel: "Instant packaged food lookup",
    icon: ScanBarcode,
    accentColor: "text-foreground liquid-pill-glass",
  },
  {
    id: "search",
    label: "Quick Search",
    sublabel: "Verified USDA & custom foods",
    icon: Search,
    accentColor: "text-foreground liquid-pill-glass",
  },
  {
    id: "quick-add",
    label: "Quick Add Macros",
    sublabel: "Direct calories and macro entry",
    icon: Zap,
    accentColor: "text-foreground liquid-pill-glass",
  },
];

export function QuickActionDock({
  open = true,
  onAction,
  onClose,
}: QuickActionDockProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const isTest = isTestEnvironment();
  useFocusTrap(sheetRef, open);

  useEffect(() => {
    if (!open) return;
    const firstBtn = buttonRefs.current[0];
    if (firstBtn) {
      firstBtn.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
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

      const totalButtons = ACTION_ITEMS.length + 1;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = (activeIdx + 1) % totalButtons;
        buttonRefs.current[next]?.focus();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = (activeIdx - 1 + totalButtons) % totalButtons;
        buttonRefs.current[prev]?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <MotionModalOverlay
      open={open}
      onClose={onClose}
      ariaLabel="Quick Actions"
      dataTestId="quick-action-dock"
      align="sheet"
      panelRef={sheetRef}
      panelClassName="w-full max-w-lg mx-auto bg-surface-elevated border-t border-x sm:border border-border surface-elevated-sheet border-b-0 sm:border-b rounded-t-3xl sm:rounded-3xl px-4 sm:px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5"
    >
      <div
        className="w-9 h-1 rounded-full bg-border mx-auto mb-3 sm:hidden"
        aria-hidden="true"
      />
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-border">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Log Food &amp; Nutrients
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick actions"
          className="touch-target tactile-press p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Action Grid + Full-Width Weigh-In Action */}
      <div className="pt-4 pb-1 sm:pb-0 space-y-2.5 sm:space-y-3">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {ACTION_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.button
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
                initial={isTest ? false : { opacity: 0, y: 18, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.95 }}
                transition={{
                  ...SPRING_EXPRESSIVE,
                  delay: isTest ? 0 : 0.05 + idx * 0.055,
                }}
                className="flex flex-col items-start p-3 sm:p-3.5 rounded-2xl bg-surface-sub hover:bg-accent border border-border hover:border-border-focus text-left group min-w-0 transition-colors"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-2.5 transition-transform duration-200 group-hover:scale-110 ${item.accentColor}`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold text-foreground tracking-tight">
                  {item.label}
                </span>
                <span className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                  {item.sublabel}
                </span>
              </motion.button>
            );
          })}
        </div>

        <motion.button
          ref={(el) => {
            buttonRefs.current[ACTION_ITEMS.length] = el;
          }}
          type="button"
          onClick={() => {
            triggerHaptic(8);
            onAction("weight");
            onClose?.();
          }}
          aria-label="Log Weigh-In"
          initial={isTest ? false : { opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.96 }}
          transition={{
            ...SPRING_SNAPPY,
            delay: isTest ? 0 : 0.05 + ACTION_ITEMS.length * 0.055,
          }}
          className="touch-target w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl bg-surface-sub hover:bg-accent border border-border hover:border-border-focus text-left group transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-foreground liquid-pill-glass shrink-0 transition-transform duration-200 group-hover:scale-105">
              <Scale className="w-4.5 h-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-foreground tracking-tight">
                Log Weigh-In
              </span>
              <span className="block text-[11px] text-muted-foreground leading-snug">
                Record body weight &amp; trend
              </span>
            </div>
          </div>
          <ChevronRight
            className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-transform duration-200 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </motion.button>
      </div>
    </MotionModalOverlay>
  );
}
