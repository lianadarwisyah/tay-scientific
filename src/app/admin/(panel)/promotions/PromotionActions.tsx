"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { refreshWebsite } from "@/lib/refreshWebsite";

/** Path of the file inside the "promotions" bucket, taken from its public URL (null for ready-made /ads/ banners). */
function storagePath(url: string) {
  const marker = "/storage/v1/object/public/promotions/";
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

type Props = { id: string; isActive: boolean; imageUrl: string; title: string; endsOn: string | null; order: string[] };

export default function PromotionActions({ id, isActive, imageUrl, title, endsOn, order }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editEnd, setEditEnd] = useState(false);
  const [end, setEnd] = useState(endsOn ?? "");
  const pos = order.indexOf(id);

  async function run(fn: () => Promise<{ error: unknown } | void>) {
    setBusy(true); setError("");
    const res = await fn();
    setBusy(false);
    if (res && res.error) setError("Could not save. Please try again."); else (refreshWebsite(), router.refresh());
  }

  const toggle = () => run(async () => await createClient().from("promotions").update({ is_active: !isActive }).eq("id", id));

  // Move up / down: renumber the whole list so the order is always clean (10, 20, 30, ...)
  const move = (dir: -1 | 1) => run(async () => {
    const next = [...order];
    const j = pos + dir;
    [next[pos], next[j]] = [next[j], next[pos]];
    const supabase = createClient();
    const results = await Promise.all(next.map((pid, k) => supabase.from("promotions").update({ sort_order: (k + 1) * 10 }).eq("id", pid)));
    return { error: results.find((r) => r.error)?.error ?? null };
  });

  const saveEnd = () => run(async () => {
    const r = await createClient().from("promotions").update({ ends_on: end || null }).eq("id", id);
    if (!r.error) setEditEnd(false);
    return r;
  });

  async function remove() {
    if (!confirm(`Delete "${title}" from the slider?`)) return;
    await run(async () => {
      const supabase = createClient();
      const r = await supabase.from("promotions").delete().eq("id", id);
      const path = storagePath(imageUrl);
      if (!r.error && path) await supabase.storage.from("promotions").remove([path]); // tidy up an uploaded image
      return r;
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => move(-1)} disabled={busy || pos <= 0} className="btn-line px-2.5 py-1.5 text-sm disabled:opacity-40" aria-label="Move up">↑</button>
        <button type="button" onClick={() => move(1)} disabled={busy || pos < 0 || pos >= order.length - 1} className="btn-line px-2.5 py-1.5 text-sm disabled:opacity-40" aria-label="Move down">↓</button>
        <button type="button" onClick={toggle} disabled={busy} className="btn-line px-3 py-1.5 text-sm">{isActive ? "Hide" : "Show"}</button>
        <button type="button" onClick={() => setEditEnd((v) => !v)} disabled={busy} className="btn-line px-3 py-1.5 text-sm">End date</button>
        <button type="button" onClick={remove} disabled={busy} className="btn border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">Delete</button>
        {error && <span role="alert" className="text-sm text-red-700">{error}</span>}
      </div>
      {editEnd && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`end-${id}`}>End date</label>
          <input id={`end-${id}`} type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="field w-auto py-1.5 text-sm" />
          <button type="button" onClick={saveEnd} disabled={busy} className="btn-main px-3 py-1.5 text-sm">Save</button>
          <button type="button" onClick={() => { setEnd(""); }} disabled={busy} className="text-sm text-slate hover:underline">No end date</button>
        </div>
      )}
    </div>
  );
}
