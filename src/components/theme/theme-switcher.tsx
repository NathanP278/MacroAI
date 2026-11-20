"use client";

import React from "react";
import { useTheme, Theme } from "./theme-provider";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { triggerHaptic } from "@/lib/motion";
import { Moon, Sun, Laptop } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <SegmentedControl<Theme>
      role="group"
      ariaLabel="Color theme"
      dataTestId="theme-switcher"
      value={theme}
      onChange={(next) => {
        triggerHaptic(6);
        setTheme(next);
      }}
      className="bg-surface-sub p-1 border border-border w-full sm:w-auto"
      buttonClassName="flex-1 sm:flex-initial px-3 py-1.5 text-xs"
      options={[
        { value: "dark", label: "Dark", icon: Moon },
        { value: "light", label: "Light", icon: Sun },
        { value: "system", label: "System", icon: Laptop },
      ]}
    />
  );
}
