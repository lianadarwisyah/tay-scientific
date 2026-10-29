import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailPattern, readToken } from "@/lib/checkService";
import { STATUS_STYLE, longDate, normaliseJob } from "@/lib/serviceJobs";
import { CAL_STATE_STYLE, calState, dmy, normaliseCal } from "@/lib/calibrations";
import { company } from "@/lib/company";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My service history", robots: { index: false, follow: false } };

const STEPS = ["goods received", "in progress", "completed"] as const;

function Progress({ status }: { status: string }) {
  const at = STEPS.indexOf(status as (typeof STEPS)[number]);
  return (
    <ol className="mt-3 flex items-center gap-2 text-xs font-semibold" aria-label={`Status: ${status}`}>
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${i <= at ? "bg-brand text-white" : "bg-mist text-slate"}`}>{i < at || status === "completed" ? "✓" : i + 1}</span>
          <span className={`capitalize ${i <= at ? "text-ink" : "text-slate"}`}>{s}</span>
          {i < STEPS.length - 1 && <span className={`h-0.5 w-6 ${i < at ? "bg-brand" : "bg-line"}`} />}
        </li>
      ))}
    </ol>
  );
}

const Section = ({ title, count, children }: { title: string; count: number; children: React.ReactNode }) => (
  <section className="mt-10">
    <h2 className="text-3xl font-bold">{title} <span className="text-lg font-normal text-slate">({count})</span></h2>
    <div className="mt-4 space-y-3">{children}</div>
  </section>
);

/** The customer's history, opened from the private link emailed by Check Service. */
export default async function ServiceHistory({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const access = t ? readToken(t) : null;
  if (!access) {
    return (
      <div className="container-x max-w-2xl py-16">
        <h1 className="text-4xl font-bold">This link has expired</h1>
        <p className="mt-3 text-slate">For your privacy, history links work for 60 minutes. Please ask for a new one.</p>
        <Link href="/check-service" className="btn-main mt-6">Get a new link</Link>
      </div>
    );
  }
  const supabase = createAdminClient();
  if (!supabase) return <div className="container-x py-16"><p>Check Service is not available right now. Please email {company.serviceEmail}.</p></div>;
  const pat = emailPattern(access.email);

  const [jobsRes, calsRes, reqRes, quoRes] = await Promise.all([
    supabase.from("service_jobs").select("*").ilike("company_email", pat).order("created_at", { ascending: false }).limit(100),
    supabase.from("calibrations").select("*").ilike("email", pat).order("due_date", { ascending: true }).limit(200),
    supabase.from("service_requests").select("ref,service_type,service_type_other,description,brand,model,serial,status,created_at").ilike("email", pat).order("created_at", { ascending: false }).limit(50),
    supabase.from("quotations").select("ref,status,created_at,quotation_items(product_name,sku,quantity)").ilike("email", pat).order("created_at", { ascending: false }).limit(50),
  ]);
  const jobs = (jobsRes.data ?? []).map((r) => normaliseJob(r));
  const cals = (calsRes.data ?? []).map((r) => normaliseCal(r));
  const requests = reqRes.data ?? [];
  const quotes = (quoRes.data ?? []) as { ref: string; status: string; created_at: string; quotation_items: { product_name: string; sku: string | null; quantity: number }[] }[];
  const company0 = jobs[0]?.company || cals[0]?.company || "";
  const ongoing = jobs.filter((j) => j.status !== "completed").length;
  const dueSoon = cals.filter((c) => calState(c.due_date) !== "valid").length;

  return (
    <div className="container-x py-12">
      <p className="text-sm text-slate">Signed in with a private link for <b>{access.email}</b> · works until {new Date(access.expires).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" })}</p>
      <h1 className="mt-2 text-5xl font-bold">My service history</h1>
      {company0 && <p className="mt-1 text-lg text-slate">{company0}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[["In service now", ongoing], ["Service jobs", jobs.length], ["Calibrations due / overdue", dueSoon], ["Quotation requests", quotes.length]].map(([k, v]) => (
          <div key={k as string} className="rounded-lg border border-line bg-white p-4"><p className="text-sm text-slate">{k}</p><p className="font-display text-3xl font-bold">{v}</p></div>
        ))}
      </div>

      <Section title="Instruments in service" count={jobs.length}>
        {jobs.length === 0 && <p className="text-slate">No service records yet.</p>}
        {jobs.map((j) => (
          <article key={j.id} className="rounded-lg border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate">{j.sr_no}</p>
                <h3 className="text-xl font-bold">{j.instrument}</h3>
                <p className="text-slate">{[j.brand, j.model, j.serial_number && `S/N ${j.serial_number}`].filter(Boolean).join(" · ")}</p>
                {j.extra_equipment.length > 0 && <p className="text-sm text-slate">+ {j.extra_equipment.map((e) => e.instrument).join(", ")}</p>}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[j.status] ?? ""}`}>{j.status}</span>
            </div>
            <p className="mt-2 text-sm">{j.service_type}{j.date_in ? ` · received ${longDate(j.date_in)}` : ""}{j.date_out ? ` · completed ${longDate(j.date_out)}` : ""}</p>
            <Progress status={j.status} />
            {j.status === "completed" && j.public_token && (
              <Link href={`/service-report/${j.public_token}`} className="btn-main mt-4 px-4 py-2 text-sm">View service report</Link>
            )}
          </article>
        ))}
      </Section>

      <Section title="Calibrations" count={cals.length}>
        {cals.length === 0 ? <p className="text-slate">No calibration records yet.</p> : (
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-bench text-slate"><tr>{["Reference", "Instrument", "Calibrated", "Due", "Status", "Cert no."].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {cals.map((c) => {
                  const st = calState(c.due_date);
                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-semibold">{c.sticker_no}</td>
                      <td className="px-4 py-3">{c.instrument}<span className="block text-slate">{[c.brand, c.model, c.serial_number && `S/N ${c.serial_number}`].filter(Boolean).join(" · ")}</span></td>
                      <td className="px-4 py-3">{dmy(c.calibration_date)}</td>
                      <td className="px-4 py-3 font-semibold">{dmy(c.due_date)}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${CAL_STATE_STYLE[st]}`}>{st === "due soon" ? "Due soon" : st === "overdue" ? "Overdue" : "Valid"}</span></td>
                      <td className="px-4 py-3">{c.cert_no || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {dueSoon > 0 && <p className="text-sm">Calibration due? <a className="font-semibold text-brand underline" href={`mailto:${company.serviceEmail}?subject=${encodeURIComponent(`Calibration booking - ${company0 || access.email}`)}`}>Book a calibration</a></p>}
      </Section>

      <Section title="Service requests" count={requests.length}>
        {requests.length === 0 && <p className="text-slate">No service requests from the website yet.</p>}
        {requests.map((r) => (
          <div key={r.ref} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-4">
            <div><p className="font-semibold">{r.ref} · {r.service_type === "Others" ? r.service_type_other : r.service_type}</p>
              <p className="text-sm text-slate">{[r.description, r.brand, r.model].filter(Boolean).join(" · ")} · sent {new Date(r.created_at).toLocaleDateString("en-GB")}</p></div>
            <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold capitalize">{r.status}</span>
          </div>
        ))}
      </Section>

      <Section title="Quotation requests" count={quotes.length}>
        {quotes.length === 0 && <p className="text-slate">No quotation requests yet.</p>}
        {quotes.map((q) => (
          <div key={q.ref} className="rounded-lg border border-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">{q.ref} · {new Date(q.created_at).toLocaleDateString("en-GB")}</p>
              <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold capitalize">{q.status}</span>
            </div>
            <p className="mt-1 text-sm text-slate">{q.quotation_items.map((i) => `${i.quantity} × ${i.product_name}`).join(" · ")}</p>
          </div>
        ))}
      </Section>

      <div className="mt-12 rounded-lg bg-brand-soft p-6">
        <p className="font-semibold">Questions about a service or calibration?</p>
        <p className="mt-1 text-slate">Email <a className="text-brand underline" href={`mailto:${company.serviceEmail}`}>{company.serviceEmail}</a> or call {company.phone}. Quote your SR no. or reference.</p>
      </div>
    </div>
  );
}
