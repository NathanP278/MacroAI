"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Moon,
  Plus,
  RotateCcw,
  ScanBarcode,
  Search,
  Settings,
  Sparkles,
  Sun,
  UtensilsCrossed,
  X,
  Zap,
  Apple,
} from "lucide-react";
import { useLoggerStore } from "@/stores/logger-store";
import { useOptionalTheme } from "@/components/theme/theme-provider";
import { copyYesterdayLogs, offsetIsoDate } from "@/lib/recipes/recipe-builder";
import { searchStaples } from "@/lib/foods/staples-search";
import { runViewTransition, triggerHaptic } from "@/lib/motion";
import type { FoodItem } from "@/types/nutrition";

function getTodayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface CommandAction {
  id: string;
  section: "Log & Actions" | "Navigate" | "Staple Foods";
  label: string;
  hint: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void | Promise<void>;
}

export function CommandPalette() {
  const isOpen = useLoggerStore((s) => s.isCommandPaletteOpen);
  const setOpen = useLoggerStore((s) => s.setCommandPaletteOpen);
  const activeDate = useLoggerStore((s) => s.activeDate);
  const setActiveDate = useLoggerStore((s) => s.setActiveDate);
  const openSheet = useLoggerStore((s) => s.openSheet);
  const setSearchInitialQuery = useLoggerStore((s) => s.setSearchInitialQuery);
  const showUndoToast = useLoggerStore((s) => s.showUndoToast);

  const themeCtx = useOptionalTheme();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [foodMatches, setFoodMatches] = useState<FoodItem[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  // Global Cmd/Ctrl + K and Escape handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const nextOpen = !useLoggerStore.getState().isCommandPaletteOpen;
        setOpen(nextOpen);
        triggerHaptic(8);
        return;
      }
      if (e.key === "Escape" && useLoggerStore.getState().isCommandPaletteOpen) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [setOpen]);

  // Reset and autofocus whenever opened
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setFoodMatches([]);
      setActiveIndex(0);
      return;
    }
    const id = setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
    return () => clearTimeout(id);
  }, [isOpen]);

  // Instant offline staple search when query >= 2 chars
  useEffect(() => {
    const trimmed = query.trim();
    if (!isOpen || trimmed.length < 2) {
      setFoodMatches([]);
      return;
    }
    let cancelled = false;
    searchStaples(trimmed, 5)
      .then((items) => {
        if (!cancelled) setFoodMatches(items);
      })
      .catch(() => {
        if (!cancelled) setFoodMatches([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, query]);

  const actions: CommandAction[] = useMemo(() => {
    const closeAnd = (fn: () => void) => () => {
      setOpen(false);
      triggerHaptic(8);
      fn();
    };

    const isDark =
      themeCtx?.resolvedTheme === "dark" ||
      (typeof document !== "undefined" &&
        !document.documentElement.classList.contains("light"));

    const staticActions: CommandAction[] = [
      {
        id: "action-search-food",
        section: "Log & Actions",
        label: "Search Food Database",
        hint: "2,500+ offline staples & USDA",
        icon: Search,
        onSelect: closeAnd(() => openSheet("search")),
      },
      {
        id: "action-quick-add",
        section: "Log & Actions",
        label: "Quick Add Macros",
        hint: "Direct calories, protein, carbs, fat",
        icon: Zap,
        onSelect: closeAnd(() => openSheet("quick-add")),
      },
      {
        id: "action-barcode",
        section: "Log & Actions",
        label: "Scan Barcode",
        hint: "Packaged food lookup & OCR",
        icon: ScanBarcode,
        onSelect: closeAnd(() => openSheet("barcode")),
      },
      {
        id: "action-ai-scan",
        section: "Log & Actions",
        label: "AI Meal Photo Scan",
        hint: "Estimate portions from meal photo",
        icon: Sparkles,
        onSelect: closeAnd(() => openSheet("ai-scan")),
      },
      {
        id: "action-copy-yesterday",
        section: "Log & Actions",
        label: "Copy Yesterday's Logs",
        hint: `Duplicate previous day into ${activeDate}`,
        icon: RotateCcw,
        onSelect: closeAnd(async () => {
          const count = await copyYesterdayLogs(activeDate);
          showUndoToast({
            message:
              count > 0
                ? `Copied ${count} ${count === 1 ? "item" : "items"} from yesterday`
                : "No entries found for yesterday",
            onUndo: () => {},
          });
        }),
      },
      {
        id: "nav-dashboard",
        section: "Navigate",
        label: "Go to Dashboard",
        hint: "/",
        href: "/",
        icon: LayoutGrid,
        onSelect: closeAnd(() => {}),
      },
      {
        id: "nav-log",
        section: "Navigate",
        label: "Go to Food Log",
        hint: "/log",
        href: "/log",
        icon: Apple,
        onSelect: closeAnd(() => {}),
      },
      {
        id: "nav-recipes",
        section: "Navigate",
        label: "Go to Recipes",
        hint: "/recipes",
        href: "/recipes",
        icon: UtensilsCrossed,
        onSelect: closeAnd(() => {}),
      },
      {
        id: "nav-settings",
        section: "Navigate",
        label: "Go to Settings",
        hint: "/settings",
        href: "/settings",
        icon: Settings,
        onSelect: closeAnd(() => {}),
      },
      {
        id: "date-prev",
        section: "Navigate",
        label: "Previous Day",
        hint: offsetIsoDate(activeDate, -1),
        icon: ChevronLeft,
        onSelect: closeAnd(() =>
          runViewTransition(
            () => setActiveDate(offsetIsoDate(activeDate, -1)),
            { direction: "backward" }
          )
        ),
      },
      {
        id: "date-next",
        section: "Navigate",
        label: "Next Day",
        hint: offsetIsoDate(activeDate, 1),
        icon: ChevronRight,
        onSelect: closeAnd(() =>
          runViewTransition(
            () => setActiveDate(offsetIsoDate(activeDate, 1)),
            { direction: "forward" }
          )
        ),
      },
      {
        id: "date-today",
        section: "Navigate",
        label: "Jump to Today",
        hint: getTodayIsoDate(),
        icon: Calendar,
        onSelect: closeAnd(() =>
          runViewTransition(() => setActiveDate(getTodayIsoDate()))
        ),
      },
      {
        id: "theme-toggle",
        section: "Navigate",
        label: isDark ? "Switch to Light Mode" : "Switch to Dark Mode",
        hint: "Appearance",
        icon: isDark ? Sun : Moon,
        onSelect: closeAnd(() => {
          const next = isDark ? "light" : "dark";
          if (themeCtx) {
            themeCtx.setTheme(next);
          } else if (typeof document !== "undefined") {
            document.documentElement.classList.remove("light", "dark");
            document.documentElement.classList.add(next);
          }
        }),
      },
    ];

    const q = query.trim().toLowerCase();
    const filteredStatic = q
      ? staticActions.filter(
          (a) =>
            a.label.toLowerCase().includes(q) ||
            a.hint.toLowerCase().includes(q) ||
            a.section.toLowerCase().includes(q)
        )
      : staticActions;

    const foodActions: CommandAction[] = foodMatches.map((food) => ({
      id: `food-${food.id}`,
      section: "Staple Foods",
      label: food.name,
      hint: `${food.nutrientsPerBasis.calories} kcal · ${food.nutrientsPerBasis.protein}P ${food.nutrientsPerBasis.carbs}C ${food.nutrientsPerBasis.fat}F`,
      icon: Plus,
      onSelect: closeAnd(() => {
        setSearchInitialQuery(food.name);
        openSheet("search");
      }),
    }));

    return [...foodActions, ...filteredStatic];
  }, [
    activeDate,
    foodMatches,
    openSheet,
    query,
    setActiveDate,
    setOpen,
    setSearchInitialQuery,
    showUndoToast,
    themeCtx,
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, actions.length]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (actions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (activeIndex + 1) % actions.length;
      setActiveIndex(next);
      itemRefs.current[next]?.scrollIntoView?.({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (activeIndex - 1 + actions.length) % actions.length;
      setActiveIndex(prev);
      itemRefs.current[prev]?.scrollIntoView?.({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetEl = itemRefs.current[activeIndex];
      if (targetEl) {
        targetEl.click();
      } else {
        actions[activeIndex]?.onSelect();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      data-testid="command-palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[min(12dvh,5.5rem)] px-4 bg-black/60 backdrop-blur-sm animate-backdrop-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg surface-elevated-sheet concentric-outer overflow-hidden animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
          <Search
            className="w-4 h-4 text-muted-foreground shrink-0"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-label="Search commands or staple foods"
            placeholder="Type a command, route, or food..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="flex-1 bg-transparent text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-surface-sub border border-border rounded">
            Esc
          </kbd>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close command palette"
            className="touch-target tactile-press p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Results List */}
        <div
          id="command-palette-list"
          role="listbox"
          className="max-h-[min(56dvh,420px)] overflow-y-auto overscroll-contain p-2 space-y-1"
        >
          {actions.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No matching commands or staple foods.
            </div>
          ) : (
            actions.map((action, idx) => {
              const Icon = action.icon;
              const isHighlighted = idx === activeIndex;
              const prevSection = idx > 0 ? actions[idx - 1].section : null;
              const showSectionHeader = action.section !== prevSection;

              const rowClasses = `tactile-press w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                isHighlighted
                  ? "bg-surface-sub text-foreground"
                  : "text-foreground/90 hover:bg-surface-sub/60"
              }`;

              const inner = (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-semibold truncate">
                      {action.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums truncate max-w-[46%]">
                    {action.hint}
                  </span>
                </>
              );

              return (
                <React.Fragment key={action.id}>
                  {showSectionHeader && (
                    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {action.section}
                    </div>
                  )}
                  {action.href ? (
                    <Link
                      ref={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                      href={action.href}
                      role="option"
                      aria-selected={isHighlighted}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        void action.onSelect();
                      }}
                      className={rowClasses}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button
                      ref={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                      type="button"
                      role="option"
                      aria-selected={isHighlighted}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        void action.onSelect();
                      }}
                      className={rowClasses}
                    >
                      {inner}
                    </button>
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Legend */}
        <div className="hidden sm:flex items-center justify-between px-4 py-2 border-t border-border bg-surface-sub/40 text-[10px] text-muted-foreground">
          <span>Use &uarr; &darr; to navigate, Enter to run</span>
          <span>Cmd / Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
