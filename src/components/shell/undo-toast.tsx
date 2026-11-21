"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { RotateCcw, X } from "lucide-react";
import { useLoggerStore } from "@/stores/logger-store";
import { triggerHaptic } from "@/lib/motion";

const AUTO_DISMISS_MS = 5000;

export function UndoToast() {
  const pathname = usePathname() ?? "/";
  const undoToast = useLoggerStore((s) => s.undoToast);
  const dismissUndoToast = useLoggerStore((s) => s.dismissUndoToast);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingMsRef = useRef<number>(AUTO_DISMISS_MS);
  const startedAtRef = useRef<number>(0);
  const isPausedRef = useRef(false);
  const isUndoingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (delayMs: number) => {
      clearTimer();
      startedAtRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        dismissUndoToast();
        timerRef.current = null;
      }, Math.max(0, delayMs));
    },
    [clearTimer, dismissUndoToast]
  );

  const handlePause = useCallback(() => {
    if (isPausedRef.current || !undoToast) return;
    isPausedRef.current = true;
    const elapsed = Date.now() - startedAtRef.current;
    remainingMsRef.current = Math.max(250, remainingMsRef.current - elapsed);
    clearTimer();
  }, [clearTimer, undoToast]);

  const handleResume = useCallback(() => {
    if (!isPausedRef.current || !undoToast) return;
    isPausedRef.current = false;
    startTimer(remainingMsRef.current);
  }, [startTimer, undoToast]);

  const handleUndo = useCallback(async () => {
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

    remainingMsRef.current = AUTO_DISMISS_MS;
    isPausedRef.current = false;
    startTimer(AUTO_DISMISS_MS);

    const docWithAriaNotify = document as Document & {
      ariaNotify?: (message: string, options?: { priority?: "normal" | "high" }) => void;
    };
    if (typeof docWithAriaNotify.ariaNotify === "function") {
      docWithAriaNotify.ariaNotify(`${undoToast.message}. Actions available`);
    }

    return () => {
      clearTimer();
    };
  }, [undoToast, startTimer, clearTimer]);

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

  const hasQuickSearchBar = pathname === "/" || pathname.startsWith("/log");

  return (
    <div
      role="region"
      aria-label="Notifications"
      className={`fixed inset-x-0 lg:left-[220px] z-50 flex justify-center px-4 pointer-events-none ${
        hasQuickSearchBar
          ? "bottom-[calc(8.75rem+env(safe-area-inset-bottom))] lg:bottom-6"
          : "bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-6"
      }`}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {undoToast ? `${undoToast.message}. Actions available` : ""}
      </div>

      {undoToast && (
        <div
          role="status"
          data-testid="undo-toast"
          onMouseEnter={handlePause}
          onMouseLeave={handleResume}
          onFocus={handlePause}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              handleResume();
            }
          }}
          className="w-full max-w-md pointer-events-auto animate-sheet-in"
        >
          <div className="undo-toast-card relative overflow-hidden surface-elevated-sheet rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-foreground leading-snug line-clamp-2 min-w-0">
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

            <div
              key={undoToast.id}
              aria-hidden="true"
              className="undo-toast-bar absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--macro-calories)]/85 pointer-events-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
