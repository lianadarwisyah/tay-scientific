/**
 * Shrinks a photo in the browser before it is uploaded to Supabase Storage, so phone photos (3-8 MB)
 * become web-sized JPGs (usually 150-400 KB). Used by Admin → Products, Banners and Events.
 *
 * - Keeps the shape (aspect ratio); only makes it smaller, never bigger.
 * - Transparent PNG areas become white (product photos are shown on white).
 * - If the original is already a small JPG within the size, the original is kept.
 */
export type CompressOptions = { maxWidth: number; maxHeight: number; quality?: number };

export const PHOTO_SIZES = {
  product: { maxWidth: 1200, maxHeight: 1200, quality: 0.85 },
  banner: { maxWidth: 1920, maxHeight: 1920, quality: 0.85 },
  event: { maxWidth: 1600, maxHeight: 1600, quality: 0.82 },
} satisfies Record<string, CompressOptions>;

/** Largest file staff may pick (before shrinking). */
export const MAX_PICK_MB = 25;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function decode(file: File): Promise<{ img: CanvasImageSource; w: number; h: number; close?: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { img: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
    } catch { /* fall back to <img> below */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { img, w: img.naturalWidth, h: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImage(file: File, { maxWidth, maxHeight, quality = 0.85 }: CompressOptions): Promise<File> {
  const { img, w, h, close } = await decode(file);
  try {
    const scale = Math.min(1, maxWidth / w, maxHeight / h);
    const width = Math.max(1, Math.round(w * scale));
    const height = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob) return file;
    // Already small enough: keep the original JPG rather than re-saving it
    if (file.type === "image/jpeg" && scale === 1 && file.size <= blob.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    close?.();
  }
}

/** "3.4 MB" / "280 KB" */
export function formatBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}
