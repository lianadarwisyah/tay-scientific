import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STATUSES, APPLICATION_STATUS_STYLE } from "@/lib/applications";
import ApplicationActions from "./ApplicationActions";

export const dynamic = "force-dynamic";
const PER_PAGE = 25;

type App = {
  id: string; position: string; name: string; email: string; phone: string; location: string | null; salary: string | null;
  start_date: string | null; message: string | null; cv_path: string | null; cv_name: string | null; status: string;
  staff_notes: string | null; emailed_at: string | null; created_at: string;
};

/** Career jobs: who applied (with CV download). Job openings are managed on the "Job openings" page. */
export default async function JobApplications({ searchParams }: { searchParams: Promise<{ status?: string; position?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = (APPLICATION_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status! : "";
  const position = (sp.position ?? "").slice(0, 160);
  const q = (sp.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = (await createClient())!;

  let query = supabase.from("job_applications").select("*", { count: "exact" }).order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (status) query = query.eq("status", status);
  if (position) query = query.eq("position", position);
  if (q) {
    const term = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(["name", "email", "phone", "location", "position"].map((c) => `${c}.ilike.${term}`).join(","));
  }
  const [{ data, error, count }, positionsRes, ...counts] = await Promise.all([
    query,
    supabase.from("job_applications").select("position").limit(1000),
    ...APPLICATION_STATUSES.map((s) => supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("status", s)),
  ]);
  const rows = (data ?? []) as App[];
  const positions = [...new Set((positionsRes.data ?? []).map((r) => r.position as string))].sort();

  // Private CV links, valid for 1 hour
  const cvLinks = new Map<string, string>();
  const paths = rows.map((r) => r.cv_path).filter((p): p is string => !!p);
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("cvs").createSignedUrls(paths, 3600, { download: true });
    signed?.forEach((s) => { if (s.path && s.signedUrl) cvLinks.set(s.path, s.signedUrl); });
  }

  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));
  const href = (p: Record<string, string | number>) => {
    const u = new URLSearchParams();
    const all: Record<string, string | number> = { status, position, q, ...p };
    Object.entries(all).forEach(([k, v]) => { if (v && !(k === "page" && Number(v) === 1)) u.set(k, String(v)); });
    return `/admin/jobs${u.size ? `?${u}` : ""}`;
  };
  const wa = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "60")}`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Career jobs</h1>
          <p className="mt-2 max-w-2xl text-slate">People who applied on the Careers page, newest first. Each application is also emailed to the careers inbox with the CV attached.</p>
        </div>
        <Link href="/admin/jobs/openings" className="btn-line">Manage job openings</Link>
      </div>

      {error ? (
        <p role="alert" className="mt-6 rounded-md bg-red-50 p-4 text-red-800">
          Applications are not saved yet. Run <code>supabase/migration_job_applications.sql</code> once in Supabase → SQL Editor.
          Until then, applications only arrive by email.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {[["", "All"], ...APPLICATION_STATUSES.map((s) => [s, s])].map(([s, label], i) => (
              <Link key={label} href={href({ status: s, page: 1 })}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${s === status ? "bg-ink text-white" : "border border-line bg-white hover:border-brand"}`}>
                {label}{i > 0 ? ` (${counts[i - 1].count ?? 0})` : ""}
              </Link>
            ))}
          </div>
          <form className="mt-4 flex flex-wrap gap-2" action="/admin/jobs">
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="ja-pos" className="sr-only">Position</label>
            <select id="ja-pos" name="position" defaultValue={position} className="field !w-auto">
              <option value="">All positions</option>
              {positions.map((p) => <option key={p}>{p}</option>)}
            </select>
            <label htmlFor="ja-q" className="sr-only">Search</label>
            <input id="ja-q" name="q" defaultValue={q} className="field max-w-sm" placeholder="Search name, email, phone, location" />
            <button className="btn-main px-5">Search</button>
          </form>

          {rows.length === 0 && <p className="mt-8 text-slate">{q || status || position ? "No applications match." : "No applications yet. They appear here when someone applies on the Careers page."}</p>}

          <div className="mt-6 space-y-4">
            {rows.map((a) => {
              const cv = a.cv_path ? cvLinks.get(a.cv_path) : null;
              return (
                <article key={a.id} className="rounded-lg border border-line bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-semibold">{a.name}</h2>
                      <p className="text-sm text-slate">
                        Applied for <b className="text-ink">{a.position}</b> · {new Date(a.created_at).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${APPLICATION_STATUS_STYLE[a.status] ?? ""}`}>{a.status}</span>
                      {cv ? <a href={cv} className="btn-main px-4 py-2 text-sm">Download CV</a>
                        : <span className="text-sm text-slate">{a.cv_path ? "CV link unavailable" : "No CV saved (see email)"}</span>}
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div><dt className="text-slate">Email</dt><dd><a className="text-brand underline" href={`mailto:${a.email}?subject=${encodeURIComponent(`Your application: ${a.position}`)}`}>{a.email}</a></dd></div>
                    <div><dt className="text-slate">Phone</dt><dd><a className="text-brand underline" href={`tel:${a.phone.replace(/[^\d+]/g, "")}`}>{a.phone}</a> · <a className="text-brand underline" href={wa(a.phone)} target="_blank" rel="noopener">WhatsApp</a></dd></div>
                    <div><dt className="text-slate">Current location</dt><dd>{a.location || "-"}</dd></div>
                    <div><dt className="text-slate">Expected salary</dt><dd>{a.salary || "-"}</dd></div>
                    <div><dt className="text-slate">Available to start</dt><dd>{a.start_date || "-"}</dd></div>
                    <div><dt className="text-slate">CV file</dt><dd className="truncate">{a.cv_name || "-"}</dd></div>
                  </dl>
                  {a.message && <p className="mt-3 whitespace-pre-line rounded-md bg-bench p-3 text-sm">{a.message}</p>}
                  <ApplicationActions id={a.id} name={a.name} status={a.status} notes={a.staff_notes} cvPath={a.cv_path} />
                </article>
              );
            })}
          </div>
          {pages > 1 && (
            <nav className="mt-6 flex items-center gap-3 text-sm" aria-label="Pages">
              {page > 1 && <Link href={href({ page: page - 1 })} className="btn-line px-3 py-1.5">← Previous</Link>}
              <span>Page {page} of {pages}</span>
              {page < pages && <Link href={href({ page: page + 1 })} className="btn-line px-3 py-1.5">Next →</Link>}
            </nav>
          )}
        </>
      )}
    </>
  );
}
