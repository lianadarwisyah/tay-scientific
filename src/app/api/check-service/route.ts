import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { company } from "@/lib/company";
import { createAdminClient } from "@/lib/supabase/admin";
import { CODE_MINUTES, emailPattern, hasSecret, hashCode, newCode, normaliseEmail } from "@/lib/checkService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/**
 * Check Service, step 1: the customer enters their email. If we have records for it, we email a 6-digit code
 * (valid 10 minutes). The answer looks the same either way, so nobody can find out which emails are customers.
 * Returns a requestId that the page sends back with the code.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (typeof body.website === "string" && body.website) return NextResponse.json({ ok: true, requestId: randomUUID() }); // spam trap
  const email = normaliseEmail(typeof body.email === "string" ? body.email : "").slice(0, 200);
  if (!EMAIL_RE.test(email)) return fail("Please enter a valid email address.");

  const supabase = createAdminClient();
  if (!supabase || !hasSecret()) {
    console.error("Check Service: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local / Vercel environment variables.");
    return fail(`Check Service is not available right now. Please email ${company.serviceEmail}.`, 500);
  }

  // A code was sent less than a minute ago: reuse it (no new email), so the button cannot be used to flood an inbox
  const { data: recent, error: recentErr } = await supabase.from("check_service_codes").select("id,created_at")
    .eq("email", email).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1);
  if (recentErr) {
    console.error("Check Service: run supabase/migration_check_service_otp.sql", recentErr.message);
    return fail(`Check Service is not available right now. Please email ${company.serviceEmail}.`, 500);
  }
  if (recent?.[0] && Date.now() - new Date(recent[0].created_at).getTime() < 60_000) {
    return NextResponse.json({ ok: true, requestId: recent[0].id });
  }

  // Do we know this email? (service jobs, calibrations, service requests, quotations)
  const pat = emailPattern(email);
  const has = async (table: string, col: string) => {
    const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).ilike(col, pat);
    return (count ?? 0) > 0;
  };
  const found = (await Promise.all([has("service_jobs", "company_email"), has("calibrations", "email"), has("service_requests", "email"), has("quotations", "email")])).some(Boolean);
  if (!found) return NextResponse.json({ ok: true, requestId: randomUUID() }); // looks the same, but no code exists

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return fail(`Email is not available right now. Please contact ${company.serviceEmail}.`, 500);

  // Tidy up old codes, then create the new one
  await supabase.from("check_service_codes").delete().lt("expires_at", new Date(Date.now() - 86_400_000).toISOString());
  const requestId = randomUUID();
  const code = newCode();
  const { error: insErr } = await supabase.from("check_service_codes").insert({
    id: requestId, email, code_hash: hashCode(requestId, code), expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
  });
  if (insErr) { console.error("Check Service: could not save code", insErr.message); return fail("Something went wrong. Please try again.", 500); }

  const port = Number(SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST, port, secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_HOST === "smtp.gmail.com" ? SMTP_PASS.replace(/\s/g, "") : SMTP_PASS },
  });
  try {
    await transporter.sendMail({
      from: SMTP_FROM || `"${company.shortName} Service" <${SMTP_USER}>`,
      to: email, replyTo: company.serviceEmail,
      subject: `${code} is your Check Service code – ${company.shortName}`,
      text: `Your ${company.shortName} Check Service code is: ${code}\n\nEnter it on the Check Service page to see your service history. It works for ${CODE_MINUTES} minutes.\nIf you did not ask for this, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;max-width:520px">
        <p style="color:#1E4E9A;font-weight:bold;margin:0 0 12px">${company.name}</p>
        <h2 style="margin:0 0 12px">Your Check Service code</h2>
        <p>Enter this code on the Check Service page to see your service history:</p>
        <p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:20px 0;padding:14px 18px;background:#F3F5F8;border-radius:8px;display:inline-block">${code}</p>
        <p style="color:#555;font-size:12px">The code works for ${CODE_MINUTES} minutes. If you did not ask for it, you can ignore this email.</p></div>`,
    });
  } catch (err) {
    console.error("Check Service: email failed", err);
    await supabase.from("check_service_codes").delete().eq("id", requestId);
    return fail("The email could not be sent. Please try again in a few minutes.", 502);
  }
  return NextResponse.json({ ok: true, requestId });
}
