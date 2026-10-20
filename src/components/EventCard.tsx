import Link from "next/link";
import { formatEventDate, isUpcoming, type EventItem } from "@/lib/events";

export default function EventCard({ e }: { e: EventItem }) {
  const cover = e.images?.[0];
  const upcoming = isUpcoming(e);
  return (
    <Link href={`/events/${e.slug}`} className="group flex flex-col overflow-hidden rounded-lg border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-mist">
        {cover
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={cover} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center font-display text-3xl font-bold text-slate/40">Event</div>}
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${upcoming ? "bg-accent text-ink" : "bg-ink/80 text-white"}`}>
          {upcoming ? "Upcoming" : "Past event"}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm font-semibold text-brand">{formatEventDate(e.event_date)}</p>
        <h3 className="mt-1 text-2xl font-semibold leading-tight group-hover:text-brand">{e.title}</h3>
        {e.partners && <p className="mt-1 text-sm text-slate">In collaboration with {e.partners}</p>}
        {e.summary && <p className="mt-3 line-clamp-3 text-slate">{e.summary}</p>}
        <span className="mt-auto pt-4 text-sm font-semibold text-brand">Read more →</span>
      </div>
    </Link>
  );
}
