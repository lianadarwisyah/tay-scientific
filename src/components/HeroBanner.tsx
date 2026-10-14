"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

export type Slide = { id: string; title: string; image_url: string; link_url: string | null };

const Arrow = ({ dir }: { dir: "left" | "right" }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {dir === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
  </svg>
);

function SlideLink({ s, active, children }: { s: Slide; active: boolean; children: React.ReactNode }) {
  const cls = "relative block h-full w-full";
  if (!s.link_url) return <div className={cls}>{children}</div>;
  if (/^https?:\/\//i.test(s.link_url)) {
    return <a href={s.link_url} target="_blank" rel="noopener" className={cls} tabIndex={active ? 0 : -1}>{children}</a>;
  }
  return <Link href={s.link_url} className={cls} tabIndex={active ? 0 : -1}>{children}</Link>;
}

/** Full-width banner slider for the home page (auto-plays every 5 s, pauses on hover, swipe on phones). */
export default function HeroBanner({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = slides.length;
  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((k) => (k + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n, paused]);

  if (n === 0) return null;

  return (
    <div
      className="group relative overflow-hidden rounded-lg bg-mist shadow-sm"
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => {
        if (touchX.current !== null) {
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        }
        touchX.current = null; setPaused(false);
      }}
    >
      {/* 2.4 : 1 banner, like 1920 × 800 */}
      <div className="relative aspect-[12/5] w-full">
        <ul className="flex h-full transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${i * 100}%)` }}>
          {slides.map((s, k) => (
            <li key={s.id} className="h-full w-full shrink-0" aria-hidden={k !== i} aria-roledescription="slide" aria-label={`${k + 1} of ${n}: ${s.title}`}>
              <SlideLink s={s} active={k === i}>
                {/* Blurred copy fills the space when an uploaded picture is not banner-shaped */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.image_url}
                  alt={s.title}
                  loading={k === 0 ? "eager" : "lazy"}
                  fetchPriority={k === 0 ? "high" : "auto"}
                  className="relative h-full w-full object-contain"
                />
              </SlideLink>
            </li>
          ))}
        </ul>
      </div>

      {n > 1 && (
        <>
          <button type="button" onClick={() => go(i - 1)} aria-label="Previous banner"
            className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur transition hover:bg-black/55 focus-visible:opacity-100 group-hover:opacity-100 md:flex">
            <Arrow dir="left" />
          </button>
          <button type="button" onClick={() => go(i + 1)} aria-label="Next banner"
            className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur transition hover:bg-black/55 focus-visible:opacity-100 group-hover:opacity-100 md:flex">
            <Arrow dir="right" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2 sm:bottom-5">
            {slides.map((s, k) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(k)}
                aria-label={`Show banner ${k + 1}: ${s.title}`}
                aria-current={k === i}
                className={`h-3 w-3 rounded-full border border-white/80 shadow transition ${k === i ? "bg-white" : "bg-white/35 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
