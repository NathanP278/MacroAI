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
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      {/* Persistent Quick Search Strip on Dashboard & Food Log (Pic 4 style) */}
      {showQuickSearchBar && onDirectAction && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-2.5 pointer-events-auto">
          <div className="macro-card-interactive bg-surface-card/95 backdrop-blur-md border border-border rounded-2xl h-12 px-3.5 flex items-center gap-2 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
            <button
              type="button"
              onClick={() => onDirectAction("search")}
              aria-label="Search for a food"
              className="flex-1 flex items-center gap-2.5 text-left text-muted-foreground hover:text-foreground transition-colors h-full min-w-0 group"
            >
              <Search className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-105" aria-hidden="true" />
              <span className="text-[13px] font-medium truncate">Search for a food</span>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onDirectAction("barcode")}
                aria-label="Open barcode camera"
                className="touch-target macro-spring active:scale-90 w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-sub"
              >
                <ScanBarcode className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onDirectAction("ai-scan")}
                aria-label="Open photo scanner"
                className="touch-target macro-spring active:scale-90 w-9 h-9 rounded-xl flex items-center justify-center text-[var(--macro-calories)] hover:bg-[var(--macro-calories)]/12"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Docked Navigation Bar (Pics 1, 3, 4) */}
      <nav
        data-testid="bottom-nav"
        aria-label="Bottom Navigation"
        className="pointer-events-auto bg-surface-card/95 backdrop-blur-md border-t border-border pb-[max(0.5rem,env(safe-area-inset-bottom))]"
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
                  className={`macro-spring active:scale-95 relative flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 rounded-xl ${
                    active
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={`flex items-center justify-center w-9 h-6 rounded-full mb-0.5 transition-colors duration-200 ${
                      active ? "bg-foreground/10" : "bg-transparent"
                    }`}
                  >
                    <Icon
                      className={`w-[19px] h-[19px] transition-transform duration-200 ${
                        active ? "stroke-[2.25] scale-105" : "stroke-[1.75]"
                      }`}
                    />
                  </span>
                  <span className="text-[11px] tracking-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Crisp White/Foreground Center '+' Action Pill (Pics 1, 3, 4) */}
          <div className="px-2 sm:px-4 shrink-0">
            <button
              type="button"
              onClick={onOpenQuickActions}
              aria-label="Open quick actions"
              className="touch-target macro-spring w-11 h-11 rounded-full bg-foreground text-background hover:scale-105 hover:ring-4 hover:ring-foreground/10 active:scale-90 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.28)] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
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
                  className={`macro-spring active:scale-95 relative flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 rounded-xl ${
                    active
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={`flex items-center justify-center w-9 h-6 rounded-full mb-0.5 transition-colors duration-200 ${
                      active ? "bg-foreground/10" : "bg-transparent"
                    }`}
                  >
                    <Icon
                      className={`w-[19px] h-[19px] transition-transform duration-200 ${
                        active ? "stroke-[2.25] scale-105" : "stroke-[1.75]"
                      }`}
                    />
                  </span>
                  <span className="text-[11px] tracking-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
