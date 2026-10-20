import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate, isUpcoming, type EventItem } from "@/lib/events";
import EventRowActions from "./EventRowActions";

export const dynamic = "force-dynamic";

export default async function EventsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const supabase = (await createClient())!;
  const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: false }).limit(300);
  const rows = ((data ?? []) as EventItem[]).map((e) => ({ ...e, images: Array.isArray(e.images) ? e.images : [] }));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Events</h1>
          <p className="mt-2 max-w-2xl text-slate">Seminars, talks and collaborations shown on the public <Link href="/events" className="text-brand underline">Events</Link> page. Events dated today or later show as &quot;Upcoming&quot;, older ones as &quot;Past event&quot;.</p>
        </div>
        {!error && <Link href="/admin/events/new" className="btn-main">+ Add event</Link>}
      </div>
      {sp.saved && <p role="status" className="mt-6 rounded-md bg-green-50 p-3 text-sm font-medium text-green-800">Event saved.</p>}
      {error ? (
        <p role="alert" className="mt-6 rounded-md bg-red-50 p-4 text-red-800">Events are not set up yet. Run <code>supabase/migration_events.sql</code> once in Supabase → SQL Editor.</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-slate">No events yet. Click &quot;Add event&quot; to post your first one.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {e.images[0] ? <img src={e.images[0]} alt="" className="h-20 w-28 shrink-0 rounded-md bg-mist object-cover" /> : <div className="h-20 w-28 shrink-0 rounded-md bg-mist" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate">
                  {formatEventDate(e.event_date)} · {isUpcoming(e) ? "Upcoming" : "Past"} · {e.images.length} photo(s)
                  {!e.is_published && <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-xs font-semibold">Hidden</span>}
                </p>
                <p className="truncate font-semibold">{e.title}</p>
                {e.is_published && <Link href={`/events/${e.slug}`} className="text-sm text-brand hover:underline">View on website ↗</Link>}
              </div>
              <EventRowActions id={e.id} title={e.title} published={e.is_published} images={e.images} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
