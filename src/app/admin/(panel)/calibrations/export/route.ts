import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { CAL_EXCEL_FILL, calState, normaliseCal, type Calibration } from "@/lib/calibrations";
import { applyCalFilters, calPeriodLabel, readCalFilters } from "@/lib/calibrationFilter";
import { MONTHS } from "@/lib/serviceJobsFilter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Excel (.xlsx) of the calibration log with the current filters, plus a Summary sheet. Admins only. */
export async function GET(req: Request) {
  const supabase = await createClient();
  if (!supabase) return new Response("Not set up", { status: 500 });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return new Response("Admins only", { status: 403 });

  const f = readCalFilters(Object.fromEntries(new URL(req.url).searchParams));
  const rows: Calibration[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await applyCalFilters(
      supabase.from("calibrations").select("*").order(f.by === "due" ? "due_date" : "calibration_date").order("sticker_no").range(from, from + 999), f);
    if (error) return new Response("Could not read calibrations: " + error.message, { status: 500 });
    rows.push(...(data ?? []).map((r) => normaliseCal(r)));
    if (!data || data.length < 1000) break;
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Tay Scientific website";
  const toDate = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`) : null);
  const peach = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF8CBAD" } };

  // ---------- Calibration log (same columns as the old Excel log) ----------
  const ws = wb.addWorksheet("Calibration log");
  ws.columns = [
    { header: "Date In", key: "in", width: 12, style: { numFmt: "d/m/yyyy" } }, { header: "Instrument", key: "inst", width: 24 },
    { header: "Brand", key: "brand", width: 18 }, { header: "Model", key: "model", width: 14 }, { header: "Serial No.", key: "sn", width: 16 },
    { header: "Reference No.", key: "sticker", width: 17 }, { header: "Company", key: "co", width: 32 }, { header: "Contact person", key: "pic", width: 18 },
    { header: "Contact no.", key: "tel", width: 15 }, { header: "Email", key: "email", width: 26 },
    { header: "Calibration date", key: "cal", width: 15, style: { numFmt: "d/m/yyyy" } }, { header: "Validity (months)", key: "valid", width: 10 },
    { header: "Calibration Due", key: "due", width: 15, style: { numFmt: "d/m/yyyy" } }, { header: "Status", key: "state", width: 10 },
    { header: "Service provider", key: "prov", width: 20 }, { header: "Cert No.", key: "cert", width: 16 },
    { header: "Reminder sent", key: "rem", width: 14, style: { numFmt: "d/m/yyyy" } },
    { header: "Remarks", key: "remarks", width: 30 },
  ];
  const h = ws.getRow(1);
  h.font = { bold: true }; h.fill = peach; h.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; h.height = 32;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  rows.forEach((c) => {
    const st = calState(c.due_date);
    const r = ws.addRow({
      in: toDate(c.date_in), inst: c.instrument, brand: c.brand ?? "", model: c.model ?? "", sn: c.serial_number ?? "", sticker: c.sticker_no,
      co: c.company, pic: c.contact_person ?? "", tel: c.contact_no ?? "", email: c.email ?? "", cal: toDate(c.calibration_date), valid: c.validity_months,
      due: toDate(c.due_date), state: st, prov: c.service_provider ?? "", cert: c.cert_no ?? "",
      rem: c.reminder_sent_at ? new Date(c.reminder_sent_at) : null, remarks: c.remarks ?? "",
    });
    r.alignment = { vertical: "top", wrapText: true };
    r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CAL_EXCEL_FILL[st] } }; // pastel green / orange / red
    const dueCell = r.getCell("due");
    if (st === "overdue") dueCell.font = { bold: true, color: { argb: "FFC00000" } };
    if (st === "due soon") dueCell.font = { bold: true, color: { argb: "FFC2410C" } };
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

  // ---------- Summary ----------
  const sum = wb.addWorksheet("Summary");
  sum.columns = [{ width: 34 }, { width: 14 }];
  sum.addRow(["Calibration log"]).font = { bold: true, size: 14 };
  sum.addRow(["Period", calPeriodLabel(f)]);
  sum.addRow(["Counted by", f.year ? (f.by === "due" ? "Due date" : "Calibration date") : "All records"]);
  if (f.state) sum.addRow(["Status filter", f.state]);
  if (f.q) sum.addRow(["Search", f.q]);
  sum.addRow(["Exported", new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })]);
  sum.addRow([]);
  const section = (title: string, list: [string, number][]) => {
    const t = sum.addRow([title, "Calibrations"]); t.font = { bold: true }; t.fill = peach;
    list.forEach((r) => sum.addRow(r));
    sum.addRow(["Total", list.reduce((a, [, n]) => a + n, 0)]).font = { bold: true };
    sum.addRow([]);
  };
  const countBy = (key: (c: Calibration) => string) => {
    const m = new Map<string, number>();
    rows.forEach((c) => m.set(key(c), (m.get(key(c)) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  section("By status", (["overdue", "due soon", "valid"] as const).map((s) => [s, rows.filter((c) => calState(c.due_date) === s).length] as [string, number]));
  const col = (c: Calibration) => (f.by === "due" ? c.due_date : c.calibration_date) ?? "";
  if (f.year && !f.month) section(`By month (${f.year})`, MONTHS.map((m, i) => [m, rows.filter((c) => col(c).slice(0, 7) === `${f.year}-${String(i + 1).padStart(2, "0")}`).length] as [string, number]));
  section("By service provider", countBy((c) => c.service_provider || "-"));
  section("By company", countBy((c) => c.company));
  section("By instrument", countBy((c) => c.instrument));

  const buf = await wb.xlsx.writeBuffer();
  const name = `Calibration log - ${calPeriodLabel(f)}${f.state ? ` - ${f.state}` : ""}.xlsx`.replace(/[^\w .-]/g, "");
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store",
    },
  });
}
