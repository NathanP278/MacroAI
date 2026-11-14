"use client";

import React, { useState } from "react";
import { BottomNav } from "./bottom-nav";
import { QuickActionDock, QuickActionType } from "./quick-action-dock";

export { QuickActionDock };
export type { QuickActionType };

export interface AppShellProps {
  children: React.ReactNode;
  onQuickAction?: (action: QuickActionType) => void;
}

export function AppShell({ children, onQuickAction }: AppShellProps) {
  const [isDockOpen, setIsDockOpen] = useState(false);

  const handleAction = (action: QuickActionType) => {
    setIsDockOpen(false);
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
      </div>
    </div>
  );
}
