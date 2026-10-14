import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import Chip from "@/components/Chip";
import Pagination from "@/components/Pagination";
import BrandLogo from "@/components/BrandLogo";
import AddToCartButton from "@/components/AddToCartButton";
import type { Product } from "@/lib/types";

const PAGE_SIZE = 20;

type BrandRow = { id: string; name: string; slug: string; logo_url: string | null; website_url: string | null; description: string | null };

async function getBrand(slug: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("brands").select("id,name,slug,logo_url,website_url,description").eq("slug", slug).maybeSingle();
  return data as BrandRow | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBrand(slug);
  return { title: b ? `${b.name} products` : "Brand", description: b ? `${b.name} products supplied by Tay Scientific Instruments.` : undefined };
}

const ExternalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

export default async function BrandPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ category?: string; page?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const brand = await getBrand(slug);
  if (!brand) notFound();
  const supabase = (await createClient())!;

  const [{ data: cats }, { data: brandCats }] = await Promise.all([
    supabase.from("categories").select("id,name,slug").order("sort_order"),
    supabase.from("products").select("category_id").eq("is_active", true).eq("brand_id", brand.id).limit(1000),
  ]);
  const catIds = new Set((brandCats ?? []).map((r) => r.category_id));
  const catChips = (cats ?? []).filter((c) => catIds.has(c.id));
  const activeCat = catChips.find((c) => c.slug === sp.category);

  let query = supabase
    .from("products")
    .select("id,sku,name,slug,image_url,brand:brands(name,slug),category:categories(name,slug)", { count: "exact" })
    .eq("is_active", true)
    .eq("brand_id", brand.id)
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (activeCat) query = query.eq("category_id", activeCat.id);
  const res = await query;
  const products = (res.data as unknown as Product[]) ?? [];
  const total = res.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hrefFor = (p: number, category = activeCat?.slug) => {
    const u = new URLSearchParams();
    if (category) u.set("category", category);
    if (p > 1) u.set("page", String(p));
    const qs = u.toString();
    return `/brands/${brand.slug}${qs ? `?${qs}` : ""}`;
  };

  let host = "";
  try { if (brand.website_url) host = new URL(brand.website_url).hostname.replace(/^www\./, ""); } catch { /* ignore bad URL */ }

  return (
    <>
      <PageHeader
        cover="/bg/lab-hero.jpg"
        slot="brands"
        title={brand.name}
        crumbs={[{ label: "Brands", href: "/brands" }, { label: brand.name }]}
        intro={brand.description ?? undefined}
      />
      <div className="container-x py-10">
        {/* The brand's link, all in one place */}
        <aside className="flex flex-col gap-5 rounded-lg border border-line bg-white p-6 sm:flex-row sm:items-center" aria-label={`More about ${brand.name}`}>
          <div className="flex h-20 w-full shrink-0 items-center justify-center rounded-md bg-bench px-4 sm:w-48">
            <BrandLogo name={brand.name} slug={brand.slug} logoUrl={brand.logo_url} size="sm" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">More about {brand.name}</h2>
            <p className="mt-1 max-w-xl text-slate">
              {brand.website_url
                ? `See the full range, technical details and documents on the official ${brand.name} website${host ? ` (${host})` : ""}.`
                : `Ask our team for details, datasheets and availability for ${brand.name} products.`}
            </p>
          </div>
          {brand.website_url ? (
            <a href={brand.website_url} target="_blank" rel="noopener noreferrer" className="btn-quote shrink-0 px-6 py-3">
              Visit official website <ExternalIcon />
            </a>
          ) : (
            <Link href="/enquiry" className="btn-quote shrink-0 px-6 py-3">Ask our team</Link>
          )}
        </aside>

        <div className="mt-12 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-4xl font-bold">Products we supply</h2>
          <Link href="/brands" className="text-sm font-semibold text-brand hover:underline">All brands</Link>
        </div>

        {catChips.length > 1 && (
          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            <Chip href={hrefFor(1, undefined)} active={!activeCat}>All</Chip>
            {catChips.map((c) => <Chip key={c.id} href={hrefFor(1, c.slug)} active={activeCat?.slug === c.slug}>{c.name}</Chip>)}
          </div>
        )}

        <p className="mt-5 text-sm text-slate">{total} product{total === 1 ? "" : "s"}</p>

        {products.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-line bg-white p-10 text-center">
            <p className="font-display text-2xl font-semibold">Product list coming soon</p>
            <p className="mt-2 text-slate">Tell us what you need from {brand.name} and we will quote it for you.</p>
            <Link href="/enquiry" className="btn-quote mt-5">Send an enquiry</Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-white">
            {products.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-md border border-line bg-white object-contain p-1" />
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${p.slug}`} className="font-semibold hover:underline">{p.name}</Link>
                  <p className="mt-0.5 text-xs text-slate">
                    SKU {p.sku}{p.category && <> · <Link href={hrefFor(1, p.category.slug)} className="hover:underline">{p.category.name}</Link></>}
                  </p>
                </div>
                <AddToCartButton product={p} />
              </li>
            ))}
          </ul>
        )}

        <Pagination page={page} pages={pages} hrefFor={(p) => hrefFor(p)} />

        <p className="mt-12 text-sm text-slate">
          Cannot find a {brand.name} product? <Link href="/enquiry" className="font-semibold text-brand hover:underline">Send us an enquiry</Link>
        </p>
      </div>
    </>
  );
}
