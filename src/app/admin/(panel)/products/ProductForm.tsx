"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { productImagePath, slugify } from "./productImages";

type Option = { id: string; name: string };
export type ProductInput = {
  id?: string; sku: string; name: string; slug: string; description: string | null;
  specs: Record<string, string> | [string, string][] | null; features: string[] | null;
  brand_id: string | null; category_id: string | null; image_url: string | null; is_active: boolean; is_featured: boolean;
};

const MAX_MB = 5;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

function toRows(specs: ProductInput["specs"]): [string, string][] {
  if (!specs) return [];
  return Array.isArray(specs) ? specs.map(([k, v]) => [String(k), String(v)]) : Object.entries(specs).map(([k, v]) => [k, String(v)]);
}

export default function ProductForm({ brands, categories, initial }: { brands: Option[]; categories: Option[]; initial?: ProductInput }) {
  const router = useRouter();
  const editing = !!initial?.id;
  const [name, setName] = useState(initial?.name ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [brandId, setBrandId] = useState(initial?.brand_id ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [features, setFeatures] = useState((initial?.features ?? []).join("\n"));
  const [specs, setSpecs] = useState<[string, string][]>(() => {
    const r = toRows(initial?.specs ?? null);
    return r.length ? r : [["", ""]];
  });
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Web address follows the name until someone edits it by hand
  useEffect(() => { if (!slugTouched) setSlug(slugify(name)); }, [name, slugTouched]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pickFile(f?: File | null) {
    setError("");
    if (preview) URL.revokeObjectURL(preview);
    if (!f) { setFile(null); setPreview(null); return; }
    if (!TYPES.includes(f.type)) { setFile(null); setPreview(null); return setError("Photo must be JPG, PNG or WebP."); }
    if (f.size > MAX_MB * 1024 * 1024) { setFile(null); setPreview(null); return setError(`Photo is larger than ${MAX_MB} MB.`); }
    setFile(f); setPreview(URL.createObjectURL(f));
  }

  function setSpec(i: number, col: 0 | 1, v: string) {
    setSpecs((rows) => rows.map((r, k) => (k === i ? (col === 0 ? [v, r[1]] : [r[0], v]) : r)) as [string, string][]);
  }
  /** Paste rows copied from Excel or a PDF table: "Label<TAB>Value" or "Label: Value", one per line */
  function pasteSpecs() {
    const text = prompt("Paste specification lines (one per line), e.g.\nMax. temperature: 550 °C\nor copied from Excel as Label<TAB>Value");
    if (!text) return;
    const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = l.includes("\t") ? l.split("\t") : l.split(/:\s+|\s{2,}/);
      return [String(m[0] ?? "").trim(), m.slice(1).join(" ").trim()] as [string, string];
    }).filter(([k, v]) => k && v);
    if (rows.length) setSpecs((cur) => [...cur.filter(([k, v]) => k || v), ...rows]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cleanSku = sku.trim(); const cleanName = name.trim(); const cleanSlug = slugify(slug);
    if (!cleanName || !cleanSku || !cleanSlug) return setError("Name, SKU and web address are required.");
    setBusy(true);
    const supabase = createClient();

    // 1) upload a new photo if one was chosen
    let finalImage: string | null = imageUrl.trim() || null;
    let uploadedPath: string | null = null;
    if (file) {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      uploadedPath = `${slugify(cleanSku) || "product"}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("product-images").upload(uploadedPath, file, { contentType: file.type, cacheControl: "31536000" });
      if (up.error) {
        setBusy(false);
        return setError(up.error.message.includes("not found") ? "Photo storage is not set up yet: run supabase/migration_admin_products.sql first." : "Photo upload failed: " + up.error.message);
      }
      finalImage = supabase.storage.from("product-images").getPublicUrl(uploadedPath).data.publicUrl;
    }

    // 2) save the product
    const row = {
      sku: cleanSku, name: cleanName, slug: cleanSlug,
      description: description.trim() || null,
      specs: specs.map(([k, v]) => [k.trim(), v.trim()]).filter(([k, v]) => k && v),
      features: features.split(/\r?\n/).map((f) => f.replace(/^[-•*]\s*/, "").trim()).filter(Boolean),
      brand_id: brandId || null, category_id: categoryId || null,
      image_url: finalImage, is_active: isActive, is_featured: isFeatured,
    };
    const res = editing
      ? await supabase.from("products").update(row).eq("id", initial!.id!)
      : await supabase.from("products").insert(row);

    if (res.error) {
      if (uploadedPath) await supabase.storage.from("product-images").remove([uploadedPath]);
      setBusy(false);
      const m = res.error.message;
      if (m.includes("products_sku_key")) return setError(`Another product already uses SKU "${cleanSku}".`);
      if (m.includes("products_slug_key")) return setError(`Another product already uses the web address "${cleanSlug}". Change it slightly, e.g. add the model code.`);
      return setError("Could not save: " + m);
    }
    // 3) remove the old uploaded photo if it was replaced
    const oldPath = productImagePath(initial?.image_url ?? null);
    if (uploadedPath && oldPath) await supabase.storage.from("product-images").remove([oldPath]);

    router.push(`/admin/products?saved=${isActive ? "1" : "hidden"}`);
    router.refresh();
  }

  const shownImage = preview || imageUrl;
  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <div><label className="label" htmlFor="p-name">Product name *</label>
          <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} className="field" placeholder="e.g. DLAB MS7-H550-Pro LCD Digital Hotplate Stirrer" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="p-sku">SKU / model code *</label>
            <input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} required maxLength={80} className="field" placeholder="e.g. DLAB-MS7-H550-Pro" /></div>
          <div><label className="label" htmlFor="p-slug">Web address *</label>
            <input id="p-slug" value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} required maxLength={120} className="field" />
            <p className="mt-1 truncate text-xs text-slate">/products/{slugify(slug) || "…"}</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="p-brand">Brand</label>
            <select id="p-brand" value={brandId} onChange={(e) => setBrandId(e.target.value)} className="field">
              <option value="">No brand</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select></div>
          <div><label className="label" htmlFor="p-cat">Category</label>
            <select id="p-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field">
              <option value="">No category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
        </div>
        <div><label className="label" htmlFor="p-desc">Description</label>
          <textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={4000} className="field" placeholder="What the product is and what it is used for." /></div>
        <div><label className="label" htmlFor="p-feat">Key features (one per line)</label>
          <textarea id="p-feat" value={features} onChange={(e) => setFeatures(e.target.value)} rows={5} className="field" placeholder={"LCD display with timer\nBrushless DC motor\nOver-temperature protection"} /></div>

        <fieldset>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="label">Specifications</legend>
            <button type="button" onClick={pasteSpecs} className="text-sm font-semibold text-brand hover:underline">Paste from Excel / PDF</button>
          </div>
          <div className="space-y-2">
            {specs.map(([k, v], i) => (
              <div key={i} className="flex gap-2">
                <label className="sr-only" htmlFor={`sk-${i}`}>Specification {i + 1} label</label>
                <input id={`sk-${i}`} value={k} onChange={(e) => setSpec(i, 0, e.target.value)} placeholder="Label, e.g. Max. temperature" className="field w-2/5" />
                <label className="sr-only" htmlFor={`sv-${i}`}>Specification {i + 1} value</label>
                <input id={`sv-${i}`} value={v} onChange={(e) => setSpec(i, 1, e.target.value)} placeholder="Value, e.g. 550 °C" className="field flex-1" />
                <button type="button" onClick={() => setSpecs((r) => r.filter((_, k2) => k2 !== i))} aria-label={`Remove specification ${i + 1}`} className="btn-line px-3">✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setSpecs((r) => [...r, ["", ""]])} className="btn-line mt-3 px-4 py-2 text-sm">+ Add row</button>
        </fieldset>
      </div>

      <div className="space-y-5">
        <div>
          <span className="label" id="photo-label">Photo</span>
          <label htmlFor="p-photo" className="flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-line bg-white p-3 text-center text-sm hover:border-brand">
            {shownImage
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={shownImage} alt="Product photo preview" className="max-h-full max-w-full object-contain" />
              : <span className="text-slate"><b className="block text-ink">Click to choose a photo</b>JPG, PNG or WebP, up to {MAX_MB} MB. Square, white background works best.</span>}
          </label>
          <input id="p-photo" type="file" accept={TYPES.join(",")} aria-labelledby="photo-label" onChange={(e) => pickFile(e.target.files?.[0])} className="sr-only" />
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {(file || imageUrl) && <button type="button" onClick={() => { pickFile(null); setImageUrl(""); }} className="text-red-700 hover:underline">Remove photo</button>}
            {file && <span className="text-slate">{file.name}</span>}
          </div>
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-slate">Or use an image link</summary>
            <label className="sr-only" htmlFor="p-imgurl">Image link</label>
            <input id="p-imgurl" value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); pickFile(null); }} placeholder="https://… or /products/brand/photo.jpg" className="field mt-2" />
          </details>
        </div>

        <div className="space-y-3 rounded-lg border border-line bg-white p-4">
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span><b>Visible on website</b><span className="block text-slate">Untick to hide it from customers without deleting.</span></span></label>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span><b>Featured</b><span className="block text-slate">Shown first in &quot;Our Products&quot; on the home page.</span></span></label>
        </div>

        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className="btn-main px-6 py-3 disabled:opacity-60">{busy ? "Saving…" : editing ? "Save changes" : "Add product"}</button>
          <button type="button" onClick={() => router.push("/admin/products")} className="btn-line px-6 py-3">Cancel</button>
        </div>
      </div>
    </form>
  );
}
