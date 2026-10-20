import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { company } from "@/lib/company";
import { serviceTypes } from "@/lib/serviceTypes";
import { createClient } from "@/lib/supabase/server";

// Nodemailer needs the Node.js runtime (not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

/**
 * Service request from the Services page.
 * 1) Saved in Supabase (table service_requests, see supabase/migration_service_requests.sql) and given a reference, e.g. SR-2026-0001.
 * 2) Emailed to company.serviceEmail (or SERVICE_EMAIL in .env.local).
 * If saving works but the email fails, the customer still gets a success message: staff see it in Admin -> Service requests.
 */
export async function POST(req: Request) {
  let f: FormData;
  try { f = await req.formData(); } catch { return fail("The form could not be read. Please try again."); }

  // Hidden "website" field: real people leave it empty, simple spam bots fill it in.
  if (text(f, "website", 200)) return NextResponse.json({ ok: true });

  const type = text(f, "service_type", 60);
  const typeOther = text(f, "service_type_other", 120);
  const description = text(f, "description", 200);
  const brand = text(f, "brand", 120);
  const model = text(f, "model", 120);
  const serial = text(f, "serial", 120);
  const companyName = text(f, "company", 200);
  const address = text(f, "address", 500);
  const pic = text(f, "pic_name", 120);
  const email = text(f, "email", 200);
  const contact = text(f, "contact", 40);
  const details = text(f, "details", 4000);

  if (!(serviceTypes as readonly string[]).includes(type)) return fail("Please choose the type of service.");
  if (type === "Others" && !typeOther) return fail("Please tell us which service you need.");
  if (!description) return fail("Please describe the equipment (product name).");
  if (!companyName) return fail("Please enter your company name.");
  if (!address) return fail("Please enter your address.");
  if (!pic) return fail("Please enter the name of the person in charge (PIC).");
  if (!EMAIL_RE.test(email)) return fail("Please enter a valid email address.");
  if (!contact) return fail("Please enter a contact number.");

  // 1) Save in the database
  let ref: string | null = null;
  const supabase = await createClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("submit_service_request", {
      payload: {
        service_type: type, service_type_other: typeOther, description, brand, model, serial, details,
        company: companyName, address, pic_name: pic, email, contact,
      },
    });
    if (error) console.error("Service request: could not save (has migration_service_requests.sql been run?)", error.message);
    else ref = data as string;
  }

  // 2) Email the service team
  const to = process.env.SERVICE_EMAIL || company.serviceEmail;
  const sent = await sendEmail();
  if (sent && ref && supabase) await supabase.rpc("mark_service_request_emailed", { r_ref: ref });

  if (ref) return NextResponse.json({ ok: true, ref }); // saved: staff will see it in Admin even if the email failed
  if (sent) return NextResponse.json({ ok: true, ref: null });
  return fail(`Your request could not be sent. Please try again, or email ${to} or call ${company.phone}.`, 502);

  async function sendEmail(): Promise<boolean> {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error("Service request form: SMTP_HOST, SMTP_USER and SMTP_PASS must be set.");
      return false;
    }
    const port = Number(SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST, port, secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_HOST === "smtp.gmail.com" ? SMTP_PASS.replace(/\s/g, "") : SMTP_PASS },
    });

    const service = type === "Others" ? `Others: ${typeOther}` : type;
    const sections: [string, [string, string][]][] = [
      ["Type of service", [["Reference", ref || "(not saved in database)"], ["Service", service]]],
      ["Equipment", [["Description", description], ["Brand", brand || "-"], ["Model", model || "-"], ["Serial number (S/N)", serial || "-"]]],
      ["Customer", [["Company", companyName], ["Address", address], ["PIC name", pic], ["Email", email], ["Contact", contact]]],
    ];
    const row = ([k, v]: [string, string]) =>
      `<tr><td style="color:#555;border-bottom:1px solid #eee;width:170px"><b>${esc(k)}</b></td><td style="border-bottom:1px solid #eee">${esc(v).replace(/\n/g, "<br>")}</td></tr>`;
    const html = `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
        <h2 style="margin:0 0 12px">New service request${ref ? ` ${esc(ref)}` : ""}: ${esc(service)}</h2>
        ${sections.map(([title, rows]) => `<h3 style="margin:18px 0 6px">${esc(title)}</h3><table cellpadding="6" style="border-collapse:collapse">${rows.map(row).join("")}</table>`).join("")}
        <h3 style="margin:18px 0 6px">Problem / details</h3>
        <p style="white-space:pre-wrap;margin:0">${details ? esc(details) : "-"}</p>
        <p style="margin-top:20px;color:#777;font-size:12px">Sent from the Services page of ${esc(company.domain)}. Also saved in Admin → Service requests. Reply to this email to contact the customer.</p>
      </div>`;
    const plain = [`New service request${ref ? ` ${ref}` : ""}: ${service}`, "",
      ...sections.flatMap(([title, rows]) => [title.toUpperCase(), ...rows.map(([k, v]) => `${k}: ${v}`), ""]),
      "Problem / details:", details || "-"].join("\n");

    try {
      await transporter.sendMail({
        from: SMTP_FROM || `"${company.shortName} Website" <${SMTP_USER}>`,
        to,
        replyTo: { name: pic, address: email },
        subject: `Service Request${ref ? ` ${ref}` : ""} - ${service} - ${description} - ${companyName}`.slice(0, 200),
        text: plain,
        html,
      });
      return true;
    } catch (err) {
      console.error("Service request form: email failed", err);
      return false;
    }
  }
}
