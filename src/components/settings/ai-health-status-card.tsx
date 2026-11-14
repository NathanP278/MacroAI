'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

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

  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/health', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
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
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkHealth();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="bg-card rounded-2xl p-4 sm:p-5 space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[var(--macro-calories)]/15 flex items-center justify-center text-[var(--macro-calories)]">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">AI Vision & OCR Service</h2>
            <p className="text-[11px] text-muted-foreground">Server-configured OpenAI-compatible model</p>
          </div>
        </div>

        <button
          type="button"
          onClick={checkHealth}
          disabled={isLoading}
          className="macro-spring active:scale-95 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-sub text-foreground hover:bg-surface-elevated disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>{isLoading ? 'Checking...' : 'Test AI Connection'}</span>
        </button>
      </div>

      {/* Status Details */}
      {status && (
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
            <div className="pt-1 text-[11px] text-[var(--neutral-over)] bg-card p-2.5 rounded-xl break-all">
              {status.error}
            </div>
          )}
        </div>
      )}

      {/* Security & Setup Note */}
      <div className="flex items-start gap-2 pt-1 text-[11px] text-muted-foreground leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-[var(--macro-carbs)] shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          Configured safely via server environment variables (<code className="text-[10px] bg-surface-sub px-1.5 py-0.5 rounded font-mono">.env.local</code>):{' '}
          <span className="font-mono text-[10px] text-foreground">AI_BASE_URL</span>,{' '}
          <span className="font-mono text-[10px] text-foreground">AI_API_KEY</span>,{' '}
          <span className="font-mono text-[10px] text-foreground">AI_MODEL</span>, and optional{' '}
          <span className="font-mono text-[10px] text-foreground">AI_CUSTOM_HEADERS</span>. Client browsers never store or expose credentials.
        </p>
      </div>
    </section>
  );
}
