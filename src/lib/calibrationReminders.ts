import nodemailer from "nodemailer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { company } from "@/lib/company";
import { REMINDER_LABEL, dmy, normaliseCal, reminderWindowEnd, type Calibration } from "@/lib/calibrations";
import { REPORT_LETTERHEAD } from "@/lib/serviceJobs";
import { todayMY } from "@/lib/types";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
const addDays = (d: string, n: number) => { const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

export type ReminderResult = { checked: number; emails: number; records: number; failed: number; skippedNoEmail: number; errors: string[] };

/**
 * Sends "Calibration due" emails for every record due within the next month (or already overdue) that has
 * reminders on, a customer email, and no reminder sent yet for its current due date. One email per customer
 * email address, listing all their instruments; a copy goes to the calibration reminder inbox.
 * Used by the daily cron job and by the "Send due reminders now" button.
 */
export async function sendCalibrationReminders(supabase: SupabaseClient): Promise<ReminderResult> {
  const result: ReminderResult = { checked: 0, emails: 0, records: 0, failed: 0, skippedNoEmail: 0, errors: [] };
  const today = todayMY();
  const { data, error } = await supabase.from("calibrations").select("*")
    .eq("reminders_enabled", true).is("reminder_sent_at", null)
    .lte("due_date", reminderWindowEnd()).gte("due_date", addDays(today, -90)) // not very old ones
    .order("due_date").limit(500);
  if (error) { result.errors.push(error.message); return result; }
  const due = (data ?? []).map((r) => normaliseCal(r));
  result.checked = due.length;
  if (!due.length) return result;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) { result.errors.push("Email is not set up (SMTP settings missing)."); return result; }
  const port = Number(SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST, port, secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_HOST === "smtp.gmail.com" ? SMTP_PASS.replace(/\s/g, "") : SMTP_PASS },
  });
  const copyTo = process.env.CALIBRATION_REMINDER_EMAIL || company.calibrationReminderEmail;

  // Group by customer email
  const groups = new Map<string, Calibration[]>();
  for (const c of due) {
    const to = (c.email ?? "").trim().toLowerCase();
    if (!to) { result.skippedNoEmail++; continue; }
    groups.set(to, [...(groups.get(to) ?? []), c]);
  }

  const monthTitle = new Date(`${today}T00:00:00+08:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });
  const logo = await loadLogo();
  for (const [to, items] of groups) {
    const first = items[0];
    const { html, text } = buildReminderEmail(items, today, monthTitle, logo ? "cid:tsi-logo" : logoUrl());
    let ok = true;
    try {
      await transporter.sendMail({
        from: SMTP_FROM || `"${company.shortName} Service" <${SMTP_USER}>`,
        to, cc: copyTo, replyTo: copyTo,
        subject: `Calibration Due Notification ${monthTitle} – ${first.company}`.slice(0, 200),
        text, html,
        attachments: logo ? [{ filename: "logo.png", content: logo, cid: "tsi-logo" }] : undefined,
      });
      result.emails++; result.records += items.length;
    } catch (err) {
      ok = false; result.failed++;
      result.errors.push(`${to}: ${err instanceof Error ? err.message : "email failed"}`);
    }
    const at = new Date().toISOString();
    for (const c of items) {
      const log = [...c.reminder_log, { at, to, ok }].slice(-20);
      await supabase.from("calibrations").update({ reminder_log: log, ...(ok ? { reminder_sent_at: at } : {}) }).eq("id", c.id);
    }
  }
  return result;
}

/** Company logo for the email header: attached inside the email when the file is available, otherwise linked from the website. */
async function loadLogo(): Promise<Buffer | null> {
  try { return await readFile(path.join(process.cwd(), "public", "logo.png")); } catch { return null; }
}
function logoUrl(): string | null {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return site && site.startsWith("https://") ? `${site.replace(/\/$/, "")}/logo.png` : null;
}

/**
 * The "Calibration Due Notification" email (laid out like a supplier's reminder: logo, title, greeting,
 * To / Contact boxes and a table of instruments). Email-safe HTML: tables and inline styles only.
 */
export function buildReminderEmail(items: Calibration[], today: string, monthTitle: string, logoSrc: string | null): { html: string; text: string } {
  const first = items[0];
  const BLUE = "#1E4E9A", LINE = "#E3E6EA", MUTED = "#5B6470";
  const greeting = first.contact_person ? `Dear ${first.contact_person},` : "Dear Sir/Miss/Madam,";
  const head = ["Cal Date", "Ref. No.", "Cert No.", "Description", "Brand", "Model", "S/N", "Due Date"];
  const rows = items.map((c) => [dmy(c.calibration_date), c.sticker_no, c.cert_no || "N/A", c.instrument, c.brand || "-", c.model || "-", c.serial_number || "-", dmy(c.due_date)]);
  const services = Array.from(new Set(items.map((c) => c.service_provider).filter(Boolean)));

  const th = (t: string) => `<th align="left" style="padding:10px 8px;font-size:12px;font-weight:bold;color:#111;background:#F3F5F8;border-bottom:1px solid ${LINE};white-space:nowrap">${esc(t)}</th>`;
  const td = (t: string, style = "") => `<td style="padding:10px 8px;font-size:12px;color:#111;border-bottom:1px solid ${LINE};${style}">${esc(t)}</td>`;
  const dueStyle = (c: Calibration) => (c.due_date ?? "") < today ? "color:#C00000;font-weight:bold;white-space:nowrap" : "color:#C2410C;font-weight:bold;white-space:nowrap";
  const label = (t: string) => `<p style="margin:0 0 10px;font-size:13px;color:${MUTED}">${esc(t)}</p>`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#F6F7F9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F9">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="680" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;background:#FFFFFF;border:1px solid ${LINE};font-family:Arial,Helvetica,sans-serif;color:#111">
  <!-- Header -->
  <tr><td style="padding:22px 28px 14px;border-bottom:3px solid ${BLUE}">
    ${logoSrc
      ? `<img src="${logoSrc}" alt="${esc(company.name)}" width="220" style="display:block;width:220px;max-width:60%;height:auto;border:0">`
      : `<p style="margin:0;font-size:20px;font-weight:bold;color:${BLUE}">${esc(company.name)}</p>`}
  </td></tr>

  <!-- Title and message -->
  <tr><td style="padding:24px 28px 8px">
    <h1 style="margin:0 0 20px;font-size:18px;font-weight:bold;color:#111">Calibration Due Notification ${esc(monthTitle)}</h1>
    <p style="margin:0 0 14px;font-size:14px">${esc(greeting)}</p>
    <p style="margin:0 0 14px;font-size:14px;line-height:1.55">Thank you for your support. Our calibration record shows that your equipment is about to be, or is already, due for calibration.
      The details are shown below. It is our great pleasure to serve you again. Please get in touch with the ${esc(company.shortName)} contact shown in this email reminder.</p>
  </td></tr>

  <!-- To / Contact -->
  <tr><td style="padding:8px 28px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LINE};border-bottom:1px solid ${LINE}">
      <tr>
        <td width="50%" valign="top" style="padding:16px 12px 16px 0;font-size:13px;line-height:1.5">
          ${label("To:")}
          <b>${esc(first.company.toUpperCase())}</b>
          ${first.contact_person ? `<br><span style="color:${MUTED}">Attn:</span> ${esc(first.contact_person)}` : ""}
          ${first.contact_no ? `<br><span style="color:${MUTED}">Tel:</span> ${esc(first.contact_no)}` : ""}
          ${first.email ? `<br><span style="color:${MUTED}">Email:</span> ${esc(first.email)}` : ""}
        </td>
        <td width="50%" valign="top" style="padding:16px 0 16px 12px;font-size:13px;line-height:1.5">
          ${label(`${company.shortName} Contact:`)}
          <b>Service Department</b><br>
          ${esc(company.name)}<br>
          ${esc(REPORT_LETTERHEAD.hq.tel)}<br>
          <a href="mailto:${esc(company.serviceEmail)}" style="color:${BLUE}">${esc(company.serviceEmail)}</a>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Instruments -->
  <tr><td style="padding:18px 28px 6px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-collapse:collapse">
      <tr>${head.map(th).join("")}</tr>
      ${rows.map((r, i) => `<tr>${r.map((v, k) => td(v, k === 7 ? dueStyle(items[i]) : k === 0 ? "white-space:nowrap" : "")).join("")}</tr>`).join("")}
    </table>
    <p style="margin:8px 0 0;font-size:11px;color:${MUTED}">Due dates in <span style="color:#C00000;font-weight:bold">red</span> have passed; <span style="color:#C2410C;font-weight:bold">orange</span> are due within ${REMINDER_LABEL}.${services.length ? ` Last calibrated by: ${esc(services.join(", "))}.` : ""}</p>
  </td></tr>

  <!-- Call to action -->
  <tr><td style="padding:18px 28px 6px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="background:#F5A623;border-radius:6px"><a href="mailto:${esc(company.serviceEmail)}?subject=${encodeURIComponent(`Calibration booking - ${first.company}`)}" style="display:inline-block;padding:11px 20px;font-size:14px;font-weight:bold;color:#111;text-decoration:none">Book a calibration</a></td>
    </tr></table>
    <p style="margin:16px 0 0;font-size:14px;line-height:1.55">Or simply reply to this email, or call us at ${esc(REPORT_LETTERHEAD.hq.tel)}.</p>
    <p style="margin:16px 0 0;font-size:14px;line-height:1.55">Thank you,<br><b>Service Department</b><br>${esc(company.name)}</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:22px 28px;margin-top:10px;border-top:1px solid ${LINE};font-size:11px;line-height:1.5;color:${MUTED}">
    <b>${esc(company.name)}</b><br>
    [${esc(REPORT_LETTERHEAD.hq.label)}] ${esc(REPORT_LETTERHEAD.hq.address)} Tel: ${esc(REPORT_LETTERHEAD.hq.tel)}<br>
    [${esc(REPORT_LETTERHEAD.branch.label)}] ${esc(REPORT_LETTERHEAD.branch.address)} Tel: ${esc(REPORT_LETTERHEAD.branch.tel)}<br>
    This is an automatic reminder based on our calibration record.
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const text = [`Calibration Due Notification ${monthTitle}`, "", greeting, "",
    "Thank you for your support. Our calibration record shows that your equipment is about to be, or is already, due for calibration. The details are below.", "",
    `To: ${first.company}${first.contact_person ? ` (Attn: ${first.contact_person})` : ""}`,
    `${company.shortName} contact: Service Department, ${REPORT_LETTERHEAD.hq.tel}, ${company.serviceEmail}`, "",
    head.join(" | "), ...rows.map((r) => r.join(" | ")), "",
    `To book, reply to this email or call ${REPORT_LETTERHEAD.hq.tel}.`, "", "Thank you,", "Service Department", company.name].join("\n");
  return { html, text };
}
