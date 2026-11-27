import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type Mail from "nodemailer/lib/mailer";

/**
 * TEST MODE: set EMAIL_TEST_TO in .env.local (e.g. EMAIL_TEST_TO=you@gmail.com) and EVERY email the website
 * sends (to staff, copies and customers) goes only to that address instead. The subject starts with [TEST]
 * and a yellow note at the top shows who would have received it. Remove the line to send for real.
 */
export const testInbox = () => (process.env.EMAIL_TEST_TO ?? "").trim();

const list = (v: Mail.Options["to"]): string[] => {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.flatMap((a) => (typeof a === "string" ? a.split(",") : [a.address])).map((s) => s.trim()).filter(Boolean);
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** In test mode, send to the test inbox only and say who the email was really for. */
export function applyTestMode(m: Mail.Options): Mail.Options {
  const inbox = testInbox();
  if (!inbox) return m;
  const realTo = list(m.to), realCc = list(m.cc), realBcc = list(m.bcc);
  const who = [`To: ${realTo.join(", ") || "-"}`, realCc.length ? `CC: ${realCc.join(", ")}` : "", realBcc.length ? `BCC: ${realBcc.join(", ")}` : ""]
    .filter(Boolean).join(" · ");
  const note = `TEST MODE: this email was NOT sent to the real recipients. It would have gone to ${who}`;
  return {
    ...m,
    to: inbox,
    cc: undefined,
    bcc: undefined,
    subject: `[TEST] ${m.subject ?? ""}`,
    text: typeof m.text === "string" ? `${note}\n\n${m.text}` : m.text,
    html: typeof m.html === "string"
      ? `<div style="font-family:Arial,sans-serif;font-size:13px;background:#FFF4CE;border:1px solid #F5A623;padding:10px 14px;margin:0 0 16px">${esc(note)}</div>${m.html}`
      : m.html,
  };
}

/** Same as nodemailer.createTransport, but every email goes through test mode first. */
export function createMailer(options: SMTPTransport.Options) {
  const transporter = nodemailer.createTransport(options);
  return { sendMail: (m: Mail.Options) => transporter.sendMail(applyTestMode(m)) };
}

/** Mailer from the SMTP_* settings, or null if email is not set up. */
export function mailerFromEnv() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT || 465);
  const mailer = createMailer({
    host: SMTP_HOST, port, secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_HOST === "smtp.gmail.com" ? SMTP_PASS.replace(/\s/g, "") : SMTP_PASS },
  });
  return { mailer, from: SMTP_FROM || `"Tay Scientific Instruments" <${SMTP_USER}>` };
}
