"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteCalButton({ id, sticker }: { id: string; sticker: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm(`Delete calibration ${sticker}? This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await createClient().from("calibrations").delete().eq("id", id);
    setBusy(false);
    if (error) alert("Could not delete: " + error.message); else router.refresh();
  }
  return <button type="button" onClick={remove} disabled={busy} className="rounded-md border border-red-300 px-3 py-1.5 text-red-700 hover:bg-red-50">Delete</button>;
}
