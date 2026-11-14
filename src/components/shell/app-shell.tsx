"use client";

import React, { useState, useEffect } from "react";
import { BottomNav } from "./bottom-nav";
import { QuickActionDock, QuickActionType } from "./quick-action-dock";
import { QuickAddDrawer } from "@/components/logging/quick-add-drawer";
import { FoodSearchDrawer } from "@/components/logging/food-search-drawer";
import { BarcodeScannerDrawer } from "@/components/scanner/barcode-scanner-drawer";
import { AiMealScannerSheet } from "@/components/scanner/ai-meal-scanner-sheet";
import { useLoggerStore } from "@/stores/logger-store";
import { ensureDefaultUserGoals } from "@/lib/nutrition/goals";
import { db } from "@/lib/db/macroai-db";
import { isCloudSyncEnabled, syncWithCentralDb } from "@/lib/db/cloud-sync";

export { QuickActionDock };
export type { QuickActionType };

export interface AppShellProps {
  children: React.ReactNode;
  onQuickAction?: (action: QuickActionType) => void;
}

export function AppShell({ children, onQuickAction }: AppShellProps) {
  const [isDockOpen, setIsDockOpen] = useState(false);
  const activeSheet = useLoggerStore((s) => s.activeSheet);
  const openSheet = useLoggerStore((s) => s.openSheet);
  const closeSheet = useLoggerStore((s) => s.closeSheet);
  const activeDate = useLoggerStore((s) => s.activeDate);
  const activeMealSlot = useLoggerStore((s) => s.activeMealSlot);

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
    setIsDockOpen(false);
    openSheet(action);
    onQuickAction?.(action);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Dynamic responsive workspace: mobile-first full bleed, expands gracefully on tablets & laptops */}
      <div
        data-testid="app-shell-container"
        className="w-full max-w-6xl mx-auto min-h-screen flex flex-col relative pb-40"
      >
        <main className="flex-1 flex flex-col w-full">{children}</main>

        {/* Persistent quick search strip + fixed bottom navigation */}
        <BottomNav
          onOpenQuickActions={() => setIsDockOpen(true)}
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
