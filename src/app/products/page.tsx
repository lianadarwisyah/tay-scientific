import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createPublicClient as createClient } from "@/lib/supabase/public";
import { activeCounts } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";
import PageHeader from "@/components/PageHeader";
import CategoryImage from "@/components/CategoryImage";
import Chip from "@/components/Chip";
import Pagination from "@/components/Pagination";
import { searchProducts, fetchAllRows } from "@/lib/search";
import type { Product, Brand } from "@/lib/types";

export const revalidate = 60; // cached for speed; Admin saves refresh it straight away

export const metadata: Metadata = { title: "Products" };
const PAGE_SIZE = 12;

type SP = { q?: string; category?: string; brand?: string; page?: string };
type CatRow = { id: string; name: string; slug: string; description: string | null };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[,()%*]/g, " ").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = createClient();

  let cats: CatRow[] = [], brands: Pick<Brand, "id" | "name" | "slug">[] = [];
  if (supabase) {
    const [c, b] = await Promise.all([
      supabase.from("categories").select("id,name,slug,description").order("sort_order"),
      supabase.from("brands").select("id,name,slug").order("name"),
    ]);
    cats = (c.data as CatRow[]) ?? [];
    brands = b.data ?? [];
  }

  const activeCat = cats.find((c) => c.slug === sp.category);
  const activeBrand = brands.find((b) => b.slug === sp.brand);
  if (supabase && ((sp.category && !activeCat) || (sp.brand && !activeBrand))) notFound();

  // ---------- Step 1: choose a category ----------
  if (!activeCat && !activeBrand && !q) {
    // Active products per category; categories with no products are hidden
    const counts = supabase ? (await activeCounts(supabase, { categories: cats.map((c) => c.id) })).byCategory : new Map<string, number>();
    const listedCats = cats.filter((c) => (counts.get(c.id) ?? 0) > 0);
    const tones = ["#EEF2F8", "#FDF3E1", "#EAF5EF", "#F6ECF1", "#EFEFF8", "#F3EFE8", "#E9F3F5", "#F4F0FA"];
    return (
      <div className="container-x py-12 md:py-16">
        <header className="text-center">
          <h1 className="text-5xl font-bold sm:text-6xl">Product Category</h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate">Choose a category to see the products we supply.</p>
        </header>

        <form action="/products" method="get" role="search" className="mx-auto mt-8 flex max-w-xl overflow-hidden rounded-md border border-line bg-white focus-within:border-ink/40">
          <label htmlFor="q" className="sr-only">Search all products</label>
          <input id="q" name="q" placeholder="Search products, e.g. uv vis, ph meter, DC-1006" className="min-w-0 flex-1 px-4 py-3 text-sm outline-none" />
          <button className="bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">Search</button>
        </form>

        {listedCats.length === 0 ? (
          <p className="mt-10 rounded-lg border border-dashed border-line bg-white p-8 text-center text-slate">No products yet. Products will appear here once they are added.</p>
        ) : (
          <ul className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {listedCats.map((c, i) => {
              const n = counts.get(c.id) ?? 0;
              return (
                <li key={c.id}>
                  <Link href={`/products?category=${c.slug}`} className="group block">
                    <span className="relative block aspect-square overflow-hidden rounded-2xl bg-mist">
                      <CategoryImage slug={c.slug} tone={tones[i % tones.length]} />
                      <span className="absolute bottom-0 right-0 bg-accent px-8 py-4 text-[15px] font-semibold text-ink transition-colors group-hover:bg-accent-dark">read more</span>
                    </span>
                    <span className="mt-4 block text-center font-display text-3xl font-semibold leading-tight">{c.name}</span>
                    <span className="mt-1 block text-center text-sm text-slate">{n} product{n === 1 ? "" : "s"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-12 text-center text-sm text-slate">
          Looking for something by brand? <Link href="/brands" className="font-semibold text-brand hover:underline">See our brands</Link>
        </p>
      </div>
    );
  }

  // ---------- Step 2: products in the chosen category / brand / search ----------
  let products: Product[] = [], total = 0, brandIdsInCat: string[] = [];
  if (supabase) {
    const select = "id,sku,name,slug,image_url,brand:brands(name,slug),category:categories(name,slug)";
    const base = (cols: string, opts?: { count: "exact" }) => {
      let qb = supabase.from("products").select(cols, opts).eq("is_active", true);
      if (activeCat) qb = qb.eq("category_id", activeCat.id);
      if (activeBrand) qb = qb.eq("brand_id", activeBrand.id);
      return qb;
    };

    const inCatReq = activeCat
      ? supabase.from("products").select("brand_id").eq("is_active", true)
          .eq("category_id", activeCat.id).limit(1000)
      : Promise.resolve({ data: [] as { brand_id: string | null }[] });

    if (q) {
      // Search: read the matching category/brand list, then match forgivingly ("uv vis" finds "UV-VIS"), best first
      const [all, inCat] = await Promise.all([
        fetchAllRows((from, to) => base(select).order("id").range(from, to)) as Promise<unknown[]>,
        inCatReq,
      ]);
      const found = searchProducts(all as Product[], q);
      total = found.length;
      products = found.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      brandIdsInCat = [...new Set((inCat.data ?? []).map((r) => r.brand_id).filter((x): x is string => !!x))];
    } else {
      const [res, inCat] = await Promise.all([
        base(select, { count: "exact" }).order("name").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
        inCatReq,
      ]);
      products = (res.data as unknown as Product[]) ?? [];
      total = res.count ?? 0;
      brandIdsInCat = [...new Set((inCat.data ?? []).map((r) => r.brand_id).filter((x): x is string => !!x))];
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (p: number, over: Partial<SP> = {}) => {
    const m = { q, category: sp.category, brand: sp.brand, ...over };
    const u = new URLSearchParams();
    if (m.q) u.set("q", m.q);
    if (m.category) u.set("category", m.category);
    if (m.brand) u.set("brand", m.brand);
    if (p > 1) u.set("page", String(p));
    const qs = u.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  };

  const title = activeCat?.name ?? activeBrand?.name ?? `Results for “${q}”`;
  const crumbs = [{ label: "Products", href: "/products" }, ...(activeCat ? [{ label: activeCat.name }] : [{ label: activeBrand ? activeBrand.name : "Search" }])];
  const catBrands = brands.filter((b) => brandIdsInCat.includes(b.id));

  return (
    <>
      <PageHeader cover="/bg/lab-hero.jpg" slot="products" title={title} crumbs={crumbs} intro={activeCat?.description ?? undefined} />
      <div className="container-x py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/products" className="text-sm font-semibold text-brand hover:underline">All categories</Link>
          <form action="/products" method="get" role="search" className="flex w-full max-w-sm overflow-hidden rounded-md border border-line bg-white focus-within:border-ink/40 sm:w-auto">
            {sp.category && <input type="hidden" name="category" value={sp.category} />}
            {sp.brand && <input type="hidden" name="brand" value={sp.brand} />}
            <label htmlFor="q" className="sr-only">Search</label>
            <input id="q" name="q" defaultValue={q} placeholder="Search products or SKU" className="min-w-0 flex-1 px-4 py-2.5 text-sm outline-none" />
            <button className="bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/85">Search</button>
          </form>
        </div>

        {activeCat && catBrands.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by brand">
            <Chip href={hrefFor(1, { brand: undefined })} active={!activeBrand}>All brands</Chip>
            {catBrands.map((b) => <Chip key={b.id} href={hrefFor(1, { brand: b.slug })} active={activeBrand?.slug === b.slug}>{b.name}</Chip>)}
          </div>
        )}

        <p className="mt-6 text-sm text-slate">{total} product{total === 1 ? "" : "s"} found</p>

        {products.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-line bg-white p-10 text-center">
            <p className="font-display text-2xl font-semibold">No products match</p>
            <p className="mt-2 text-slate">Try a different keyword, or tell us what you need and we will source it.</p>
            <Link href="/enquiry" className="btn-quote mt-5">Send an enquiry</Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        <Pagination page={page} pages={pages} hrefFor={(p) => hrefFor(p)} />
      </div>
    </>
  );
}
