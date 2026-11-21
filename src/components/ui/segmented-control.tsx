"use client";

import React, { useId } from "react";
import { motion } from "motion/react";
import { SPRING_PILL, isTestEnvironment } from "@/lib/motion";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  id?: string;
  ariaLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  activeThumbClassName?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  role?: "tablist" | "group";
  ariaLabel: string;
  dataTestId?: string;
  className?: string;
  buttonClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  thumbClassName?: string;
}

/**
 * Monochrome spring-gliding segmented control powered by Motion `layoutId`.
 * Supports both `tablist` and `group` ARIA semantics, plus reduced-motion & jsdom safety.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  role = "group",
  ariaLabel,
  dataTestId,
  className = "p-1 bg-surface-sub",
  buttonClassName = "px-3 py-2 sm:py-1.5 text-xs",
  activeClassName = "text-background font-semibold",
  inactiveClassName = "text-muted-foreground hover:text-foreground font-medium",
  thumbClassName = "bg-foreground",
}: SegmentedControlProps<T>) {
  const controlId = useId();
  const isTest = isTestEnvironment();

  return (
    <div
      role={role}
      aria-label={ariaLabel}
      data-testid={dataTestId}
      className={`relative inline-flex items-center rounded-full liquid-input-well ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        const Icon = opt.icon;
        const resolvedThumbClass = opt.activeThumbClassName ?? thumbClassName;
        const a11yProps =
          role === "tablist"
            ? { role: "tab" as const, "aria-selected": isSelected }
            : { "aria-pressed": isSelected };

        return (
          <button
            key={opt.value}
            id={opt.id}
            type="button"
            aria-label={opt.ariaLabel}
            onClick={() => onChange(opt.value)}
            {...a11yProps}
            className={`relative z-10 touch-target tactile-press inline-flex items-center justify-center gap-1.5 rounded-full whitespace-nowrap min-h-[36px] sm:min-h-0 transition-colors duration-200 ${buttonClassName} ${
              isSelected ? activeClassName : inactiveClassName
            }`}
          >
            {isSelected && (
              <motion.span
                layoutId={isTest ? undefined : `segmented-thumb-${controlId}`}
                transition={SPRING_PILL}
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 rounded-full liquid-glass-active-pill ${resolvedThumbClass}`}
              />
            )}
            {Icon && <Icon className="relative z-10 w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
