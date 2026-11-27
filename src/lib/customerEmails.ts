import { company } from "@/lib/company";
import { mailerFromEnv } from "@/lib/mailer";

/**
 * "We've received your request" emails to customers and applicants, sent from the website mailbox (SMTP_USER).
 * Replies go to the team that handles the request. A failure here never blocks the form: it is only logged.
 */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const BLUE = "#1E4E9A", LINE = "#E3E6EA", MUTED = "#5B6470";

type Row = [string, string];
type Content = { heading: string; intro: string; rows?: Row[]; table?: { head: string[]; rows: string[][] }; note?: string; closing: string };

function layout(greetName: string, c: Content): { html: string; text: string } {
  const rows = c.rows?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">${c.rows.map(([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:${MUTED};border-bottom:1px solid ${LINE};vertical-align:top;white-space:nowrap"><b>${esc(k)}</b></td><td style="padding:6px 0;border-bottom:1px solid ${LINE}">${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("")}</table>`
    : "";
  const table = c.table
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:12px 0;border:1px solid ${LINE}">
        <tr>${c.table.head.map((h, i) => `<th align="${i === c.table!.head.length - 1 ? "right" : "left"}" style="padding:8px;background:#F3F5F8;font-size:13px;border-bottom:1px solid ${LINE}">${esc(h)}</th>`).join("")}</tr>
        ${c.table.rows.map((r) => `<tr>${r.map((v, i) => `<td align="${i === r.length - 1 ? "right" : "left"}" style="padding:8px;font-size:13px;border-bottom:1px solid ${LINE}">${esc(v)}</td>`).join("")}</tr>`).join("")}
      </table>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F6F7F9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F9"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#FFFFFF;border:1px solid ${LINE};font-family:Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.55">
  <tr><td style="padding:20px 28px;border-bottom:3px solid ${BLUE}"><b style="font-size:18px;color:${BLUE}">${esc(company.name)}</b></td></tr>
  <tr><td style="padding:24px 28px">
    <h1 style="margin:0 0 16px;font-size:20px">${esc(c.heading)}</h1>
    <p style="margin:0 0 12px">Dear ${esc(greetName)},</p>
    <p style="margin:0 0 12px">${esc(c.intro)}</p>
    ${rows}${table}
    ${c.note ? `<p style="margin:12px 0;color:${MUTED}">${esc(c.note)}</p>` : ""}
    <p style="margin:16px 0 0">${esc(c.closing)}</p>
    <p style="margin:16px 0 0">Thank you,<br><b>${esc(company.name)}</b></p>
  </td></tr>
  <tr><td style="padding:18px 28px;border-top:1px solid ${LINE};font-size:12px;color:${MUTED}">
    ${esc(company.address)} · Tel ${esc(company.phone)} · WhatsApp ${esc(company.whatsappDisplay)}<br>
    This is an automatic email confirming we received your request. You can reply to it to reach our team.
  </td></tr>
</table></td></tr></table></body></html>`;
  const text = [c.heading, "", `Dear ${greetName},`, "", c.intro, "",
    ...(c.rows ?? []).map(([k, v]) => `${k}: ${v}`),
    ...(c.table ? ["", c.table.head.join(" | "), ...c.table.rows.map((r) => r.join(" | "))] : []),
    ...(c.note ? ["", c.note] : []), "", c.closing, "", "Thank you,", company.name, "",
    `${company.address} · Tel ${company.phone} · WhatsApp ${company.whatsappDisplay}`].join("\n");
  return { html, text };
}

async function send(to: string, replyTo: string | string[], subject: string, greetName: string, c: Content, label: string) {
  const m = mailerFromEnv();
  if (!m) { console.error(`${label}: customer confirmation not sent (SMTP settings missing).`); return false; }
  const { html, text } = layout(greetName, c);
  try {
    await m.mailer.sendMail({ from: m.from, to, replyTo: Array.isArray(replyTo) ? replyTo.join(", ") : replyTo, subject, html, text });
    return true;
  } catch (err) {
    console.error(`${label}: customer confirmation email failed`, err);
    return false;
  }
}

export function sendQuotationReceived(q: { ref: string; customer_name: string; email: string; company: string | null; items: { name: string; sku: string | null; quantity: number }[] }, replyTo: string[]) {
  return send(q.email, replyTo, `We've received your quotation request ${q.ref} – ${company.shortName}`, q.customer_name, {
    heading: "We've received your quotation request",
    intro: `Thank you for your interest in our products. We have received your quotation request ${q.ref}, and our sales team will prepare a quotation and get back to you soon.`,
    rows: [["Reference", q.ref], ...(q.company ? [["Company", q.company] as Row] : [])],
    table: { head: ["Product", "SKU", "Qty"], rows: q.items.map((i) => [i.name, i.sku || "-", String(i.quantity)]) },
    note: "Prices, availability and delivery details will be included in the quotation from our sales team.",
    closing: `If you need to add or change anything, simply reply to this email and quote ${q.ref}.`,
  }, "Quotation");
}

export function sendEnquiryReceived(e: { name: string; email: string; subject: string; message: string }, replyTo: string[]) {
  return send(e.email, replyTo, `We've received your enquiry – ${company.shortName}`, e.name, {
    heading: "We've received your enquiry",
    intro: "Thank you for contacting us. Our team has received your message and will reply to you soon. Here is a copy of what you sent:",
    rows: [...(e.subject ? [["Subject", e.subject] as Row] : []), ["Message", e.message]],
    closing: "If you have anything to add, simply reply to this email.",
  }, "Enquiry");
}

export function sendServiceRequestReceived(r: { ref: string | null; pic: string; email: string; service: string; description: string; brand: string; model: string; serial: string }, replyTo: string) {
  return send(r.email, replyTo, `We've received your service request${r.ref ? ` ${r.ref}` : ""} – ${company.shortName}`, r.pic, {
    heading: "We've received your service request",
    intro: `Thank you for your service request. Our service team will contact you to arrange the details.`,
    rows: [
      ...(r.ref ? [["Reference", r.ref] as Row] : []),
      ["Service", r.service], ["Equipment", r.description],
      ["Brand / model", [r.brand, r.model].filter(Boolean).join(" / ") || "-"], ["Serial number", r.serial || "-"],
    ],
    closing: `If you have anything to add, simply reply to this email${r.ref ? ` and quote ${r.ref}` : ""}.`,
  }, "Service request");
}

export function sendApplicationReceived(a: { name: string; email: string; position: string }, replyTo: string) {
  return send(a.email, replyTo, `Thank you for your application – ${company.shortName}`, a.name, {
    heading: "Thank you for your application",
    intro: `We have received your application for the position of ${a.position}, together with your CV. Our team will review it and contact you if your profile matches what we are looking for.`,
    closing: "Thank you for your interest in joining us.",
  }, "Careers");
}
