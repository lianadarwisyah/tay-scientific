import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normaliseJob, emptyTimeLog, emptyWorkItem, type JobDraft } from "@/lib/serviceJobs";
import ServiceJobForm from "../ServiceJobForm";

export const dynamic = "force-dynamic";

export default async function EditServiceJob({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = (await createClient())!;
  const { data } = await supabase.from("service_jobs").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _c, updated_at: _u, created_by: _b, public_token: token, last_notified_status: lastNotified, notifications, ...job } = normaliseJob(data);
  const draft: JobDraft = {
    ...job,
    work_items: job.work_items.length ? job.work_items : [emptyWorkItem()],
    time_logs: job.time_logs.length ? job.time_logs : [emptyTimeLog()],
  };
  return (
    <>
      <Link href="/admin/service-portal" className="text-sm text-brand hover:underline">← Service portal</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold">{job.sr_no}</h1>
        {job.status === "completed" && <Link href={`/admin/service-portal/${id}/report`} className="btn-main">View service report</Link>}
      </div>
      <p className="mt-1 text-slate">{job.instrument} · {job.company}</p>
      {(notifications?.length ?? 0) > 0 && (
        <details className="mt-4 rounded-md border border-line bg-white p-3 text-sm">
          <summary className="cursor-pointer font-semibold">Customer emails sent ({notifications!.length})</summary>
          <ul className="mt-2 space-y-1 text-slate">
            {notifications!.slice().reverse().map((n, i) => (
              <li key={i}>{new Date(n.at).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}: <span className="capitalize">{n.status}</span> to {n.to} {n.ok ? "✓" : "(failed)"}</li>
            ))}
          </ul>
        </details>
      )}
      {job.status === "completed" && token && (
        <p className="mt-3 text-sm text-slate">Customer report link: <a className="break-all text-brand underline" href={`/service-report/${token}`} target="_blank" rel="noopener">/service-report/{token}</a></p>
      )}
      <div className="mt-6"><ServiceJobForm id={id} initial={draft} lastNotified={lastNotified ?? null} /></div>
    </>
  );
}
