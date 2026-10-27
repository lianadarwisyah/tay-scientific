import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ServiceJobForm from "../ServiceJobForm";
import { JOB_SERVICE_TYPES, blankJob } from "@/lib/serviceJobs";

export const dynamic = "force-dynamic";

/** New service record. ?from=<service request id> fills it in from a website service request. */
export default async function NewServiceJob({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const initial = blankJob();
  let fromRef = "";
  const supabase = (await createClient())!;
  // Preview of the number this job will get when saved (the database gives the real one)
  const year = Number(new Date().toLocaleString("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric" }));
  const { data: counter } = await supabase.from("service_report_counters").select("last_number").eq("year", year).maybeSingle();
  const nextSr = `TSI/SR/${year}/${String((counter?.last_number ?? 0) + 1).padStart(3, "0")}`;
  if (from) {
    const { data: r } = await supabase.from("service_requests").select("*").eq("id", from).maybeSingle();
    if (r) {
      fromRef = r.ref;
      // Training requests have no service report, so staff choose the service type themselves
      const type = (JOB_SERVICE_TYPES as readonly string[]).includes(r.service_type) ? r.service_type : r.service_type === "Training" ? "" : "Others";
      Object.assign(initial, {
        instrument: r.description ?? "", brand: r.brand ?? "", model: r.model ?? "", serial_number: r.serial ?? "",
        company: r.company ?? "", company_email: r.email ?? "", company_phone: r.contact ?? "", contact_person: r.pic_name ?? "",
        delivery_address: r.address ?? "", service_type: type,
        remarks: [`From website service request ${r.ref}.`, r.service_type_other ? `Service: ${r.service_type_other}.` : "", r.details ?? ""].filter(Boolean).join("\n"),
        service_request_id: r.id,
      });
    }
  }
  return (
    <>
      <Link href="/admin/service-portal" className="text-sm text-brand hover:underline">← Service portal</Link>
      <h1 className="mt-2 text-4xl font-bold">Add service</h1>
      {fromRef && <p className="mt-2 rounded-md bg-brand-soft p-3 text-sm">Filled in from website service request <b>{fromRef}</b>. Check the details, then save.</p>}
      <div className="mt-6"><ServiceJobForm initial={initial} nextSr={nextSr} /></div>
    </>
  );
}
