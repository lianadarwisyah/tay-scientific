import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { company } from "@/lib/company";

// Nodemailer needs the Node.js runtime (not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = { name: string; sku: string | null; quantity: number };
type Quote = {
  ref: string; customer_name: string; company: string | null; address?: string | null; email: string;
  phone: string | null; message: string | null; created_at: string; items: Item[];
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Emails a new quotation request to company.quotationEmail (or QUOTATION_EMAIL in the environment).
 * Called by the quote cart right after the quotation is saved. The details are read back from the
 * database (claim_quotation_email), so they cannot be faked, and each quotation is emailed only once.
 */
export async function POST(req: Request) {
  let ref = "";
  try { ref = String((await req.json())?.ref ?? ""); } catch { /* handled below */ }
  if (!/^TSI-\d{4}-\d{4,}$/.test(ref)) return NextResponse.json({ ok: false }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!url || !key) return NextResponse.json({ ok: false }, { status: 500 });
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error("Quotation email: SMTP_HOST, SMTP_USER and SMTP_PASS must be set.");
    return NextResponse.json({ ok: false, error: "Email is not set up" }, { status: 500 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("claim_quotation_email", { p_ref: ref });
  if (error) {
    console.error("Quotation email: could not read quotation", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  if (!data) return NextResponse.json({ ok: true, skipped: true }); // already emailed, too old, or unknown
  const q = data as Quote;

  const to = process.env.QUOTATION_EMAIL || company.quotationEmail;
  const date = new Date(q.created_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" });
  const details: [string, string][] = [
    ["Reference", q.ref], ["Date", date], ["Name", q.customer_name], ["Company", q.company || "-"], ["Address", q.address || "-"],
    ["Email", q.email], ["Phone", q.phone || "-"],
  ];
  const totalQty = q.items.reduce((n, i) => n + i.quantity, 0);

  const html = `
  <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
    <h2 style="margin:0 0 4px">New quotation request ${esc(q.ref)}</h2>
    <p style="margin:0 0 16px;color:#555">${q.items.length} product(s), ${totalQty} item(s) in total</p>
    <table cellpadding="6" style="border-collapse:collapse">
      ${details.map(([k, v]) => `<tr><td style="color:#555;border-bottom:1px solid #eee"><b>${esc(k)}</b></td><td style="border-bottom:1px solid #eee">${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("")}
    </table>
    <h3 style="margin:20px 0 6px">Products</h3>
    <table cellpadding="6" style="border-collapse:collapse;min-width:420px">
      <tr style="background:#f3f5f8;text-align:left"><th>Product</th><th>SKU</th><th style="text-align:right">Qty</th></tr>
      ${q.items.map((i) => `<tr><td style="border-bottom:1px solid #eee">${esc(i.name)}</td><td style="border-bottom:1px solid #eee">${esc(i.sku || "-")}</td><td style="border-bottom:1px solid #eee;text-align:right">${i.quantity}</td></tr>`).join("")}
    </table>
    <h3 style="margin:20px 0 6px">Message from customer</h3>
    <p style="white-space:pre-wrap;margin:0">${q.message ? esc(q.message) : "-"}</p>
    <p style="margin-top:20px;color:#777;font-size:12px">Reply to this email to answer the customer directly. This request is also in Admin → Quotations.</p>
  </div>`;

  const text = [
    `New quotation request ${q.ref}`, "",
    ...details.map(([k, v]) => `${k}: ${v}`), "", "Products:",
    ...q.items.map((i) => `- ${i.name} (${i.sku || "-"}) x ${i.quantity}`), "",
    "Message:", q.message || "-",
  ].join("\n");

  const port = Number(SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_HOST === "smtp.gmail.com" ? SMTP_PASS.replace(/\s/g, "") : SMTP_PASS },
  });

  try {
    await transporter.sendMail({
      from: SMTP_FROM || `"${company.shortName} Website" <${SMTP_USER}>`,
      to,
      replyTo: { name: q.customer_name, address: q.email },
      subject: `Quotation request ${q.ref} - ${q.customer_name}${q.company ? ` (${q.company})` : ""}`,
      text,
      html,
    });
  } catch (err) {
    console.error("Quotation email: sending failed", err);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
