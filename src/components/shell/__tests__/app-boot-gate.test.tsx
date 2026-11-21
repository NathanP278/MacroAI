import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AppBootGate } from '../app-boot-gate';
import { useLoggerStore } from '@/stores/logger-store';

describe('AppBootGate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useLoggerStore.setState({ syncAuthLocked: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('blocks page rendering while checking and reveals page with transition once Cloud Sync is verified', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ authRequired: true, authenticated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AppBootGate forceGate>
        <div data-testid="protected-route">Settings Content</div>
      </AppBootGate>
    );

    // Immediately on open: overlay is prominent and underlying route is NOT mounted
    expect(screen.getByTestId('boot-splash-overlay')).toBeInTheDocument();
    expect(screen.getByText(/checking cloud sync/i)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-route')).not.toBeInTheDocument();

    // Advance past minimum prominent hold (~560ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(screen.getByText(/cloud sync verified/i)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-route')).not.toBeInTheDocument();

    // Advance past confirmation beat (~240ms) -> revealing phase with transition
    await act(async () => {
      await vi.advanceTimersByTimeAsync(260);
    });
    expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    expect(screen.getByTestId('app-boot-content')).toHaveClass('boot-page-reveal');

    // Advance past dissolve (~440ms) -> overlay unmounted cleanly
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(screen.queryByTestId('boot-splash-overlay')).not.toBeInTheDocument();
    expect(screen.getByTestId('protected-route')).toBeInTheDocument();
  });

  it('keeps all routes completely unmounted when Cloud Sync passphrase is required until unlocked', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/auth/sync-session') && (!init?.method || init.method === 'GET')) {
        return Promise.resolve(
          new Response(JSON.stringify({ authRequired: true, authenticated: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (url.includes('/api/auth/sync-session') && init?.method === 'POST') {
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true, authenticated: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AppBootGate forceGate>
        <div data-testid="settings-route">Secret Settings Page</div>
      </AppBootGate>
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(650);
    });

    // Locked state: page still MUST NOT be mounted, passphrase gate is shown
    expect(screen.getByTestId('boot-sync-gate-card')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-route')).not.toBeInTheDocument();

    // Submit valid passphrase
    fireEvent.change(screen.getByLabelText(/sync access passphrase/i), {
      target: { value: 'valid-passphrase' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
    });

    // Advance past confirm beat + dissolve transition
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(screen.queryByTestId('boot-splash-overlay')).not.toBeInTheDocument();
    expect(screen.getByTestId('settings-route')).toBeInTheDocument();
  });
});
