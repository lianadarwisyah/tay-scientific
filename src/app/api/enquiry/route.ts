import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { company } from "@/lib/company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/**
 * Contact page enquiry: saved in Supabase (Admin → Enquiries) and emailed to company.enquiryEmails
 * (or ENQUIRY_EMAILS in the environment, comma-separated). Reply goes straight to the customer.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return fail("The form could not be read. Please try again.");
  const val = (k: string, max: number) => (typeof body[k] === "string" ? body[k].trim().slice(0, max) : "");
  if (val("website", 200)) return NextResponse.json({ ok: true }); // spam trap
  const name = val("name", 120), email = val("email", 200), phone = val("phone", 40), subject = val("subject", 200), message = val("message", 4000);
  if (!name) return fail("Please enter your name.");
  if (!EMAIL_RE.test(email)) return fail("Please enter a valid email address.");
  if (!message) return fail("Please enter your message.");

  // 1) Save (customers may insert enquiries; only admins can read them)
  let saved = false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.from("enquiries").insert({ name, email, phone: phone || null, subject: subject || null, message });
    if (error) console.error("Enquiry: could not save", error.message); else saved = true;
  }

  // 2) Email the sales team
  let sent = false;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  const to = (process.env.ENQUIRY_EMAILS || company.enquiryEmails.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
  if (SMTP_HOST && SMTP_USER && SMTP_PASS && to.length) {
    const port = Number(SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST, port, secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_HOST === "smtp.gmail.com" ? SMTP_PASS.replace(/\s/g, "") : SMTP_PASS },
    });
    const rows: [string, string][] = [["Name", name], ["Email", email], ["Phone / WhatsApp", phone || "-"], ["Subject", subject || "-"]];
    try {
      await transporter.sendMail({
        from: SMTP_FROM || `"${company.shortName} Website" <${SMTP_USER}>`,
        to, replyTo: { name, address: email },
        subject: `Website enquiry${subject ? ` - ${subject}` : ""} - ${name}`.slice(0, 200),
        text: [`New enquiry from the website`, "", ...rows.map(([k, v]) => `${k}: ${v}`), "", "Message:", message].join("\n"),
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
          <h2 style="margin:0 0 12px">New enquiry from the website</h2>
          <table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#555;border-bottom:1px solid #eee"><b>${esc(k)}</b></td><td style="border-bottom:1px solid #eee">${esc(v)}</td></tr>`).join("")}</table>
          <h3 style="margin:18px 0 6px">Message</h3><p style="white-space:pre-wrap;margin:0">${esc(message)}</p>
          <p style="margin-top:20px;color:#777;font-size:12px">Sent from the Contact page. Also in Admin → Enquiries. Reply to this email to answer the customer.</p></div>`,
      });
      sent = true;
    } catch (err) { console.error("Enquiry: email failed", err); }
  } else {
    console.error("Enquiry: SMTP settings missing, email not sent.");
  }

  if (saved || sent) return NextResponse.json({ ok: true });
  return fail(`Your enquiry could not be sent. Please email ${company.email} or call ${company.phone}.`, 502);
}
