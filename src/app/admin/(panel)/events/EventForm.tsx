"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { eventSlug, type EventItem } from "@/lib/events";
import { todayMY } from "@/lib/types";

const MAX_MB = 8;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Path of a file inside the "events" bucket from its public URL (null for photos stored in /public). */
export function eventStoragePath(url: string) {
  const marker = "/storage/v1/object/public/events/";
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

/** Add or edit an event. Photos: upload several at once; the first photo is the cover. */
export default function EventForm({ event }: { event?: EventItem }) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>(event?.images ?? []);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const supabase = createClient();
    const list = Array.from(files);
    const bad = list.find((f) => !TYPES.includes(f.type) || f.size > MAX_MB * 1024 * 1024);
    if (bad) return setError(`"${bad.name}" is not allowed. Use JPG, PNG or WebP photos up to ${MAX_MB} MB each.`);
    setUploading(list.length);
    const urls: string[] = [];
    for (const f of list) {
      const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
      const path = `${todayMY().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("events").upload(path, f, { contentType: f.type, cacheControl: "31536000" });
      if (up.error) { setError(`Upload failed for "${f.name}": ${up.error.message}`); break; }
      urls.push(supabase.storage.from("events").getPublicUrl(path).data.publicUrl);
      setUploading((n) => n - 1);
    }
    setUploading(0);
    setImages((cur) => [...cur, ...urls]);
  }

  const move = (i: number, d: number) => setImages((cur) => {
    const next = [...cur]; const j = i + d;
    if (j < 0 || j >= next.length) return cur;
    [next[i], next[j]] = [next[j], next[i]]; return next;
  });
  const makeCover = (i: number) => setImages((cur) => [cur[i], ...cur.filter((_, k) => k !== i)]);
  const remove = (i: number) => setImages((cur) => { setRemoved((r) => [...r, cur[i]]); return cur.filter((_, k) => k !== i); });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title") || "").trim();
    const date = String(f.get("event_date") || "");
    if (!title || !date) return setError("Please enter the title and the date.");
    setBusy(true); setError("");
    const row = {
      title, event_date: date,
      time_text: String(f.get("time_text") || "").trim() || null,
      location: String(f.get("location") || "").trim() || null,
      partners: String(f.get("partners") || "").trim() || null,
      summary: String(f.get("summary") || "").trim() || null,
      body: String(f.get("body") || "").trim() || null,
      is_published: f.get("is_published") === "on",
      images,
    };
    const supabase = createClient();
    let err;
    if (event) {
      ({ error: err } = await supabase.from("events").update(row).eq("id", event.id));
    } else {
      // Unique link for the event page; add a short suffix if the same title/date already exists
      let slug = eventSlug(date, title);
      const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("slug", slug);
      if (count) slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`;
      ({ error: err } = await supabase.from("events").insert({ ...row, slug }));
    }
    if (err) { setBusy(false); return setError("Could not save: " + err.message); }
    // Tidy up photos that were removed (only files uploaded to the events bucket)
    const paths = removed.filter((u) => !images.includes(u)).map(eventStoragePath).filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from("events").remove(paths);
    router.push("/admin/events?saved=1");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-4xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <div><label className="label" htmlFor="ev-title">Event title *</label>
          <input id="ev-title" name="title" required maxLength={160} defaultValue={event?.title} className="field" placeholder="e.g. Product Knowledge Sharing Session" /></div>
        <div><label className="label" htmlFor="ev-date">Date *</label>
          <input id="ev-date" name="event_date" type="date" required defaultValue={event?.event_date ?? todayMY()} className="field" /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="ev-time">Time</label>
          <input id="ev-time" name="time_text" maxLength={120} defaultValue={event?.time_text ?? ""} className="field" placeholder="e.g. 9.00 am – 11.30 am (registration 8.45 am)" /></div>
        <div><label className="label" htmlFor="ev-partners">In collaboration with</label>
          <input id="ev-partners" name="partners" maxLength={300} defaultValue={event?.partners ?? ""} className="field" placeholder="e.g. Nexbio Asia" /></div>
      </div>
      <div><label className="label" htmlFor="ev-location">Location</label>
        <input id="ev-location" name="location" maxLength={300} defaultValue={event?.location ?? ""} className="field" placeholder="Venue and address" /></div>
      <div><label className="label" htmlFor="ev-summary">Short summary (shown on the event card)</label>
        <textarea id="ev-summary" name="summary" rows={2} maxLength={400} defaultValue={event?.summary ?? ""} className="field" /></div>
      <div><label className="label" htmlFor="ev-body">Full write-up</label>
        <textarea id="ev-body" name="body" rows={10} maxLength={12000} defaultValue={event?.body ?? ""} className="field"
          placeholder={"What happened, who presented, topics covered...\nLine breaks and numbered lists are kept as you type them."} /></div>

      <fieldset>
        <legend className="label">Photos and poster</legend>
        <p className="text-sm text-slate">Upload several at once (JPG, PNG or WebP, up to {MAX_MB} MB each). The <b>first photo is the cover</b> on the Events page.</p>
        <input type="file" accept={TYPES.join(",")} multiple onChange={(e) => { upload(e.target.files); e.target.value = ""; }} className="mt-3 block text-sm" disabled={uploading > 0} />
        {uploading > 0 && <p className="mt-2 text-sm text-slate" role="status">Uploading {uploading} photo(s)...</p>}
        {images.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((src, i) => (
              <li key={src} className="overflow-hidden rounded-lg border border-line bg-white">
                <div className="relative aspect-[4/3] bg-mist">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold">Cover</span>}
                </div>
                <div className="flex flex-wrap gap-1 p-2 text-xs">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="btn-line px-2 py-1 disabled:opacity-40" aria-label="Move left">←</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="btn-line px-2 py-1 disabled:opacity-40" aria-label="Move right">→</button>
                  {i > 0 && <button type="button" onClick={() => makeCover(i)} className="btn-line px-2 py-1">Cover</button>}
                  <button type="button" onClick={() => remove(i)} className="ml-auto rounded border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <label className="flex items-center gap-2 font-semibold">
        <input type="checkbox" name="is_published" defaultChecked={event?.is_published ?? true} className="h-4 w-4" />
        Show on the website
      </label>

      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy || uploading > 0} className="btn-main px-8">{busy ? "Saving..." : event ? "Save changes" : "Add event"}</button>
        <button type="button" onClick={() => router.push("/admin/events")} className="btn-line">Cancel</button>
      </div>
    </form>
  );
}
