import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { JOB_STATUSES, STATUS_STYLE, longDate, normaliseJob, type ServiceJob } from "@/lib/serviceJobs";
import { MONTHS, applyFilters, filterHref, periodLabel, readFilters } from "@/lib/serviceJobsFilter";
import DeleteJobButton from "./DeleteJobButton";

export const dynamic = "force-dynamic";
const PER_PAGE = 30;
const BASE = "/admin/service-portal";

export default async function ServicePortal({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const f = readFilters(sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = (await createClient())!;

  const list = applyFilters(
    supabase.from("service_jobs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PER_PAGE, page * PER_PAGE - 1),
    f,
  );
  // Counts per status for the chosen period and search (tabs and summary)
  const statusCount = (s: string) => applyFilters(supabase.from("service_jobs").select("id", { count: "exact", head: true }), f, false).eq("status", s);
  const [{ data, error, count }, firstJob, ...counts] = await Promise.all([
    list,
    supabase.from("service_jobs").select("date_in").not("date_in", "is", null).order("date_in", { ascending: true }).limit(1),
    ...JOB_STATUSES.map(statusCount),
  ]);
  const rows = (data ?? []).map((r) => normaliseJob(r)) as ServiceJob[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));
  const statusTotals = JOB_STATUSES.map((s, i) => ({ s, n: counts[i].count ?? 0 }));
  const periodTotal = statusTotals.reduce((a, b) => a + b.n, 0);

  // Year choices: from the first job's year (or this year) to this year
  const thisYear = Number(new Date().toLocaleString("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric" }));
  const firstYear = Math.min(thisYear, Number(firstJob.data?.[0]?.date_in?.slice(0, 4)) || thisYear);
  const years = Array.from({ length: thisYear - firstYear + 1 }, (_, i) => thisYear - i);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Service portal</h1>
          <p className="mt-2 max-w-2xl text-slate">Instruments received for service, in progress and completed. Completed jobs have a service report you can print or save as PDF.</p>
        </div>
        {!error && <Link href={`${BASE}/new`} className="btn-main">+ Add service</Link>}
      </div>
      {sp.saved && <p role="status" className="mt-6 rounded-md bg-green-50 p-3 text-sm font-medium text-green-800">Service record {sp.saved !== "1" && <b>{sp.saved}</b>} saved. It shows on the dashboard until it is completed.
        {sp.email === "sent" && " The customer has been emailed."}</p>}
      {sp.email === "failed" && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">The record was saved, but the customer email could not be sent. Check the email settings, then open the record and save again with &quot;Email the customer&quot; ticked.</p>}

      {error ? (
        <p role="alert" className="mt-6 rounded-md bg-red-50 p-4 text-red-800">The service portal is not set up yet. Run <code>supabase/migration_service_portal.sql</code> once in Supabase → SQL Editor.</p>
      ) : (
        <>
          {/* Search, period and Excel export */}
          <form className="mt-6 grid gap-3 rounded-lg border border-line bg-white p-4 md:grid-cols-[1fr_auto_auto_auto_auto]" action={BASE}>
            {f.status && <input type="hidden" name="status" value={f.status} />}
            <div>
              <label htmlFor="sp-q" className="label">Search</label>
              <input id="sp-q" name="q" defaultValue={f.q} className="field" placeholder="SR no., company, instrument, brand, model, S/N, PO, technician" />
            </div>
            <div>
              <label htmlFor="sp-month" className="label">Month</label>
              <select id="sp-month" name="month" defaultValue={f.month ?? ""} className="field">
                <option value="">All months</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sp-year" className="label">Year</label>
              <select id="sp-year" name="year" defaultValue={f.year ?? ""} className="field">
                <option value="">All years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sp-by" className="label">Count by</label>
              <select id="sp-by" name="by" defaultValue={f.by} className="field">
                <option value="in">Date in (received)</option>
                <option value="out">Date out (completed)</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button className="btn-main px-5">Apply</button>
              {(f.q || f.year || f.month) && <Link href={BASE} className="btn-line px-4">Clear</Link>}
            </div>
          </form>
          {f.month && !f.year && <p className="mt-2 text-sm text-red-700">Choose a year as well to filter by month.</p>}

          {/* Summary for the period */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-soft p-4">
            <p>
              <b>{periodLabel(f)}</b>{f.year ? ` (by ${f.by === "out" ? "date out" : "date in"})` : ""}:{" "}
              <b>{periodTotal}</b> service {periodTotal === 1 ? "job" : "jobs"}
              {statusTotals.map(({ s, n }) => <span key={s} className="capitalize"> · {s} {n}</span>)}
            </p>
            <a href={filterHref(`${BASE}/export`, f)} className="btn-line bg-white px-4 py-2 text-sm">Download Excel (.xlsx)</a>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[["", "All"], ...JOB_STATUSES.map((s) => [s, s])].map(([s, label], i) => (
              <Link key={label} href={filterHref(BASE, { ...f, status: s })}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${s === f.status ? "bg-ink text-white" : "border border-line bg-white hover:border-brand"}`}>
                {label} ({i === 0 ? periodTotal : statusTotals[i - 1].n})
              </Link>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="mt-8 text-slate">{f.q || f.status || f.year ? "No service records match." : "No service records yet. Click \"Add service\" when an instrument comes in."}</p>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-white">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-line bg-bench text-slate">
                  <tr>{["SR No.", "Date in", "Date out", "Company", "Instrument", "Service", "Status", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold">{r.sr_no}</td>
                      <td className="whitespace-nowrap px-4 py-3">{longDate(r.date_in) || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3">{longDate(r.date_out) || "-"}</td>
                      <td className="px-4 py-3">{r.company}<span className="block text-slate">{r.contact_person}</span></td>
                      <td className="px-4 py-3">{r.instrument}<span className="block text-slate">{r.brand} · {r.model} · S/N {r.serial_number}</span></td>
                      <td className="px-4 py-3">{r.service_type}<span className="block text-slate">{r.serviced_by}</span></td>
                      <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[r.status] ?? ""}`}>{r.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link href={`${BASE}/${r.id}`} className="btn-line px-3 py-1.5">Edit</Link>
                          {r.status === "completed" && <Link href={`${BASE}/${r.id}/report`} className="btn-main px-3 py-1.5">Report</Link>}
                          <DeleteJobButton id={r.id} srNo={r.sr_no} photos={r.work_items.flatMap((w) => w.photos)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 && (
            <nav className="mt-6 flex items-center gap-3 text-sm" aria-label="Pages">
              {page > 1 && <Link href={filterHref(BASE, f, { page: page - 1 })} className="btn-line px-3 py-1.5">← Previous</Link>}
              <span>Page {page} of {pages}</span>
              {page < pages && <Link href={filterHref(BASE, f, { page: page + 1 })} className="btn-line px-3 py-1.5">Next →</Link>}
            </nav>
          )}
        </>
      )}
    </>
  );
}
