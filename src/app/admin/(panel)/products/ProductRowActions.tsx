"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { refreshWebsite } from "@/lib/refreshWebsite";
import { productImagePath } from "./productImages";

export default function ProductRowActions({ id, slug, name, isActive, imageUrl }: { id: string; slug: string; name: string; isActive: boolean; imageUrl: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true); setError("");
    const { error } = await createClient().from("products").update({ is_active: !isActive }).eq("id", id);
    setBusy(false);
    if (error) setError("Could not update"); else (refreshWebsite(), router.refresh());
  }
  async function remove() {
    if (!confirm(`Delete "${name}" permanently?\n\nTip: choose Hide instead if you may sell it again. Old quotations keep the product name either way.`)) return;
    setBusy(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { setBusy(false); return setError("Could not delete"); }
    const path = productImagePath(imageUrl);
    if (path) await supabase.storage.from("product-images").remove([path]);
    setBusy(false); (refreshWebsite(), router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 whitespace-nowrap">
      <Link href={`/admin/products/${id}`} className="btn-line px-3 py-1.5 text-xs">Edit</Link>
      <button type="button" onClick={toggle} disabled={busy} className="btn-line px-3 py-1.5 text-xs">{isActive ? "Hide" : "Show"}</button>
      <a href={`/products/${slug}`} target="_blank" rel="noopener" className="px-2 py-1.5 text-xs text-brand hover:underline">View</a>
      <button type="button" onClick={remove} disabled={busy} className="px-2 py-1.5 text-xs text-red-700 hover:underline">Delete</button>
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
