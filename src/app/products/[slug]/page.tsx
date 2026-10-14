import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProductImage } from "@/components/ProductCard";
import AddToCartButton from "@/components/AddToCartButton";
import { whatsappLink } from "@/lib/company";
import type { Product } from "@/lib/types";

async function getProduct(slug: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("products")
    .select("*,brand:brands(name,slug),category:categories(name,slug)")
    .eq("slug", slug).eq("is_active", true).maybeSingle();
  return data as unknown as Product | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  return { title: p?.name ?? "Product", description: p?.description ?? undefined };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const specs: [string, string][] = Array.isArray(p.specs) ? p.specs : Object.entries(p.specs ?? {});
  const features = Array.isArray(p.features) ? p.features : [];

  return (
    <div className="container-x py-12">
      <nav className="text-sm text-slate" aria-label="Breadcrumb">
        <Link href="/products" className="hover:text-brand">Products</Link>
        {p.category && <> / <Link href={`/products?category=${p.category.slug}`} className="hover:text-brand">{p.category.name}</Link></>}
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-lg border border-line bg-mist">
          <ProductImage src={p.image_url} alt={p.name} />
        </div>
        <div>
          {p.brand && <Link href={`/brands/${p.brand.slug}`} className="text-sm font-semibold text-brand">{p.brand.name}</Link>}
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{p.name}</h1>
          <p className="mt-2 text-sm text-slate">SKU {p.sku}</p>
          {p.description && <p className="mt-6 max-w-prose text-lg leading-relaxed">{p.description}</p>}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <AddToCartButton product={p} withQty />
            <a className="btn-line" target="_blank" rel="noopener"
              href={whatsappLink(`Hi, I would like to ask about ${p.name} (SKU ${p.sku}).`)}>
              Ask on WhatsApp
            </a>
          </div>
          <p className="mt-3 text-sm text-slate">Prices are given by quotation. Add this to your quote cart to request one.</p>

          {features.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-lg font-semibold">Key features</h2>
              <ul className="mt-3 space-y-2">
                {features.map((f) => (
                  <li key={f} className="flex gap-3 leading-relaxed">
                    <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {specs.length > 0 && (
            <div className="mt-10 overflow-x-auto"><table className="w-full text-sm">
              <caption className="mb-2 text-left font-display text-lg font-semibold">Specifications</caption>
              <tbody>
                {specs.map(([k, v]) => (
                  <tr key={k} className="border-t border-line">
                    <th scope="row" className="w-1/3 py-3 pr-4 text-left font-medium text-slate">{k}</th>
                    <td className="py-3">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    </div>
  );
}
