import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normaliseJob } from "@/lib/serviceJobs";
import ReportSheet from "@/components/service/ReportSheet";
import PrintButton from "@/components/service/PrintButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const supabase = (await createClient())!;
  const { data } = await supabase.from("service_jobs").select("sr_no,company").eq("id", (await params).id).maybeSingle();
  // The browser uses the page title as the PDF file name when saving
  return { title: data ? `${data.sr_no.replace(/\//g, "-")} ${data.company}` : "Service report" };
}

export default async function ServiceReport({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; email?: string }> }) {
  const { id } = await params;
  const { saved, email } = await searchParams;
  const supabase = (await createClient())!;
  const { data } = await supabase.from("service_jobs").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const j = normaliseJob(data);

  if (j.status !== "completed") {
    return (
      <div className="max-w-2xl">
        <Link href="/admin/service-portal" className="text-sm text-brand hover:underline">← Service portal</Link>
        <h1 className="mt-2 text-3xl font-bold">{j.sr_no}: report not available yet</h1>
        <p className="mt-3 text-slate">This job is <b className="capitalize">{j.status}</b>. The service report can be generated once the job is set to <b>completed</b>.</p>
        <Link href={`/admin/service-portal/${id}`} className="btn-main mt-6">Open the service record</Link>
      </div>
    );
  }


  return (
    <>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/service-portal" className="text-sm text-brand hover:underline">← Service portal</Link>
          <h1 className="text-3xl font-bold">Service report {j.sr_no}</h1>
          {saved && <p className="mt-1 text-sm text-green-800" role="status">Saved. The report is ready to print or save as PDF.{email === "sent" && " The customer has been emailed a link to this report."}</p>}
          {email === "failed" && <p className="mt-1 text-sm font-medium text-red-700" role="alert">The customer email could not be sent. Check the email settings and save the record again with &quot;Email the customer&quot; ticked.</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/admin/service-portal/${id}`} className="btn-line">Edit</Link>
          <PrintButton />
        </div>
      </div>
      <p className="no-print mb-4 text-sm text-slate">Tip: in the print window choose <b>Save as PDF</b>, paper <b>A4</b>, and turn off &quot;Headers and footers&quot;.</p>

      <ReportSheet j={j} />
    </>
  );
}
