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
    ensureDefaultUserGoals().catch((err) => {
      console.error("Failed to seed default user goals:", err);
    });
  }, []);

  const handleAction = (action: QuickActionType) => {
    setIsDockOpen(false);
    openSheet(action);
    onQuickAction?.(action);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      {/* Mobile-first centered frame container */}
      <div
        data-testid="app-shell-container"
        className="w-full max-w-[430px] min-h-screen flex flex-col relative pb-24 shadow-2xl bg-background border-x border-border"
      >
        {/* Main page content area */}
        <main className="flex-1 flex flex-col w-full">
          {children}
        </main>

        {/* Fixed bottom navigation */}
        <BottomNav onOpenQuickActions={() => setIsDockOpen(true)} />

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
