"use client";

import React from "react";
import { useTheme, Theme } from "./theme-provider";
import { Moon, Sun, Laptop } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: "dark", label: "Dark", icon: Moon },
    { value: "light", label: "Light", icon: Sun },
    { value: "system", label: "System", icon: Laptop },
  ];

  return (
    <div
      data-testid="theme-switcher"
      className="flex items-center gap-1 bg-surface-sub p-1 rounded-full border border-border"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`macro-spring active:scale-95 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              isSelected
                ? "bg-foreground text-background font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={isSelected}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
