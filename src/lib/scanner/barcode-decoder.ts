import * as ZXingModule from 'html5-qrcode/third_party/zxing-js.umd';

export const FOOD_BARCODE_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'qr_code',
] as const;

interface ZXingResult {
  text?: string;
  getText?: () => string;
}

interface ZXingLuminanceSource {
  readonly width: number;
}

interface ZXingBinarizer {
  readonly width?: number;
}

interface ZXingBinaryBitmap {
  readonly width?: number;
}

interface ZXingReader {
  setHints?: (hints: Map<number, unknown>) => void;
  decodeWithState?: (bitmap: ZXingBinaryBitmap) => ZXingResult;
  decode: (bitmap: ZXingBinaryBitmap, hints?: Map<number, unknown>) => ZXingResult;
}

interface ZXingRuntime {
  BarcodeFormat: Record<string, number>;
  DecodeHintType: {
    POSSIBLE_FORMATS: number;
    TRY_HARDER: number;
  };
  RGBLuminanceSource: new (
    luminances: Uint8ClampedArray,
    width: number,
    height: number
  ) => ZXingLuminanceSource;
  GlobalHistogramBinarizer: new (source: ZXingLuminanceSource) => ZXingBinarizer;
  HybridBinarizer: new (source: ZXingLuminanceSource) => ZXingBinarizer;
  BinaryBitmap: new (binarizer: ZXingBinarizer) => ZXingBinaryBitmap;
  MultiFormatReader: new (verbose?: boolean, hints?: Map<number, unknown>) => ZXingReader;
}

const ZXing = ZXingModule as unknown as ZXingRuntime;

export interface CoverRoi {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  destWidth: number;
  destHeight: number;
}

const MAX_ROI_WIDTH = 960;

/**
 * Maps a center scan band inside an `object-cover` video container back to native
 * video pixel coordinates, keeping full HD resolution (up to 960px wide) so 1D
 * barcode bars remain crisp on both portrait iPhone and landscape cameras.
 */
export function computeCoverRoi(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number
): CoverRoi {
  const safeVideoW = Math.max(1, videoWidth);
  const safeVideoH = Math.max(1, videoHeight);
  const containerAspect =
    containerWidth > 0 && containerHeight > 0 ? containerWidth / containerHeight : 4 / 3;
  const videoAspect = safeVideoW / safeVideoH;

  let visibleW: number;
  let visibleH: number;
  let visibleX: number;
  let visibleY: number;

  if (videoAspect > containerAspect) {
    visibleH = safeVideoH;
    visibleW = safeVideoH * containerAspect;
    visibleX = (safeVideoW - visibleW) / 2;
    visibleY = 0;
  } else {
    visibleW = safeVideoW;
    visibleH = safeVideoW / containerAspect;
    visibleX = 0;
    visibleY = (safeVideoH - visibleH) / 2;
  }

  const sw = Math.max(1, Math.min(safeVideoW, Math.round(visibleW * 0.88)));
  const sh = Math.max(1, Math.min(safeVideoH, Math.round(visibleH * 0.6)));
  const sx = Math.max(0, Math.min(safeVideoW - sw, Math.round(visibleX + (visibleW - sw) / 2)));
  const sy = Math.max(0, Math.min(safeVideoH - sh, Math.round(visibleY + (visibleH - sh) / 2)));

  const destWidth = Math.min(MAX_ROI_WIDTH, sw);
  const destHeight = Math.max(1, Math.round((sh * destWidth) / sw));

  return { sx, sy, sw, sh, destWidth, destHeight };
}

/**
 * Converts RGBA ImageData bytes to an 8-bit grayscale luminance buffer,
 * optionally reusing an existing Uint8ClampedArray to avoid per-frame allocations.
 */
export function rgbaToLuminance(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  out?: Uint8ClampedArray
): Uint8ClampedArray {
  const total = width * height;
  const lum = out && out.length === total ? out : new Uint8ClampedArray(total);
  for (let i = 0, j = 0; j < total; i += 4, j++) {
    lum[j] = (rgba[i] + (rgba[i + 1] << 1) + rgba[i + 2]) >> 2;
  }
  return lum;
}

/**
 * Rotates a grayscale luminance buffer 90 degrees clockwise so vertical
 * barcodes on cans/bottles can be read by 1D horizontal scanners.
 */
export function rotateLuminance90CW(
  lum: Uint8ClampedArray,
  width: number,
  height: number,
  out?: Uint8ClampedArray
): Uint8ClampedArray {
  const total = width * height;
  const rotated = out && out.length === total ? out : new Uint8ClampedArray(total);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    const targetCol = height - 1 - y;
    for (let x = 0; x < width; x++) {
      rotated[x * height + targetCol] = lum[rowOffset + x];
    }
  }
  return rotated;
}

export interface ZxingFrameDecoder {
  decodeLuminance: (
    luminance: Uint8ClampedArray,
    width: number,
    height: number,
    frameIndex: number
  ) => string | null;
}

/**
 * Creates a fast reusable ZXing 1D/QR frame decoder restricted to retail food formats.
 */
export function createZxingFrameDecoder(): ZxingFrameDecoder {
  const formats = [
    ZXing.BarcodeFormat.EAN_13,
    ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.UPC_A,
    ZXing.BarcodeFormat.UPC_E,
    ZXing.BarcodeFormat.CODE_128,
    ZXing.BarcodeFormat.QR_CODE,
  ].filter((f) => typeof f === 'number');

  const fastHints = new Map<number, unknown>([
    [ZXing.DecodeHintType.POSSIBLE_FORMATS, formats],
    [ZXing.DecodeHintType.TRY_HARDER, false],
  ]);

  const hardHints = new Map<number, unknown>([
    [ZXing.DecodeHintType.POSSIBLE_FORMATS, formats],
    [ZXing.DecodeHintType.TRY_HARDER, true],
  ]);

  const reader = new ZXing.MultiFormatReader(false, fastHints);
  let rotatedBuffer: Uint8ClampedArray | undefined;

  const tryDecodeBitmap = (
    bitmap: ZXingBinaryBitmap,
    hints: Map<number, unknown>
  ): string | null => {
    try {
      if (reader.setHints && reader.decodeWithState) {
        reader.setHints(hints);
        const res = reader.decodeWithState(bitmap);
        return res?.text ?? res?.getText?.() ?? null;
      }
      const res = reader.decode(bitmap, hints);
      return res?.text ?? res?.getText?.() ?? null;
    } catch {
      return null;
    }
  };

  return {
    decodeLuminance(
      luminance: Uint8ClampedArray,
      width: number,
      height: number,
      frameIndex: number
    ): string | null {
      if (width <= 0 || height <= 0 || luminance.length < width * height) {
        return null;
      }

      const source = new ZXing.RGBLuminanceSource(luminance, width, height);

      // Fast pass: GlobalHistogramBinarizer sharpens 1D bar rows (~1-3ms)
      const fastText = tryDecodeBitmap(
        new ZXing.BinaryBitmap(new ZXing.GlobalHistogramBinarizer(source)),
        fastHints
      );
      if (fastText) return fastText;

      // Secondary pass rotated across frames to handle glare, tilt, QR, and vertical cans
      const strategy = frameIndex % 3;
      if (strategy === 0) {
        return tryDecodeBitmap(
          new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(source)),
          hardHints
        );
      }

      if (strategy === 1) {
        return tryDecodeBitmap(
          new ZXing.BinaryBitmap(new ZXing.GlobalHistogramBinarizer(source)),
          hardHints
        );
      }

      rotatedBuffer = rotateLuminance90CW(luminance, width, height, rotatedBuffer);
      const rotatedSource = new ZXing.RGBLuminanceSource(rotatedBuffer, height, width);
      return tryDecodeBitmap(
        new ZXing.BinaryBitmap(new ZXing.GlobalHistogramBinarizer(rotatedSource)),
        hardHints
      );
    },
  };
}

interface NativeBarcodeDetectorInstance {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
}

interface NativeBarcodeDetectorConstructor {
  new (opts: { formats: string[] }): NativeBarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}

async function getSafeNativeBarcodeDetector(): Promise<NativeBarcodeDetectorInstance | null> {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
    return null;
  }
  const DetectorCtor = (
    window as unknown as { BarcodeDetector?: NativeBarcodeDetectorConstructor }
  ).BarcodeDetector;
  if (!DetectorCtor) return null;

  try {
    let formats: string[] = [...FOOD_BARCODE_FORMATS];
    if (typeof DetectorCtor.getSupportedFormats === 'function') {
      const supported = await DetectorCtor.getSupportedFormats();
      formats = FOOD_BARCODE_FORMATS.filter((f) => supported.includes(f));
      if (formats.length === 0) return null;
    }
    return new DetectorCtor({ formats });
  } catch {
    return null;
  }
}

export async function requestBarcodeCameraStream(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });

  // Enable continuous autofocus where supported so close-up labels stay sharp
  const track = stream.getVideoTracks()[0];
  if (track && typeof track.getCapabilities === 'function' && typeof track.applyConstraints === 'function') {
    try {
      const caps = track.getCapabilities() as { focusMode?: string[] };
      if (Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
        await track.applyConstraints({
          advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
        });
      }
    } catch {
      // Optional camera hint; safe to ignore when unsupported
    }
  }

  return stream;
}

export interface StartBarcodeScanOptions {
  video: HTMLVideoElement;
  onDetected: (barcode: string) => void;
  onCameraError: (message: string) => void;
}

const FRAME_INTERVAL_MS = 55;
const MAX_NATIVE_DETECTOR_ERRORS = 3;

/**
 * Starts live camera barcode scanning on a single `<video>` element.
 * Uses native `BarcodeDetector` when supported and automatically falls back
 * to full-resolution ZXing ROI decoding (iOS Safari, Firefox, etc.).
 */
export function startBarcodeVideoScan({
  video,
  onDetected,
  onCameraError,
}: StartBarcodeScanOptions): () => void {
  let stopped = false;
  let activeStream: MediaStream | null = null;
  let rafId: number | null = null;
  let inFlight = false;
  let lastAttemptAt = 0;
  let frameIndex = 0;
  let nativeErrors = 0;
  let zxingDecoder: ZxingFrameDecoder | null = null;
  let roiCanvas: HTMLCanvasElement | null = null;
  let roiCtx: CanvasRenderingContext2D | null = null;
  let lumBuffer: Uint8ClampedArray | undefined;

  const cleanup = () => {
    stopped = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      activeStream = null;
    }
    if (video.srcObject) {
      video.srcObject = null;
    }
  };

  const decodeViaZxingRoi = (): string | null => {
    if (video.videoWidth <= 0 || video.videoHeight <= 0) return null;

    const roi = computeCoverRoi(
      video.videoWidth,
      video.videoHeight,
      video.clientWidth,
      video.clientHeight
    );

    if (!roiCanvas) {
      roiCanvas = document.createElement('canvas');
      roiCtx = roiCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (!roiCtx) return null;

    if (roiCanvas.width !== roi.destWidth || roiCanvas.height !== roi.destHeight) {
      roiCanvas.width = roi.destWidth;
      roiCanvas.height = roi.destHeight;
    }

    roiCtx.drawImage(
      video,
      roi.sx,
      roi.sy,
      roi.sw,
      roi.sh,
      0,
      0,
      roi.destWidth,
      roi.destHeight
    );

    const imageData = roiCtx.getImageData(0, 0, roi.destWidth, roi.destHeight);
    lumBuffer = rgbaToLuminance(imageData.data, roi.destWidth, roi.destHeight, lumBuffer);

    if (!zxingDecoder) {
      zxingDecoder = createZxingFrameDecoder();
    }
    return zxingDecoder.decodeLuminance(lumBuffer, roi.destWidth, roi.destHeight, frameIndex++);
  };

  async function init() {
    if (typeof navigator === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      if (!stopped) {
        onCameraError('Camera access unavailable. You can enter the barcode manually below.');
      }
      return;
    }

    try {
      const [stream, nativeDetector] = await Promise.all([
        requestBarcodeCameraStream(),
        getSafeNativeBarcodeDetector(),
      ]);

      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      activeStream = stream;
      video.srcObject = stream;
      await video.play().catch(() => {});

      if (stopped) {
        cleanup();
        return;
      }

      let activeDetector = nativeDetector;

      const tick = (now: number) => {
        if (stopped) return;
        rafId = requestAnimationFrame(tick);

        if (inFlight || now - lastAttemptAt < FRAME_INTERVAL_MS) return;
        if (video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) return;

        lastAttemptAt = now;
        inFlight = true;

        (async () => {
          try {
            if (activeDetector) {
              try {
                const hits = await activeDetector.detect(video);
                nativeErrors = 0;
                const code = hits?.[0]?.rawValue?.trim();
                if (code && !stopped) {
                  cleanup();
                  onDetected(code);
                  return;
                }
              } catch {
                nativeErrors += 1;
                if (nativeErrors >= MAX_NATIVE_DETECTOR_ERRORS) {
                  activeDetector = null;
                }
              }
            } else {
              const code = decodeViaZxingRoi()?.trim();
              if (code && !stopped) {
                cleanup();
                onDetected(code);
                return;
              }
            }
          } finally {
            inFlight = false;
          }
        })();
      };

      rafId = requestAnimationFrame(tick);
    } catch {
      if (!stopped) {
        onCameraError('Camera access unavailable. You can enter the barcode manually below.');
      }
    }
  }

  init();
  return cleanup;
}
