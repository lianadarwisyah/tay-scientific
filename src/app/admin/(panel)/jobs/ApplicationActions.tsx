"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APPLICATION_STATUSES } from "@/lib/applications";

/** Status, staff notes and delete for one job application. */
export default function ApplicationActions({ id, name, status, notes, cvPath }: { id: string; name: string; status: string; notes: string | null; cvPath: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [note, setNote] = useState(notes ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function update(patch: Record<string, unknown>, ok: string) {
    setBusy(true); setMsg("");
    const { error } = await createClient().from("job_applications").update(patch).eq("id", id);
    setBusy(false);
    setMsg(error ? "Could not save. Please try again." : ok);
    if (!error) router.refresh();
    return !error;
  }
  async function remove() {
    if (!confirm(`Delete the application from ${name} and the CV file? This cannot be undone.`)) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("job_applications").delete().eq("id", id);
    if (!error && cvPath) await supabase.storage.from("cvs").remove([cvPath]);
    setBusy(false);
    if (error) setMsg("Could not delete. Please try again."); else router.refresh();
  }

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold" htmlFor={`as-${id}`}>Status</label>
        <select id={`as-${id}`} value={value} disabled={busy} className="field !w-auto capitalize"
          onChange={async (e) => { const next = e.target.value; if (await update({ status: next }, "Status saved.")) setValue(next); }}>
          {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="button" onClick={remove} disabled={busy} className="ml-auto rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">Delete</button>
      </div>
      <div>
        <label className="label" htmlFor={`an-${id}`}>Notes (only staff see this)</label>
        <textarea id={`an-${id}`} rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className="field" placeholder="e.g. Called on 20 Oct, interview 25 Oct 10am" />
        <div className="mt-2 flex items-center gap-3">
          <button type="button" disabled={busy || note === (notes ?? "")} onClick={() => update({ staff_notes: note.trim() || null }, "Notes saved.")} className="btn-line px-3 py-1.5 text-sm disabled:opacity-40">Save notes</button>
          {msg && <span role="status" className="text-sm text-slate">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
