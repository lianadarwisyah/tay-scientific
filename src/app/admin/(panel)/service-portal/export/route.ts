import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { JOB_STATUSES, normaliseJob, type ServiceJob } from "@/lib/serviceJobs";
import { MONTHS, applyFilters, periodColumn, periodLabel, readFilters } from "@/lib/serviceJobsFilter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Excel (.xlsx) of the service jobs matching the Service portal filters, with a Summary sheet. Admins only. */
export async function GET(req: Request) {
  const supabase = await createClient();
  if (!supabase) return new Response("Not set up", { status: 500 });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return new Response("Admins only", { status: 403 });

  const f = readFilters(Object.fromEntries(new URL(req.url).searchParams));
  const col = periodColumn(f);

  // Read every matching job (Supabase returns up to 1000 rows per request)
  const jobs: ServiceJob[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await applyFilters(
      supabase.from("service_jobs").select("*").order(col, { ascending: true, nullsFirst: false }).order("sr_no").range(from, from + 999), f);
    if (error) return new Response("Could not read service jobs: " + error.message, { status: 500 });
    jobs.push(...(data ?? []).map((r) => normaliseJob(r)));
    if (!data || data.length < 1000) break;
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Tay Scientific website";
  wb.created = new Date();
  const toDate = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`) : null);
  const header = (ws: ExcelJS.Worksheet) => {
    const r = ws.getRow(1);
    r.font = { bold: true, color: { argb: "FFFFFFFF" } };
    r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E4E9A" } };
    r.alignment = { vertical: "middle" };
    r.height = 20;
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };

  // ---------- Sheet 1: Summary ----------
  const sum = wb.addWorksheet("Summary");
  sum.columns = [{ width: 34 }, { width: 14 }];
  sum.addRow(["Service jobs report"]).font = { bold: true, size: 14 };
  sum.addRow(["Period", periodLabel(f)]);
  sum.addRow(["Counted by", f.year ? (f.by === "out" ? "Date out (completed)" : "Date in (received)") : "All records"]);
  if (f.status) sum.addRow(["Status filter", f.status]);
  if (f.q) sum.addRow(["Search", f.q]);
  sum.addRow(["Exported", new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })]);
  sum.addRow([]);
  const section = (title: string, rows: [string, number][]) => {
    const h = sum.addRow([title, "Jobs"]);
    h.font = { bold: true };
    h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC000" } };
    rows.forEach((r) => sum.addRow(r));
    const t = sum.addRow(["Total", rows.reduce((a, [, n]) => a + n, 0)]);
    t.font = { bold: true };
    sum.addRow([]);
  };
  const countBy = (key: (j: ServiceJob) => string, order?: string[]) => {
    const m = new Map<string, number>();
    jobs.forEach((j) => m.set(key(j), (m.get(key(j)) ?? 0) + 1));
    const keys = order ? order.filter((k) => m.has(k)).concat([...m.keys()].filter((k) => !order.includes(k))) : [...m.keys()].sort();
    return keys.map((k) => [k, m.get(k)!] as [string, number]);
  };
  section("By status", JOB_STATUSES.map((s) => [s.replace(/\b\w/g, (c) => c.toUpperCase()), jobs.filter((j) => j.status === s).length] as [string, number]));
  // By month: for a whole year, every month of that year; otherwise each month that has jobs
  const monthKey = (j: ServiceJob) => { const d = (col === "date_out" ? j.date_out : j.date_in) ?? ""; return d ? d.slice(0, 7) : "No date"; };
  if (f.year && !f.month) {
    section(`By month (${f.year})`, MONTHS.map((m, i) => [m, jobs.filter((j) => monthKey(j) === `${f.year}-${String(i + 1).padStart(2, "0")}`).length] as [string, number]));
  } else if (!f.month) {
    section("By month", countBy(monthKey).map(([k, n]) => [k === "No date" ? k : `${MONTHS[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}`, n]));
  }
  section("By service type", countBy((j) => j.service_type || "-"));
  section("By technician", countBy((j) => j.serviced_by || j.engineer_name || "-"));
  section("By brand", countBy((j) => (j.brand || "-").toUpperCase()));

  // ---------- Sheet 2: All jobs ----------
  const ws = wb.addWorksheet("Service jobs");
  ws.columns = [
    { header: "SR No.", key: "sr", width: 18 }, { header: "Status", key: "status", width: 15 },
    { header: "Date in", key: "in", width: 12, style: { numFmt: "dd/mm/yyyy" } }, { header: "Date out", key: "out", width: 12, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Company", key: "company", width: 32 }, { header: "Contact person", key: "pic", width: 18 },
    { header: "Company email", key: "email", width: 26 }, { header: "Phone", key: "phone", width: 16 },
    { header: "Instrument", key: "inst", width: 28 }, { header: "Brand", key: "brand", width: 14 }, { header: "Model", key: "model", width: 14 },
    { header: "Serial number", key: "sn", width: 20 }, { header: "Other instruments", key: "more", width: 36 }, { header: "Condition", key: "cond", width: 12 },
    { header: "Service", key: "svc", width: 20 }, { header: "Serviced by", key: "by", width: 18 },
    { header: "PO number", key: "po", width: 14 }, { header: "Warranty", key: "war", width: 16 }, { header: "Invoice / document no.", key: "inv", width: 18 },
    { header: "Job completed", key: "done", width: 13 }, { header: "Repairable", key: "rep", width: 14 },
    { header: "Work done", key: "work", width: 50 }, { header: "Recommendation", key: "reco", width: 40 },
    { header: "Service engineer", key: "eng", width: 18 }, { header: "Report date", key: "rdate", width: 12, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Remarks (staff)", key: "rem", width: 40 },
  ];
  header(ws);
  for (const j of jobs) {
    ws.addRow({
      sr: j.sr_no, status: j.status, in: toDate(j.date_in), out: toDate(j.date_out), company: j.company, pic: j.contact_person ?? "",
      email: j.company_email, phone: j.company_phone ?? "", inst: j.instrument, brand: j.brand, model: j.model, sn: j.serial_number,
      more: j.extra_equipment.map((e) => [e.instrument, e.brand, e.model, e.serial_number && `S/N ${e.serial_number}`].filter(Boolean).join(" · ")).join("\n"),
      cond: j.condition ?? "", svc: j.service_type, by: j.serviced_by ?? "", po: j.po_number ?? "", war: j.warranty, inv: j.invoice_no ?? "",
      done: j.job_completed?.toUpperCase() ?? "", rep: j.repairable ?? "",
      work: j.work_items.filter((w) => w.task).map((w, i) => `${i + 1}. ${w.task}${w.result ? ` - ${w.result}` : ""}${w.note ? ` (${w.note})` : ""}`).join("\n"),
      reco: j.recommendation ?? "", eng: j.engineer_name ?? "", rdate: toDate(j.report_date), rem: j.remarks ?? "",
    }).alignment = { vertical: "top", wrapText: true };
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

  const buf = await wb.xlsx.writeBuffer();
  const name = `Service jobs - ${periodLabel(f)}${f.status ? ` - ${f.status}` : ""}.xlsx`.replace(/[^\w .-]/g, "");
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
