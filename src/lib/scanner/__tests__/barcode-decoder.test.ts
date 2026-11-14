import { describe, test, expect } from 'vitest';
import {
  computeCoverRoi,
  rgbaToLuminance,
  rotateLuminance90CW,
  createZxingFrameDecoder,
} from '../barcode-decoder';

/**
 * Pure EAN-13 / UPC-A bit pattern encoder for generating real retail product
 * barcode test frames in unit tests (no mocking of the decoder).
 */
function encodeEan13Modules(code13: string): string {
  const digits = code13.split('').map(Number);
  const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
  const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
  const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

  let bits = '101';
  const parity = PARITY[digits[0]];
  for (let i = 1; i <= 6; i++) {
    bits += (parity[i - 1] === 'L' ? L : G)[digits[i]];
  }
  bits += '01010';
  for (let i = 7; i <= 12; i++) {
    bits += R[digits[i]];
  }
  bits += '101';
  return bits;
}

function renderEan13Rgba(
  code13: string,
  width: number,
  height: number,
  barWidthPx: number,
  barHeightPx: number,
  opts: { blur?: boolean; gradient?: boolean; vertical?: boolean } = {}
): { rgba: Uint8ClampedArray; width: number; height: number } {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bg = opts.gradient ? Math.floor(145 + (80 * x) / width) : 230;
      const idx = (y * width + x) * 4;
      rgba[idx] = bg;
      rgba[idx + 1] = bg;
      rgba[idx + 2] = bg;
      rgba[idx + 3] = 255;
    }
  }

  const bits = encodeEan13Modules(code13);
  const totalBarW = bits.length * barWidthPx;
  const startX = Math.floor((width - totalBarW) / 2);
  const startY = Math.floor((height - barHeightPx) / 2);

  for (let y = startY; y < startY + barHeightPx; y++) {
    if (y < 0 || y >= height) continue;
    for (let m = 0; m < bits.length; m++) {
      if (bits[m] === '1') {
        const x0 = Math.floor(startX + m * barWidthPx);
        const x1 = Math.floor(startX + (m + 1) * barWidthPx);
        for (let x = x0; x < x1; x++) {
          if (x >= 0 && x < width) {
            const idx = (y * width + x) * 4;
            rgba[idx] = 35;
            rgba[idx + 1] = 35;
            rgba[idx + 2] = 35;
          }
        }
      }
    }
  }

  if (opts.blur) {
    const blurred = new Uint8ClampedArray(rgba);
    for (let y = 0; y < height; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const val = Math.round(
          (rgba[idx - 4] + 2 * rgba[idx] + rgba[idx + 4]) / 4
        );
        blurred[idx] = blurred[idx + 1] = blurred[idx + 2] = val;
      }
    }
    if (!opts.vertical) {
      return { rgba: blurred, width, height };
    }
    rgba.set(blurred);
  }

  if (opts.vertical) {
    const rot = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const src = (y * width + x) * 4;
        const dst = (x * height + (height - 1 - y)) * 4;
        rot[dst] = rgba[src];
        rot[dst + 1] = rgba[src + 1];
        rot[dst + 2] = rgba[src + 2];
        rot[dst + 3] = 255;
      }
    }
    return { rgba: rot, width: height, height: width };
  }

  return { rgba, width, height };
}

describe('Barcode Decoder (Native-Resolution ROI & ZXing)', () => {
  const REAL_PRODUCT_BARCODES = [
    { name: 'Nutella', code: '3017620422003', expected: '3017620422003' },
    { name: 'Coca-Cola Original', code: '5449000000996', expected: '5449000000996' },
    { name: 'Coca-Cola Zero Sugar (UPC-A)', code: '0049000042566', expected: '049000042566' },
    { name: 'Cheerios (UPC-A)', code: '0016000275287', expected: '016000275287' },
    { name: 'Pringles Original (UPC-A)', code: '0038000138416', expected: '038000138416' },
    { name: 'Snickers UK', code: '5000159461122', expected: '5000159461122' },
    { name: 'Barilla Spaghetti Nº5', code: '8076800195057', expected: '8076800195057' },
  ];

  test('decodes real generic product barcodes rapidly with blur and uneven lighting', () => {
    const decoder = createZxingFrameDecoder();

    for (const product of REAL_PRODUCT_BARCODES) {
      const { rgba, width, height } = renderEan13Rgba(product.code, 720, 280, 3.2, 140, {
        blur: true,
        gradient: true,
      });
      const lum = rgbaToLuminance(rgba, width, height);
      const t0 = performance.now();
      const decoded = decoder.decodeLuminance(lum, width, height, 0);
      const elapsedMs = performance.now() - t0;

      expect(decoded).toBe(product.expected);
      expect(elapsedMs).toBeLessThan(100);
    }
  });

  test('decodes vertical (90-degree rotated) retail barcodes across rotation pass', () => {
    const decoder = createZxingFrameDecoder();
    const { rgba, width, height } = renderEan13Rgba('3017620422003', 640, 260, 2.8, 120, {
      blur: true,
      vertical: true,
    });
    const lum = rgbaToLuminance(rgba, width, height);

    // Frame index 2 triggers the 90-degree rotation pass
    let decoded: string | null = null;
    for (let f = 0; f < 4 && !decoded; f++) {
      decoded = decoder.decodeLuminance(lum, width, height, f);
    }
    expect(decoded).toBe('3017620422003');
  });

  test('computeCoverRoi keeps center reticle aligned on portrait iPhone streams and preserves HD resolution', () => {
    // Portrait iPhone stream 720x1280 rendered inside 335x251 (4:3) object-cover container
    const portraitRoi = computeCoverRoi(720, 1280, 335, 251);
    expect(portraitRoi.sx).toBeGreaterThanOrEqual(0);
    expect(portraitRoi.sy).toBeGreaterThan(250); // cropped from vertical center of 1280px stream
    expect(portraitRoi.sy + portraitRoi.sh).toBeLessThan(1030);
    expect(portraitRoi.destWidth).toBeGreaterThanOrEqual(500);
    expect(portraitRoi.destWidth).toBeLessThanOrEqual(960);

    // Landscape desktop/Android stream 1280x720 in 400x300 (4:3) container
    const landscapeRoi = computeCoverRoi(1280, 720, 400, 300);
    expect(landscapeRoi.sx).toBeGreaterThan(100);
    expect(landscapeRoi.destWidth).toBeGreaterThanOrEqual(700);
    expect(landscapeRoi.destWidth).toBeLessThanOrEqual(960);
  });

  test('rotateLuminance90CW rotates dimensions accurately', () => {
    const src = new Uint8ClampedArray([1, 2, 3, 4, 5, 6]); // 3x2
    const rotated = rotateLuminance90CW(src, 3, 2); // 2x3
    expect(Array.from(rotated)).toEqual([4, 1, 5, 2, 6, 3]);
  });
});
