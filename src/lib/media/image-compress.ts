/**
 * Compresses an image blob into a JPEG Data URL, resizing it if width exceeds maxWidth.
 * Preserves aspect ratio and cleans up ImageBitmap resources in a finally block.
 */
export async function compressImageToJpeg(
  file: Blob,
  maxWidth = 1024,
  quality = 0.8
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;
    const maxDim = Math.max(width, height);
    if (maxDim > maxWidth) {
      const scale = maxWidth / maxDim;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context is not available');
    }
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    if (bitmap && typeof (bitmap as any).close === 'function') {
      (bitmap as any).close();
    }
  }
}
