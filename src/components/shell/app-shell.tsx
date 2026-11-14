"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "./bottom-nav";
import { QuickActionDock, QuickActionType } from "./quick-action-dock";
import { UndoToast } from "./undo-toast";
import { CommandPalette } from "./command-palette";
import { QuickAddDrawer } from "@/components/logging/quick-add-drawer";
import { FoodSearchDrawer } from "@/components/logging/food-search-drawer";
import { BarcodeScannerDrawer } from "@/components/scanner/barcode-scanner-drawer";
import { AiMealScannerSheet } from "@/components/scanner/ai-meal-scanner-sheet";
import { useLoggerStore } from "@/stores/logger-store";
import { ensureDefaultUserGoals } from "@/lib/nutrition/goals";
import { db } from "@/lib/db/macroai-db";
import { isCloudSyncEnabled, syncWithCentralDb } from "@/lib/db/cloud-sync";
import { triggerHaptic } from "@/lib/motion";

export { QuickActionDock };
export type { QuickActionType };

export interface AppShellProps {
  children: React.ReactNode;
  onQuickAction?: (action: QuickActionType) => void;
}

export function AppShell({ children, onQuickAction }: AppShellProps) {
  const [isDockOpen, setIsDockOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const activeSheet = useLoggerStore((s) => s.activeSheet);
  const openSheet = useLoggerStore((s) => s.openSheet);
  const closeSheet = useLoggerStore((s) => s.closeSheet);
  const activeDate = useLoggerStore((s) => s.activeDate);
  const activeMealSlot = useLoggerStore((s) => s.activeMealSlot);

  // Restore & persist per-route scroll position
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `macro_scroll_${pathname}`;
    try {
      const saved = window.sessionStorage?.getItem(key);
      if (saved) {
        const y = parseInt(saved, 10);
        if (Number.isFinite(y) && y > 0) {
          requestAnimationFrame(() => {
            window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
          });
        }
      }
    } catch {
      // sessionStorage unavailable
    }

    const handleScroll = () => {
      try {
        window.sessionStorage?.setItem(key, String(Math.round(window.scrollY)));
      } catch {
        // Ignore storage errors
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      handleScroll();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function initData() {
      if (isCloudSyncEnabled()) {
        await syncWithCentralDb(db).catch((err) => {
          console.error("Central DB sync warning:", err);
        });
      }
      if (!cancelled) {
        await ensureDefaultUserGoals().catch((err) => {
          console.error("Failed to seed default user goals:", err);
        });
      }
    }

    initData();

    if (!isCloudSyncEnabled()) {
      return () => {
        cancelled = true;
      };
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncWithCentralDb(db).catch(() => {});
      }
    };

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const handleAction = (action: QuickActionType) => {
    triggerHaptic(8);
    setIsDockOpen(false);
    openSheet(action);
    onQuickAction?.(action);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Translucent top safe-area scrim so scrolled content never clashes with iOS/Android status bar */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 z-40 h-[env(safe-area-inset-top)] bg-background/85 backdrop-blur-md pointer-events-none"
      />

      {/* Dynamic responsive workspace: mobile-first full bleed, expands gracefully on tablets & laptops */}
      <div
        data-testid="app-shell-container"
        className="w-full max-w-6xl mx-auto min-h-dvh flex flex-col relative pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[calc(9rem+env(safe-area-inset-bottom))] sm:pb-[calc(9.5rem+env(safe-area-inset-bottom))]"
      >
        <main className="flex-1 flex flex-col w-full animate-page-enter">
          {children}
        </main>

        {/* Floating Undo Toast */}
        <UndoToast />

        {/* Desktop Command Palette (Cmd/Ctrl + K) */}
        <CommandPalette />

        {/* Persistent quick search strip + fixed bottom navigation */}
        <BottomNav
          onOpenQuickActions={() => {
            triggerHaptic(10);
            setIsDockOpen(true);
          }}
          onDirectAction={handleAction}
        />

        {/* Quick action overlay dock */}
        {isDockOpen && (
          <QuickActionDock
            onAction={handleAction}
            onClose={() => setIsDockOpen(false)}
          />
        )}

        {/* Quick Add Macros Drawer */}
        <QuickAddDrawer
          open={activeSheet === "quick-add"}
          date={activeDate}
          mealSlot={activeMealSlot}
          onClose={closeSheet}
        />

        {/* Food Search Drawer */}
        <FoodSearchDrawer
          open={activeSheet === "search"}
          date={activeDate}
          mealSlot={activeMealSlot}
          onClose={closeSheet}
        />

        {/* Barcode Scanner Drawer */}
        <BarcodeScannerDrawer
          open={activeSheet === "barcode"}
          date={activeDate}
          mealSlot={activeMealSlot}
          onClose={closeSheet}
        />

        {/* AI Meal Scanner Sheet */}
        <AiMealScannerSheet
          open={activeSheet === "ai-scan"}
          date={activeDate}
          mealSlot={activeMealSlot}
          onClose={closeSheet}
        />
      </div>
    </div>
  );
}
