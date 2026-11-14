'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { db } from '@/lib/db/macroai-db';
import {
  isCloudSyncEnabled,
  syncWithCentralDb,
  type CentralSyncResult,
} from '@/lib/db/cloud-sync';

export function CentralDbStatusCard() {
  const [status, setStatus] = useState<CentralSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const result = await syncWithCentralDb(db);
      setStatus(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Central sync failed';
      setError(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!isCloudSyncEnabled()) return;
    const timer = setTimeout(() => {
      handleSync();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const modeDisplay = (() => {
    if (!status) return null;
    if (status.mode === 'turso-cloud') return 'Turso Cloud (libSQL)';
    if (status.mode === 'vercel-ephemeral') {
      return 'Ephemeral (/tmp) — Set TURSO_DATABASE_URL';
    }
    return status.label || 'Local SQLite (macroai.db)';
  })();

  return (
    <section className="bg-card rounded-2xl p-4 sm:p-5 space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[var(--macro-calories)]/15 flex items-center justify-center text-[var(--macro-calories)]">
            <Cloud className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              Central Database Sync
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Cross-device Turso (libSQL) &amp; local IndexedDB cache
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="macro-spring active:scale-95 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-sub text-foreground hover:bg-surface-elevated disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      </div>

      {/* Status Details */}
      {(status || error) && (
        <div className="bg-surface-sub rounded-xl p-3 space-y-2 text-xs">
          {status && (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Storage Engine:</span>
                {status.configured ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--macro-carbs)] text-right">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{modeDisplay}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--neutral-over)] text-right">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{modeDisplay}</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-card rounded-lg px-2.5 py-1.5 text-center">
                  <div className="text-[10px] text-muted-foreground">Logs</div>
                  <div className="text-xs font-semibold tabular-nums text-foreground">
                    {status.counts.foodLogs}
                  </div>
                </div>
                <div className="bg-card rounded-lg px-2.5 py-1.5 text-center">
                  <div className="text-[10px] text-muted-foreground">Recipes</div>
                  <div className="text-xs font-semibold tabular-nums text-foreground">
                    {status.counts.customRecipes}
                  </div>
                </div>
                <div className="bg-card rounded-lg px-2.5 py-1.5 text-center">
                  <div className="text-[10px] text-muted-foreground">Cached Foods</div>
                  <div className="text-xs font-semibold tabular-nums text-foreground">
                    {status.counts.foodsCache}
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="pt-1 text-[11px] text-[var(--neutral-over)] bg-card p-2.5 rounded-xl break-all">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Vercel / Turso Setup Hint */}
      <div className="flex items-start gap-2 pt-1 text-[11px] text-muted-foreground leading-relaxed">
        <ShieldCheck
          className="w-4 h-4 text-[var(--macro-carbs)] shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p>
          For persistent Vercel hosting, add free-tier Turso env vars in Vercel or{' '}
          <code className="text-[10px] bg-surface-sub px-1.5 py-0.5 rounded font-mono">
            .env.local
          </code>
          :{' '}
          <span className="font-mono text-[10px] text-foreground">
            TURSO_DATABASE_URL
          </span>{' '}
          and{' '}
          <span className="font-mono text-[10px] text-foreground">
            TURSO_AUTH_TOKEN
          </span>
          . Local dev falls back to{' '}
          <span className="font-mono text-[10px] text-foreground">
            macroai.db
          </span>
          .
        </p>
      </div>
    </section>
  );
}
