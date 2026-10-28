import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient as createClient } from "@/lib/supabase/public";
import PageHeader from "@/components/PageHeader";
import EventCard from "@/components/EventCard";
import { isUpcoming, type EventItem } from "@/lib/events";

export const metadata: Metadata = {
  title: "Events",
  description: "Seminars, product knowledge sessions, exhibitions and collaborations by Tay Scientific Instruments.",
};
export const revalidate = 60; // cached; Admin saves refresh it straight away

export default async function EventsPage() {
  const supabase = createClient();
  const { data } = supabase
    ? await supabase.from("events").select("*").eq("is_published", true).order("event_date", { ascending: false }).limit(200)
    : { data: [] };
  const all = ((data ?? []) as EventItem[]).map((e) => ({ ...e, images: Array.isArray(e.images) ? e.images : [] }));
  const upcoming = all.filter(isUpcoming).reverse(); // soonest first
  const past = all.filter((e) => !isUpcoming(e));

  return (
    <>
      <PageHeader slot="events" title="Events" crumbs={[{ label: "Events" }]}
        intro="Seminars, product knowledge sessions and collaborations with our partners. See what we have been up to, and join us at the next one." />
      <div className="container-x py-12">
        {upcoming.length > 0 && (
          <section className="mb-14">
            <h2 className="text-4xl font-bold">Upcoming events</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map((e) => <EventCard key={e.id} e={e} />)}</div>
          </section>
        )}
        <section>
          <h2 className="text-4xl font-bold">{upcoming.length ? "Past events" : "Our events"}</h2>
          {past.length === 0
            ? <p className="mt-4 text-slate">No events posted yet. Follow this page for our next seminar.</p>
            : <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{past.map((e) => <EventCard key={e.id} e={e} />)}</div>}
        </section>
        <div className="mt-14 rounded-lg bg-brand-soft p-8">
          <h2 className="text-3xl font-bold">Want a talk or training at your lab?</h2>
          <p className="mt-2 max-w-2xl text-slate">We run product knowledge sessions, calibration and maintenance talks with our brand partners. Let us know what your team needs.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/enquiry" className="btn-main">Contact us</Link>
            <Link href="/services#request" className="btn-line">Request training</Link>
          </div>
        </div>
      </div>
    </>
  );
}
