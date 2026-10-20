import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RequestActions from "./RequestActions";
import { SERVICE_STATUSES } from "@/lib/serviceTypes";

export const dynamic = "force-dynamic";

type R = {
  id: string; ref: string; service_type: string; service_type_other: string | null; description: string; brand: string | null;
  model: string | null; serial: string | null; details: string | null; company: string; address: string; pic_name: string;
  email: string; contact: string; status: string; staff_notes: string | null; emailed_at: string | null; created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  new: "bg-accent/20 text-ink", "in progress": "bg-brand-soft text-brand-dark", done: "bg-green-100 text-green-800", cancelled: "bg-mist text-slate",
};

export default async function ServiceRequestsAdmin({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = (SERVICE_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status! : "";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const supabase = (await createClient())!;

  let query = supabase.from("service_requests").select("*").order("created_at", { ascending: false }).limit(200);
  if (status) query = query.eq("status", status);
  if (q) {
    const term = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(["ref", "company", "pic_name", "email", "description", "brand", "model", "serial"].map((c) => `${c}.ilike.${term}`).join(","));
  }
  const [{ data, error }, counts] = await Promise.all([
    query,
    Promise.all(SERVICE_STATUSES.map((s) => supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", s))),
  ]);
  const rows = (data ?? []) as R[];
  const tab = (s: string, label: string, n?: number | null) => {
    const href = `/admin/service-requests${s ? `?status=${encodeURIComponent(s)}` : ""}`;
    const active = s === status;
    return (
      <Link key={label} href={href} className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${active ? "bg-ink text-white" : "border border-line bg-white hover:border-brand"}`}>
        {label}{n != null ? ` (${n})` : ""}
      </Link>
    );
  };

  return (
    <>
      <h1 className="text-4xl font-bold">Service requests</h1>
      <p className="mt-2 max-w-3xl text-slate">Requests from the &quot;Request a service&quot; form on the Services page. Each one is also emailed to the service inbox.</p>

      {error ? (
        <p role="alert" className="mt-6 rounded-md bg-red-50 p-4 text-red-800">
          Service requests are not set up yet. Run <code>supabase/migration_service_requests.sql</code> once in Supabase → SQL Editor.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {tab("", "All")}
            {SERVICE_STATUSES.map((s, i) => tab(s, s, counts[i].count))}
          </div>
          <form className="mt-4 flex max-w-xl gap-2" action="/admin/service-requests">
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="sr-q" className="sr-only">Search</label>
            <input id="sr-q" name="q" defaultValue={q} className="field" placeholder="Search reference, company, PIC, equipment, S/N" />
            <button className="btn-main px-5">Search</button>
          </form>

          {rows.length === 0 && <p className="mt-8 text-slate">{q || status ? "No service requests match." : "No service requests yet. They appear here when customers use the form on the Services page."}</p>}

          <div className="mt-6 space-y-4">
            {rows.map((r) => (
              <article key={r.id} className="rounded-lg border border-line bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold">{r.ref} · {r.service_type === "Others" ? `Others: ${r.service_type_other ?? ""}` : r.service_type}</h2>
                    <p className="text-sm text-slate">
                      {new Date(r.created_at).toLocaleString("en-MY")} · {r.emailed_at ? "Emailed to service inbox" : "Not emailed (check here)"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[r.status] ?? ""}`}>{r.status}</span>
                </div>

                <div className="mt-4 grid gap-5 text-sm md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold">Equipment</h3>
                    <p className="mt-1">{r.description}</p>
                    <p className="text-slate">Brand: {r.brand || "-"} · Model: {r.model || "-"} · S/N: {r.serial || "-"}</p>
                    {r.details && <p className="mt-2 whitespace-pre-line text-slate">Details: {r.details}</p>}
                  </div>
                  <div>
                    <h3 className="font-semibold">Customer</h3>
                    <p className="mt-1"><strong>{r.company}</strong></p>
                    <p className="whitespace-pre-line text-slate">{r.address}</p>
                    <p className="mt-1">
                      PIC: {r.pic_name} · <a className="text-brand underline" href={`mailto:${r.email}?subject=${encodeURIComponent(`Service request ${r.ref}`)}`}>{r.email}</a> ·{" "}
                      <a className="text-brand underline" href={`tel:${r.contact.replace(/[^\d+]/g, "")}`}>{r.contact}</a>
                    </p>
                  </div>
                </div>

                <RequestActions id={r.id} refCode={r.ref} status={r.status} notes={r.staff_notes} />
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
