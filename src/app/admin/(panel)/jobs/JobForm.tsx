"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { refreshWebsite } from "@/lib/refreshWebsite";

export type JobRow = {
  id: string; slug: string; title: string; department: string; location: string; type: string; teaser: string; summary: string;
  responsibilities: string[]; requirements: string[]; offer: string[]; sort_order: number; is_open: boolean;
};

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
const lines = (v: FormDataEntryValue | null) => String(v || "").split(/\r?\n/).map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);

/** Add or edit a job opening shown on the Careers page. */
export default function JobForm({ job }: { job?: JobRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title") || "").trim();
    if (!title) return setError("Please enter the job title.");
    setBusy(true); setError("");
    const row = {
      title,
      department: String(f.get("department") || "").trim(),
      location: String(f.get("location") || "").trim() || "Johor Bahru, Johor",
      type: String(f.get("type") || "Full-time"),
      teaser: String(f.get("teaser") || "").trim(),
      summary: String(f.get("summary") || "").trim(),
      responsibilities: lines(f.get("responsibilities")),
      requirements: lines(f.get("requirements")),
      offer: lines(f.get("offer")),
      sort_order: Number(f.get("sort_order") || 0),
      is_open: f.get("is_open") === "on",
    };
    const supabase = createClient();
    const { error } = job
      ? await supabase.from("jobs").update(row).eq("id", job.id)
      : await supabase.from("jobs").insert({ ...row, slug: `${slugify(title) || "job"}-${crypto.randomUUID().slice(0, 4)}` });
    if (error) { setBusy(false); return setError("Could not save: " + error.message); }
    router.push("/admin/jobs/openings?saved=1");
    (refreshWebsite(), router.refresh());
  }

  const area = (name: keyof JobRow, label: string, hint: string, rows = 5) => (
    <div>
      <label className="label" htmlFor={`job-${name}`}>{label}</label>
      <textarea id={`job-${name}`} name={name} rows={rows} className="field" placeholder={hint}
        defaultValue={job ? (job[name] as string[]).join("\n") : ""} />
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="job-title">Job title *</label><input id="job-title" name="title" required maxLength={160} defaultValue={job?.title} className="field" /></div>
        <div><label className="label" htmlFor="job-dept">Department</label><input id="job-dept" name="department" maxLength={120} defaultValue={job?.department} className="field" placeholder="e.g. Sales, Service, Finance & Accounts" /></div>
        <div><label className="label" htmlFor="job-loc">Location</label><input id="job-loc" name="location" maxLength={120} defaultValue={job?.location ?? "Johor Bahru, Johor"} className="field" /></div>
        <div><label className="label" htmlFor="job-type">Type</label>
          <select id="job-type" name="type" defaultValue={job?.type ?? "Full-time"} className="field">
            {["Full-time", "Part-time", "Contract", "Internship"].map((t) => <option key={t}>{t}</option>)}
          </select></div>
      </div>
      <div><label className="label" htmlFor="job-teaser">One-line teaser (on the job card)</label><input id="job-teaser" name="teaser" maxLength={200} defaultValue={job?.teaser} className="field" /></div>
      <div><label className="label" htmlFor="job-summary">What this job is</label><textarea id="job-summary" name="summary" rows={3} defaultValue={job?.summary} className="field" /></div>
      {area("responsibilities", "Responsibilities (one per line)", "Find and follow up new customers...\nPrepare quotations...")}
      {area("requirements", "Requirements (one per line)", "Diploma or degree in Science...\nGood communication skills...")}
      {area("offer", "What we offer (one per line)", "Basic salary with commission...\nEPF and SOCSO contributions...", 4)}
      <div className="flex flex-wrap items-end gap-6">
        <div><label className="label" htmlFor="job-order">Order (smaller shows first)</label><input id="job-order" name="sort_order" type="number" defaultValue={job?.sort_order ?? 100} className="field w-32" /></div>
        <label className="flex items-center gap-2 pb-3 font-semibold"><input type="checkbox" name="is_open" defaultChecked={job?.is_open ?? true} className="h-4 w-4" /> Open (show on the Careers page)</label>
      </div>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="btn-main px-8">{busy ? "Saving..." : job ? "Save changes" : "Add job"}</button>
        <button type="button" onClick={() => router.push("/admin/jobs/openings")} className="btn-line">Cancel</button>
      </div>
    </form>
  );
}
