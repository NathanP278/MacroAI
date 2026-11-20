'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useLoggerStore } from '@/stores/logger-store';
import { SyncUnlockCard } from '@/components/auth/sync-unlock-modal';

interface AiHealthStatus {
  configured: boolean;
  model: string;
  reachable: boolean;
  error?: string;
}

export function AiHealthStatusCard() {
  const [status, setStatus] = useState<AiHealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasTested, setHasTested] = useState(false);
  const [authLocked, setAuthLocked] = useState(false);
  const syncAuthLocked = useLoggerStore((s) => s.syncAuthLocked);

  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/health', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.status === 401) {
        setAuthLocked(true);
        useLoggerStore.getState().setSyncAuthLocked(true);
        setStatus(null);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAuthLocked(false);
        setStatus(data);
      } else {
        setStatus({
          configured: false,
          model: '',
          reachable: false,
          error: `Health check returned status ${res.status}`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network request failed';
      setStatus({
        configured: false,
        model: '',
        reachable: false,
        error: msg,
      });
    } finally {
      setIsLoading(false);
      setHasTested(true);
    }
  }, []);

  const prevSyncLockedRef = React.useRef(syncAuthLocked);

  useEffect(() => {
    const timer = setTimeout(() => {
      void checkHealth();
    }, 0);
    return () => clearTimeout(timer);
  }, [checkHealth]);

  useEffect(() => {
    const wasLocked = prevSyncLockedRef.current;
    prevSyncLockedRef.current = syncAuthLocked;
    if (wasLocked && !syncAuthLocked) {
      const timer = setTimeout(() => {
        setAuthLocked(false);
        void checkHealth();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [syncAuthLocked, checkHealth]);

  return (
    <section className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-2xl bg-[var(--macro-calories)]/15 flex items-center justify-center text-[var(--macro-calories)] shrink-0">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground tracking-tight">AI Meal &amp; Label Scanning</h2>
            <p className="text-xs text-muted-foreground">Optional server-hosted vision model</p>
          </div>
        </div>

        <button
          type="button"
          onClick={checkHealth}
          disabled={isLoading}
          className="touch-target tactile-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-sub text-foreground hover:bg-surface-elevated disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>{isLoading ? 'Checking...' : 'Test AI Connection'}</span>
        </button>
      </div>

      {/* Unlock Prompt when SYNC_ACCESS_KEY is active */}
      {(authLocked || syncAuthLocked) && (
        <SyncUnlockCard
          compact
          onUnlocked={() => {
            setAuthLocked(false);
            void checkHealth();
          }}
        />
      )}

      {/* Status Details */}
      {!(authLocked || syncAuthLocked) && status && (
        <div className="bg-surface-sub rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Configured in Server:</span>
            {status.configured ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--macro-carbs)]">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Yes</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--neutral-over)]">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Not configured</span>
              </span>
            )}
          </div>

          {status.model && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Model:</span>
              <span className="font-mono text-[11px] text-foreground bg-card px-2 py-0.5 rounded-md">
                {status.model}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Endpoint Reachability:</span>
            {status.reachable ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--macro-carbs)]">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reachable</span>
              </span>
            ) : hasTested ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--neutral-over)]">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Unreachable</span>
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">Untested</span>
            )}
          </div>

          {status.error && (
            <div className="pt-1 text-[11px] text-[var(--neutral-over)] bg-card p-2.5 rounded-xl space-y-1">
              <p className="break-all">{status.error}</p>
              <p className="text-muted-foreground">
                Verify <span className="font-mono">AI_BASE_URL</span>, <span className="font-mono">AI_API_KEY</span>, and <span className="font-mono">AI_MODEL</span> on your server, then retry Test Connection.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Developer / Self-Hosting Setup Disclosure */}
      <details className="group rounded-xl bg-surface-sub/60 border border-border/50 px-3 py-2 text-[11px] text-muted-foreground">
        <summary className="cursor-pointer font-semibold text-foreground select-none list-none flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--macro-carbs)] shrink-0" aria-hidden="true" />
            <span>Developer / Self-Hosting Setup</span>
          </span>
          <span className="text-[10px] text-muted-foreground group-open:hidden">Show</span>
          <span className="text-[10px] text-muted-foreground hidden group-open:inline">Hide</span>
        </summary>
        <p className="pt-2 leading-relaxed">
          Configured safely via server environment variables (<code className="text-[10px] bg-card px-1.5 py-0.5 rounded font-mono">.env.local</code>):{' '}
          <span className="font-mono text-[10px] text-foreground">AI_BASE_URL</span>,{' '}
          <span className="font-mono text-[10px] text-foreground">AI_API_KEY</span>,{' '}
          <span className="font-mono text-[10px] text-foreground">AI_MODEL</span>, and optional{' '}
          <span className="font-mono text-[10px] text-foreground">AI_CUSTOM_HEADERS</span>. Client browsers never store or expose credentials.
        </p>
      </details>
    </section>
  );
}
