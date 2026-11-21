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
      className={`lg:hidden touch-target w-11 h-11 sm:w-9 sm:h-9 rounded-full flex items-center justify-center liquid-pill-glass text-muted-foreground hover:text-foreground shrink-0 ${className ?? ""}`}
    >
      <Settings className="w-4 h-4" aria-hidden="true" />
    </Link>
  );
}
