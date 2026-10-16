import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import ServiceRequestForm from "@/components/ServiceRequestForm";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: services } = supabase
    ? await supabase.from("services").select("id,title,description").eq("is_active", true).order("sort_order")
    : { data: [] };
  return (
    <>
      <PageHeader slot="services" title="Services" crumbs={[{ label: "Services" }]} intro="Support for your lab, from supply to servicing." />
      <div className="container-x py-12">
        <div className="grid gap-5 md:grid-cols-2">
          {(services ?? []).map((s) => (
            <div key={s.id} className="rounded-lg border border-line border-l-4 border-l-accent bg-white p-6">
              <h2 className="text-2xl font-semibold">{s.title}</h2>
              <p className="mt-1 max-w-md text-slate">{s.description}</p>
            </div>
          ))}
        </div>
        <a href="#request" className="btn-main mt-10">Request a service</a>
      </div>
      <ServiceRequestForm />
      <div className="h-12" />
    </>
  );
}
