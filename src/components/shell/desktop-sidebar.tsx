"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  LayoutGrid,
  Apple,
  TrendingUp,
  UtensilsCrossed,
  Settings,
  Plus,
  Search,
  ScanBarcode,
  Sparkles,
} from "lucide-react";
import { useLoggerStore } from "@/stores/logger-store";
import { SPRING_PILL, SPRING_SNAPPY, triggerHaptic } from "@/lib/motion";
import type { QuickActionType } from "./quick-action-dock";

export interface DesktopSidebarProps {
  onOpenQuickActions: () => void;
  onDirectAction: (action: QuickActionType) => void;
}

interface SidebarNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SIDEBAR_ITEMS: SidebarNavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Food Log", href: "/log", icon: Apple },
  { label: "Trends", href: "/trends", icon: TrendingUp },
  { label: "Recipes", href: "/recipes", icon: UtensilsCrossed },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function DesktopSidebar({
  onOpenQuickActions,
  onDirectAction,
}: DesktopSidebarProps) {
  const pathname = usePathname() ?? "/";
  const setCommandPaletteOpen = useLoggerStore((s) => s.setCommandPaletteOpen);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const isItemActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  if (!isDesktop) {
    return (
      <aside
        data-testid="desktop-sidebar"
        aria-hidden="true"
        className="hidden lg:flex lg:flex-col lg:w-[220px] lg:shrink-0 lg:sticky lg:top-0 lg:h-dvh border-r border-border/50 bg-card/50 backdrop-blur-xl"
      />
    );
  }

  return (
    <aside
      data-testid="desktop-sidebar"
      aria-label="Primary Navigation"
      style={{ viewTransitionName: "desktop-sidebar" }}
      className="hidden lg:flex lg:flex-col lg:w-[220px] lg:shrink-0 lg:sticky lg:top-0 lg:h-dvh border-r border-border/50 bg-card/50 backdrop-blur-xl px-3.5 py-5 justify-between gap-5"
    >
      <div className="space-y-5">
        {/* Brand */}
        <Link
          href="/"
          onClick={() => triggerHaptic(6)}
          className="group flex items-center gap-2.5 px-2 py-1 rounded-xl hover:bg-surface-sub/60 transition-colors"
        >
          <span className="w-7 h-7 rounded-lg bg-foreground text-background flex items-center justify-center text-xs font-bold tracking-tight shrink-0 transition-transform duration-300 group-hover:scale-108">
            M
          </span>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-foreground leading-none">
              MacroAI
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Calibration Cockpit
            </div>
          </div>
        </Link>

        {/* Primary Log & Search Controls */}
        <div className="space-y-2">
          <motion.button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              onOpenQuickActions();
            }}
            whileHover={{ scale: 1.03, y: -1.5 }}
            whileTap={{ scale: 0.94 }}
            transition={SPRING_SNAPPY}
            aria-label="Open quick actions"
            className="group w-full h-10 px-3.5 rounded-full bg-foreground text-background hover:opacity-95 text-xs font-semibold flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.28)] transition-opacity"
          >
            <Plus className="w-4 h-4 stroke-[2.5] transition-transform duration-300 group-hover:rotate-90" aria-hidden="true" />
            <span>Log Food</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              onDirectAction("search");
            }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={SPRING_SNAPPY}
            aria-label="Search for a food"
            className="w-full h-9 px-2.5 rounded-xl bg-surface-sub/80 border border-border/60 hover:border-border-focus text-muted-foreground hover:text-foreground text-xs flex items-center gap-2 transition-colors"
          >
            <Search className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="flex-1 text-left truncate font-medium">Search foods</span>
            <kbd
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(6);
                setCommandPaletteOpen(true);
              }}
              className="px-1.5 py-0.5 rounded-md bg-card border border-border/70 text-[10px] font-mono text-muted-foreground"
            >
              ⌘K
            </kbd>
          </motion.button>

          <div className="grid grid-cols-2 gap-1.5">
            <motion.button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                onDirectAction("barcode");
              }}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.94 }}
              transition={SPRING_SNAPPY}
              aria-label="Open barcode camera"
              className="h-8 px-2 rounded-xl bg-surface-sub/55 border border-border/40 hover:border-border-focus hover:bg-surface-sub text-muted-foreground hover:text-foreground text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <ScanBarcode className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Barcode</span>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                onDirectAction("ai-scan");
              }}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.94 }}
              transition={SPRING_SNAPPY}
              aria-label="Open photo scanner"
              className="h-8 px-2 rounded-xl bg-[var(--macro-calories)]/10 border border-[var(--macro-calories)]/25 hover:bg-[var(--macro-calories)]/18 text-[var(--macro-calories)] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>AI Scan</span>
            </motion.button>
          </div>
        </div>

        {/* Navigation Links with Shared-Element Gliding Active Pill */}
        <nav aria-label="Sidebar Navigation" className="space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => triggerHaptic(6)}
                aria-current={active ? "page" : undefined}
                className={`relative tactile-press flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-sub/55 font-medium"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="desktop-sidebar-active-pill"
                    transition={SPRING_PILL}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-xl bg-foreground/10 border border-border-focus shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                  />
                )}
                <Icon
                  aria-hidden="true"
                  className={`relative z-10 w-[18px] h-[18px] shrink-0 transition-transform duration-200 ${
                    active ? "stroke-[2.25] scale-105" : "stroke-[1.75]"
                  }`}
                />
                <span className="relative z-10 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Command Palette Shortcut Footer */}
      <motion.button
        type="button"
        onClick={() => {
          triggerHaptic(6);
          setCommandPaletteOpen(true);
        }}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.96 }}
        transition={SPRING_SNAPPY}
        className="w-full px-3 py-2 rounded-xl bg-surface-sub/50 border border-border/40 hover:border-border-focus text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-between transition-colors"
      >
        <span>Command Menu</span>
        <span className="font-mono text-[10px]">⌘K</span>
      </motion.button>
    </aside>
  );
}
