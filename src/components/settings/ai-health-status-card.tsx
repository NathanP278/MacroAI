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
    <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-foreground">AI Vision & OCR Service</h2>
            <p className="text-[10px] text-muted-foreground">Server-configured OpenAI-compatible model</p>
          </div>
        </div>

        <button
          type="button"
          onClick={checkHealth}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Checking...' : 'Test AI Connection'}</span>
        </button>
      </div>

      {/* Status Details */}
      {status && (
        <div className="bg-muted/30 border border-border/50 rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Configured in Server:</span>
            {status.configured ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Yes</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/90">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Not configured</span>
              </span>
            )}
          </div>

          {status.model && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Model:</span>
              <span className="font-mono text-[11px] text-foreground bg-muted px-2 py-0.5 rounded-md">
                {status.model}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Endpoint Reachability:</span>
            {status.reachable ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reachable</span>
              </span>
            ) : hasTested ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/90">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Unreachable</span>
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">Untested</span>
            )}
          </div>

          {status.error && (
            <div className="pt-1 text-[10px] text-amber-400/90 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20 break-all">
              {status.error}
            </div>
          )}
        </div>
      )}

      {/* Security & Setup Note */}
      <div className="flex items-start gap-2 pt-1 text-[11px] text-muted-foreground leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          Configured safely via server environment variables (<code className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono">.env.local</code>):{' '}
          <span className="font-mono text-[10px] text-foreground">AI_BASE_URL</span>,{' '}
          <span className="font-mono text-[10px] text-foreground">AI_API_KEY</span>,{' '}
          <span className="font-mono text-[10px] text-foreground">AI_MODEL</span>, and optional{' '}
          <span className="font-mono text-[10px] text-foreground">AI_CUSTOM_HEADERS</span>. Client browsers never store or expose credentials.
        </p>
      </div>
    </section>
  );
}
