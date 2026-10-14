"use client";
import { useEffect, useRef, useState } from "react";
import { brandLogo } from "@/lib/brandLogos";

/**
 * Shows the brand logo (see src/lib/brandLogos.ts). Run `npm run logos:fetch` to download missing logos,
 * or set `logo_url` on the brand in Supabase. Without a logo, the brand name is shown as a wordmark.
 */
export default function BrandLogo({ name, slug, logoUrl, size = "lg" }: { name: string; slug: string; logoUrl?: string | null; size?: "lg" | "sm" }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // An image that failed before React took over never fires onError, so check once after mount
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  const text = size === "lg" ? "text-4xl" : "text-2xl";
  if (failed) {
    return <span className={`font-display ${text} font-bold leading-none tracking-tight text-ink/85`}>{name}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={brandLogo(slug, logoUrl)}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={size === "lg" ? "max-h-24 max-w-[80%] object-contain" : "max-h-14 max-w-[160px] object-contain"}
    />
  );
}
