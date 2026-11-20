"use client";

import React from "react";

export interface BootSplashOverlayProps {
  visible: boolean;
  exiting: boolean;
  statusLabel: string;
}

/**
 * Authored Smoked Liquid Glass boot calibration overlay.
 * Bridges cold-open IndexedDB + optional Cloud Sync session check and dissolves
 * cleanly into either the Cloud Sync Login Modal or the live Dashboard.
 */
export function BootSplashOverlay({
  visible,
  exiting,
  statusLabel,
}: BootSplashOverlayProps) {
  if (!visible) return null;

  const size = 84;
  const cx = size / 2;
  const cy = size / 2 + 2;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const arcSpan = circumference * (240 / 360);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={statusLabel}
      data-testid="boot-splash-overlay"
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center px-6 bg-background/88 backdrop-blur-2xl ${
        exiting ? "boot-splash-exit pointer-events-none" : "boot-splash-enter"
      }`}
    >
      {/* Smoked Liquid Glass Calibration Emblem */}
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative w-24 h-24 rounded-[28px] surface-elevated-sheet flex items-center justify-center overflow-hidden boot-emblem-enter">
          {/* Specular traveling sheen */}
          <div
            aria-hidden="true"
            className="boot-glass-sheen pointer-events-none absolute inset-0"
          />

          {/* Calibrating 240-deg Calorie Arc + 3 Nutrient Dots */}
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-[74px] h-[74px] overflow-visible relative z-10"
            aria-hidden="true"
          >
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="var(--surface-sub)"
              strokeWidth="5.5"
              strokeDasharray={`${arcSpan} ${circumference}`}
              strokeLinecap="round"
              transform={`rotate(150 ${cx} ${cy})`}
            />
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="var(--macro-calories)"
              strokeWidth="5.5"
              strokeDasharray={`${arcSpan} ${circumference}`}
              strokeLinecap="round"
              transform={`rotate(150 ${cx} ${cy})`}
              className="boot-arc-sweep"
              style={
                {
                  "--boot-arc-span": `${arcSpan}`,
                } as React.CSSProperties
              }
            />
          </svg>

          {/* Center 3-Macro Calibration Dots */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pt-1.5 gap-1.5 z-10"
          >
            <span
              className="w-2 h-2 rounded-full bg-[var(--macro-protein)] boot-dot"
              style={{ "--boot-dot-delay": "90ms" } as React.CSSProperties}
            />
            <span
              className="w-2 h-2 rounded-full bg-[var(--macro-fat)] boot-dot"
              style={{ "--boot-dot-delay": "170ms" } as React.CSSProperties}
            />
            <span
              className="w-2 h-2 rounded-full bg-[var(--macro-carbs)] boot-dot"
              style={{ "--boot-dot-delay": "250ms" } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Brand Wordmark + Live Status Pill */}
        <div className="flex flex-col items-center gap-2 text-center boot-copy-enter">
          <span className="text-xl font-bold tracking-tight text-foreground">
            MacroAI
          </span>
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full surface-glass-pill text-[11px] font-medium text-muted-foreground tabular-nums">
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full bg-[var(--macro-calories)] boot-pulse-dot"
            />
            <span>{statusLabel}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
