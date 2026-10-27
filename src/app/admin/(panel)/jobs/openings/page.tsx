import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import JobRowActions from "../JobRowActions";
import type { JobRow } from "../JobForm";

export const dynamic = "force-dynamic";

export default async function JobOpenings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const supabase = (await createClient())!;
  const { data, error } = await supabase.from("jobs").select("*").order("sort_order").order("title");
  const rows = (data ?? []) as JobRow[];
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Job openings</h1>
          <p className="mt-2 max-w-2xl text-slate">Openings shown on the <Link href="/careers" className="text-brand underline">Careers</Link> page. Close a job to hide it without deleting it. Applications show on the Career jobs page.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/jobs" className="btn-line">← Applications</Link>
          {!error && <Link href="/admin/jobs/new" className="btn-main">+ Add job</Link>}
        </div>
      </div>
      {sp.saved && <p role="status" className="mt-6 rounded-md bg-green-50 p-3 text-sm font-medium text-green-800">Job saved.</p>}
      {error ? (
        <p role="alert" className="mt-6 rounded-md bg-red-50 p-4 text-red-800">Career jobs are not set up yet. Run <code>supabase/migration_jobs.sql</code> once in Supabase → SQL Editor. Until then the Careers page uses the jobs written in <code>src/lib/jobs.ts</code>.</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-slate">No jobs yet. The Careers page shows a &quot;send us your CV anyway&quot; message.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{j.title} {!j.is_open && <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-xs font-semibold">Closed</span>}</p>
                <p className="text-sm text-slate">{[j.department, j.location, j.type].filter(Boolean).join(" · ")}</p>
              </div>
              <JobRowActions id={j.id} title={j.title} open={j.is_open} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
