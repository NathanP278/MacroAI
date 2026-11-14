"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  ScanBarcode,
  X,
  Camera,
  CameraOff,
  Search,
  Check,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { db, generateId } from '@/lib/db/macroai-db';
import { scaleNutrition } from '@/lib/nutrition/scaling';
import { lookupBarcodeWaterfall, BarcodeLookupResult } from '@/hooks/use-barcode-lookup';
import { useLoggerStore } from '@/stores/logger-store';
import { AddBarcodeProductModal } from './add-barcode-product-modal';
import type { FoodLogEntry } from '@/types/nutrition';

export interface BarcodeScannerDrawerProps {
  open: boolean;
  date?: string;
  mealSlot?: string;
  onClose: () => void;
}

export function BarcodeScannerDrawer({
  open,
  date,
  mealSlot,
  onClose,
}: BarcodeScannerDrawerProps) {
  const storeDate = useLoggerStore((s) => s.activeDate);
  const storeMealSlot = useLoggerStore((s) => s.activeMealSlot);

  const effectiveDate = date ?? storeDate ?? '2026-11-14';
  const effectiveMealSlot = mealSlot ?? storeMealSlot ?? 'snacks';

  const [manualBarcode, setManualBarcode] = useState('');
  const [lookupResult, setLookupResult] = useState<BarcodeLookupResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Missing product modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [missingBarcode, setMissingBarcode] = useState('');

  // Portion adjustment for 'hit' results
  const [amount, setAmount] = useState('100');
  const [unit, setUnit] = useState('g');
  const [isLogging, setIsLogging] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isProcessingScanRef = useRef(false);
  const isLookingUpRef = useRef(false);

  // Keyboard Escape listener
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Reset all scanner state and locks whenever the drawer closes
  useEffect(() => {
    if (!open) {
      setLookupResult(null);
      setManualBarcode('');
      setMissingBarcode('');
      setIsAddModalOpen(false);
      setCameraError(null);
      setIsLookingUp(false);
      isProcessingScanRef.current = false;
      isLookingUpRef.current = false;
    }
  }, [open]);

  const handleLookup = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || isLookingUpRef.current) return;

    isLookingUpRef.current = true;
    setIsLookingUp(true);
    try {
      const res = await lookupBarcodeWaterfall(trimmed);
      setLookupResult(res);

      if (res.status === 'hit') {
        if (res.item.basis === 'perServing') {
          setAmount('1');
          setUnit(res.item.servingUnit || 'serving');
        } else {
          setAmount(String(res.item.servingSize || 100));
          setUnit(res.item.basis === 'per100ml' ? 'ml' : (res.item.servingUnit || 'g'));
        }
      } else if (res.status === 'missing') {
        setMissingBarcode(trimmed);
        setIsAddModalOpen(true);
      } else if (res.status === 'offline-miss') {
        setMissingBarcode(trimmed);
      }
    } catch (err) {
      console.error('Barcode lookup failed:', err);
    } finally {
      isLookingUpRef.current = false;
      setIsLookingUp(false);
    }
  };

  // Camera scanner effect
  useEffect(() => {
    if (!open || lookupResult !== null || isAddModalOpen) {
      return;
    }

    // Explicitly reset scan lock so interrupted or restarted scanning is never frozen
    isProcessingScanRef.current = false;

    let isMounted = true;
    let activeStream: MediaStream | null = null;
    let html5Scanner: Html5Qrcode | null = null;
    let scanInterval: any = null;

    const stopAllScanning = () => {
      if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
      }
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
        activeStream = null;
      }
      if (html5Scanner && (html5Scanner as any).isScanning) {
        html5Scanner.stop().catch(() => {});
      }
    };

    const handleBarcodeDetected = (rawCode: string) => {
      if (isProcessingScanRef.current) return;
      isProcessingScanRef.current = true;
      stopAllScanning();
      handleLookup(rawCode);
    };

    async function startScanner() {
      setCameraError(null);

      if (typeof navigator === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
        if (isMounted) {
          setCameraError('Camera access unavailable. You can enter the barcode manually below.');
        }
        return;
      }

      // Fast-path: Native BarcodeDetector if available
      if (
        typeof window !== 'undefined' &&
        'BarcodeDetector' in window &&
        navigator?.mediaDevices?.getUserMedia
      ) {
        try {
          const BarcodeDetectorClass = (window as any).BarcodeDetector;
          const detector = new BarcodeDetectorClass({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
          });
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
          });

          if (!isMounted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          activeStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
          }

          scanInterval = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleBarcodeDetected(barcodes[0].rawValue);
              }
            } catch {
              // Ignore frame detection errors
            }
          }, 200);

          return;
        } catch {
          // Fall through to Html5Qrcode fallback
        }
      }

      // Fallback: html5-qrcode
      try {
        const container = document.getElementById('macroai-barcode-scanner');
        if (!container) return;

        const scanner = new Html5Qrcode('macroai-barcode-scanner');
        html5Scanner = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (isMounted) {
              handleBarcodeDetected(decodedText);
            }
          },
          () => {}
        );

        if (!isMounted) {
          scanner.stop().catch(() => {});
          return;
        }
      } catch {
        if (isMounted) {
          setCameraError('Camera access unavailable. You can enter the barcode manually below.');
        }
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      stopAllScanning();
    };
  }, [open, lookupResult, isAddModalOpen]);

  if (!open) return null;

  const parsedAmount = Math.max(0, parseFloat(amount) || 0);

  const scaledNutrition =
    lookupResult?.status === 'hit'
      ? scaleNutrition(
          lookupResult.item.nutrientsPerBasis,
          lookupResult.item.micronutrientsPerBasis,
          lookupResult.item.basis,
          parsedAmount,
          lookupResult.item.servingSize
        )
      : null;

  const handleLogHitFood = async () => {
    if (!lookupResult || lookupResult.status !== 'hit' || isLogging) return;
    setIsLogging(true);

    try {
      const item = lookupResult.item;
      const scaled = scaleNutrition(
        item.nutrientsPerBasis,
        item.micronutrientsPerBasis,
        item.basis,
        parsedAmount,
        item.servingSize
      );

      const entry: FoodLogEntry = {
        id: generateId(),
        date: effectiveDate,
        mealSlot: effectiveMealSlot,
        foodId: item.id,
        name: item.name,
        source: item.source,
        amount: parsedAmount,
        unit: unit.trim() || item.servingUnit || 'g',
        nutritionSnapshot: {
          calories: scaled.macros.calories,
          protein: scaled.macros.protein,
          carbs: scaled.macros.carbs,
          fat: scaled.macros.fat,
          fiber: scaled.macros.fiber,
          micros: scaled.micros,
        },
        createdAt: Date.now(),
      };

      await db.foodLogs.add(entry);
      onClose();
    } catch (err) {
      console.error('Failed to log scanned food:', err);
    } finally {
      setIsLogging(false);
    }
  };

  const handleResetScanner = () => {
    setLookupResult(null);
    setManualBarcode('');
    setMissingBarcode('');
    setIsAddModalOpen(false);
    setCameraError(null);
    setIsLookingUp(false);
    isProcessingScanRef.current = false;
    isLookingUpRef.current = false;
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Barcode Scanner"
        data-testid="barcode-scanner-drawer"
        className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      >
        <div
          className="w-full max-w-[430px] mx-auto bg-surface-elevated border-t border-x border-border rounded-t-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              {lookupResult ? (
                <button
                  type="button"
                  onClick={handleResetScanner}
                  aria-label="Back to camera scanner"
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-sub transition-colors mr-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center text-sky-400">
                  <ScanBarcode className="w-4 h-4" />
                </div>
              )}
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {lookupResult?.status === 'hit'
                    ? lookupResult.item.name
                    : 'Scan Food Barcode'}
                </h2>
                <p className="text-[10px] text-muted-foreground capitalize">
                  Logging to {effectiveMealSlot} &bull; {effectiveDate}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close barcode scanner"
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Views */}
          {lookupResult?.status === 'hit' ? (
            /* Hit view: Product details & Portion selection */
            <div className="pt-4 flex-1 overflow-y-auto space-y-4">
              {lookupResult.item.brand && (
                <p className="text-xs text-muted-foreground -mt-2">
                  Brand: <span className="text-foreground font-medium">{lookupResult.item.brand}</span>
                </p>
              )}

              {/* Portion Selector Box */}
              <div className="bg-surface-sub border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Portion Amount</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Basis: {lookupResult.item.servingSize} {lookupResult.item.servingUnit}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      aria-label="Portion amount"
                      type="number"
                      step="any"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 text-base font-semibold tabular-nums rounded-xl bg-surface-card border border-border focus:border-border-focus focus:outline-none text-foreground"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      aria-label="Portion unit"
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl bg-surface-card border border-border focus:border-border-focus focus:outline-none text-foreground text-center"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  {lookupResult.item.basis === 'perServing' ? (
                    [0.5, 1, 1.5, 2].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount(String(preset))}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                          amount === String(preset)
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-surface-card border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {preset}x
                      </button>
                    ))
                  ) : lookupResult.item.basis === 'per100ml' ? (
                    [50, 100, 150, 200, 250].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setAmount(String(preset));
                          setUnit('ml');
                        }}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                          amount === String(preset) && unit === 'ml'
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-surface-card border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {preset}ml
                      </button>
                    ))
                  ) : (
                    [50, 100, 150, 200, 250].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setAmount(String(preset));
                          setUnit('g');
                        }}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                          amount === String(preset) && unit === 'g'
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-surface-card border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {preset}g
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Scaled Macro Summary */}
              {scaledNutrition && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-foreground">Scaled Nutrition</span>
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      {scaledNutrition.macros.calories} kcal
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-surface-sub border border-border rounded-xl p-2">
                      <span className="text-[10px] text-emerald-400 font-medium block">Protein</span>
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {scaledNutrition.macros.protein}g
                      </span>
                    </div>
                    <div className="bg-surface-sub border border-border rounded-xl p-2">
                      <span className="text-[10px] text-sky-400 font-medium block">Carbs</span>
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {scaledNutrition.macros.carbs}g
                      </span>
                    </div>
                    <div className="bg-surface-sub border border-border rounded-xl p-2">
                      <span className="text-[10px] text-amber-400 font-medium block">Fat</span>
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {scaledNutrition.macros.fat}g
                      </span>
                    </div>
                    <div className="bg-surface-sub border border-border rounded-xl p-2">
                      <span className="text-[10px] text-muted-foreground font-medium block">Fiber</span>
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {scaledNutrition.macros.fiber}g
                      </span>
                    </div>
                  </div>

                  {scaledNutrition.micros.sodiumMg !== undefined && (
                    <div className="bg-surface-sub/50 border border-border rounded-xl p-2 text-[10px] text-muted-foreground">
                      Sodium: <strong className="text-foreground tabular-nums">{scaledNutrition.micros.sodiumMg}mg</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Log Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLogHitFood}
                  disabled={isLogging || parsedAmount <= 0}
                  className="w-full py-2.5 px-4 rounded-xl bg-foreground text-background font-semibold text-xs hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isLogging ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Log Food</span>
                </button>
              </div>
            </div>
          ) : lookupResult?.status === 'offline-miss' ? (
            /* Offline-miss View */
            <div className="pt-4 flex-1 flex flex-col justify-center items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Network Offline
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Barcode <span className="font-mono text-foreground">{missingBarcode}</span> was not found in your local cache, and you appear to be offline.
                </p>
              </div>
              <div className="pt-2 w-full space-y-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-foreground text-background font-semibold text-xs hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product Offline</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetScanner}
                  className="w-full py-2 px-4 rounded-xl bg-surface-sub hover:bg-muted border border-border text-foreground font-medium text-xs transition-colors"
                >
                  Try Another Barcode
                </button>
              </div>
            </div>
          ) : lookupResult?.status === 'missing' ? (
            /* Missing View */
            <div className="pt-4 flex-1 flex flex-col justify-center items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center text-sky-400">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Product Not Found
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Barcode <span className="font-mono text-foreground">{missingBarcode}</span> is not registered in Open Food Facts.
                </p>
              </div>
              <div className="pt-2 w-full space-y-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-foreground text-background font-semibold text-xs hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product Details</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetScanner}
                  className="w-full py-2 px-4 rounded-xl bg-surface-sub hover:bg-muted border border-border text-foreground font-medium text-xs transition-colors"
                >
                  Scan Another
                </button>
              </div>
            </div>
          ) : (
            /* Default Camera View & Manual Search */
            <div className="pt-3 flex-1 flex flex-col min-h-0 space-y-3">
              {/* Camera Viewfinder Area */}
              <div className="relative w-full aspect-[4/3] rounded-2xl bg-black overflow-hidden border border-border flex items-center justify-center">
                {cameraError ? (
                  <div className="p-4 text-center space-y-2">
                    <CameraOff className="w-8 h-8 mx-auto text-muted-foreground/60" />
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {cameraError}
                    </p>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div
                      id="macroai-barcode-scanner"
                      className="absolute inset-0 w-full h-full overflow-hidden"
                    />

                    {/* Target Reticle Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-32 border-2 border-sky-400/80 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-sky-400" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-sky-400" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-sky-400" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-sky-400" />
                      </div>
                    </div>

                    <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
                      <span className="text-[10px] bg-black/60 backdrop-blur-sm text-foreground/80 px-2.5 py-1 rounded-full border border-white/10 font-medium">
                        Point camera at a barcode
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Manual Barcode Input Section */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Or enter barcode manually:
                </span>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLookup(manualBarcode);
                  }}
                  className="flex items-center gap-2"
                >
                  <label htmlFor="manual-barcode-input" className="sr-only">
                    Barcode
                  </label>
                  <div className="flex-1">
                    <input
                      id="manual-barcode-input"
                      aria-label="Barcode"
                      type="text"
                      placeholder="Enter barcode digits..."
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-sub border border-border focus:border-border-focus focus:outline-none text-foreground placeholder:text-muted-foreground/50 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLookingUp || !manualBarcode.trim()}
                    className="py-2 px-3 rounded-xl bg-foreground text-background font-semibold text-xs hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {isLookingUp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Look Up</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Render AddBarcodeProductModal when open */}
      {isAddModalOpen && (
        <AddBarcodeProductModal
          open={isAddModalOpen}
          barcode={missingBarcode}
          date={effectiveDate}
          mealSlot={effectiveMealSlot}
          onClose={() => {
            setIsAddModalOpen(false);
          }}
          onSaved={() => {
            setIsAddModalOpen(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
