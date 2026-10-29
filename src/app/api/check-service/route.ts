import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { company } from "@/lib/company";
import { createAdminClient } from "@/lib/supabase/admin";
import { LINK_MINUTES, emailPattern, makeToken, normaliseEmail } from "@/lib/checkService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Simple protection against repeated requests (per server instance)
const recent = new Map<string, number>();

/**
 * Check Service, step 1: the customer enters their email. If we have any records for it, we email a private
 * link (valid 60 minutes) that opens their history. The answer is the same either way, so nobody can find out
 * which emails are customers.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = normaliseEmail(typeof body.email === "string" ? body.email : "").slice(0, 200);
  if (typeof body.website === "string" && body.website) return NextResponse.json({ ok: true }); // spam trap
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) {
    console.error("Check Service: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local / Vercel environment variables.");
    return NextResponse.json({ ok: false, error: `Check Service is not available right now. Please email ${company.serviceEmail}.` }, { status: 500 });
  }

  const last = recent.get(email) ?? 0;
  if (Date.now() - last < 2 * 60_000) return NextResponse.json({ ok: true }); // a link was just sent
  recent.set(email, Date.now());

  // Do we know this email? (service jobs, calibrations, service requests, quotations)
  const has = async (table: string, col: string) => {
    const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).ilike(col, emailPattern(email));
    return (count ?? 0) > 0;
  };
  const found = (await Promise.all([has("service_jobs", "company_email"), has("calibrations", "email"), has("service_requests", "email"), has("quotations", "email")])).some(Boolean);

  if (found) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return NextResponse.json({ ok: false, error: `Email is not available right now. Please contact ${company.serviceEmail}.` }, { status: 500 });
    const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
    const link = `${site}/check-service/view?t=${encodeURIComponent(makeToken(email))}`;
    const port = Number(SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST, port, secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_HOST === "smtp.gmail.com" ? SMTP_PASS.replace(/\s/g, "") : SMTP_PASS },
    });
    try {
      await transporter.sendMail({
        from: SMTP_FROM || `"${company.shortName} Service" <${SMTP_USER}>`,
        to: email, replyTo: company.serviceEmail,
        subject: `Your service history link – ${company.shortName}`,
        text: `Open this link to see your service history with ${company.name} (valid for ${LINK_MINUTES} minutes):\n\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;max-width:560px">
          <p style="color:#1E4E9A;font-weight:bold;margin:0 0 12px">${company.name}</p>
          <h2 style="margin:0 0 12px">Your service history</h2>
          <p>Click the button to see your instruments in service, service reports, calibrations and quotation requests with us.</p>
          <p style="margin:24px 0"><a href="${link}" style="background:#F5A623;color:#111;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">View my service history</a></p>
          <p style="color:#555;font-size:12px">This private link works for ${LINK_MINUTES} minutes. If you did not ask for it, you can ignore this email.</p></div>`,
      });
    } catch (err) {
      console.error("Check Service: email failed", err);
      return NextResponse.json({ ok: false, error: "The email could not be sent. Please try again in a few minutes." }, { status: 502 });
    }
  }
  return NextResponse.json({ ok: true });
}
