"use client";
import { useState } from "react";
import Link from "next/link";
import { company, whatsappLink } from "@/lib/company";

const STEPS = [
  { n: 1, title: "Enter your email", text: "The email you gave us for a service, calibration or quotation." },
  { n: 2, title: "Check your inbox", text: "We email you a private link. It works for 60 minutes." },
  { n: 3, title: "See your history", text: "Status, service reports, calibration due dates and requests." },
];

const SHOWS = [
  { title: "Instruments in service", text: "Goods received, in progress or completed, with progress." },
  { title: "Service reports", text: "View, print or save the report of every completed job." },
  { title: "Calibrations", text: "Calibration and due dates, and which ones are due soon." },
  { title: "Requests", text: "Your service requests and quotation requests with us." },
];

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
    <div className="bg-bench">
      {/* Simple, calm header */}
      <section className="border-b border-line bg-white">
        <div className="container-x py-10 text-center md:py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-slate"><Link href="/" className="hover:text-ink">Home</Link> / <span className="text-ink">Check Service</span></nav>
          <h1 className="mt-3 text-5xl font-bold">Check Service</h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate">Check the status of your instruments in service, your service reports, calibrations and quotation requests.</p>
        </div>
      </section>

      <div className="container-x py-12">
        {/* Form card */}
        <div className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-7 shadow-sm sm:p-9">
          {state === "sent" ? (
            <div className="text-center" role="status">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700" aria-hidden="true">✓</div>
              <h2 className="mt-4 text-3xl font-bold">Check your email</h2>
              <p className="mt-2 text-slate">If <b className="text-ink">{email}</b> is in our records, we have sent it a private link to your service history.
                It works for 60 minutes. Please also check your spam folder.</p>
              <button type="button" onClick={() => setState("idle")} className="btn-line mt-6">Use a different email</button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <h2 className="text-3xl font-bold">Find your records</h2>
                <p className="mt-1 text-slate">Enter the email address you gave us.</p>
              </div>
              <div>
                <label className="label" htmlFor="cs-email">Email address</label>
                <input id="cs-email" name="email" type="email" required maxLength={200} autoComplete="email" className="field py-3 text-lg" placeholder="you@company.com" />
              </div>
              <div className="hidden" aria-hidden="true"><label htmlFor="cs-website">Website</label><input id="cs-website" name="website" tabIndex={-1} autoComplete="off" /></div>
              {state === "error" && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
              <button type="submit" disabled={state === "busy"} className="btn-main w-full py-3 text-base">{state === "busy" ? "Sending..." : "Email me my service history"}</button>
              <p className="text-center text-xs text-slate">For your privacy, we send the details to your email instead of showing them here.</p>
            </form>
          )}
        </div>

        {/* How it works */}
        <section className="mx-auto mt-14 max-w-5xl" aria-labelledby="cs-how">
          <h2 id="cs-how" className="text-center text-3xl font-bold">How it works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-xl border border-line bg-white p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand font-bold text-white">{s.n}</span>
                <p className="mt-3 font-bold">{s.title}</p>
                <p className="mt-1 text-sm text-slate">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* What you will see */}
        <section className="mx-auto mt-12 max-w-5xl" aria-labelledby="cs-see">
          <h2 id="cs-see" className="text-center text-3xl font-bold">What you will see</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SHOWS.map((s) => (
              <li key={s.title} className="rounded-xl border border-line bg-white p-5">
                <p className="font-bold">{s.title}</p>
                <p className="mt-1 text-sm text-slate">{s.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Help */}
        <section className="mx-auto mt-12 flex max-w-5xl flex-wrap items-center justify-between gap-4 rounded-xl bg-brand-soft p-6">
          <div>
            <p className="font-bold">Need help?</p>
            <p className="text-sm text-slate">Email <a className="text-brand underline" href={`mailto:${company.serviceEmail}`}>{company.serviceEmail}</a> or call {company.phone}.</p>
          </div>
          <a href={whatsappLink("Hi Tay Scientific, I would like to check my service status. ")} target="_blank" rel="noopener" className="btn-wa">WhatsApp {company.whatsappDisplay}</a>
        </section>
      </div>
    </div>
  );
}
