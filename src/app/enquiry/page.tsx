"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { company, whatsappLink } from "@/lib/company";
import PageHeader from "@/components/PageHeader";

export default function EnquiryPage() {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy");
    const f = new FormData(e.currentTarget);
    // Hidden "website" field: real people leave it empty, simple spam bots fill it in.
    if (f.get("website")) return setState("sent");
    try {
      const { error } = await createClient().from("enquiries").insert({
        name: f.get("name"), email: f.get("email"), phone: f.get("phone") || null,
        subject: f.get("subject") || null, message: f.get("message"),
      });
      setState(error ? "error" : "sent");
    } catch {
      setState("error");
    }
  }

  return (
    <>
    <PageHeader slot="contact" title="Contact us" crumbs={[{ label: "Contact" }]} intro="Cannot find a product, or have a technical question? Tell us and we will get back to you." />
    <div className="container-x grid gap-12 py-12 md:grid-cols-[1.3fr_1fr]">
      <div>
        <h2 className="text-3xl font-bold">Send an enquiry</h2>
        {state === "sent" ? (
          <div className="mt-8 rounded-lg bg-brand-soft p-6" role="status">
            <p className="font-display text-xl font-semibold">Enquiry sent</p>
            <p className="mt-1 text-sm">Thank you. We will reply by email as soon as we can.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" required maxLength={120} autoComplete="name" className="field" /></div>
              <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required maxLength={200} autoComplete="email" className="field" /></div>
              <div><label className="label" htmlFor="phone">Phone / WhatsApp</label><input id="phone" name="phone" type="tel" className="field" /></div>
              <div><label className="label" htmlFor="subject">Subject</label><input id="subject" name="subject" className="field" /></div>
            </div>
            <div><label className="label" htmlFor="message">Message</label><textarea id="message" name="message" rows={5} required maxLength={4000} className="field" /></div>
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="website">Leave this field empty</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            {state === "error" && <p role="alert" className="text-sm font-medium text-red-700">Your enquiry could not be sent. Please try again or contact us on WhatsApp.</p>}
            <button disabled={state === "busy"} className="btn-main px-6 py-3">{state === "busy" ? "Sending..." : "Send enquiry"}</button>
          </form>
        )}
      </div>
      <aside className="h-fit rounded-lg border border-line bg-white p-6 text-sm">
        <p className="font-display text-lg font-semibold">Prefer to talk?</p>
        <p className="mt-3">{company.phone}</p>
        <p className="mt-1">{company.phone2}</p>
        <p className="mt-1"><a className="text-brand underline" href={`mailto:${company.email}`}>{company.email}</a></p>
        <p className="mt-3 text-slate">{company.address}</p>
        <p className="mt-1 text-slate">{company.hours}</p>
        <a href={whatsappLink("Hi Tay Scientific, I would like to enquire about ")} target="_blank" rel="noopener" className="btn-wa mt-5 w-full">Contact via WhatsApp</a>
      </aside>
    </div>
    </>
  );
}
