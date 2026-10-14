import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProductRowActions from "./ProductRowActions";
import { searchProducts, fetchAllRows } from "@/lib/search";

const PER_PAGE = 30;
type Row = {
  id: string; sku: string; name: string; slug: string; image_url: string | null; is_active: boolean; is_featured: boolean;
  brand: { name: string } | null; category: { name: string } | null;
};

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; brand?: string; show?: string; page?: string; saved?: string }> }) {
  const sp = await searchParams;
  const supabase = (await createClient())!;
  const q = (sp.q ?? "").replace(/[%,()]/g, " ").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const show = sp.show ?? "all";

  const { data: brands } = await supabase.from("brands").select("id,name,slug").order("name");
  const brand = brands?.find((b) => b.slug === sp.brand);
  const select = "id,sku,name,slug,image_url,is_active,is_featured,brand:brands(name),category:categories(name)";
  const filtered = (opts?: { count: "exact" }) => {
    let qb = supabase.from("products").select(select, opts);
    if (brand) qb = qb.eq("brand_id", brand.id);
    if (show === "visible") qb = qb.eq("is_active", true);
    if (show === "hidden") qb = qb.eq("is_active", false);
    return qb;
  };
  let rows: Row[] = [], count = 0, error: { message: string } | null = null;
  if (q) {
    // Forgiving search: "uv vis" finds "UV-VIS", "dc1006" finds "DC-1006" (see src/lib/search.ts)
    const all = (await fetchAllRows((from, to) => filtered().order("id").range(from, to))) as unknown as Row[];
    const found = searchProducts(all, q);
    count = found.length;
    rows = found.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  } else {
    const res = await filtered({ count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    rows = (res.data ?? []) as unknown as Row[];
    count = res.count ?? 0;
    error = res.error;
  }
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));
  const link = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (brand) u.set("brand", brand.slug);
    if (show !== "all") u.set("show", show);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Products</h1>
          <p className="mt-1 text-slate">{count ?? 0} products{q || brand || show !== "all" ? " match your filters" : " in total"}</p>
        </div>
        <Link href="/admin/products/new" className="btn-main px-5 py-3">+ Add product</Link>
      </div>

      {sp.saved && <p role="status" className="mt-6 rounded-md bg-green-50 p-3 text-sm font-medium text-green-800">Product saved. It is now on the website{sp.saved === "hidden" ? " (hidden from customers)" : ""}.</p>}
      {error && <p role="alert" className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-800">Could not load products: {error.message}</p>}

      <form className="mt-6 flex flex-wrap gap-3" role="search">
        <label htmlFor="q" className="sr-only">Search by name or SKU</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search by name or SKU" className="field min-w-0 flex-1 sm:max-w-sm" />
        <label htmlFor="brand" className="sr-only">Brand</label>
        <select id="brand" name="brand" defaultValue={brand?.slug ?? ""} className="field w-auto">
          <option value="">All brands</option>
          {brands?.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
        </select>
        <label htmlFor="show" className="sr-only">Visibility</label>
        <select id="show" name="show" defaultValue={show} className="field w-auto">
          <option value="all">Visible and hidden</option>
          <option value="visible">Visible only</option>
          <option value="hidden">Hidden only</option>
        </select>
        <button className="btn-line px-5">Filter</button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-mist text-left text-slate">
            <tr><th className="p-3">Product</th><th className="p-3">Brand</th><th className="p-3">Category</th><th className="p-3">Status</th><th className="p-3"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-line align-middle">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-mist">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-contain" /> : <span className="text-xs text-slate">No photo</span>}
                    </span>
                    <span className="min-w-0">
                      <Link href={`/admin/products/${p.id}`} className="font-semibold hover:text-brand">{p.name}</Link>
                      <span className="block text-xs text-slate">SKU {p.sku}{p.is_featured ? " · Featured" : ""}</span>
                    </span>
                  </div>
                </td>
                <td className="p-3">{p.brand?.name ?? "-"}</td>
                <td className="p-3">{p.category?.name ?? "-"}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.is_active ? "bg-green-100 text-green-800" : "bg-mist text-slate"}`}>{p.is_active ? "Visible" : "Hidden"}</span>
                </td>
                <td className="p-3"><ProductRowActions id={p.id} slug={p.slug} name={p.name} isActive={p.is_active} imageUrl={p.image_url} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate">No products found.</td></tr>}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="Pages">
          {page > 1 ? <Link href={link(page - 1)} className="btn-line px-4 py-2">Previous</Link> : <span />}
          <span className="text-slate">Page {page} of {pages}</span>
          {page < pages ? <Link href={link(page + 1)} className="btn-line px-4 py-2">Next</Link> : <span />}
        </nav>
      )}
    </>
  );
}
