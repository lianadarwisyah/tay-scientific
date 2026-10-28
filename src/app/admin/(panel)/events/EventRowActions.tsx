"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { refreshWebsite } from "@/lib/refreshWebsite";
import { eventStoragePath } from "./EventForm";

export default function EventRowActions({ id, title, published, images }: { id: string; title: string; published: boolean; images: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await createClient().from("events").update({ is_published: !published }).eq("id", id);
    setBusy(false); (refreshWebsite(), router.refresh());
  }
  async function remove() {
    if (!confirm(`Delete "${title}" and its photos? This cannot be undone.`)) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", id);
    const paths = images.map(eventStoragePath).filter((p): p is string => !!p);
    if (!error && paths.length) await supabase.storage.from("events").remove(paths);
    setBusy(false); (refreshWebsite(), router.refresh());
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/admin/events/${id}`} className="btn-line px-3 py-1.5 text-sm">Edit</Link>
      <button type="button" onClick={toggle} disabled={busy} className="btn-line px-3 py-1.5 text-sm">{published ? "Hide" : "Show"}</button>
      <button type="button" onClick={remove} disabled={busy} className="btn border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">Delete</button>
    </div>
  );
}
