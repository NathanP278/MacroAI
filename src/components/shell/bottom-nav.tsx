"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Plus, ChefHat, Settings } from "lucide-react";

export interface BottomNavProps {
  onOpenQuickActions: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS_LEFT: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Log", href: "/log", icon: BookOpen },
];

const NAV_ITEMS_RIGHT: NavItem[] = [
  { label: "Recipes", href: "/recipes", icon: ChefHat },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function BottomNav({ onOpenQuickActions }: BottomNavProps) {
  let pathname = "/";
  try {
    pathname = usePathname() || "/";
  } catch {
    pathname = "/";
  }

  const isItemActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#16181D]/95 dark:bg-[#16181D]/95 backdrop-blur-md border-t border-white/[0.08] shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
    >
      <div className="max-w-[430px] mx-auto h-16 px-4 flex items-center justify-between relative">
        {/* Left Nav items */}
        <div className="flex items-center gap-1 flex-1 justify-around">
          {NAV_ITEMS_LEFT.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors ${
                  active
                    ? "text-amber-400 font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${active ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Prominent Center Action Button */}
        <div className="flex flex-col items-center justify-center px-2 relative -top-3">
          <button
            type="button"
            onClick={onOpenQuickActions}
            aria-label="Open quick actions"
            className="w-13 h-13 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-95 text-[#121316] flex items-center justify-center shadow-lg shadow-amber-400/25 border-2 border-[#121316] transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#121316]"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Quick Add</span>
        </div>

        {/* Right Nav items */}
        <div className="flex items-center gap-1 flex-1 justify-around">
          {NAV_ITEMS_RIGHT.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors ${
                  active
                    ? "text-amber-400 font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${active ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
