'use client';

import React, { useEffect, useState } from 'react';

export function PwaRegister() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // 1. Service Worker registration
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        // Non-fatal, e.g. private browsing or unsupported environment
        console.debug('Service Worker registration skipped/failed:', err);
      });
    }

    // 2. Offline detection
    const handleStatusChange = () => {
      setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    };

    handleStatusChange();

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top,0px)+0.5rem)] inset-x-0 lg:left-[220px] z-50 flex justify-center px-4 pointer-events-none">
      <aside
        role="status"
        aria-live="polite"
        className="px-3 py-1 rounded-full bg-zinc-800/95 text-zinc-300 text-xs font-medium border border-zinc-700/60 shadow-md backdrop-blur-sm flex items-center gap-2 select-none transition-all whitespace-nowrap"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span>Offline Mode — Local storage &amp; 2,500 staples active</span>
      </aside>
    </div>
  );
}
