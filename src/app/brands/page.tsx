import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Chip from "@/components/Chip";
import BrandLogo from "@/components/BrandLogo";
import { knownBrandLogo } from "@/lib/brandLogos";

export const metadata: Metadata = {
  title: "Brands",
  description: "Laboratory chemicals, equipment, life science products and consumables from the brands Tay Scientific supplies.",
};

type Cat = { id: string; name: string; slug: string };
type Brand = { id: string; name: string; slug: string; logo_url: string | null };
type Pair = { brand_id: string | null; category_id: string | null };

export default async function BrandsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  let cats: Cat[] = [], brands: Brand[] = [];
  const pairs: Pair[] = [];

  if (supabase) {
    const [c, b] = await Promise.all([
      supabase.from("categories").select("id,name,slug").order("sort_order"),
      supabase.from("brands").select("id,name,slug,logo_url").order("name"),
    ]);
    cats = c.data ?? [];
    brands = b.data ?? [];
    // Read brand/category pairs in pages of 1,000 (Supabase's per-request limit)
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase.from("products").select("brand_id,category_id").eq("is_active", true).order("id").range(from, from + 999);
      if (!data?.length) break;
      pairs.push(...data);
      if (data.length < 1000) break;
    }
  }

  // Only offer categories that actually have products
  const catsWithProducts = cats.filter((c) => pairs.some((p) => p.category_id === c.id));
  const activeCat = catsWithProducts.find((c) => c.slug === sp.category);

  const counts = new Map<string, number>();
  const brandCats = new Map<string, Set<string>>();
  for (const p of pairs) {
    if (!p.brand_id) continue;
    if (p.category_id) brandCats.set(p.brand_id, (brandCats.get(p.brand_id) ?? new Set()).add(p.category_id));
    if (activeCat && p.category_id !== activeCat.id) continue;
    counts.set(p.brand_id, (counts.get(p.brand_id) ?? 0) + 1);
  }
  // Brands without a logo, or with no active products (in the chosen category, or at all), are hidden
  const shown = brands.filter((b) => counts.has(b.id) && knownBrandLogo(b.slug, b.logo_url));
  const catNames = (brandId: string) => cats.filter((c) => brandCats.get(brandId)?.has(c.id)).map((c) => c.name);

  return (
    <div className="container-x py-12 md:py-16">
      <header className="text-center">
        <h1 className="text-5xl font-bold sm:text-6xl">Brands</h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-slate">
          We represent reputable brands in laboratory chemicals, equipment, life science and consumables. Choose a brand to see the products we supply.
        </p>
      </header>

      {catsWithProducts.length > 0 && (
        <div className="mt-10 flex flex-wrap justify-center gap-2" role="group" aria-label="Filter brands by category">
          <Chip variant="tab" href="/brands" active={!activeCat}>All brands</Chip>
          {catsWithProducts.map((c) => (
            <Chip variant="tab" key={c.id} href={`/brands?category=${c.slug}`} active={activeCat?.slug === c.slug}>{c.name}</Chip>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-line bg-white p-8 text-center text-slate">
          No brands yet. Run the seed SQL, or add brands in Supabase.
        </p>
      ) : (
        <ul className="mt-12 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {shown.map((b) => {
            const n = counts.get(b.id) ?? 0;
            const names = catNames(b.id);
            return (
              <li key={b.id}>
                <Link
                  href={activeCat ? `/brands/${b.slug}?category=${activeCat.slug}` : `/brands/${b.slug}`}
                  className="group relative block h-[220px] overflow-hidden rounded-sm bg-white transition-shadow hover:shadow-[0_14px_34px_-10px_rgba(0,0,0,.28)] focus-visible:shadow-[0_14px_34px_-10px_rgba(0,0,0,.28)]"
                >
                  {/* Logo */}
                  <span className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <BrandLogo name={b.name} slug={b.slug} logoUrl={b.logo_url} />
                  </span>
                  {/* Shown on hover / keyboard focus */}
                  <span className="absolute inset-0 flex flex-col opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="flex flex-[1.3] items-center justify-center bg-accent">
                      <span className="border border-ink/70 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-ink">View products</span>
                    </span>
                    <span className="flex flex-1 flex-col justify-center bg-white px-5">
                      <span className="font-display text-2xl font-semibold leading-none">{b.name}</span>
                      <span className="mt-2 text-xs uppercase tracking-wide text-slate">
                        {n > 0 ? `${n} product${n === 1 ? "" : "s"}` : "Ask us"}{names.length > 0 && ` · ${names.slice(0, 2).join(", ")}`}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
