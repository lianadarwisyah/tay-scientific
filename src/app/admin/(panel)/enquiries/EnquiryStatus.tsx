"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STATUSES = ["new", "replied", "closed"] as const;

export default function EnquiryStatus({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    setBusy(true);
    const { error } = await createClient().from("enquiries").update({ status: next }).eq("id", id);
    setBusy(false);
    if (!error) { setValue(next); router.refresh(); }
  }

  return (
    <select value={value} disabled={busy} onChange={(e) => change(e.target.value)} className="field !w-auto capitalize" aria-label="Enquiry status">
      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
