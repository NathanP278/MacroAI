"use client";

import React from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { triggerHaptic } from "@/lib/motion";

export interface SettingsHeaderLinkProps {
  className?: string;
}

/**
 * Consistent top-right Settings link shared across primary workspace page headers.
 */
export function SettingsHeaderLink({ className }: SettingsHeaderLinkProps) {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      title="Settings"
      onClick={() => triggerHaptic(8)}
      className={`touch-target tactile-press w-9 h-9 rounded-full flex items-center justify-center bg-card border border-border/50 hover:bg-surface-sub text-muted-foreground hover:text-foreground transition-colors shrink-0 ${className ?? ""}`}
    >
      <Settings className="w-4 h-4" aria-hidden="true" />
    </Link>
  );
}
