"use client";
import { useEffect, useRef, useState } from "react";
import CategoryIcon from "./CategoryIcon";
import { categoryPhotos } from "@/lib/categoryPhotos";

/**
 * Category picture for the Products page. Photos are set in src/lib/categoryPhotos.ts.
 * If a category has no photo (or it fails to load), a soft coloured tile with the category icon is shown.
 */
export default function CategoryImage({ slug, tone }: { slug: string; tone: string }) {
  const src = categoryPhotos[slug];
  const [failed, setFailed] = useState(!src);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <span className="flex h-full w-full items-center justify-center text-ink/30" style={{ background: tone }}>
        <CategoryIcon slug={slug} size={120} />
      </span>
    );
  }
  return (
    <span className="block h-full w-full" style={{ background: tone }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={src}
        alt="" // the category name is already written under the picture
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    </span>
  );
}
