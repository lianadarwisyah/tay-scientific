"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { createClient } from "@/lib/supabase/client";
import { company, whatsappLink } from "@/lib/company";

type Done = { ref: string; name: string; company: string; address: string; items: { name: string; sku: string; quantity: number }[] };

export default function CartPage() {
  const { items, setQty, remove, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const snapshot = items.map((i) => ({ name: i.name, sku: i.sku, quantity: i.quantity }));
    const { data, error } = await createClient().rpc("submit_quotation", {
      payload: {
        customer_name: f.get("name"),
        company: f.get("company"),
        address: f.get("address"),
        email: f.get("email"),
        phone: f.get("phone"),
        message: f.get("message"),
        items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      },
    });
    setBusy(false);
    if (error) return setError("We could not send your quotation request. Please check your details and try again.");
    // Email the request to the company inbox (runs in the background; the quotation is already saved)
    fetch("/api/quotation-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: data }),
      keepalive: true,
    }).catch(() => { /* the request is still in Admin → Quotations */ });
    setDone({ ref: data as string, name: String(f.get("name")), company: String(f.get("company") || ""), address: String(f.get("address") || ""), items: snapshot });
    clear();
  }

  // ---------- Success: printable quotation request ----------
  if (done) {
    const lines = done.items.map((i) => `- ${i.name} (${i.sku}) x ${i.quantity}`).join("\n");
    const wa = whatsappLink(`Hi ${company.shortName}, I just submitted quotation request ${done.ref}.\n\n${lines}`);
    return (
      <div className="container-x max-w-2xl py-12">
        <div className="no-print mb-6 rounded-lg bg-brand-soft p-5">
          <p className="font-display text-xl font-semibold">Quotation request sent</p>
          <p className="mt-1 text-sm">Our team will reply to your email with pricing and availability. Your reference is <strong>{done.ref}</strong>.</p>
        </div>
        <div className="rounded-sm border border-line bg-white p-8">
          <div className="flex justify-between border-b border-dashed border-line pb-4">
            <div>
              <p className="font-display text-2xl font-bold">{company.name}</p>
              <p className="text-sm text-slate">{company.email} · {company.phone}</p>
            </div>
            <div className="text-right text-sm"><p className="font-semibold">Quotation request</p><p>{done.ref}</p><p className="text-slate">{new Date().toLocaleDateString("en-MY")}</p></div>
          </div>
          <p className="mt-4 text-sm">Requested by <strong>{done.name}</strong>{done.company && <>, {done.company}</>}</p>
          {done.address && <p className="mt-1 whitespace-pre-line text-sm text-slate">{done.address}</p>}
          <table className="mt-4 w-full text-sm">
            <thead><tr className="border-b border-line text-left text-slate"><th className="py-2">Product</th><th>SKU</th><th className="text-right">Qty</th></tr></thead>
            <tbody>{done.items.map((i) => (
              <tr key={i.sku} className="border-b border-line/60"><td className="py-2 pr-2">{i.name}</td><td>{i.sku}</td><td className="text-right">{i.quantity}</td></tr>
            ))}</tbody>
          </table>
          <p className="mt-6 text-xs text-slate">Pricing will be provided by {company.shortName} in a formal quotation.</p>
        </div>
        <div className="no-print mt-6 flex flex-wrap gap-3">
          <button onClick={() => window.print()} className="btn-main">Download as PDF</button>
          <a href={wa} target="_blank" rel="noopener" className="btn-quote">Send via WhatsApp</a>
          <Link href="/products" className="btn-line">Continue browsing</Link>
        </div>
        <p className="no-print mt-3 text-xs text-slate">Tip: in the print window, choose “Save as PDF”.</p>
      </div>
    );
  }

  // ---------- Empty ----------
  if (items.length === 0) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-3xl font-bold">Your quote cart is empty</h1>
        <p className="mt-3 text-slate">Add the products you need, then request a quotation.</p>
        <Link href="/products" className="btn-main mt-6">Browse products</Link>
      </div>
    );
  }

  // ---------- Cart + form ----------
  return (
    <div className="container-x grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr]">
      <section>
        <h1 className="text-4xl font-bold">Quote cart</h1>
        <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-white">
          {items.map((i) => (
            <li key={i.productId} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/products/${i.slug}`} className="font-semibold hover:text-brand">{i.name}</Link>
                <p className="text-xs text-slate">SKU {i.sku}</p>
              </div>
              <label className="sr-only" htmlFor={`q-${i.productId}`}>Quantity for {i.name}</label>
              <input id={`q-${i.productId}`} type="number" min={1} value={i.quantity} onChange={(e) => setQty(i.productId, Number(e.target.value))} className="field !w-20" />
              <button onClick={() => remove(i.productId)} className="text-sm font-medium text-slate underline hover:text-ink">Remove</button>
            </li>
          ))}
        </ul>
        <Link href="/products" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">Add more products</Link>
      </section>

      <form onSubmit={onSubmit} className="h-fit space-y-4 rounded-lg border border-line bg-white p-6">
        <h2 className="text-xl font-semibold">Your details</h2>
        <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" required className="field" autoComplete="name" /></div>
        <div><label className="label" htmlFor="company">Company / institution</label><input id="company" name="company" className="field" autoComplete="organization" /></div>
        <div><label className="label" htmlFor="address">Address</label><textarea id="address" name="address" rows={3} maxLength={500} className="field" autoComplete="street-address" placeholder="Street, postcode, city, state" /></div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="field" autoComplete="email" /></div>
        <div><label className="label" htmlFor="phone">Phone / WhatsApp</label><input id="phone" name="phone" type="tel" className="field" autoComplete="tel" /></div>
        <div><label className="label" htmlFor="message">Notes (optional)</label><textarea id="message" name="message" rows={3} className="field" placeholder="Delivery location, needed-by date, etc." /></div>
        {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
        <button disabled={busy} className="btn-quote w-full py-3">{busy ? "Sending..." : "Submit quotation request"}</button>
      </form>
    </div>
  );
}
