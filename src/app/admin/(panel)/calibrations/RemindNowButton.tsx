"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Runs the due-reminder check now (the same job also runs automatically every morning on the live site). */
export default function RemindNowButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function run() {
    if (!confirm("Email every customer whose calibration is due within 1 month (or overdue) and has not been reminded yet?")) return;
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/calibration-reminders", { method: "POST" });
      const r = await res.json();
      if (r.checked === 0 && !r.errors?.length) setMsg("Nothing to send: no calibration is due without a reminder.");
      else setMsg(`Sent ${r.emails ?? 0} email(s) covering ${r.records ?? 0} instrument(s).`
        + (r.skippedNoEmail ? ` ${r.skippedNoEmail} skipped (no customer email).` : "")
        + (r.errors?.length ? ` Problems: ${r.errors.join("; ")}` : ""));
      router.refresh();
    } catch { setMsg("Could not run the reminders. Please try again."); }
    setBusy(false);
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={busy} className="btn-line">{busy ? "Sending..." : "Send due reminders now"}</button>
      {msg && <p role="status" className="max-w-md text-right text-sm text-slate">{msg}</p>}
    </div>
  );
}
