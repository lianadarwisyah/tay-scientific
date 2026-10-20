import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EventGallery from "@/components/EventGallery";
import { formatEventDate, isUpcoming, type EventItem } from "@/lib/events";
import { company } from "@/lib/company";

export const dynamic = "force-dynamic";

async function getEvent(slug: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("events").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  if (!data) return null;
  const e = data as EventItem;
  return { ...e, images: Array.isArray(e.images) ? e.images : [] };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await getEvent((await params).slug);
  if (!e) return { title: "Event" };
  return { title: e.title, description: e.summary ?? undefined, openGraph: e.images[0] ? { images: [e.images[0]] } : undefined };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const e = await getEvent((await params).slug);
  if (!e) notFound();
  const upcoming = isUpcoming(e);
  const cover = e.images[0];
  const facts: [string, string | null][] = [
    ["Date", formatEventDate(e.event_date, true)], ["Time", e.time_text], ["Location", e.location],
    ["In collaboration with", e.partners ? `${company.name} and ${e.partners}` : null],
  ];

  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="container-x py-10 md:py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-slate">
            <Link href="/" className="hover:text-ink">Home</Link> / <Link href="/events" className="hover:text-ink">Events</Link> / <span aria-current="page" className="text-ink">{e.title}</span>
          </nav>
          <div className="mt-6 grid items-start gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12">
            <div>
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${upcoming ? "bg-accent text-ink" : "bg-ink text-white"}`}>
                {upcoming ? "Upcoming event" : "Past event"}
              </span>
              <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{e.title}</h1>
              {e.summary && <p className="mt-4 text-lg text-slate">{e.summary}</p>}
              <dl className="mt-6 space-y-3 rounded-lg border border-line bg-bench p-5">
                {facts.filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="grid gap-1 sm:grid-cols-[170px_1fr]">
                    <dt className="text-sm font-semibold text-slate">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {upcoming && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/enquiry" className="btn-main">Register your interest</Link>
                  <a href={`mailto:${company.email}?subject=${encodeURIComponent(`Event: ${e.title}`)}`} className="btn-line">Email us</a>
                </div>
              )}
            </div>
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={e.title} className="w-full rounded-lg border border-line object-cover shadow-sm" />
            )}
          </div>
        </div>
      </section>

      <div className="container-x py-12">
        {e.body && (
          <article className="max-w-3xl whitespace-pre-line text-lg leading-relaxed">{e.body}</article>
        )}
        {e.images.length > 0 && (
          <section className="mt-12">
            <h2 className="text-3xl font-bold">Photos</h2>
            <div className="mt-5"><EventGallery images={e.images} title={e.title} /></div>
          </section>
        )}
        <Link href="/events" className="btn-line mt-12">← All events</Link>
      </div>
    </>
  );
}
