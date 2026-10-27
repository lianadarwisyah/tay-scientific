"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteJobButton({ id, srNo, photos }: { id: string; srNo: string; photos: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm(`Delete service record ${srNo} and its photos? This cannot be undone.`)) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("service_jobs").delete().eq("id", id);
    const m = "/storage/v1/object/public/service-photos/";
    const paths = photos.map((u) => (u.includes(m) ? decodeURIComponent(u.slice(u.indexOf(m) + m.length)) : null)).filter((p): p is string => !!p);
    if (!error && paths.length) await supabase.storage.from("service-photos").remove(paths);
    setBusy(false);
    if (error) alert("Could not delete: " + error.message); else router.refresh();
  }
  return <button type="button" onClick={remove} disabled={busy} className="rounded-md border border-red-300 px-3 py-1.5 text-red-700 hover:bg-red-50">Delete</button>;
}
