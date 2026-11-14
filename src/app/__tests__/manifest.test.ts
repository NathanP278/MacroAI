import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import manifest from '../manifest';
import { PwaRegister } from '@/components/shell/pwa-register';

describe('Task 13: Manifest, Service Worker & PwaRegister', () => {
  describe('manifest.ts', () => {
    it('returns standalone PWA manifest for MacroAI', () => {
      const m = manifest();
      expect(m.name).toBe('MacroAI');
      expect(m.short_name).toBe('MacroAI');
      expect(m.description).toBe('Offline-first, adherence-neutral calorie & macro tracking PWA');
      expect(m.start_url).toBe('/');
      expect(m.display).toBe('standalone');
      expect(m.background_color).toBe('#121316');
      expect(m.theme_color).toBe('#121316');
      expect(m.icons?.length).toBeGreaterThanOrEqual(2);

      const icon192 = m.icons?.find((i) => i.sizes === '192x192');
      const icon512 = m.icons?.find((i) => i.sizes === '512x512');
      expect(icon192).toBeDefined();
      expect(icon192?.src).toBe('/icons/icon-192.png');
      expect(icon192?.type).toBe('image/png');

      expect(icon512).toBeDefined();
      expect(icon512?.src).toBe('/icons/icon-512.png');
      expect(icon512?.type).toBe('image/png');
    });
  });

  describe('PWA Icons on disk', () => {
    function readPngHeader(relPath: string) {
      const fullPath = path.resolve(process.cwd(), relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const buf = fs.readFileSync(fullPath);
      // PNG Signature: 89 50 4E 47 0D 0A 1A 0A
      const expectedSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(buf.subarray(0, 8).equals(expectedSig)).toBe(true);

      const ihdrChunkType = buf.subarray(12, 16).toString('ascii');
      expect(ihdrChunkType).toBe('IHDR');

      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      return { width, height };
    }

    it('has valid 192x192 PNG icon', () => {
      const { width, height } = readPngHeader('public/icons/icon-192.png');
      expect(width).toBe(192);
      expect(height).toBe(192);
    });

    it('has valid 512x512 PNG icon', () => {
      const { width, height } = readPngHeader('public/icons/icon-512.png');
      expect(width).toBe(512);
      expect(height).toBe(512);
    });
  });

  describe('public/sw.js Service Worker file', () => {
    it('implements required offline caching strategies and precache list', () => {
      const swPath = path.resolve(process.cwd(), 'public/sw.js');
      expect(fs.existsSync(swPath)).toBe(true);
      const sw = fs.readFileSync(swPath, 'utf-8');

      // Precache assets
      expect(sw).toContain("'/data/staples-2500.json'");
      expect(sw).toContain("'/icons/icon-192.png'");
      expect(sw).toContain("'/icons/icon-512.png'");
      expect(sw).toContain("'/manifest.webmanifest'");

      // Lifecycle hooks
      expect(sw).toMatch(/skipWaiting/);
      expect(sw).toMatch(/clients\.claim/);

      // Routing strategies
      expect(sw).toMatch(/\/api\//); // network-only for api
      expect(sw).toMatch(/staples-2500\.json/); // cache-first for staples
    });
  });

  describe('PwaRegister component', () => {
    const originalNavigator = window.navigator;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    });

    it('registers service worker when navigator.serviceWorker is supported', () => {
      const registerMock = vi.fn().mockResolvedValue({});
      Object.defineProperty(window, 'navigator', {
        value: {
          ...originalNavigator,
          serviceWorker: { register: registerMock },
          onLine: true,
        },
        configurable: true,
        writable: true,
      });

      render(React.createElement(PwaRegister));
      expect(registerMock).toHaveBeenCalledWith('/sw.js');
    });

    it('does not display offline banner when online', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          ...originalNavigator,
          serviceWorker: { register: vi.fn().mockResolvedValue({}) },
          onLine: true,
        },
        configurable: true,
        writable: true,
      });

      render(React.createElement(PwaRegister));
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('displays adherence-neutral offline banner when offline', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          ...originalNavigator,
          serviceWorker: { register: vi.fn().mockResolvedValue({}) },
          onLine: false,
        },
        configurable: true,
        writable: true,
      });

      render(React.createElement(PwaRegister));
      const banner = screen.getByRole('status');
      expect(banner).toBeInTheDocument();
      expect(banner.textContent?.toLowerCase()).toMatch(/offline/i);
      expect(banner.textContent?.toLowerCase()).toMatch(/staples/i);
    });

    it('updates status when online and offline window events fire', () => {
      let isOnline = true;
      Object.defineProperty(window, 'navigator', {
        get: () => ({
          ...originalNavigator,
          serviceWorker: { register: vi.fn().mockResolvedValue({}) },
          onLine: isOnline,
        }),
        configurable: true,
      });

      render(React.createElement(PwaRegister));
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      act(() => {
        isOnline = false;
        window.dispatchEvent(new Event('offline'));
      });
      expect(screen.getByRole('status')).toBeInTheDocument();

      act(() => {
        isOnline = true;
        window.dispatchEvent(new Event('online'));
      });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
