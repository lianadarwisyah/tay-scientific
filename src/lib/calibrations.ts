/** Calibration log (Admin → Services → Calibration log): shared types and helpers. */
import { todayMY } from "@/lib/types";

export type Calibration = {
  id: string; sticker_no: string; date_in: string | null; instrument: string; brand: string | null; model: string | null;
  serial_number: string | null; company: string; contact_person: string | null; contact_no: string | null; email: string | null;
  calibration_date: string; validity_months: number; due_date: string | null; service_provider: string | null;
  cert_no: string | null; price: number | null; remarks: string | null; reminders_enabled: boolean;
  reminder_sent_at: string | null; reminder_log: { at: string; to: string; ok: boolean }[];
  service_job_id: string | null; created_by: string | null; created_at: string; updated_at: string;
};

/** The reminder email goes out this many calendar months before the due date (due 26/11 → reminder on 26/10). */
export const REMINDER_MONTHS = 1;
export const REMINDER_LABEL = "1 month";
export const VALIDITY_CHOICES = [3, 6, 12, 24, 36];
export const EXTERNAL_SUGGESTIONS = ["Trescal"];

/** Service provider is saved as "In-House", "In-House (TAN YH)" or the external company name. */
export function parseProvider(v: string | null | undefined): { type: "in-house" | "external"; name: string } {
  const s = (v ?? "").trim();
  const m = s.match(/^in-house\s*(?:\((.*)\))?$/i);
  if (!s || m) return { type: "in-house", name: m?.[1]?.trim() ?? "" };
  return { type: "external", name: s };
}
export const formatProvider = (type: "in-house" | "external", name: string) =>
  type === "in-house" ? (name.trim() ? `In-House (${name.trim()})` : "In-House") : name.trim();

/** Due date = calibration date + validity months (same rule as the database). Also works with negative months. */
export function dueDateFor(calDate: string, months: number): string {
  if (!calDate || !months) return "";
  const [y, m, d] = calDate.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Date the reminder is emailed: one month before the due date. */
export const reminderDateFor = (due: string | null) => (due ? dueDateFor(due, -REMINDER_MONTHS) : "");
/** Anything due on or before this date is "due soon" and gets its reminder now. */
export const reminderWindowEnd = () => dueDateFor(todayMY(), REMINDER_MONTHS);

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const a = new Date(`${todayMY()}T00:00:00Z`).getTime();
  const b = new Date(`${date}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

export type CalState = "overdue" | "due soon" | "valid";
export function calState(due: string | null): CalState {
  const d = daysUntil(due);
  if (d === null) return "valid";
  if (d < 0) return "overdue";
  if (due! <= reminderWindowEnd()) return "due soon";
  return "valid";
}
export const CAL_STATE_STYLE: Record<CalState, string> = {
  overdue: "bg-red-100 text-red-800", "due soon": "bg-orange-100 text-orange-800", valid: "bg-green-100 text-green-800",
};
/** Soft (pastel) row colours in the Calibration log list: easy on the eyes */
export const CAL_ROW_STYLE: Record<CalState, string> = {
  overdue: "bg-red-50 hover:bg-red-100/70 border-l-4 border-l-red-300",
  "due soon": "bg-orange-50 hover:bg-orange-100/70 border-l-4 border-l-orange-300",
  valid: "bg-green-50 hover:bg-green-100/70 border-l-4 border-l-green-300",
};
/** Same pastel colours for the Excel download (ARGB) */
export const CAL_EXCEL_FILL: Record<CalState, string> = { overdue: "FFFDE2E2", "due soon": "FFFFEDD5", valid: "FFDCFCE7" };

/** "6/11/2023" like the old Excel log */
export const dmy = (d: string | null | undefined) => (d ? `${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}/${d.slice(0, 4)}` : "");

export function normaliseCal(raw: Record<string, unknown>): Calibration {
  const c = raw as unknown as Calibration;
  return { ...c, reminder_log: Array.isArray(c.reminder_log) ? c.reminder_log : [], price: c.price === null || c.price === undefined ? null : Number(c.price) };
}

/** Fields the Calibration form edits. */
export type CalibrationDraft = Omit<Calibration, "id" | "due_date" | "reminder_sent_at" | "reminder_log" | "created_by" | "created_at" | "updated_at" | "price">;

export const blankCalibration = (): CalibrationDraft => ({
  sticker_no: "", date_in: todayMY(), instrument: "", brand: "", model: "", serial_number: "", company: "", contact_person: "",
  contact_no: "", email: "", calibration_date: todayMY(), validity_months: 12, service_provider: "In-House", cert_no: "",
  remarks: "", reminders_enabled: true, service_job_id: null,
});

