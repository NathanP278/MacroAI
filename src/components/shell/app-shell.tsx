"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Lock, X } from "lucide-react";
import { BottomNav } from "./bottom-nav";
import { QuickActionDock, QuickActionType } from "./quick-action-dock";
import { UndoToast } from "./undo-toast";
import { CommandPalette } from "./command-palette";
import { SyncUnlockCard } from "@/components/auth/sync-unlock-modal";
import { QuickAddDrawer } from "@/components/logging/quick-add-drawer";
import { FoodSearchDrawer } from "@/components/logging/food-search-drawer";
import { EditLogEntryDrawer } from "@/components/logging/edit-log-entry-drawer";
import { BarcodeScannerDrawer } from "@/components/scanner/barcode-scanner-drawer";
import { AiMealScannerSheet } from "@/components/scanner/ai-meal-scanner-sheet";
import { AiMealIdeasDrawer } from "@/components/scanner/ai-meal-ideas-drawer";
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

function SyncAuthBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isUnlockExpanded, setIsUnlockExpanded] = useState(false);

  if (isDismissed) {
    return null;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4">
      <div
        role="region"
        aria-label="Cloud sync locked"
        data-testid="sync-auth-banner"
        className="bg-card border border-border/60 rounded-2xl px-4 py-3 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-surface-sub border border-border/50 flex items-center justify-center text-[var(--neutral-over)] shrink-0">
              <Lock className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                Cloud sync &amp; AI locked
              </p>
              <p className="text-[11px] text-muted-foreground">
                Local offline logging remains active.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-expanded={isUnlockExpanded}
              onClick={() => {
                triggerHaptic(8);
                setIsUnlockExpanded((prev) => !prev);
              }}
              className="touch-target tactile-press px-3.5 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90"
            >
              Unlock Cloud Sync
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setIsDismissed(true);
              }}
              aria-label="Dismiss cloud sync notice"
              className="touch-target tactile-press w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-sub"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {isUnlockExpanded && (
          <SyncUnlockCard
            compact
            onUnlocked={() => {
              setIsUnlockExpanded(false);
              if (isCloudSyncEnabled()) {
                void syncWithCentralDb(db).catch(() => {});
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

export function AppShell({ children, onQuickAction }: AppShellProps) {
  const [isDockOpen, setIsDockOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const hasQuickSearchBar = pathname === "/" || pathname.startsWith("/log");
  const activeSheet = useLoggerStore((s) => s.activeSheet);
  const openSheet = useLoggerStore((s) => s.openSheet);
  const closeSheet = useLoggerStore((s) => s.closeSheet);
  const activeDate = useLoggerStore((s) => s.activeDate);
  const activeMealSlot = useLoggerStore((s) => s.activeMealSlot);
  const editingEntry = useLoggerStore((s) => s.editingEntry);
  const setEditingEntry = useLoggerStore((s) => s.setEditingEntry);
  const syncAuthLocked = useLoggerStore((s) => s.syncAuthLocked);

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
        className={`w-full max-w-6xl mx-auto min-h-dvh flex flex-col relative pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] ${
          hasQuickSearchBar
            ? "pb-[calc(8.75rem+env(safe-area-inset-bottom))] sm:pb-[calc(9.25rem+env(safe-area-inset-bottom))]"
            : "pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:pb-[calc(5.75rem+env(safe-area-inset-bottom))]"
        }`}
      >
        {syncAuthLocked && <SyncAuthBanner />}

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

        {/* AI Meal Ideas Drawer */}
        <AiMealIdeasDrawer
          open={activeSheet === "meal-ideas"}
          date={activeDate}
          onClose={closeSheet}
        />

        {/* Tap-to-Edit Logged Entry Drawer */}
        <EditLogEntryDrawer
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
        />
      </div>
    </div>
  );
}
