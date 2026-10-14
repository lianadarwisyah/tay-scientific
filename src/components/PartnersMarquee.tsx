"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { knownBrandLogo, EXTRA_PARTNERS, CATALOGUE_BRANDS } from "@/lib/brandLogos";

type Partner = { name: string; logo: string; website: string };
export type PartnerBrand = { name: string; slug: string; website_url: string | null; logo_url: string | null };

/**
 * "Official Distributor Partners" logo strip that scrolls on a loop.
 * Shows every brand in the database THAT HAS A LOGO, so every brand on the Brands page is here, plus
 * CATALOGUE_BRANDS and EXTRA_PARTNERS from src/lib/brandLogos.ts (shown even if not in the database yet).
 * Brands without a logo are left out; a brand appears automatically once its logo is added
 * (npm run logos:fetch, a file in public/brands/, or logo_url in Supabase). A logo that fails to load hides its card.
 * Clicking a card opens the brand's website (or its brand page on this site) in a new tab.
 */
function buildPartners(brands: PartnerBrand[]): Partner[] {
  const seen = new Set<string>();
  const list: Partner[] = [];
  for (const b of brands) {
    if (seen.has(b.slug)) continue;
    seen.add(b.slug);
    const logo = knownBrandLogo(b.slug, b.logo_url);
    if (!logo) continue; // no logo: leave it out of the strip
    list.push({ name: b.name, logo, website: b.website_url || `/brands/${b.slug}` });
  }
  // Brands we carry (Brands page), even if their SQL import has not been run yet
  for (const c of CATALOGUE_BRANDS) {
    if (seen.has(c.slug)) continue;
    seen.add(c.slug);
    const logo = knownBrandLogo(c.slug);
    if (logo) list.push({ name: c.name, logo, website: c.website || `/brands/${c.slug}` });
  }
  for (const e of EXTRA_PARTNERS) {
    if (seen.has(e.slug) || list.some((p) => p.name.toLowerCase() === e.name.toLowerCase())) continue;
    const logo = knownBrandLogo(e.slug);
    if (logo) list.push({ name: e.name, logo, website: e.website });
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

function Logo({ partner, decorative, onFail }: { partner: Partner; decorative: boolean; onFail: () => void }) {
  const ref = useRef<HTMLImageElement>(null);
  // An image that failed before React hydrated never fires onError, so check once after mount
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) onFail();
  }, [onFail]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={partner.logo}
      alt={decorative ? "" : partner.name}
      loading="lazy"
      onError={onFail}
      className="max-h-full max-w-full object-contain"
    />
  );
}

function Card({ partner, copy, hidden, onFail }: { partner: Partner; copy: boolean; hidden: boolean; onFail: () => void }) {
  if (hidden) return null; // logo could not be loaded: leave this brand out
  return (
    <li className="shrink-0" aria-hidden={copy || undefined}>
      <a
        href={partner.website}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={copy ? -1 : undefined}
        aria-label={copy ? undefined : `${partner.name} website (opens in a new tab)`}
        className="flex h-20 w-[206px] items-center justify-center rounded-md border border-line bg-white px-5 py-3 text-center shadow-[0_3px_8px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:border-brand"
      >
        <Logo partner={partner} decorative={copy} onFail={onFail} />
      </a>
    </li>
  );
}

export default function PartnersMarquee({ brands }: { brands: PartnerBrand[] }) {
  const all = buildPartners(brands);
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const markBroken = useCallback((name: string) => setBroken((b) => (b.has(name) ? b : new Set(b).add(name))), []);
  const partners = all.filter((p) => !broken.has(p.name));
  // Keep a steady scrolling speed however many brands there are
  const duration = `${Math.max(30, partners.length * 2.8)}s`;
  if (partners.length === 0) return null;
  return (
    <section aria-labelledby="partners-title" className="border-t border-line bg-white py-16">
      <div className="container-x text-center">
        <h2 id="partners-title" className="text-4xl font-bold sm:text-5xl">Official Distributor Partners</h2>
        <p className="mt-2 text-slate">Authorized distributor for leading global brands</p>
      </div>

      <div className="marquee-viewport mx-auto mt-8 max-w-[1660px] overflow-hidden px-5">
        <ul className="marquee-track flex w-max gap-[30px] py-3" style={{ animationDuration: duration }}>
          {partners.map((p) => <Card key={p.name} partner={p} copy={false} hidden={false} onFail={() => markBroken(p.name)} />)}
          {/* Second copy makes the loop seamless; hidden from screen readers */}
          {partners.map((p) => <Card key={`${p.name}-copy`} partner={p} copy hidden={false} onFail={() => markBroken(p.name)} />)}
        </ul>
      </div>
    </section>
  );
}
