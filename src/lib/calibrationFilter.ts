import { reminderWindowEnd } from "@/lib/calibrations";
import { MONTHS } from "@/lib/serviceJobsFilter";
import { todayMY } from "@/lib/types";

/** Filters shared by the Calibration log list and its Excel export. */
export type CalFilters = { q: string; state: "" | "overdue" | "due soon" | "valid"; year: number | null; month: number | null; by: "cal" | "due" };

export function readCalFilters(sp: Record<string, string | undefined>): CalFilters {
  const year = Number(sp.year), month = Number(sp.month);
  return {
    q: (sp.q ?? "").trim().slice(0, 80),
    state: sp.state === "overdue" || sp.state === "due soon" || sp.state === "valid" ? sp.state : "",
    year: year >= 2000 && year <= 2100 ? year : null,
    month: month >= 1 && month <= 12 ? month : null,
    by: sp.by === "due" ? "due" : "cal",
  };
}

export function calPeriodLabel(f: CalFilters): string {
  if (!f.year) return "All time";
  return f.month ? `${MONTHS[f.month - 1]} ${f.year}` : String(f.year);
}


/** Apply search, period and due state to a Supabase query on calibrations. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyCalFilters<Q extends { gte: any; lt: any; lte: any; gt: any; or: any }>(query: Q, f: CalFilters, withState = true): Q {
  let q = query;
  const col = f.by === "due" ? "due_date" : "calibration_date";
  if (f.year) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const from = f.month ? `${f.year}-${pad(f.month)}-01` : `${f.year}-01-01`;
    const to = f.month ? (f.month === 12 ? `${f.year + 1}-01-01` : `${f.year}-${pad(f.month + 1)}-01`) : `${f.year + 1}-01-01`;
    q = q.gte(col, from).lt(col, to);
  }
  if (withState && f.state) {
    const today = todayMY(), soon = reminderWindowEnd();
    if (f.state === "overdue") q = q.lt("due_date", today);
    if (f.state === "due soon") q = q.gte("due_date", today).lte("due_date", soon);
    if (f.state === "valid") q = q.gt("due_date", soon);
  }
  if (f.q) {
    const term = `%${f.q.replace(/[%_,()]/g, " ")}%`;
    q = q.or(["sticker_no", "instrument", "brand", "model", "serial_number", "company", "contact_person", "email", "service_provider", "cert_no"]
      .map((c) => `${c}.ilike.${term}`).join(","));
  }
  return q;
}

export function calFilterHref(base: string, f: CalFilters, extra: Record<string, string | number | undefined> = {}): string {
  const u = new URLSearchParams();
  const all: Record<string, string | number | null | undefined> = { q: f.q, state: f.state, year: f.year, month: f.month, by: f.by === "due" ? "due" : undefined, ...extra };
  Object.entries(all).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "" && !(k === "page" && Number(v) === 1)) u.set(k, String(v)); });
  return `${base}${u.size ? `?${u}` : ""}`;
}
