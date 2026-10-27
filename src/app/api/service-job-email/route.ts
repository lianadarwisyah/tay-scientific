import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { company } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { longDate, normaliseJob, REPORT_LETTERHEAD } from "@/lib/serviceJobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** What the customer is told at each stage */
const MESSAGES: Record<string, { subject: string; heading: string; intro: string }> = {
  "goods received": {
    subject: "We have received your instrument",
    heading: "Your instrument has been received",
    intro: "Thank you for choosing Tay Scientific. We have received your instrument for service. Our service team will check it and keep you updated.",
  },
  "in progress": {
    subject: "Service in progress",
    heading: "Service is now in progress",
    intro: "Our service team has started work on your instrument. We will let you know as soon as the service is completed.",
  },
  completed: {
    subject: "Service completed",
    heading: "Your service is completed",
    intro: "The service on your instrument is completed. A summary is below, and you can view, print or save the full service report with the button.",
  },
};

/**
 * Emails the customer about a service job's current status (goods received / in progress / completed).
 * Called by Admin → Service portal after saving, only by logged-in admins. Each status is emailed once,
 * unless staff choose "send again" (force).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const force = body.force === true;
  const supabase = await createClient();
  if (!supabase || !id) return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });

  const { data, error } = await supabase.from("service_jobs").select("*").eq("id", id).maybeSingle();
  if (error || !data) return NextResponse.json({ ok: false, error: "Service record not found" }, { status: 404 });
  const j = normaliseJob(data);
  const msg = MESSAGES[j.status];
  if (!msg) return NextResponse.json({ ok: false, error: "Unknown status" }, { status: 400 });
  if (!force && j.last_notified_status === j.status) return NextResponse.json({ ok: true, skipped: true });

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return NextResponse.json({ ok: false, error: "Email is not set up (SMTP settings missing)." }, { status: 500 });

  const serviceInbox = process.env.SERVICE_EMAIL || company.serviceEmail;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
  const reportUrl = j.status === "completed" && j.public_token ? `${site}/service-report/${j.public_token}` : null;
  const greeting = j.contact_person ? `Dear ${j.contact_person},` : "Dear Customer,";

  const details: [string, string][] = [
    ["Report no.", j.sr_no],
    ["Instrument", j.instrument],
    ["Brand / model", `${j.brand} / ${j.model}`],
    ["Serial number", j.serial_number],
    ["Service", j.service_type],
    ...(j.date_in ? [["Date received", longDate(j.date_in)] as [string, string]] : []),
    ...(j.status === "in progress" && j.serviced_by ? [["Service engineer", j.serviced_by] as [string, string]] : []),
    ...(j.status === "completed" && j.date_out ? [["Date completed", longDate(j.date_out)] as [string, string]] : []),
  ];
  const work = j.status === "completed" ? j.work_items.filter((w) => w.task) : [];
  const row = ([k, v]: [string, string]) =>
    `<tr><td style="color:#555;padding:6px 12px 6px 0;border-bottom:1px solid #eee;width:150px"><b>${esc(k)}</b></td><td style="padding:6px 0;border-bottom:1px solid #eee">${esc(v)}</td></tr>`;

  const html = `
  <div style="font-family:Arial,sans-serif;font-size:14px;color:#111;max-width:620px">
    <p style="margin:0 0 4px;color:#1E4E9A;font-weight:bold">${esc(company.name)}</p>
    <h2 style="margin:0 0 16px">${esc(msg.heading)}</h2>
    <p>${esc(greeting)}</p>
    <p>${esc(msg.intro)}</p>
    <table cellpadding="0" style="border-collapse:collapse;margin:16px 0">${details.map(row).join("")}</table>
    ${work.length ? `<h3 style="margin:20px 0 6px">Work done</h3><ol style="margin:0;padding-left:20px">${work.map((w) => `<li>${esc(w.task)}${w.result ? ` – <b>${esc(w.result)}</b>` : ""}${w.note ? ` (${esc(w.note)})` : ""}</li>`).join("")}</ol>` : ""}
    ${j.status === "completed" && j.recommendation ? `<h3 style="margin:20px 0 6px">Recommendation</h3><p style="white-space:pre-wrap;margin:0">${esc(j.recommendation)}</p>` : ""}
    ${reportUrl ? `<p style="margin:24px 0"><a href="${reportUrl}" style="background:#F5A623;color:#111;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">View service report</a></p>` : ""}
    <p style="margin-top:24px">If you have any questions, simply reply to this email or call us at ${esc(REPORT_LETTERHEAD.hq.tel)}.</p>
    <p>Thank you,<br>Service Department<br>${esc(company.name)}</p>
    <p style="margin-top:24px;color:#888;font-size:12px">${esc(REPORT_LETTERHEAD.hq.address)}</p>
  </div>`;
  const text = [msg.heading, "", greeting, "", msg.intro, "", ...details.map(([k, v]) => `${k}: ${v}`),
    ...(work.length ? ["", "Work done:", ...work.map((w, i) => `${i + 1}. ${w.task}${w.result ? ` - ${w.result}` : ""}${w.note ? ` (${w.note})` : ""}`)] : []),
    ...(j.status === "completed" && j.recommendation ? ["", "Recommendation:", j.recommendation] : []),
    ...(reportUrl ? ["", `View service report: ${reportUrl}`] : []),
    "", `Questions? Reply to this email or call ${REPORT_LETTERHEAD.hq.tel}.`, "", "Service Department", company.name].join("\n");

  const port = Number(SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST, port, secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_HOST === "smtp.gmail.com" ? SMTP_PASS.replace(/\s/g, "") : SMTP_PASS },
  });
  let ok = true, errText = "";
  try {
    await transporter.sendMail({
      from: SMTP_FROM || `"${company.shortName} Service" <${SMTP_USER}>`,
      to: j.company_email,
      bcc: serviceInbox, // keeps a copy in the service inbox
      replyTo: serviceInbox,
      subject: `${msg.subject} – ${j.sr_no} – ${j.instrument}`.slice(0, 200),
      text, html,
    });
  } catch (err) {
    ok = false; errText = err instanceof Error ? err.message : "Email failed";
    console.error("Service job email failed", err);
  }

  // Keep a record on the job (shown on the edit page)
  const log = [...(j.notifications ?? []), { status: j.status, to: j.company_email, at: new Date().toISOString(), ok }].slice(-30);
  await supabase.from("service_jobs").update({ notifications: log, ...(ok ? { last_notified_status: j.status } : {}) }).eq("id", id);

  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: errText }, { status: 502 });
}
