import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CAL_ROW_STYLE, CAL_STATE_STYLE, REMINDER_LABEL, calState, daysUntil, dmy, reminderDateFor, normaliseCal, type Calibration } from "@/lib/calibrations";
import { applyCalFilters, calFilterHref, calPeriodLabel, readCalFilters } from "@/lib/calibrationFilter";
import { MONTHS } from "@/lib/serviceJobsFilter";
import RemindNowButton from "./RemindNowButton";
import DeleteCalButton from "./DeleteCalButton";

export const dynamic = "force-dynamic";
const PER_PAGE = 40;
const BASE = "/admin/calibrations";
const STATES = [["", "All"], ["overdue", "Overdue"], ["due soon", `Due within ${REMINDER_LABEL}`], ["valid", "Valid"]] as const;

export default async function CalibrationLog({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const f = readCalFilters(sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = (await createClient())!;

  const list = applyCalFilters(
    supabase.from("calibrations").select("*", { count: "exact" }).order("due_date", { ascending: true }).range((page - 1) * PER_PAGE, page * PER_PAGE - 1), f);
  const stateCount = (s: string) => applyCalFilters(supabase.from("calibrations").select("id", { count: "exact", head: true }), { ...f, state: s as never });
  const [{ data, error, count }, first, ...counts] = await Promise.all([
    list,
    supabase.from("calibrations").select("calibration_date").order("calibration_date").limit(1),
    ...STATES.map(([s]) => stateCount(s)),
  ]);
  const rows = (data ?? []).map((r) => normaliseCal(r)) as Calibration[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));
  const thisYear = Number(new Date().toLocaleString("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric" }));
  const firstYear = Math.min(thisYear, Number(first.data?.[0]?.calibration_date?.slice(0, 4)) || thisYear);
  const years = Array.from({ length: thisYear + 2 - firstYear + 1 }, (_, i) => thisYear + 2 - i); // include next years for due dates

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Calibration log</h1>
          <p className="mt-2 max-w-2xl text-slate">Every calibration with its validity. The due date is worked out automatically, and customers are emailed {REMINDER_LABEL} before it is due.</p>
        </div>
        {!error && (
          <div className="flex flex-wrap items-start gap-3">
            <RemindNowButton />
            <Link href={`${BASE}/new`} className="btn-main">+ Add calibration</Link>
          </div>
        )}
      </div>
      {sp.saved && <p role="status" className="mt-6 rounded-md bg-green-50 p-3 text-sm font-medium text-green-800">Calibration {sp.saved !== "1" && <b>{sp.saved}</b>} saved.</p>}

      {error ? (
        <p role="alert" className="mt-6 rounded-md bg-red-50 p-4 text-red-800">The calibration log is not set up yet. Run <code>supabase/migration_calibrations.sql</code> once in Supabase → SQL Editor.</p>
      ) : (
        <>
          <form className="mt-6 grid gap-3 rounded-lg border border-line bg-white p-4 md:grid-cols-[1fr_auto_auto_auto_auto]" action={BASE}>
            {f.state && <input type="hidden" name="state" value={f.state} />}
            <div><label htmlFor="cl-q" className="label">Search</label>
              <input id="cl-q" name="q" defaultValue={f.q} className="field" placeholder="Reference no., instrument, brand, model, S/N, company, email, provider, cert no." /></div>
            <div><label htmlFor="cl-month" className="label">Month</label>
              <select id="cl-month" name="month" defaultValue={f.month ?? ""} className="field"><option value="">All months</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
            <div><label htmlFor="cl-year" className="label">Year</label>
              <select id="cl-year" name="year" defaultValue={f.year ?? ""} className="field"><option value="">All years</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
            <div><label htmlFor="cl-by" className="label">Count by</label>
              <select id="cl-by" name="by" defaultValue={f.by} className="field"><option value="cal">Calibration date</option><option value="due">Due date</option></select></div>
            <div className="flex items-end gap-2">
              <button className="btn-main px-5">Apply</button>
              {(f.q || f.year || f.month) && <Link href={BASE} className="btn-line px-4">Clear</Link>}
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-soft p-4">
            <p><b>{calPeriodLabel(f)}</b>{f.year ? ` (by ${f.by === "due" ? "due date" : "calibration date"})` : ""}: <b>{counts[0].count ?? 0}</b> calibration{(counts[0].count ?? 0) === 1 ? "" : "s"}
              {" "}· overdue {counts[1].count ?? 0} · due soon {counts[2].count ?? 0} · valid {counts[3].count ?? 0}</p>
            <a href={calFilterHref(`${BASE}/export`, f)} className="btn-line bg-white px-4 py-2 text-sm">Download Excel (.xlsx)</a>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {STATES.map(([s, label], i) => (
              <Link key={label} href={calFilterHref(BASE, { ...f, state: s })}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${s === f.state ? "bg-ink text-white" : "border border-line bg-white hover:border-brand"}`}>
                {label} ({counts[i].count ?? 0})
              </Link>
            ))}
          </div>

          <p className="mt-3 flex flex-wrap gap-4 text-xs text-slate">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-l-4 border-l-green-300 bg-green-50" /> Valid</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-l-4 border-l-orange-300 bg-orange-50" /> Due within {REMINDER_LABEL}</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-l-4 border-l-red-300 bg-red-50" /> Overdue</span>
          </p>

          {rows.length === 0 ? (
            <p className="mt-8 text-slate">{f.q || f.state || f.year ? "No calibrations match." : "No calibrations yet. Click \"Add calibration\" to record one."}</p>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-white">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b border-line bg-bench text-slate">
                  <tr>{["Reference no.", "Instrument", "Company", "Cal. date", "Validity", "Cal. due", "Provider", "Reminder", ""].map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-white">
                  {rows.map((r) => {
                    const st = calState(r.due_date);
                    const d = daysUntil(r.due_date);
                    return (
                      <tr key={r.id} className={`align-top ${CAL_ROW_STYLE[st]}`}>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold">{r.sticker_no}<span className="block font-normal text-slate">In: {dmy(r.date_in) || "-"}</span></td>
                        <td className="px-3 py-3">{r.instrument}<span className="block text-slate">{[r.brand, r.model, r.serial_number && `S/N ${r.serial_number}`].filter(Boolean).join(" · ")}</span></td>
                        <td className="px-3 py-3">{r.company}<span className="block text-slate">{[r.contact_person, r.contact_no].filter(Boolean).join(" · ")}</span><span className="block text-slate">{r.email}</span></td>
                        <td className="whitespace-nowrap px-3 py-3">{dmy(r.calibration_date)}</td>
                        <td className="whitespace-nowrap px-3 py-3">{r.validity_months} mo.</td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <b>{dmy(r.due_date)}</b>
                          <span className={`mt-1 block w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${CAL_STATE_STYLE[st]}`}>
                            {st === "overdue" ? `Overdue ${-(d ?? 0)}d` : st === "due soon" ? (d === 0 ? "Due today" : `Due in ${d}d`) : "Valid"}
                          </span>
                        </td>
                        <td className="px-3 py-3">{r.service_provider || "-"}</td>
                        <td className="px-3 py-3 text-xs">
                          {!r.reminders_enabled ? <span className="text-slate">Off</span>
                            : r.reminder_sent_at ? <span className="text-green-800">Sent {new Date(r.reminder_sent_at).toLocaleDateString("en-GB")}</span>
                            : !r.email ? <span className="text-red-700">No email</span> : <span className="text-slate">Scheduled<span className="block">{dmy(reminderDateFor(r.due_date))}</span></span>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link href={`${BASE}/${r.id}`} className="btn-line px-3 py-1.5">Edit</Link>
                            <DeleteCalButton id={r.id} sticker={r.sticker_no} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 && (
            <nav className="mt-6 flex items-center gap-3 text-sm" aria-label="Pages">
              {page > 1 && <Link href={calFilterHref(BASE, f, { page: page - 1 })} className="btn-line px-3 py-1.5">← Previous</Link>}
              <span>Page {page} of {pages}</span>
              {page < pages && <Link href={calFilterHref(BASE, f, { page: page + 1 })} className="btn-line px-3 py-1.5">Next →</Link>}
            </nav>
          )}
        </>
      )}
    </>
  );
}
