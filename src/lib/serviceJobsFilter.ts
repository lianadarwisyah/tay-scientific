import { JOB_STATUSES } from "@/lib/serviceJobs";

/** Filters shared by the Service portal list and its Excel export. */
export type JobFilters = { status: string; q: string; year: number | null; month: number | null; by: "in" | "out" };

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function readFilters(sp: Record<string, string | undefined>): JobFilters {
  const year = Number(sp.year);
  const month = Number(sp.month);
  return {
    status: (JOB_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status! : "",
    q: (sp.q ?? "").trim().slice(0, 80),
    year: year >= 2000 && year <= 2100 ? year : null,
    month: month >= 1 && month <= 12 ? month : null,
    by: sp.by === "out" ? "out" : "in",
  };
}

/** The date column the period is about: "in" = date received, "out" = date completed / returned. */
export const periodColumn = (f: JobFilters) => (f.by === "out" ? "date_out" : "date_in");

/** [from, to) dates for the chosen year / month, or null for all time. */
export function periodRange(f: JobFilters): [string, string] | null {
  if (!f.year) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (!f.month) return [`${f.year}-01-01`, `${f.year + 1}-01-01`];
  const next = f.month === 12 ? `${f.year + 1}-01-01` : `${f.year}-${pad(f.month + 1)}-01`;
  return [`${f.year}-${pad(f.month)}-01`, next];
}

/** "October 2026", "2026" or "All time" */
export function periodLabel(f: JobFilters): string {
  if (!f.year) return "All time";
  return f.month ? `${MONTHS[f.month - 1]} ${f.year}` : String(f.year);
}

/** Apply search + period (+ status) to a Supabase query on service_jobs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFilters<Q extends { eq: any; gte: any; lt: any; or: any }>(query: Q, f: JobFilters, withStatus = true): Q {
  let q = query;
  if (withStatus && f.status) q = q.eq("status", f.status);
  const range = periodRange(f);
  if (range) q = q.gte(periodColumn(f), range[0]).lt(periodColumn(f), range[1]);
  if (f.q) {
    const term = `%${f.q.replace(/[%_,()]/g, " ")}%`;
    q = q.or(["sr_no", "company", "contact_person", "instrument", "brand", "model", "serial_number", "po_number", "invoice_no", "serviced_by"]
      .map((c) => `${c}.ilike.${term}`).join(","));
  }
  return q;
}

/** Query string for links that keep the current filters. */
export function filterHref(base: string, f: JobFilters, extra: Record<string, string | number | undefined> = {}): string {
  const u = new URLSearchParams();
  const all: Record<string, string | number | undefined | null> = { status: f.status, q: f.q, year: f.year, month: f.month, by: f.by === "out" ? "out" : undefined, ...extra };
  Object.entries(all).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "" && !(k === "page" && Number(v) === 1)) u.set(k, String(v)); });
  return `${base}${u.size ? `?${u}` : ""}`;
}
