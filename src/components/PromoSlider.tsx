"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Promotion } from "@/lib/types";

function formatEnd(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

function PromoLink({ href, className, tabbable, children }: { href: string | null; className: string; tabbable: boolean; children: React.ReactNode }) {
  if (!href) return <div className={className}>{children}</div>;
  if (/^https?:\/\//i.test(href)) {
    return <a href={href} target="_blank" rel="noopener" className={className} tabIndex={tabbable ? 0 : -1}>{children}</a>;
  }
  return <Link href={href} className={className} tabIndex={tabbable ? 0 : -1}>{children}</Link>;
}

function Slide({ p, active, posterOnly }: { p: Promotion; active: boolean; posterOnly: boolean }) {
  return (
    <div aria-hidden={!active} className={`transition-opacity duration-500 ${active ? "relative opacity-100" : "pointer-events-none absolute inset-0 opacity-0"}`}>
      <PromoLink href={p.link_url} tabbable={posterOnly && active} className="block overflow-hidden bg-mist">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image_url} alt={p.title} className="max-h-[520px] w-full object-contain" />
      </PromoLink>
      {!posterOnly && (
        <div className="p-5">
          <p className="font-display text-2xl font-bold leading-tight">{p.title}</p>
          {p.subtitle && <p className="mt-1 text-sm text-slate">{p.subtitle}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {p.ends_on ? <p className="text-xs font-medium text-slate">Valid until {formatEnd(p.ends_on)}</p> : <span />}
            {p.link_url && (
              <PromoLink href={p.link_url} tabbable={active} className="btn-quote px-5 py-2.5 text-sm">
                {p.button_label || "View promotion"}
              </PromoLink>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Promotion card for the home page hero. Rotates every 6 s when there is more than one. */
/** posterOnly: show just the clickable poster (used for the built-in company ads). */
export default function PromoSlider({ promos, posterOnly = false }: { promos: Promotion[]; posterOnly?: boolean }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const many = promos.length > 1;

  useEffect(() => {
    if (!many || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % promos.length), 6000);
    return () => clearInterval(t);
  }, [many, paused, promos.length]);

  return (
    <div
      className="slip-in relative mx-auto w-full max-w-md overflow-hidden rounded-md bg-white text-ink shadow-[0_24px_50px_-12px_rgba(0,0,0,.55)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Current promotions"
    >
      {!posterOnly && <span className="absolute left-3 top-3 z-10 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink shadow">
        Promotion
      </span>}
      <div className="relative">
        {promos.map((p, n) => <Slide key={p.id} p={p} active={n === i} posterOnly={posterOnly} />)}
      </div>
      {many && (
        <div className="flex items-center justify-center gap-2 pb-4">
          {promos.map((p, n) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setI(n)}
              aria-label={`Show promotion ${n + 1}: ${p.title}`}
              aria-current={n === i}
              className={`h-2.5 rounded-full transition-all ${n === i ? "w-6 bg-brand" : "w-2.5 bg-line hover:bg-slate"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
