"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { company, whatsappLink } from "@/lib/company";

const STEPS = [
  { n: 1, title: "Enter your email", text: "The email you gave us for a service, calibration or quotation." },
  { n: 2, title: "Enter the code", text: "We email you a 6-digit code. Type it here (it works for 10 minutes)." },
  { n: 3, title: "See your history", text: "Status, service reports, calibration due dates and requests, right here." },
];

const SHOWS = [
  { title: "Instruments in service", text: "Goods received, in progress or completed, with progress." },
  { title: "Service reports", text: "View, print or save the report of every completed job." },
  { title: "Calibrations", text: "Calibration and due dates, and which ones are due soon." },
  { title: "Requests", text: "Your service requests and quotation requests with us." },
];

/** Check Service form: email → 6-digit code from the email → history (same page, no leaving the site). */
export default function CheckServiceForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [requestId, setRequestId] = useState("");
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);

  async function sendCode(addr: string, website = "") {
    setBusy(true); setError(""); setResent(false);
    try {
      const res = await fetch("/api/check-service", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: addr, website }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) { setEmail(addr); setRequestId(json.requestId); setCode(""); setStep("code"); return true; }
      setError(json.error || "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally { setBusy(false); }
    return false;
  }

  async function onEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await sendCode(String(f.get("email") || "").trim(), String(f.get("website") || ""));
  }

  async function onCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/check-service/verify", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, code }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) { router.refresh(); return; } // the page now shows the history
      setError(json.error || "That code is not correct.");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    }
    setBusy(false);
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
          {step === "code" ? (
            <form onSubmit={onCode} className="space-y-5">
              <div>
                <h2 className="text-3xl font-bold">Enter your code</h2>
                <p className="mt-1 text-slate">If <b className="text-ink">{email}</b> is in our records, we have emailed it a 6-digit code. Please also check your spam folder.</p>
              </div>
              <div>
                <label className="label" htmlFor="cs-code">6-digit code</label>
                <input id="cs-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="field py-3 text-center font-mono text-3xl tracking-[0.5em]" placeholder="••••••" />
              </div>
              {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
              {resent && !error && <p role="status" className="text-sm text-green-800">A new code has been sent (if this email is in our records).</p>}
              <button type="submit" disabled={busy || code.length !== 6} className="btn-main w-full py-3 text-base">{busy ? "Checking..." : "View my service history"}</button>
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <button type="button" className="text-brand underline" onClick={() => { setStep("email"); setError(""); }}>Use a different email</button>
                <button type="button" className="text-brand underline" disabled={busy} onClick={async () => { if (await sendCode(email)) setResent(true); }}>Send a new code</button>
              </div>
            </form>
          ) : (
            <form onSubmit={onEmail} className="space-y-5">
              <div>
                <h2 className="text-3xl font-bold">Find your records</h2>
                <p className="mt-1 text-slate">Enter the email address you gave us. We will email you a code to confirm it is you.</p>
              </div>
              <div>
                <label className="label" htmlFor="cs-email">Email address</label>
                <input id="cs-email" name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={email} className="field py-3 text-lg" placeholder="you@company.com" />
              </div>
              <div className="hidden" aria-hidden="true"><label htmlFor="cs-website">Website</label><input id="cs-website" name="website" tabIndex={-1} autoComplete="off" /></div>
              {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
              <button type="submit" disabled={busy} className="btn-main w-full py-3 text-base">{busy ? "Sending..." : "Send me a code"}</button>
              <p className="text-center text-xs text-slate">For your privacy, we check it is your email before showing any details.</p>
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
