"use client";

import React, { useLayoutEffect, useRef, useState } from "react";

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

interface ThumbRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Monochrome sliding-pill segmented control supporting both `tablist` and `group`
 * ARIA semantics, ResizeObserver alignment, and reduced-motion/jsdom fallbacks.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  role = "group",
  ariaLabel,
  dataTestId,
  className = "p-1 bg-surface-sub",
  buttonClassName = "px-3 py-1.5 text-xs",
  activeClassName = "text-background font-semibold",
  inactiveClassName = "text-muted-foreground hover:text-foreground font-medium",
  thumbClassName = "bg-foreground",
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [thumbRect, setThumbRect] = useState<ThumbRect | null>(null);
  const [animateThumb, setAnimateThumb] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const activeButton = buttonRefs.current[value];
    if (!container || !activeButton) return;

    let rafId: number | null = null;
    const measure = () => {
      const width = activeButton.offsetWidth;
      const height = activeButton.offsetHeight;
      if (width > 0 && height > 0) {
        const next: ThumbRect = {
          left: activeButton.offsetLeft,
          top: activeButton.offsetTop,
          width,
          height,
        };
        setThumbRect((prev) => {
          if (
            prev &&
            prev.left === next.left &&
            prev.top === next.top &&
            prev.width === next.width &&
            prev.height === next.height
          ) {
            return prev;
          }
          return next;
        });
        rafId = window.requestAnimationFrame(() => {
          setAnimateThumb(true);
        });
      }
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      return () => {
        if (rafId !== null) window.cancelAnimationFrame(rafId);
      };
    }

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(container);
    observer.observe(activeButton);

    return () => {
      observer.disconnect();
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [value, options]);

  const activeOption = options.find((opt) => opt.value === value);
  const resolvedThumbClass = activeOption?.activeThumbClassName ?? thumbClassName;
  const hasMeasuredThumb = Boolean(thumbRect && thumbRect.width > 0 && thumbRect.height > 0);

  return (
    <div
      ref={containerRef}
      role={role}
      aria-label={ariaLabel}
      data-testid={dataTestId}
      className={`relative inline-flex items-center rounded-full ${className}`}
    >
      {hasMeasuredThumb && thumbRect && (
        <span
          aria-hidden="true"
          className={`motion-reduce:hidden pointer-events-none absolute left-0 top-0 rounded-full shadow-xs ${
            animateThumb ? "segmented-thumb" : ""
          } ${resolvedThumbClass}`}
          style={{
            width: `${thumbRect.width}px`,
            height: `${thumbRect.height}px`,
            transform: `translate3d(${thumbRect.left}px, ${thumbRect.top}px, 0)`,
          }}
        />
      )}

      {options.map((opt) => {
        const isSelected = opt.value === value;
        const Icon = opt.icon;
        const a11yProps =
          role === "tablist"
            ? { role: "tab" as const, "aria-selected": isSelected }
            : { "aria-pressed": isSelected };

        return (
          <button
            key={opt.value}
            ref={(el) => {
              buttonRefs.current[opt.value] = el;
            }}
            id={opt.id}
            type="button"
            aria-label={opt.ariaLabel}
            onClick={() => onChange(opt.value)}
            {...a11yProps}
            className={`relative z-10 tactile-press inline-flex items-center justify-center gap-1.5 rounded-full whitespace-nowrap transition-colors duration-150 ${buttonClassName} ${
              isSelected
                ? `${activeClassName} ${
                    !hasMeasuredThumb ? `${resolvedThumbClass} shadow-xs` : ""
                  }`
                : inactiveClassName
            }`}
          >
            {hasMeasuredThumb && (
              <span
                aria-hidden="true"
                className={`hidden motion-reduce:block pointer-events-none absolute inset-0 rounded-full shadow-xs segmented-pill-reduce ${
                  opt.activeThumbClassName ?? thumbClassName
                } ${isSelected ? "opacity-100" : "opacity-0"}`}
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
