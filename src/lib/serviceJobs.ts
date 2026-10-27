/** Service portal (Admin → Services → Service portal): shared types and choices. */
import { todayMY } from "@/lib/types";

export const JOB_STATUSES = ["goods received", "in progress", "completed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** "Service" dropdown. The first four are the job-type boxes on the printed report.
 *  Training is not here: it has no service report (customers can still request training on the Services page). */
export const JOB_SERVICE_TYPES = ["New unit installation", "Calibration", "Inspection", "Repair", "Preventive maintenance", "Diagnostic", "Others"] as const;
export const REPORT_JOB_TYPES = ["New unit installation", "Calibration", "Inspection", "Repair"] as const;

export const WARRANTY_OPTIONS = ["Under warranty", "Over warranty", "Maintenance contract", "Non-TSI sales"] as const;
export const WORK_RESULTS = ["PASS", "FAIL", "N/A"] as const;

export type WorkItem = { task: string; result: string; note: string; photos: string[] };
/** Extra instruments on the same report (the first one is in instrument / brand / model / serial_number). */
export type Equipment = { instrument: string; brand: string; model: string; serial_number: string };
export type TimeLog = { date: string; start: string; stop: string; working_hours: string; travel_hours: string; distance: string; overnight: string; ga_gw: string };

export type ServiceJob = {
  id: string; sr_no: string; status: JobStatus; date_in: string | null; date_out: string | null;
  instrument: string; brand: string; model: string; serial_number: string; description: string | null; condition: string | null;
  company: string; company_email: string; company_phone: string | null; contact_person: string | null; delivery_address: string | null;
  service_type: string; serviced_by: string | null; po_number: string | null; warranty: string; invoice_no: string | null; remarks: string | null;
  work_items: WorkItem[]; time_logs: TimeLog[]; extra_equipment: Equipment[];
  job_completed: "yes" | "no" | "n/a" | null; repairable: "repairable" | "non-repairable" | null; continue_on: string | null;
  recommendation: string | null; engineer_name: string | null; report_date: string | null;
  customer_approval_name: string | null; customer_approval_date: string | null;
  service_request_id: string | null; created_by: string | null; created_at: string; updated_at: string;
  public_token?: string; last_notified_status?: string | null; notifications?: { status: string; to: string; at: string; ok: boolean }[];
};

export const emptyTimeLog = (): TimeLog => ({ date: "", start: "", stop: "", working_hours: "", travel_hours: "", distance: "", overnight: "", ga_gw: "" });
export const emptyWorkItem = (): WorkItem => ({ task: "", result: "", note: "", photos: [] });

/** Make sure JSON columns are always arrays of the right shape. */
export function normaliseJob(raw: Record<string, unknown>): ServiceJob {
  const j = raw as unknown as ServiceJob;
  const work = Array.isArray(j.work_items) ? j.work_items : [];
  const logs = Array.isArray(j.time_logs) ? j.time_logs : [];
  return {
    ...j,
    work_items: work.map((w) => ({ task: String(w?.task ?? ""), result: String(w?.result ?? ""), note: String(w?.note ?? ""), photos: Array.isArray(w?.photos) ? w.photos.map(String) : [] })),
    time_logs: logs.map((t) => ({ ...emptyTimeLog(), ...t })),
    extra_equipment: (Array.isArray(j.extra_equipment) ? j.extra_equipment : []).map((e) => ({
      instrument: String(e?.instrument ?? ""), brand: String(e?.brand ?? ""), model: String(e?.model ?? ""), serial_number: String(e?.serial_number ?? ""),
    })),
  };
}

export const STATUS_STYLE: Record<string, string> = {
  "goods received": "bg-accent/25 text-ink",
  "in progress": "bg-brand-soft text-brand-dark",
  completed: "bg-green-100 text-green-800",
};

/** "28 September 2026" */
export function longDate(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(`${d}T00:00:00+08:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });
}
/** "5 OCT 2026" (time log table) */
export function shortDate(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(`${d}T00:00:00+08:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }).toUpperCase();
}

/** Letterhead printed at the top of every service report page (same as the paper form SR V2.0). */
export const REPORT_LETTERHEAD = {
  name: "TAY SCIENTIFIC INSTRUMENTS SDN BHD",
  regNo: "197901000468 (44730-H)",
  hq: { label: "HQ", address: "No. 6, Jalan Mutiara 4, Taman Perindustrian Plentong, 81750 Masai, Johor.", tel: "+607- 353 9250", email: "service@tayscientific.com.my" },
  branch: { label: "Sabah Branch", address: "Lot 3, Block C, Lorong Buah Salak 4, 88450 Hiong Tiong Industrial Centre, Mile 7, Jalan Tuaran, Inaman Sabah.", tel: "+608-842 4719", email: "kkservice@tayscientific.com.my" },
  formVersion: "SR V2.0",
};

/** Fields the form edits (everything except ids and timestamps). */
export type JobDraft = Omit<ServiceJob, "id" | "created_at" | "updated_at" | "created_by" | "public_token" | "last_notified_status" | "notifications">;

export const blankJob = (): JobDraft => ({
  sr_no: "", status: "goods received", date_in: todayMY(), date_out: null,
  instrument: "", brand: "", model: "", serial_number: "", description: "", condition: "",
  company: "", company_email: "", company_phone: "", contact_person: "", delivery_address: "",
  service_type: "", serviced_by: "", po_number: "", warranty: "Under warranty", invoice_no: "", remarks: "",
  work_items: [emptyWorkItem()], time_logs: [emptyTimeLog()], extra_equipment: [],
  job_completed: null, repairable: null, continue_on: "", recommendation: "", engineer_name: "", report_date: null,
  customer_approval_name: "", customer_approval_date: null, service_request_id: null,
});

