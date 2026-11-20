"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { BackupPanel } from "@/components/settings/backup-panel";
import { GoalsCalculatorForm } from "@/components/settings/goals-calculator-form";
import { AiHealthStatusCard } from "@/components/settings/ai-health-status-card";
import { CentralDbStatusCard } from "@/components/settings/central-db-status-card";
import { AppleHealthShortcutCard } from "@/components/settings/apple-health-shortcut-card";
import { triggerHaptic } from "@/lib/motion";
import { ArrowLeft, Moon, ShieldCheck, Database } from "lucide-react";

export default function SettingsPage() {
  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    triggerHaptic(8);
    if (typeof window !== "undefined" && window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-5 sm:gap-6 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-8">
        {/* Header matching Dashboard Obsidian Aesthetic */}
        <header className="space-y-2.5">
          <div>
            <Link
              href="/"
              onClick={handleBack}
              aria-label="Back to previous page"
              className="touch-target tactile-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border hover:border-border-focus text-xs font-semibold text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back</span>
            </Link>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Settings & Preferences
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Targets, appearance, AI vision health & local database backups
            </p>
          </div>
        </header>

        {/* Responsive 12-Column Obsidian Bento Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-start animate-card-enter">
          {/* Primary Calculator + Info Column */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            <GoalsCalculatorForm />

            {/* Adherence Neutrality & Offline Privacy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <section className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[var(--macro-carbs)]/15 flex items-center justify-center text-[var(--macro-carbs)] shrink-0">
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-foreground tracking-tight">
                      Adherence-Neutral Analytics
                    </h2>
                    <p className="text-xs text-[var(--macro-carbs)] font-medium">
                      Active & Non-judgmental
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Surplus calorie and macronutrient intake is represented as neutral scientific data.
                  Exceeding daily targets never triggers red alert borders, shaming badges, or penalties.
                </p>
              </section>

              <section className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[var(--macro-calories)]/15 flex items-center justify-center text-[var(--macro-calories)] shrink-0">
                    <Database className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-foreground tracking-tight">
                      Offline Storage & Privacy
                    </h2>
                    <p className="text-xs text-[var(--macro-calories)] font-medium">
                      On-Device First · Optional Cloud Sync
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Entries save instantly on this device for 100% offline logging and optionally sync across your devices when cloud sync is connected.
                </p>
              </section>
            </div>
          </div>

          {/* Right Column: Appearance, Sync, AI Vision & Backup */}
          <div className="lg:col-span-5 lg:sticky lg:top-[max(1.5rem,env(safe-area-inset-top))] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-5 items-start">
            {/* Theme Section */}
            <section className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-[var(--macro-calories)]/15 flex items-center justify-center text-[var(--macro-calories)] shrink-0">
                    <Moon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-foreground tracking-tight">
                      Theme & Appearance
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Dark, light, or match system
                    </p>
                  </div>
                </div>
                <ThemeSwitcher />
              </div>
            </section>

            {/* Central Database Sync */}
            <CentralDbStatusCard />

            {/* AI Vision & OCR Service */}
            <AiHealthStatusCard />

            {/* Apple Health iOS Shortcut Bridge */}
            <AppleHealthShortcutCard />

            {/* Data Backup & Restore */}
            <BackupPanel />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
