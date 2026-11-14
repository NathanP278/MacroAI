"use client";

import React from "react";
import { useTheme, Theme } from "./theme-provider";
import { Moon, Sun, Laptop } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: "dark", label: "Dark", icon: Moon },
    { value: "light", label: "Light", icon: Sun },
    { value: "system", label: "System", icon: Laptop },
  ];

  return (
    <div className="flex items-center gap-1 bg-[#16181D] dark:bg-[#16181D] p-1 rounded-xl border border-white/[0.08]">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isSelected
                ? "bg-amber-400 text-[#121316] font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
            }`}
            aria-pressed={isSelected}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
