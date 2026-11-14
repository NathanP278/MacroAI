"use client";

import React, { useState, useRef } from "react";
import { Download, Upload, AlertCircle, CheckCircle2, Database, ShieldAlert } from "lucide-react";
import { exportBackupJson, importBackupJson } from "@/lib/db/backup";

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
    <section className={`bg-surface-card border border-border rounded-2xl p-4 space-y-4 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <Database className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-xs font-semibold text-foreground">Data Backup & Restore</h2>
          <p className="text-[10px] text-muted-foreground">Versioned local JSON export and atomic import</p>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-surface-sub border border-border/50 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-xs font-medium text-foreground">Export Backup</div>
          <div className="text-[10px] text-muted-foreground">
            Download a portable snapshot of logs, cached foods, recipes, and goals
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? "Exporting..." : "Export Backup"}</span>
        </button>
      </div>

      {/* Import Section */}
      <div className="bg-surface-sub border border-border/50 rounded-xl p-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-foreground">Import Backup</div>
            <div className="text-[10px] text-muted-foreground">
              Restore data from a valid <code className="font-mono text-[9px]">macroai-backup.json</code> file
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center bg-surface-card border border-border rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setImportMode("merge")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                importMode === "merge"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Merge
            </button>
            <button
              type="button"
              onClick={() => setImportMode("replace")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                importMode === "replace"
                  ? "bg-destructive text-destructive-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Replace
            </button>
          </div>
        </div>

        {importMode === "replace" && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div>
              <strong>Replace mode:</strong> Wipes all local nutrition logs, custom recipes, and user goals before restoring.
            </div>
          </div>
        )}

        {importMode === "merge" && (
          <div className="text-[10px] text-muted-foreground">
            <strong>Merge mode:</strong> Safely upserts logs and recipes by ID, and resolves user goals by updatedAt timestamp.
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
          className="w-full bg-surface-card hover:bg-surface-card/80 border border-border text-foreground font-medium px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{isImporting ? "Importing..." : `Select JSON File to ${importMode === "replace" ? "Replace" : "Merge"}`}</span>
        </button>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs ${
            statusType === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {statusType === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="leading-snug">{statusMessage}</span>
        </div>
      )}
    </section>
  );
}
