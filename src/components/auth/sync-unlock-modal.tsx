'use client';

import React, { useId, useState } from 'react';
import { KeyRound, Lock } from 'lucide-react';
import { useLoggerStore } from '@/stores/logger-store';
import { ShakeOnError } from '@/components/motion/motion-primitives';

export interface SyncUnlockCardProps {
  onUnlocked?: () => void;
  compact?: boolean;
}

export function SyncUnlockCard({
  onUnlocked,
  compact = false,
}: SyncUnlockCardProps) {
  const inputId = useId();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passphrase.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/sync-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: trimmed }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        authenticated?: boolean;
        error?: string;
      };

      if (!res.ok || data.authenticated === false) {
        setError(data.error || 'Incorrect passphrase. Please try again.');
        return;
      }

      setPassphrase('');
      useLoggerStore.getState().setSyncAuthLocked(false);
      onUnlocked?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to verify passphrase.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={
        compact
          ? 'bg-surface-sub border border-border/50 rounded-xl p-3 space-y-2.5'
          : 'bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3'
      }
      data-testid="sync-unlock-card"
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`${
            compact ? 'w-7 h-7 rounded-xl' : 'w-9 h-9 rounded-2xl'
          } bg-card flex items-center justify-center text-[var(--neutral-over)] shrink-0 border border-border/50`}
        >
          <Lock className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={compact ? 'text-xs font-semibold text-foreground' : 'text-sm font-bold text-foreground'}>
            Cloud Sync &amp; AI Locked
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Enter your server passphrase to unlock Turso sync and AI features. Local offline logging stays active.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <label htmlFor={inputId} className="sr-only">
          Sync access passphrase
        </label>
        <div className="relative flex-1 min-w-0">
          <KeyRound
            className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={inputId}
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter sync passphrase"
            autoComplete="current-password"
            disabled={isSubmitting}
            className="w-full h-9 pl-8 pr-3 rounded-xl bg-card border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border-focus"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !passphrase.trim()}
          className="touch-target tactile-press h-9 px-4 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shrink-0"
        >
          {isSubmitting ? 'Unlocking...' : 'Unlock'}
        </button>
      </div>

      {error && (
        <ShakeOnError shakeKey={error}>
          <p className="text-[11px] text-[var(--neutral-over)]" role="status">
            {error}
          </p>
        </ShakeOnError>
      )}
    </form>
  );
}
