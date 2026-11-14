"use client";

import React from "react";
import { AppShell } from "@/components/shell/app-shell";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { BackupPanel } from "@/components/settings/backup-panel";
import { Moon, ShieldCheck, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-4">
        {/* Header */}
        <header className="pt-2">
          <h1 className="text-base font-bold tracking-tight text-foreground">Settings & Preferences</h1>
          <p className="text-[11px] text-muted-foreground">App appearance, storage, and adherence neutrality</p>
        </header>

        {/* Theme Section */}
        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-foreground">Theme & Appearance</h2>
                <p className="text-[10px] text-muted-foreground">Dark, light, or match system</p>
              </div>
            </div>
            <ThemeSwitcher />
          </div>
        </section>

        {/* Data Backup & Restore */}
        <BackupPanel />

        {/* Adherence Neutrality Info */}
        <section className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">Adherence-Neutral Analytics</h2>
              <p className="text-[10px] text-emerald-400/90 font-mono">Active & Non-judgmental</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Surplus calorie and macronutrient intake is represented as neutral scientific data.
            Exceeding daily targets never triggers red alert borders, shaming badges, or penalties.
          </p>
        </section>

        {/* Offline & Storage Info */}
        <section className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center text-sky-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">Offline Storage & Privacy</h2>
              <p className="text-[10px] text-sky-400 font-mono">Client-side IndexedDB</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            All your nutrition logs, custom recipes, and scan histories reside locally in your browser storage.
            No account required.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
