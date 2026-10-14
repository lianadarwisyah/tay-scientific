/**
 * Checks that quotation emails can be sent, and explains any problem in plain words.
 * Run from the project folder:  npm run test:email
 */
import fs from "node:fs";
import nodemailer from "nodemailer";

// --- read .env.local ---
const env = {};
try {
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { console.log("✗ Could not find .env.local in this folder. Run this from the project folder."); process.exit(1); }

const company = fs.readFileSync("src/lib/company.ts", "utf8").match(/quotationEmail:\s*"([^"]+)"/)?.[1];
const to = env.QUOTATION_EMAIL || company;
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = env;
let ok = true;
const fail = (msg) => { ok = false; console.log("✗ " + msg); };

console.log("Checking email settings…\n");
console.log(`  Send from (SMTP_USER): ${SMTP_USER || "(missing)"}`);
console.log(`  Send to (quotation inbox): ${to || "(missing)"}`);
console.log(`  Server: ${SMTP_HOST || "(missing)"}:${SMTP_PORT || "465"}\n`);

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) fail("SMTP_HOST, SMTP_USER or SMTP_PASS is missing in .env.local.");
if (SMTP_PASS === "YOUR-MAILBOX-PASSWORD") fail("SMTP_PASS is still the example placeholder. Put your real (app) password.");
if (SMTP_HOST === "smtp.gmail.com" && SMTP_PASS && SMTP_PASS.replace(/\s/g, "").length !== 16)
  fail(`For Gmail, SMTP_PASS must be a 16-letter App Password (yours is ${SMTP_PASS.replace(/\s/g, "").length} characters).\n    Create one: Google Account → Security → 2-Step Verification (turn on) → App passwords.\n    Paste the 16 letters without spaces.`);

// --- check the database step (migration_quotation_email.sql) ---
if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  try {
    const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/claim_quotation_email`, {
      method: "POST",
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_ref: "TSI-0000-0000" }),
    });
    if (r.ok) console.log("✓ Database step is set up (migration_quotation_email.sql has been run).");
    else fail("The database step is missing: run supabase/migration_quotation_email.sql in Supabase → SQL Editor.");
  } catch { fail("Could not reach Supabase. Check your internet connection and NEXT_PUBLIC_SUPABASE_URL."); }
}

// --- try to log in and send a test email ---
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  const port = Number(SMTP_PORT || 465);
  const t = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s/g, "") } });
  try {
    await t.verify();
    console.log("✓ Logged in to the email server.");
    await t.sendMail({ from: `"Tay Scientific Website" <${SMTP_USER}>`, to, subject: "Test email from Tay Scientific website",
      text: "If you can read this, quotation emails are working.\n\nSent by: npm run test:email" });
    console.log(`✓ Test email sent to ${to}. Check the inbox (and Spam) in a minute.`);
  } catch (e) {
    const m = String(e?.response || e?.message || e);
    if (/535|Invalid login|Username and Password not accepted|BadCredentials/i.test(m))
      fail("The email server rejected the password.\n    For Gmail you must use a 16-letter App Password, not your normal password\n    (Google Account → Security → 2-Step Verification → App passwords).");
    else if (/ETIMEDOUT|ECONNREFUSED|ECONNRESET|ESOCKET/i.test(m))
      fail(`Could not connect to ${SMTP_HOST}:${port}. Your network may block it; try SMTP_PORT=587, or another network.`);
    else if (/ENOTFOUND/i.test(m)) fail(`The server name "${SMTP_HOST}" was not found. Check SMTP_HOST.`);
    else fail("Sending failed: " + m);
  }
}
console.log(ok ? "\nAll good. Restart npm run dev, then send a new quotation to test." : "\nFix the ✗ items above, save .env.local, then run this test again.");
