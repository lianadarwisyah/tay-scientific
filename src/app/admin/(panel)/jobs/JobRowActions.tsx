"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JobRowActions({ id, title, open }: { id: string; title: string; open: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => PromiseLike<unknown>) => { setBusy(true); await fn(); setBusy(false); router.refresh(); };
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/admin/jobs/${id}`} className="btn-line px-3 py-1.5 text-sm">Edit</Link>
      <button type="button" disabled={busy} onClick={() => run(() => createClient().from("jobs").update({ is_open: !open }).eq("id", id))} className="btn-line px-3 py-1.5 text-sm">
        {open ? "Close job" : "Reopen"}
      </button>
      <button type="button" disabled={busy} className="btn border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
        onClick={() => { if (confirm(`Delete the job "${title}"?`)) run(() => createClient().from("jobs").delete().eq("id", id)); }}>Delete</button>
    </div>
  );
}
