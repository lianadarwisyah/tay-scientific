import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { company } from "@/lib/company";
import { jobs } from "@/lib/jobs";

// Nodemailer needs the Node.js runtime (not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Max CV size. Vercel rejects request bodies over 4.5 MB, so keep this at 4 MB or less. */
const MAX_CV_BYTES = 4 * 1024 * 1024;
const ALLOWED_EXT = ["pdf", "doc", "docx"];
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(f: FormData, key: string, max: number): string {
  const v = f.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  let f: FormData;
  try {
    f = await req.formData();
  } catch {
    return fail("The form could not be read. If your CV is large, please try a smaller file.");
  }

  // Hidden "website" field: real people leave it empty, simple spam bots fill it in.
  if (text(f, "website", 200)) return NextResponse.json({ ok: true });

  const name = text(f, "name", 120);
  const email = text(f, "email", 200);
  const phone = text(f, "phone", 40);
  const position = text(f, "position", 120);
  const location = text(f, "location", 120);
  const salary = text(f, "salary", 60);
  const startDate = text(f, "start", 60);
  const message = text(f, "message", 4000);
  const consent = f.get("consent") === "yes";

  if (!name) return fail("Please enter your full name.");
  if (!EMAIL_RE.test(email)) return fail("Please enter a valid email address.");
  if (!phone) return fail("Please enter your phone number.");
  const validRoles = [...jobs.map((j) => j.title), "General application"];
  if (!validRoles.includes(position)) return fail("Please choose the position you are applying for.");
  if (!consent) return fail("Please agree to let us use your details for this application.");

  const cv = f.get("cv");
  if (!(cv instanceof File) || cv.size === 0) return fail("Please attach your CV.");
  const ext = cv.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(ext)) return fail("Your CV must be a PDF or Word file (.pdf, .doc, .docx).");
  if (cv.size > MAX_CV_BYTES) return fail("Your CV is larger than 4 MB. Please upload a smaller file.");

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error("Careers form: SMTP_HOST, SMTP_USER and SMTP_PASS must be set.");
    return fail("Applications cannot be sent right now. Please email your CV to " + company.careersEmail + ".", 500);
  }

  const port = Number(SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_HOST === "smtp.gmail.com" ? SMTP_PASS.replace(/\s/g, "") : SMTP_PASS },
  });

  const rows: [string, string][] = [
    ["Position", position],
    ["Full name", name],
    ["Email", email],
    ["Phone", phone],
    ["Current location", location || "-"],
    ["Expected salary", salary || "-"],
    ["Available to start", startDate || "-"],
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
      <h2 style="margin:0 0 12px">New job application: ${esc(position)}</h2>
      <table cellpadding="6" style="border-collapse:collapse">
        ${rows.map(([k, v]) => `<tr><td style="color:#555;border-bottom:1px solid #eee"><b>${esc(k)}</b></td><td style="border-bottom:1px solid #eee">${esc(v)}</td></tr>`).join("")}
      </table>
      <h3 style="margin:20px 0 6px">Message from applicant</h3>
      <p style="white-space:pre-wrap;margin:0">${message ? esc(message) : "-"}</p>
      <p style="margin-top:20px;color:#777;font-size:12px">CV attached: ${esc(cv.name)}. Reply to this email to contact the applicant directly.</p>
    </div>`;

  const plain = [
    `New job application: ${position}`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Message:",
    message || "-",
    "",
    `CV attached: ${cv.name}`,
  ].join("\n");

  const safeFileName = `CV - ${name.replace(/[^\p{L}\p{N} ._-]/gu, "").slice(0, 60) || "applicant"}.${ext}`;

  try {
    await transporter.sendMail({
      from: SMTP_FROM || `"${company.shortName} Careers" <${SMTP_USER}>`,
      to: company.careersEmail,
      replyTo: { name, address: email },
      subject: `Job Application - ${position} - ${name}`,
      text: plain,
      html,
      attachments: [
        {
          filename: safeFileName,
          content: Buffer.from(await cv.arrayBuffer()),
          contentType: MIME_BY_EXT[ext],
        },
      ],
    });
  } catch (err) {
    console.error("Careers form: email failed", err);
    return fail("Your application could not be sent. Please try again, or email your CV to " + company.careersEmail + ".", 502);
  }

  return NextResponse.json({ ok: true });
}
