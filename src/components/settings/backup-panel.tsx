"use client";

import React, { useState, useRef } from "react";
import { Download, Upload, AlertCircle, CheckCircle2, Database, ShieldAlert } from "lucide-react";
import { exportBackupJson, importBackupJson } from "@/lib/db/backup";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { triggerHaptic } from "@/lib/motion";

interface BackupPanelProps {
  className?: string;
}

export function BackupPanel({ className }: BackupPanelProps) {
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileAsText = (file: File): Promise<string> => {
    if (typeof file.text === "function") {
      return file.text();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setStatusMessage(null);
      setStatusType(null);

      const json = await exportBackupJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `macroai-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusType("success");
      setStatusMessage("Backup exported successfully!");
    } catch (err) {
      setStatusType("error");
      setStatusMessage(err instanceof Error ? err.message : "Failed to export backup");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (importMode === "replace") {
      const confirmed = window.confirm(
        "Are you sure you want to replace all existing data? This will wipe your current local records."
      );
      if (!confirmed) {
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    try {
      setIsImporting(true);
      setStatusMessage(null);
      setStatusType(null);

      const text = await readFileAsText(file);
      const result = await importBackupJson(text, importMode);

      const counts = result.importedCounts;
      const logText = `${counts.foodLogs} log${counts.foodLogs === 1 ? "" : "s"}`;
      const foodText = `${counts.foodsCache} food${counts.foodsCache === 1 ? "" : "s"}`;
      const recipeText = `${counts.customRecipes} recipe${counts.customRecipes === 1 ? "" : "s"}`;
      const goalText = `${counts.userGoals} goal${counts.userGoals === 1 ? "" : "s"}`;

      setStatusType("success");
      setStatusMessage(`Imported: ${logText}, ${foodText}, ${recipeText}, ${goalText}`);
    } catch (err) {
      setStatusType("error");
      setStatusMessage(err instanceof Error ? err.message : "Failed to import backup");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <section className={`bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-4 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl bg-[var(--macro-calories)]/15 flex items-center justify-center text-[var(--macro-calories)] shrink-0">
          <Database className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground tracking-tight">Data Backup & Restore</h2>
          <p className="text-xs text-muted-foreground">Versioned local JSON export and atomic import</p>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-surface-sub rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-foreground">Export Backup</div>
          <div className="text-[11px] text-muted-foreground">
            Download a portable snapshot of logs, cached foods, recipes, and goals
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="touch-target tactile-press w-full sm:w-auto justify-center bg-foreground text-background hover:opacity-90 font-semibold px-3.5 py-2 rounded-full text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isExporting ? "Exporting..." : "Export Backup"}</span>
        </button>
      </div>

      {/* Import Section */}
      <div className="bg-surface-sub rounded-xl p-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-foreground">Import Backup</div>
            <div className="text-[11px] text-muted-foreground">
              Restore data from a valid <code className="font-mono text-[10px]">macroai-backup.json</code> file
            </div>
          </div>

          {/* Mode Selector */}
          <SegmentedControl<"merge" | "replace">
            role="group"
            ariaLabel="Backup import mode"
            value={importMode}
            onChange={(next) => {
              triggerHaptic(6);
              setImportMode(next);
            }}
            className="bg-card p-0.5 text-xs shrink-0"
            buttonClassName="px-3 py-1.5 text-[11px] cursor-pointer"
            options={[
              { value: "merge", label: "Merge" },
              {
                value: "replace",
                label: "Replace",
                activeThumbClassName: "bg-[var(--neutral-over)]",
              },
            ]}
          />
        </div>

        {importMode === "replace" && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-card text-[var(--neutral-over)] text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <strong className="text-foreground">Replace mode:</strong> Wipes all local nutrition logs, custom recipes, and user goals before restoring.
            </div>
          </div>
        )}

        {importMode === "merge" && (
          <div className="text-[11px] text-muted-foreground">
            <strong className="text-foreground">Merge mode:</strong> Safely upserts logs and recipes by ID, and resolves user goals by updatedAt timestamp.
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          data-testid="backup-file-input"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={triggerFileInput}
          disabled={isImporting}
          className="macro-spring active:scale-95 w-full bg-card hover:bg-surface-elevated text-foreground font-semibold px-3.5 py-2 rounded-full text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <span>{isImporting ? "Importing..." : `Select JSON File to ${importMode === "replace" ? "Replace" : "Merge"}`}</span>
        </button>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`p-2.5 rounded-xl flex items-center gap-2 text-xs ${
            statusType === "success"
              ? "bg-[var(--macro-carbs)]/15 text-[var(--macro-carbs)] animate-check-pop"
              : "bg-surface-sub text-[var(--neutral-over)]"
          }`}
        >
          {statusType === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
          <span className="leading-snug">{statusMessage}</span>
        </div>
      )}
    </section>
  );
}
