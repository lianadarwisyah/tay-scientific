import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normaliseJob } from "@/lib/serviceJobs";
import ReportSheet from "@/components/service/ReportSheet";
import PrintButton from "@/components/service/PrintButton";
import { company } from "@/lib/company";

export const dynamic = "force-dynamic";
// Private link from the customer's email: keep it out of search engines
export const metadata: Metadata = { title: "Service report", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The customer's view of a completed service report (link sent in the "Service completed" email). */
export default async function CustomerServiceReport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID.test(token)) notFound();
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data } = await supabase.rpc("get_service_report", { code: token });
  if (!data) notFound();
  const j = normaliseJob(data as Record<string, unknown>);

  return (
    <div className="container-x py-10 print:max-w-none print:p-0">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Service report {j.sr_no}</h1>
          <p className="text-slate">{j.instrument} · {j.company}</p>
        </div>
        <PrintButton />
      </div>
      <p className="no-print mb-4 text-sm text-slate">To keep a copy, click <b>Print / Save as PDF</b> and choose <b>Save as PDF</b>. Questions? Email <a className="text-brand underline" href={`mailto:${company.serviceEmail}?subject=${encodeURIComponent(`Service report ${j.sr_no}`)}`}>{company.serviceEmail}</a>.</p>
      <ReportSheet j={j} />
    </div>
  );
}
