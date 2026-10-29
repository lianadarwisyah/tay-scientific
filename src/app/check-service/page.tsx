"use client";
import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { company, whatsappLink } from "@/lib/company";

/** Check Service: the customer enters their email and receives a private link to their history. */
export default function CheckServicePage() {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy"); setError("");
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/check-service", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: f.get("email"), website: f.get("website") }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) { setEmail(String(f.get("email"))); setState("sent"); }
      else { setError(json.error || "Something went wrong. Please try again."); setState("error"); }
    } catch {
      setError("Something went wrong. Please check your connection and try again."); setState("error");
    }
  }

  return (
    <>
      <PageHeader slot="services" title="Check Service" crumbs={[{ label: "Check Service" }]}
        intro="See the status of your instruments in service, your service reports, calibrations and quotation requests." />
      <div className="container-x grid gap-12 py-12 md:grid-cols-[1.2fr_1fr]">
        <div className="max-w-xl">
          {state === "sent" ? (
            <div className="rounded-lg bg-brand-soft p-6" role="status">
              <p className="font-display text-2xl font-bold">Check your email</p>
              <p className="mt-2">If <b>{email}</b> is in our records, we have sent it a private link to your service history.
                The link works for 60 minutes. Please also check your spam folder.</p>
              <button type="button" onClick={() => setState("idle")} className="btn-line mt-5">Use a different email</button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-line bg-white p-6">
              <h2 className="text-3xl font-bold">Find your records</h2>
              <p className="text-slate">Enter the email address you gave us when you sent an instrument for service, booked a calibration or asked for a quotation.</p>
              <div>
                <label className="label" htmlFor="cs-email">Email</label>
                <input id="cs-email" name="email" type="email" required maxLength={200} autoComplete="email" className="field" placeholder="you@company.com" />
              </div>
              <div className="hidden" aria-hidden="true"><label htmlFor="cs-website">Website</label><input id="cs-website" name="website" tabIndex={-1} autoComplete="off" /></div>
              {state === "error" && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
              <button type="submit" disabled={state === "busy"} className="btn-main w-full">{state === "busy" ? "Sending..." : "Email me my service history"}</button>
              <p className="text-xs text-slate">For your privacy, we send the details to your email instead of showing them here.</p>
            </form>
          )}
        </div>
        <aside className="h-fit rounded-lg border border-line bg-white p-6">
          <h2 className="text-2xl font-bold">What you will see</h2>
          <ul className="mt-3 space-y-2 text-slate">
            <li><b className="text-ink">Instruments in service:</b> goods received, in progress or completed.</li>
            <li><b className="text-ink">Service reports:</b> view, print or save completed reports.</li>
            <li><b className="text-ink">Calibrations:</b> calibration and due dates, and which are due soon.</li>
            <li><b className="text-ink">Requests:</b> your service requests and quotation requests.</li>
          </ul>
          <p className="mt-5 text-sm text-slate">Need help? Email <a className="text-brand underline" href={`mailto:${company.serviceEmail}`}>{company.serviceEmail}</a></p>
          <a href={whatsappLink("Hi Tay Scientific, I would like to check my service status. ")} target="_blank" rel="noopener" className="btn-wa mt-4 w-full">WhatsApp {company.whatsappDisplay}</a>
        </aside>
      </div>
    </>
  );
}
