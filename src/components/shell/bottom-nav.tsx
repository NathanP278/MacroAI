"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Apple,
  Plus,
  UtensilsCrossed,
  Settings,
  Search,
  ScanBarcode,
  Sparkles,
} from "lucide-react";
import { useLoggerStore } from "@/stores/logger-store";
import { triggerHaptic } from "@/lib/motion";
import type { QuickActionType } from "./quick-action-dock";

export interface BottomNavProps {
  onOpenQuickActions: () => void;
  onDirectAction?: (action: QuickActionType) => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS_LEFT: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Food Log", href: "/log", icon: Apple },
];

const NAV_ITEMS_RIGHT: NavItem[] = [
  { label: "Recipes", href: "/recipes", icon: UtensilsCrossed },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function BottomNav({ onOpenQuickActions, onDirectAction }: BottomNavProps) {
  const pathname = usePathname() ?? "/";
  const setCommandPaletteOpen = useLoggerStore((s) => s.setCommandPaletteOpen);

  const showQuickSearchBar =
    Boolean(onDirectAction) &&
    (pathname === "/" || pathname.startsWith("/log"));

  const isItemActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <div
      style={{ viewTransitionName: "bottom-chrome" }}
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
    >
      {/* Persistent Quick Search Strip on Dashboard & Food Log */}
      {showQuickSearchBar && onDirectAction && (
        <div className="max-w-2xl mx-auto pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 pb-2.5 pointer-events-auto">
          <div className="surface-floating-bar hover:border-border-focus transition-colors rounded-2xl h-12 px-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                onDirectAction("search");
              }}
              aria-label="Search for a food"
              className="tactile-press flex-1 flex items-center gap-2.5 text-left text-muted-foreground hover:text-foreground transition-colors h-full min-w-0 group px-1"
            >
              <Search
                className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-105"
                aria-hidden="true"
              />
              <span className="text-[13px] font-medium truncate">
                Search for a food
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setCommandPaletteOpen(true);
              }}
              aria-label="Open command palette"
              className="hidden sm:inline-flex tactile-press items-center gap-1 px-2 py-1 rounded-lg bg-surface-sub border border-border text-[11px] font-mono text-muted-foreground hover:text-foreground shrink-0"
            >
              <span>⌘K</span>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  onDirectAction("barcode");
                }}
                aria-label="Open barcode camera"
                className="touch-target tactile-press min-w-[44px] min-h-[44px] sm:min-w-0 sm:px-2.5 sm:h-9 rounded-xl flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-sub"
              >
                <ScanBarcode className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline text-[11px] font-medium">
                  Barcode
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  onDirectAction("ai-scan");
                }}
                aria-label="Open photo scanner"
                className="touch-target tactile-press min-w-[44px] min-h-[44px] sm:min-w-0 sm:px-2.5 sm:h-9 rounded-xl flex items-center justify-center gap-1.5 text-[var(--macro-calories)] hover:bg-[var(--macro-calories)]/12"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline text-[11px] font-semibold">
                  AI Scan
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Docked Navigation Bar */}
      <nav
        data-testid="bottom-nav"
        aria-label="Bottom Navigation"
        className="pointer-events-auto bg-surface-card/90 backdrop-blur-md border-t border-border shadow-[0_-8px_28px_-12px_rgba(0,0,0,0.32)] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      >
        <div className="max-w-2xl mx-auto h-16 px-2 sm:px-6 flex items-center justify-between gap-1">
          {/* Left Nav items */}
          <div className="flex items-center gap-0.5 flex-1 justify-around min-w-0">
            {NAV_ITEMS_LEFT.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => triggerHaptic(8)}
                  className={`touch-target tactile-press relative flex flex-col items-center justify-center flex-1 min-w-0 min-h-[44px] py-1.5 rounded-xl ${
                    active
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={`flex items-center justify-center w-10 h-6 rounded-full mb-0.5 transition-colors duration-200 ${
                      active ? "bg-foreground/10" : "bg-transparent"
                    }`}
                  >
                    <Icon
                      aria-hidden="true"
                      className={`w-[19px] h-[19px] transition-transform duration-200 ${
                        active ? "stroke-[2.25] scale-105" : "stroke-[1.75]"
                      }`}
                    />
                  </span>
                  <span className="text-[10px] sm:text-[11px] tracking-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Crisp White/Foreground Center '+' Action Pill */}
          <div className="px-2 sm:px-4 shrink-0">
            <button
              type="button"
              onClick={onOpenQuickActions}
              aria-label="Open quick actions"
              className="group touch-target tactile-press w-11 h-11 rounded-full bg-foreground text-background hover:ring-4 hover:ring-foreground/10 hover:shadow-[0_6px_20px_rgba(0,0,0,0.34)] flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.28)] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-[box-shadow,transform] duration-200"
            >
              <Plus
                className="w-5 h-5 stroke-[2.5] transition-transform duration-200 group-hover:scale-110 group-hover:rotate-90"
                aria-hidden="true"
              />
            </button>
          </div>

          {/* Right Nav items */}
          <div className="flex items-center gap-0.5 flex-1 justify-around min-w-0">
            {NAV_ITEMS_RIGHT.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => triggerHaptic(8)}
                  className={`touch-target tactile-press relative flex flex-col items-center justify-center flex-1 min-w-0 min-h-[44px] py-1.5 rounded-xl ${
                    active
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={`flex items-center justify-center w-10 h-6 rounded-full mb-0.5 transition-colors duration-200 ${
                      active ? "bg-foreground/10" : "bg-transparent"
                    }`}
                  >
                    <Icon
                      aria-hidden="true"
                      className={`w-[19px] h-[19px] transition-transform duration-200 ${
                        active ? "stroke-[2.25] scale-105" : "stroke-[1.75]"
                      }`}
                    />
                  </span>
                  <span className="text-[10px] sm:text-[11px] tracking-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
