"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage, PHOTO_SIZES, PHOTO_TYPES, MAX_PICK_MB } from "@/lib/compressImage";
import { todayMY } from "@/lib/types";
import {
  JOB_STATUSES, JOB_SERVICE_TYPES, WARRANTY_OPTIONS, WORK_RESULTS, emptyTimeLog, emptyWorkItem,
  type JobDraft, type TimeLog, type WorkItem,
} from "@/lib/serviceJobs";

/** Path inside the "service-photos" bucket from its public URL. */
const photoPath = (url: string) => {
  const m = "/storage/v1/object/public/service-photos/"; const i = url.indexOf(m);
  return i === -1 ? null : decodeURIComponent(url.slice(i + m.length));
};

const Field = ({ id, label, req, children }: { id: string; label: string; req?: boolean; children: React.ReactNode }) => (
  <div><label className="label" htmlFor={id}>{label}{req && <span className="text-red-600"> *</span>}</label>{children}</div>
);

export default function ServiceJobForm({ id, initial, nextSr, lastNotified }: { id?: string; initial: JobDraft; nextSr?: string; lastNotified?: string | null }) {
  const router = useRouter();
  const [job, setJob] = useState<JobDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  // Email the customer when the status is new to them (ticked by default), or untick to save quietly
  const [notifyChoice, setNotifyChoice] = useState<boolean | null>(null);
  const statusIsNew = job.status !== (lastNotified ?? null);
  const notify = notifyChoice ?? statusIsNew;
  const [showReport, setShowReport] = useState(initial.status !== "goods received" || initial.work_items.some((w) => w.task));

  const set = <K extends keyof JobDraft>(k: K, v: JobDraft[K]) => setJob((j) => ({ ...j, [k]: v }));
  const text = (k: keyof JobDraft) => ({
    value: (job[k] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never),
  });

  const setWork = (i: number, patch: Partial<WorkItem>) => set("work_items", job.work_items.map((w, k) => (k === i ? { ...w, ...patch } : w)));
  const setLog = (i: number, patch: Partial<TimeLog>) => set("time_logs", job.time_logs.map((t, k) => (k === i ? { ...t, ...patch } : t)));

  async function addPhotos(i: number, files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const supabase = createClient();
    const urls: string[] = [];
    setUploading(i);
    for (const f of Array.from(files)) {
      if (!PHOTO_TYPES.includes(f.type) || f.size > MAX_PICK_MB * 1024 * 1024) { setError(`"${f.name}": use JPG, PNG or WebP up to ${MAX_PICK_MB} MB.`); continue; }
      let small = f;
      try { small = await compressImage(f, PHOTO_SIZES.event); } catch { /* keep original */ }
      const path = `${todayMY().slice(0, 7)}/${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from("service-photos").upload(path, small, { contentType: small.type, cacheControl: "31536000" });
      if (up.error) { setError(`Photo upload failed: ${up.error.message}${up.error.message.includes("not found") ? " (run supabase/migration_service_portal.sql)" : ""}`); break; }
      urls.push(supabase.storage.from("service-photos").getPublicUrl(path).data.publicUrl);
    }
    setUploading(null);
    setJob((j) => ({ ...j, work_items: j.work_items.map((w, k) => (k === i ? { ...w, photos: [...w.photos, ...urls] } : w)) }));
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const completing = job.status === "completed";
    // Which button was pressed: "Save" keeps working on the record, "Save and generate report" opens the report
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const generate = completing && submitter?.value === "report";
    const work = job.work_items.filter((w) => w.task.trim() || w.photos.length);
    const logs = job.time_logs.filter((t) => Object.values(t).some((v) => String(v).trim()));
    if (generate) {
      const missing: string[] = [];
      if (!work.length) missing.push("at least one work scope item");
      if (!job.job_completed) missing.push("\"service job completed\" (Section G)");
      if (!job.repairable) missing.push("repairable / non-repairable (Section G)");
      if (!(job.engineer_name || job.serviced_by)?.trim()) missing.push("service engineer name");
      if (missing.length) { setShowReport(true); return setError(`To mark the job as completed and generate the report, please fill in: ${missing.join(", ")}.`); }
    }
    setBusy(true);
    const supabase = createClient();
    const today = todayMY();
    const clean = (v: string | null | undefined) => (v ?? "").trim() || null;
    const row = {
      ...job,
      sr_no: job.sr_no.trim(), // empty: the database assigns the next number
      instrument: job.instrument.trim(), brand: job.brand.trim(), model: job.model.trim(), serial_number: job.serial_number.trim(),
      company: job.company.trim(), company_email: job.company_email.trim(),
      description: clean(job.description), condition: clean(job.condition), company_phone: clean(job.company_phone),
      contact_person: clean(job.contact_person), delivery_address: clean(job.delivery_address), serviced_by: clean(job.serviced_by),
      po_number: clean(job.po_number), invoice_no: clean(job.invoice_no), remarks: clean(job.remarks), continue_on: clean(job.continue_on),
      recommendation: clean(job.recommendation), customer_approval_name: clean(job.customer_approval_name),
      date_in: job.date_in || null, customer_approval_date: job.customer_approval_date || null,
      date_out: job.date_out || (completing ? today : null),
      report_date: job.report_date || (completing ? today : null),
      engineer_name: clean(job.engineer_name) ?? (completing ? clean(job.serviced_by) : null),
      work_items: work.map((w) => ({ ...w, task: w.task.trim(), note: w.note.trim() })),
      time_logs: logs,
      extra_equipment: job.extra_equipment.map((e) => ({ instrument: e.instrument.trim(), brand: e.brand.trim(), model: e.model.trim(), serial_number: e.serial_number.trim() }))
        .filter((e) => e.instrument || e.brand || e.model || e.serial_number),
    };
    if (!row.extra_equipment.length) delete (row as Partial<typeof row>).extra_equipment; // also works before migration_service_equipment.sql
    let savedId = id;
    let savedSr = row.sr_no;
    if (id) {
      const { error } = await supabase.from("service_jobs").update(row).eq("id", id);
      if (error) { setBusy(false); return setError("Could not save: " + error.message + (error.message.includes("extra_equipment") ? " (run supabase/migration_service_equipment.sql)" : "")); }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("service_jobs").insert({ ...row, created_by: user?.email ?? null }).select("id,sr_no").single();
      if (error) {
        setBusy(false);
        return setError(error.message.includes("service_jobs") && error.message.includes("exist")
          ? "The service portal is not set up yet: run supabase/migration_service_portal.sql in Supabase." : "Could not save: " + error.message);
      }
      savedId = data.id;
      savedSr = data.sr_no;
      // A job created from a website service request moves that request to "in progress"
      if (job.service_request_id) await supabase.from("service_requests").update({ status: "in progress" }).eq("id", job.service_request_id).eq("status", "new");
    }
    // Email the customer about this status (goods received / in progress / completed)
    let emailParam = "";
    if (notify && savedId) {
      try {
        const res = await fetch("/api/service-job-email", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: savedId, force: !statusIsNew }) });
        const json = await res.json().catch(() => ({}));
        emailParam = json.ok ? (json.skipped ? "" : "sent") : "failed";
      } catch { emailParam = "failed"; }
    }
    const gone = removedPhotos.filter((u) => !row.work_items.some((w) => w.photos.includes(u))).map(photoPath).filter((p): p is string => !!p);
    if (gone.length) await supabase.storage.from("service-photos").remove(gone);
    const em = emailParam ? `&email=${emailParam}` : "";
    router.push(generate ? `/admin/service-portal/${savedId}/report?saved=1${em}` : `/admin/service-portal?saved=${encodeURIComponent(savedSr || "1")}${em}`);
    router.refresh();
  }

  const h2 = "font-display text-2xl font-bold border-b border-line pb-2";

  return (
    <form onSubmit={save} className="max-w-5xl space-y-10">
      {/* ---------- Job ---------- */}
      <section className="grid gap-4 rounded-lg border border-line bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="sj-sr" label="Report no. (SR No.)">
          <input id="sj-sr" {...text("sr_no")} maxLength={40} className="field" placeholder={id ? "" : nextSr ?? "Given automatically"} />
          {!id && !job.sr_no && <p className="mt-1 text-xs text-slate">{nextSr ? <>This job will be <b>{nextSr}</b> when you save. Leave empty to use it.</> : "Given automatically when you save."}</p>}
        </Field>
        <Field id="sj-status" label="Status" req>
          <select id="sj-status" {...text("status")} className="field capitalize">
            {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field id="sj-in" label="Date in"><input id="sj-in" type="date" {...text("date_in")} className="field" /></Field>
        <Field id="sj-out" label="Date out"><input id="sj-out" type="date" {...text("date_out")} className="field" /></Field>
      </section>

      {/* ---------- Instrument ---------- */}
      <section className="space-y-4">
        <h2 className={h2}>Instrument details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="sj-inst" label="Instrument" req><input id="sj-inst" required {...text("instrument")} maxLength={200} className="field" placeholder="e.g. Kjeldahl Distillation Unit" /></Field>
          <Field id="sj-brand" label="Brand" req><input id="sj-brand" required {...text("brand")} maxLength={120} className="field" placeholder="e.g. Drawell, Stier, Precisa" /></Field>
          <Field id="sj-model" label="Model" req><input id="sj-model" required {...text("model")} maxLength={120} className="field" /></Field>
          <Field id="sj-sn" label="Serial number" req><input id="sj-sn" required {...text("serial_number")} maxLength={120} className="field" /></Field>
          <Field id="sj-cond" label="Condition"><input id="sj-cond" {...text("condition")} maxLength={120} className="field" placeholder="e.g. Good, Fair, Poor" /></Field>
        </div>

        {/* More instruments on the same report: each one becomes another column in Section D */}
        {job.extra_equipment.map((e, i) => (
          <div key={i} className="rounded-lg border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold">Instrument {i + 2}</h3>
              <button type="button" onClick={() => set("extra_equipment", job.extra_equipment.filter((_, k) => k !== i))} className="text-sm text-red-700 hover:underline">Remove</button>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {([["instrument", "Instrument", 200], ["brand", "Brand", 120], ["model", "Model", 120], ["serial_number", "Serial number", 120]] as const).map(([key, label, max]) => (
                <Field key={key} id={`eq-${i}-${key}`} label={label} req={key === "instrument"}>
                  <input id={`eq-${i}-${key}`} required={key === "instrument"} maxLength={max} className="field" value={e[key]}
                    onChange={(ev) => set("extra_equipment", job.extra_equipment.map((x, k) => (k === i ? { ...x, [key]: ev.target.value } : x)))} />
                </Field>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => set("extra_equipment", [...job.extra_equipment, { instrument: "", brand: "", model: "", serial_number: "" }])}
          className="btn-line px-4 py-2 text-sm">+ Add another instrument</button>
        <p className="text-xs text-slate">Only add more when several instruments are serviced on the same report. Each one is shown as a column in Section D.</p>
      </section>

      {/* ---------- Company ---------- */}
      <section className="space-y-4">
        <h2 className={h2}>Company details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="sj-co" label="Company" req><input id="sj-co" required {...text("company")} maxLength={200} className="field" /></Field>
          <Field id="sj-email" label="Company email" req><input id="sj-email" type="email" required {...text("company_email")} maxLength={200} className="field" /></Field>
          <Field id="sj-phone" label="Company phone number"><input id="sj-phone" type="tel" {...text("company_phone")} maxLength={40} className="field" /></Field>
          <Field id="sj-pic" label="Contact person"><input id="sj-pic" {...text("contact_person")} maxLength={120} className="field" /></Field>
        </div>
        <Field id="sj-addr" label="Delivery address"><textarea id="sj-addr" rows={3} {...text("delivery_address")} maxLength={500} className="field" /></Field>
      </section>

      {/* ---------- Service ---------- */}
      <section className="space-y-4">
        <h2 className={h2}>Service details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="sj-svc" label="Service" req>
            <select id="sj-svc" required {...text("service_type")} className="field">
              <option value="" disabled>Select service type</option>
              {JOB_SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field id="sj-by" label="Serviced by"><input id="sj-by" {...text("serviced_by")} maxLength={120} className="field" placeholder="Technician name" /></Field>
          <Field id="sj-po" label="Purchase order number"><input id="sj-po" {...text("po_number")} maxLength={80} className="field" /></Field>
          <Field id="sj-war" label="Warranty information">
            <select id="sj-war" {...text("warranty")} className="field">{WARRANTY_OPTIONS.map((w) => <option key={w}>{w}</option>)}</select>
          </Field>
          <Field id="sj-inv" label="Invoice / document no."><input id="sj-inv" {...text("invoice_no")} maxLength={80} className="field" placeholder="e.g. IN26-5846" /></Field>
        </div>
        <Field id="sj-rem" label="Remarks (staff only, not on the report)"><textarea id="sj-rem" rows={3} {...text("remarks")} maxLength={4000} className="field" placeholder="Additional notes, observations or special instructions" /></Field>
      </section>

      {/* ---------- Report ---------- */}
      <section className="space-y-6 rounded-lg border border-line bg-bench p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">Service report details</h2>
            <p className="text-sm text-slate">Fill in as the work is done. The report can be generated when the status is <b>completed</b>.</p>
          </div>
          <button type="button" onClick={() => setShowReport((v) => !v)} className="btn-line px-4 py-2 text-sm">{showReport ? "Hide" : "Show"}</button>
        </div>

        {showReport && (
          <>
            {/* Section E: work description */}
            <div>
              <h3 className="text-lg font-bold">Work description (Section E)</h3>
              <ol className="mt-3 space-y-4">
                {job.work_items.map((w, i) => (
                  <li key={i} className="rounded-lg border border-line bg-white p-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                      <Field id={`w-task-${i}`} label={`${i + 1}. Work scope`}>
                        <input id={`w-task-${i}`} value={w.task} onChange={(e) => setWork(i, { task: e.target.value })} maxLength={300} className="field" placeholder="e.g. Inspect wiring" />
                      </Field>
                      <Field id={`w-res-${i}`} label="Result">
                        <select id={`w-res-${i}`} value={w.result} onChange={(e) => setWork(i, { result: e.target.value })} className="field">
                          <option value="">-</option>
                          {WORK_RESULTS.map((r) => <option key={r}>{r}</option>)}
                        </select>
                      </Field>
                    </div>
                    <div className="mt-3">
                      <Field id={`w-note-${i}`} label="Note">
                        <input id={`w-note-${i}`} value={w.note} onChange={(e) => setWork(i, { note: e.target.value })} maxLength={500} className="field" placeholder="e.g. When valve is closed, the boric acid still dispensing" />
                      </Field>
                    </div>
                    <div className="mt-3">
                      <span className="label">Photos</span>
                      {w.photos.length > 0 && (
                        <ul className="mb-2 flex flex-wrap gap-2">
                          {w.photos.map((p) => (
                            <li key={p} className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p} alt="" className="h-24 w-24 rounded-md border border-line object-cover" />
                              <button type="button" aria-label="Remove photo" className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 text-sm font-bold text-white"
                                onClick={() => { setRemovedPhotos((r) => [...r, p]); setWork(i, { photos: w.photos.filter((x) => x !== p) }); }}>×</button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <input type="file" multiple accept={PHOTO_TYPES.join(",")} disabled={uploading !== null} className="block text-sm"
                        onChange={(e) => { addPhotos(i, e.target.files); e.target.value = ""; }} aria-label={`Add photos for item ${i + 1}`} />
                      {uploading === i && <p className="mt-1 text-sm text-slate" role="status">Uploading photos...</p>}
                    </div>
                    {job.work_items.length > 1 && (
                      <button type="button" onClick={() => { setRemovedPhotos((r) => [...r, ...w.photos]); set("work_items", job.work_items.filter((_, k) => k !== i)); }}
                        className="mt-3 text-sm text-red-700 hover:underline">Remove this item</button>
                    )}
                  </li>
                ))}
              </ol>
              <button type="button" onClick={() => set("work_items", [...job.work_items, emptyWorkItem()])} className="btn-line mt-3 px-4 py-2 text-sm">+ Add work item</button>
            </div>

            {/* Section F: time */}
            <div>
              <h3 className="text-lg font-bold">Working / travelling time (Section F)</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead><tr className="text-left text-slate">
                    {["Date", "Start", "Stop", "Working hours", "Travelling hours", "Distance (km)", "Overnight stay", "GA/GW", ""].map((h) => <th key={h} className="px-1 pb-1 font-semibold">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {job.time_logs.map((t, i) => (
                      <tr key={i}>
                        <td className="p-1"><input type="date" aria-label="Date" value={t.date} onChange={(e) => setLog(i, { date: e.target.value })} className="field py-1.5" /></td>
                        <td className="p-1"><input aria-label="Start" value={t.start} onChange={(e) => setLog(i, { start: e.target.value })} className="field py-1.5" placeholder="1100" /></td>
                        <td className="p-1"><input aria-label="Stop" value={t.stop} onChange={(e) => setLog(i, { stop: e.target.value })} className="field py-1.5" placeholder="1300" /></td>
                        <td className="p-1"><input aria-label="Working hours" value={t.working_hours} onChange={(e) => setLog(i, { working_hours: e.target.value })} className="field py-1.5" placeholder="2 Hours/Day" /></td>
                        <td className="p-1"><input aria-label="Travelling hours" value={t.travel_hours} onChange={(e) => setLog(i, { travel_hours: e.target.value })} className="field py-1.5" placeholder="N/A" /></td>
                        <td className="p-1"><input aria-label="Distance" value={t.distance} onChange={(e) => setLog(i, { distance: e.target.value })} className="field py-1.5" placeholder="N/A" /></td>
                        <td className="p-1"><input aria-label="Overnight stay" value={t.overnight} onChange={(e) => setLog(i, { overnight: e.target.value })} className="field py-1.5" placeholder="N/A" /></td>
                        <td className="p-1"><input aria-label="GA/GW" value={t.ga_gw} onChange={(e) => setLog(i, { ga_gw: e.target.value })} className="field py-1.5" placeholder="N/A" /></td>
                        <td className="p-1">{job.time_logs.length > 1 && <button type="button" aria-label="Remove row" onClick={() => set("time_logs", job.time_logs.filter((_, k) => k !== i))} className="px-2 text-red-700">×</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => set("time_logs", [...job.time_logs, emptyTimeLog()])} className="btn-line mt-2 px-4 py-2 text-sm">+ Add day</button>
            </div>

            {/* Section G + H */}
            <div className="grid gap-6 md:grid-cols-2">
              <fieldset className="space-y-3">
                <legend className="text-lg font-bold">Service (Section G)</legend>
                <p className="text-sm">The service job is completed. The customer was informed about any changes made.</p>
                <div className="flex gap-5">
                  {(["yes", "no", "n/a"] as const).map((v) => (
                    <label key={v} className="flex items-center gap-2 uppercase"><input type="radio" name="job_completed" checked={job.job_completed === v} onChange={() => set("job_completed", v)} /> {v}</label>
                  ))}
                </div>
                <div className="flex gap-5">
                  {(["repairable", "non-repairable"] as const).map((v) => (
                    <label key={v} className="flex items-center gap-2 capitalize"><input type="radio" name="repairable" checked={job.repairable === v} onChange={() => set("repairable", v)} /> {v}</label>
                  ))}
                </div>
                <Field id="sj-cont" label="The service will continue on"><input id="sj-cont" {...text("continue_on")} maxLength={120} className="field" placeholder="e.g. date of next visit (optional)" /></Field>
              </fieldset>
              <Field id="sj-reco" label="Recommendation (Section H)">
                <textarea id="sj-reco" rows={6} {...text("recommendation")} maxLength={2000} className="field" placeholder={"e.g. Change valve for the Boric Acid line.\nWill claim warranty from principal."} />
              </Field>
            </div>

            {/* Section I */}
            <div>
              <h3 className="text-lg font-bold">Declaration (Section I)</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field id="sj-eng" label="Service engineer"><input id="sj-eng" {...text("engineer_name")} maxLength={120} className="field" placeholder={job.serviced_by || "Name"} /></Field>
                <Field id="sj-rdate" label="Report date"><input id="sj-rdate" type="date" {...text("report_date")} className="field" /></Field>
                <Field id="sj-cname" label="Customer approval name"><input id="sj-cname" {...text("customer_approval_name")} maxLength={120} className="field" placeholder="Optional: filled in on paper" /></Field>
                <Field id="sj-cdate" label="Customer approval date"><input id="sj-cdate" type="date" {...text("customer_approval_date")} className="field" /></Field>
              </div>
              <p className="mt-2 text-xs text-slate">The report has a signature box for the customer&apos;s approval. Leave the customer name and date empty to let the customer write them by hand.</p>
            </div>
          </>
        )}
      </section>

      <label className="flex items-start gap-3 rounded-lg border border-line bg-white p-4">
        <input type="checkbox" checked={notify} onChange={(e) => setNotifyChoice(e.target.checked)} className="mt-1 h-4 w-4" />
        <span>
          <b>Email the customer about this update</b>
          <span className="block text-sm text-slate">
            Sends a &quot;<span className="capitalize">{job.status}</span>&quot; email to {job.company_email || "the company email"}
            {job.status === "completed" ? " with a link to view and print the service report" : ""}. A copy goes to the service inbox.
            {!statusIsNew && " The customer was already told about this status, so this sends it again."}
          </span>
        </span>
      </label>

      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" name="intent" value="save" disabled={busy || uploading !== null} className={job.status === "completed" ? "btn-line px-8" : "btn-main px-8"}>
          {busy ? "Saving..." : job.status === "completed" ? "Save" : "Submit service record"}
        </button>
        {job.status === "completed" && (
          <button type="submit" name="intent" value="report" disabled={busy || uploading !== null} className="btn-main px-8">
            {busy ? "Saving..." : "Save and generate report"}
          </button>
        )}
        <button type="button" onClick={() => router.push("/admin/service-portal")} className="btn-line">Cancel</button>
        <span className="text-sm text-slate">
          {job.status === "completed"
            ? <><b>Save</b> keeps the record without opening the report; <b>Save and generate report</b> checks the report sections and opens the report.</>
            : <>The report can be generated once the status is set to <b>completed</b>.</>}
        </span>
      </div>
    </form>
  );
}
