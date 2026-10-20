"use client";
import { useCallback, useEffect, useState } from "react";

/** Photo grid; click a photo to view it large. Arrow keys / buttons to move, Esc to close. */
export default function EventGallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const move = useCallback((d: number) => setOpen((i) => (i === null ? null : (i + d + images.length) % images.length)), [images.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, move]);

  if (!images.length) return null;
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {images.map((src, i) => (
          <li key={src}>
            <button type="button" onClick={() => setOpen(i)} className="block aspect-[4/3] w-full overflow-hidden rounded-lg bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              aria-label={`View photo ${i + 1} of ${images.length}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${title}: photo ${i + 1}`} loading="lazy" className="h-full w-full object-cover transition duration-300 hover:scale-105" />
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[open]} alt={`${title}: photo ${open + 1}`} className="max-h-[88vh] max-w-full rounded-md object-contain" onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={() => setOpen(null)} className="absolute right-4 top-4 rounded-full bg-white/15 px-4 py-2 text-white hover:bg-white/25" aria-label="Close">✕</button>
          {images.length > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); move(-1); }} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-4 py-3 text-2xl text-white hover:bg-white/25" aria-label="Previous photo">‹</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); move(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-4 py-3 text-2xl text-white hover:bg-white/25" aria-label="Next photo">›</button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">{open + 1} / {images.length}</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
