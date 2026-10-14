"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Small floating bar on the public website, shown ONLY to signed-in admins,
 * so staff can check their changes and jump straight back to the dashboard without signing in again.
 * Normal visitors never see it (no session = no database call).
 */
export default function AdminBar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    const supabase = createClient();
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return; // visitor: stop here
      const { data: ok } = await supabase.rpc("is_admin");
      if (alive) setIsAdmin(!!ok);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (!session) setIsAdmin(false); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  // On a product page, find that product so "Edit product" opens its edit form directly
  const productSlug = pathname.startsWith("/products/") ? decodeURIComponent(pathname.split("/")[2] ?? "") : null;
  useEffect(() => {
    setEditId(null);
    if (!isAdmin || !productSlug) return;
    let alive = true;
    createClient().from("products").select("id").eq("slug", productSlug).maybeSingle()
      .then(({ data }) => { if (alive && data) setEditId(data.id as string); });
    return () => { alive = false; };
  }, [isAdmin, productSlug]);

  if (!isAdmin || hidden || pathname.startsWith("/admin")) return null;

  return (
    <div className="no-print fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full bg-ink py-1.5 pl-4 pr-1.5 text-sm text-white shadow-lg" role="region" aria-label="Admin shortcuts">
      <span className="mr-1 hidden text-white/70 sm:inline">Admin</span>
      {editId && (
        <Link href={`/admin/products/${editId}`} className="rounded-full px-3 py-1.5 font-semibold hover:bg-white/15">
          Edit product
        </Link>
      )}
      <Link href="/admin" className="rounded-full bg-accent px-4 py-1.5 font-semibold text-ink hover:bg-accent-dark">← Back to dashboard</Link>
      <button type="button" onClick={() => setHidden(true)} aria-label="Hide admin bar" className="rounded-full px-2.5 py-1.5 text-white/70 hover:bg-white/15 hover:text-white">✕</button>
    </div>
  );
}
