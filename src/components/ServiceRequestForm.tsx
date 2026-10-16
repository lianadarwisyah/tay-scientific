"use client";
import { useRef, useState } from "react";
import { company } from "@/lib/company";
import { serviceTypes } from "@/lib/serviceTypes";

/** "Request a service" form on the Services page. Sends to /api/service-request, which emails company.serviceEmail. */
export default function ServiceRequestForm() {
  const sectionRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy"); setError("");
    try {
      const res = await fetch("/api/service-request", { method: "POST", body: new FormData(e.currentTarget) });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setState("sent"); formRef.current?.reset(); setType("");
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        setError(json.error || "Your request could not be sent. Please try again."); setState("error");
      }
    } catch {
      setError("Your request could not be sent. Please check your connection and try again."); setState("error");
    }
  }

  return (
    <section id="request" ref={sectionRef} className="scroll-mt-24 border-y border-line bg-white py-16">
      <div className="container-x grid gap-10 md:grid-cols-[1fr_1.6fr] md:gap-16">
        <div>
          <h2 className="text-4xl font-bold sm:text-5xl">Request a service</h2>
          <p className="mt-4 text-lg text-slate">
            Tell us what you need and which equipment it is for. Our service team will contact you to arrange the details.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate">
            <li>Calibration, diagnostic, training, preventive maintenance and more.</li>
            <li>Have the brand, model and serial number (S/N) ready: it is usually on a label at the back or bottom of the unit.</li>
            <li>
              Prefer email? Write to{" "}
              <a href={`mailto:${company.serviceEmail}`} className="font-medium text-brand underline">{company.serviceEmail}</a>.
            </li>
          </ul>
        </div>

        {state === "sent" ? (
          <div className="h-fit rounded-lg bg-brand-soft p-8" role="status">
            <p className="font-display text-3xl font-bold">Request sent</p>
            <p className="mt-2">Thank you. Our service team has your request and will contact you soon.</p>
            <button type="button" onClick={() => setState("idle")} className="btn-line mt-6 px-5 py-2.5">Send another request</button>
          </div>
        ) : (
          <form ref={formRef} onSubmit={onSubmit} className="space-y-8 rounded-lg border border-line bg-bench p-6 sm:p-8">
            {/* 1. Type of service */}
            <fieldset className="space-y-4">
              <legend className="font-display text-2xl font-bold">1. Type of service</legend>
              <div>
                <label className="label" htmlFor="svc-type">Service needed *</label>
                <select id="svc-type" name="service_type" required value={type} onChange={(e) => setType(e.target.value)} className="field">
                  <option value="" disabled>Choose a service</option>
                  {serviceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {type === "Others" && (
                <div>
                  <label className="label" htmlFor="svc-type-other">Please specify *</label>
                  <input id="svc-type-other" name="service_type_other" required maxLength={120} className="field" placeholder="e.g. Installation, repair, relocation" />
                </div>
              )}
            </fieldset>

            {/* 2. Equipment info */}
            <fieldset className="space-y-4">
              <legend className="font-display text-2xl font-bold">2. Equipment info</legend>
              <div>
                <label className="label" htmlFor="svc-desc">Description (product name) *</label>
                <input id="svc-desc" name="description" required maxLength={200} className="field" placeholder="e.g. UV-Vis spectrophotometer, analytical balance" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><label className="label" htmlFor="svc-brand">Brand</label><input id="svc-brand" name="brand" maxLength={120} className="field" /></div>
                <div><label className="label" htmlFor="svc-model">Model</label><input id="svc-model" name="model" maxLength={120} className="field" /></div>
                <div><label className="label" htmlFor="svc-serial">S/N</label><input id="svc-serial" name="serial" maxLength={120} className="field" placeholder="Serial number" /></div>
              </div>
              <div>
                <label className="label" htmlFor="svc-details">Problem / details</label>
                <textarea id="svc-details" name="details" rows={3} maxLength={4000} className="field" placeholder="What is wrong, or what you need done (optional)" />
              </div>
            </fieldset>

            {/* 3. Customer contact */}
            <fieldset className="space-y-4">
              <legend className="font-display text-2xl font-bold">3. Customer contact</legend>
              <div><label className="label" htmlFor="svc-company">Company name *</label><input id="svc-company" name="company" required maxLength={200} autoComplete="organization" className="field" /></div>
              <div>
                <label className="label" htmlFor="svc-address">Address *</label>
                <textarea id="svc-address" name="address" required rows={3} maxLength={500} autoComplete="street-address" className="field" placeholder="Street, postcode, city, state" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><label className="label" htmlFor="svc-pic">PIC name *</label><input id="svc-pic" name="pic_name" required maxLength={120} autoComplete="name" className="field" /></div>
                <div><label className="label" htmlFor="svc-email">Email *</label><input id="svc-email" name="email" type="email" required maxLength={200} autoComplete="email" className="field" /></div>
                <div><label className="label" htmlFor="svc-contact">Contact *</label><input id="svc-contact" name="contact" type="tel" required maxLength={40} autoComplete="tel" placeholder="e.g. 012-345 6789" className="field" /></div>
              </div>
            </fieldset>

            {/* Spam trap: hidden from people */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="svc-website">Website</label><input id="svc-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>

            {state === "error" && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
            <button type="submit" disabled={state === "busy"} className="btn-main w-full py-3 sm:w-auto sm:px-10">
              {state === "busy" ? "Sending..." : "Submit service request"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
