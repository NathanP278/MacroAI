"use client";

import React, { useEffect, useRef } from "react";
import { RotateCcw, X } from "lucide-react";
import { useLoggerStore } from "@/stores/logger-store";
import { triggerHaptic } from "@/lib/motion";

const AUTO_DISMISS_MS = 5000;

export function UndoToast() {
  const undoToast = useLoggerStore((s) => s.undoToast);
  const dismissUndoToast = useLoggerStore((s) => s.dismissUndoToast);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUndoingRef = useRef(false);

  const handleUndo = React.useCallback(async () => {
    if (!undoToast || isUndoingRef.current) return;
    isUndoingRef.current = true;
    try {
      await undoToast.onUndo();
      triggerHaptic(12);
    } catch (err) {
      console.error("Failed to undo action:", err);
    } finally {
      isUndoingRef.current = false;
      dismissUndoToast();
    }
  }, [undoToast, dismissUndoToast]);

  useEffect(() => {
    if (!undoToast) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      dismissUndoToast();
      timerRef.current = null;
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [undoToast, dismissUndoToast]);

  useEffect(() => {
    if (!undoToast) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
          return;
        }
        e.preventDefault();
        void handleUndo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoToast, handleUndo]);

  if (!undoToast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="undo-toast"
      className="fixed bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md pointer-events-auto animate-sheet-in"
    >
      <div className="surface-elevated-sheet rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-foreground truncate">
          {undoToast.message}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => void handleUndo()}
            aria-label="Undo"
            className="touch-target tactile-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            onClick={dismissUndoToast}
            aria-label="Dismiss notification"
            className="touch-target tactile-press p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-sub"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
