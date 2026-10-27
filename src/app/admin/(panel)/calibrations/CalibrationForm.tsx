"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EXTERNAL_SUGGESTIONS, REMINDER_LABEL, reminderDateFor, VALIDITY_CHOICES, dueDateFor, formatProvider, parseProvider, type CalibrationDraft as Draft } from "@/lib/calibrations";
import { longDate } from "@/lib/serviceJobs";

const Field = ({ id, label, req, children, hint }: { id: string; label: string; req?: boolean; hint?: string; children: React.ReactNode }) => (
  <div>
    <label className="label" htmlFor={id}>{label}{req && <span className="text-red-600"> *</span>}</label>
    {children}
    {hint && <p className="mt-1 text-xs text-slate">{hint}</p>}
  </div>
);

/** Add or edit a calibration record. The due date is calibration date + validity. */
export default function CalibrationForm({ id, initial, nextSticker }: { id?: string; initial: Draft; nextSticker?: string }) {
  const router = useRouter();
  const [c, setC] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const custom = !VALIDITY_CHOICES.includes(c.validity_months);
  const [customValidity, setCustomValidity] = useState(custom);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setC((d) => ({ ...d, [k]: v }));
  const text = (k: keyof Draft) => ({
    value: (c[k] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as never),
  });
  const due = dueDateFor(c.calibration_date, c.validity_months);
  const initialProvider = parseProvider(initial.service_provider);
  const [providerType, setProviderType] = useState<"in-house" | "external">(initialProvider.type);
  const [providerName, setProviderName] = useState(initialProvider.name);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!c.calibration_date || !c.validity_months) return setError("Please enter the calibration date and validity.");
    if (c.reminders_enabled && !c.email?.trim()) return setError("Add the customer email to send the due reminder, or untick \"Send reminder\".");
    if (providerType === "external" && !providerName.trim()) return setError("Please enter the external service provider (who did the calibration).");
    setBusy(true);
    const clean = (v: string | null | undefined) => (v ?? "").trim() || null;
    const row = {
      sticker_no: c.sticker_no.trim(), date_in: c.date_in || null, instrument: c.instrument.trim(), brand: clean(c.brand), model: clean(c.model),
      serial_number: clean(c.serial_number), company: c.company.trim(), contact_person: clean(c.contact_person), contact_no: clean(c.contact_no),
      email: clean(c.email), calibration_date: c.calibration_date, validity_months: Number(c.validity_months),
      service_provider: formatProvider(providerType, providerName), cert_no: clean(c.cert_no),
      remarks: clean(c.remarks), reminders_enabled: c.reminders_enabled, service_job_id: c.service_job_id,
    };
    const supabase = createClient();
    let saved = "";
    if (id) {
      const { error } = await supabase.from("calibrations").update(row).eq("id", id);
      if (error) { setBusy(false); return setError("Could not save: " + error.message); }
      saved = row.sticker_no;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("calibrations").insert({ ...row, created_by: user?.email ?? null }).select("sticker_no").single();
      if (error) {
        setBusy(false);
        return setError(error.message.includes("calibrations") && error.message.includes("exist")
          ? "The calibration log is not set up yet: run supabase/migration_calibrations.sql in Supabase." : "Could not save: " + error.message);
      }
      saved = data.sticker_no;
    }
    router.push(`/admin/calibrations?saved=${encodeURIComponent(saved || "1")}`);
    router.refresh();
  }

  const h2 = "font-display text-2xl font-bold border-b border-line pb-2";
  return (
    <form onSubmit={save} className="max-w-5xl space-y-8">
      <section className="space-y-4">
        <h2 className={h2}>Instrument</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field id="cal-sticker" label="Reference no." hint={!id && !c.sticker_no ? (nextSticker ? `Will be ${nextSticker} when you save. Leave empty to use it.` : "Given automatically when you save.") : undefined}>
            <input id="cal-sticker" {...text("sticker_no")} maxLength={40} className="field" placeholder={id ? "" : nextSticker ?? "Given automatically"} />
          </Field>
          <Field id="cal-in" label="Date in"><input id="cal-in" type="date" {...text("date_in")} className="field" /></Field>
          <Field id="cal-inst" label="Instrument" req><input id="cal-inst" required {...text("instrument")} maxLength={200} className="field" placeholder="e.g. pH Meter" /></Field>
          <Field id="cal-brand" label="Brand"><input id="cal-brand" {...text("brand")} maxLength={120} className="field" placeholder="e.g. Hanna Instruments" /></Field>
          <Field id="cal-model" label="Model"><input id="cal-model" {...text("model")} maxLength={120} className="field" /></Field>
          <Field id="cal-sn" label="Serial no."><input id="cal-sn" {...text("serial_number")} maxLength={120} className="field" /></Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={h2}>Customer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cal-co" label="Company" req><input id="cal-co" required {...text("company")} maxLength={200} className="field" /></Field>
          <Field id="cal-pic" label="Contact person"><input id="cal-pic" {...text("contact_person")} maxLength={120} className="field" /></Field>
          <Field id="cal-tel" label="Contact no."><input id="cal-tel" type="tel" {...text("contact_no")} maxLength={40} className="field" /></Field>
          <Field id="cal-email" label="Email" hint="The calibration due reminder is sent here.">
            <input id="cal-email" type="email" {...text("email")} maxLength={200} className="field" />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={h2}>Calibration</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field id="cal-date" label="Calibration date" req><input id="cal-date" type="date" required {...text("calibration_date")} className="field" /></Field>
          <Field id="cal-valid" label="Validity" req>
            {customValidity ? (
              <div className="flex gap-2">
                <input id="cal-valid" type="number" min={1} max={120} required value={c.validity_months}
                  onChange={(e) => set("validity_months", Number(e.target.value))} className="field" />
                <span className="self-center text-sm text-slate">months</span>
              </div>
            ) : (
              <select id="cal-valid" value={c.validity_months} className="field"
                onChange={(e) => { if (e.target.value === "other") setCustomValidity(true); else set("validity_months", Number(e.target.value)); }}>
                {VALIDITY_CHOICES.map((m) => <option key={m} value={m}>{m} months{m === 12 ? " (1 year)" : m === 24 ? " (2 years)" : m === 36 ? " (3 years)" : ""}</option>)}
                <option value="other">Other...</option>
              </select>
            )}
          </Field>
          <div>
            <span className="label">Calibration due</span>
            <p className="rounded-md border border-line bg-bench px-3 py-2.5 font-semibold">{due ? longDate(due) : "-"}</p>
            <p className="mt-1 text-xs text-slate">Worked out automatically. Reminder email: <b>{due ? longDate(reminderDateFor(due)) : "-"}</b> ({REMINDER_LABEL} before).</p>
          </div>
          <Field id="cal-cert" label="Certificate no."><input id="cal-cert" {...text("cert_no")} maxLength={80} className="field" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="label" id="cal-prov-label">Service provider <span className="text-red-600">*</span></p>
            <div className="flex gap-6 pt-2" role="radiogroup" aria-labelledby="cal-prov-label">
              {(["in-house", "external"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 font-semibold">
                  <input type="radio" name="provider_type" checked={providerType === t} onChange={() => { setProviderType(t); setProviderName(""); }} className="h-4 w-4" />
                  {t === "in-house" ? "In-house" : "External"}
                </label>
              ))}
            </div>
          </div>
          {/* Who did the calibration: only asked for external providers */}
          {providerType === "external" && (
            <Field id="cal-ext" label="External provider" req>
              <input id="cal-ext" list="cal-external" required value={providerName} onChange={(e) => setProviderName(e.target.value)} maxLength={120} className="field" placeholder="Who did the calibration, e.g. Trescal" />
              <datalist id="cal-external">{EXTERNAL_SUGGESTIONS.map((p) => <option key={p} value={p} />)}</datalist>
            </Field>
          )}
        </div>
        <Field id="cal-rem" label="Remarks (staff only)"><textarea id="cal-rem" rows={2} {...text("remarks")} maxLength={2000} className="field" /></Field>
        <label className="flex items-start gap-3 rounded-lg border border-line bg-white p-4">
          <input type="checkbox" checked={c.reminders_enabled} onChange={(e) => set("reminders_enabled", e.target.checked)} className="mt-1 h-4 w-4" />
          <span><b>Send reminder</b><span className="block text-sm text-slate">Email the customer {REMINDER_LABEL} before the due date (a copy goes to the service inbox). Untick if no reminder is needed.</span></span>
        </label>
      </section>

      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="btn-main px-8">{busy ? "Saving..." : id ? "Save changes" : "Add calibration"}</button>
        <button type="button" onClick={() => router.push("/admin/calibrations")} className="btn-line">Cancel</button>
      </div>
    </form>
  );
}
