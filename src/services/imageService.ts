/**
 * Image processing and compression service for ContextPad.
 * Converts uploaded or pasted images into optimized Base64 data URLs.
 */
import { createCanvas } from '../adapters';

export interface ProcessedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  mimeType: string;
  name: string;
}

/**
 * Generate a friendly default alt text for an image
 */
export function generateImageAlt(file?: File): string {
  if (file && file.name && !file.name.match(/^image\.(png|jpe?g|webp|gif)$/i)) {
    // Strip extension
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    return baseName.replace(/[-_]+/g, ' ').trim();
  }
  
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  return `Pasted image ${dateStr} ${timeStr}`;
}

/**
 * Compresses an image file (if needed) and converts it to a Base64 data URL.
 * Scales down images larger than maxDimension (default 1600px) and compresses to WebP/JPEG.
 */
export async function compressAndConvertToDataUrl(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<ProcessedImageResult> {
  const originalSize = file.size;
  const mimeType = file.type;

  // SVG files are vector - do not downscale, read directly as data URL
  if (mimeType === 'image/svg+xml') {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      dataUrl,
      width: 0,
      height: 0,
      originalSize,
      compressedSize: dataUrl.length,
      mimeType,
      name: file.name
    };
  }

  // Small images (< 150KB) and animated GIFs can be kept as-is to preserve fidelity and animation frames
  if (mimeType === 'image/gif' || originalSize < 150 * 1024) {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      dataUrl,
      width: 0,
      height: 0,
      originalSize,
      compressedSize: dataUrl.length,
      mimeType,
      name: file.name
    };
  }

  // Read as Data URL to load into Image
  const rawDataUrl = await readFileAsDataUrl(file);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Scale down if either dimension exceeds maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        // Canvas not supported, fallback to raw
        resolve({
          dataUrl: rawDataUrl,
          width,
          height,
          originalSize,
          compressedSize: rawDataUrl.length,
          mimeType,
          name: file.name
        });
        return;
      }

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP for high compression, fallback to JPEG
      let exportType = 'image/webp';
      let compressedDataUrl = '';
      
      try {
        compressedDataUrl = canvas.toDataURL(exportType, quality);
        // If browser doesn't support webp export, it falls back to image/png
        if (!compressedDataUrl.startsWith('data:image/webp') && mimeType === 'image/jpeg') {
          exportType = 'image/jpeg';
          compressedDataUrl = canvas.toDataURL(exportType, quality);
        }
      } catch {
        compressedDataUrl = rawDataUrl;
      }

      // If compressed version is somehow larger than raw, keep raw
      const finalDataUrl = compressedDataUrl.length < rawDataUrl.length ? compressedDataUrl : rawDataUrl;

      resolve({
        dataUrl: finalDataUrl,
        width,
        height,
        originalSize,
        compressedSize: finalDataUrl.length,
        mimeType: exportType,
        name: file.name
      });
    };

    img.onerror = () => {
      // If image element fails to load, fallback to original data URL
      resolve({
        dataUrl: rawDataUrl,
        width: 0,
        height: 0,
        originalSize,
        compressedSize: rawDataUrl.length,
        mimeType,
        name: file.name
      });
    };

    img.src = rawDataUrl;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
