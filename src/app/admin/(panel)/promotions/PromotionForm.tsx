"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { refreshWebsite } from "@/lib/refreshWebsite";
import { todayMY } from "@/lib/types";
import { compressImage, PHOTO_SIZES, MAX_PICK_MB, formatBytes } from "@/lib/compressImage";

const MAX_MB = 5;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Last day of the current month (Malaysia time) as YYYY-MM-DD. */
function endOfMonth(today: string) {
  const [y, m] = today.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

export default function PromotionForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const today = todayMY();

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const [photoNote, setPhotoNote] = useState("");
  async function pick(f?: File | null) {
    setMessage(""); setPhotoNote("");
    if (preview) URL.revokeObjectURL(preview);
    if (!f) { setFile(null); setPreview(null); return; }
    const reject = (msg: string) => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; setState("error"); setMessage(msg); };
    if (!TYPES.includes(f.type)) return reject("Please choose a JPG, PNG or WebP image.");
    if (f.size > MAX_PICK_MB * 1024 * 1024) return reject(`Image is too large. Maximum ${MAX_PICK_MB} MB.`);
    // Shrink to banner size before upload (saves Supabase storage)
    let small = f;
    try { small = await compressImage(f, PHOTO_SIZES.banner); } catch { /* keep the original */ }
    if (small.size > MAX_MB * 1024 * 1024) return reject(`Image is still larger than ${MAX_MB} MB after resizing. Please use a smaller image.`);
    if (small !== f) setPhotoNote(`Resized for the web: ${formatBytes(f.size)} → ${formatBytes(small.size)}`);
    setState("idle");
    setFile(small);
    setPreview(URL.createObjectURL(small));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) { setState("error"); return setMessage("Please choose the promotion image."); }
    const f = new FormData(e.currentTarget);
    const starts = String(f.get("starts_on") || today);
    const ends = String(f.get("ends_on") || "") || null;
    if (ends && ends < starts) { setState("error"); return setMessage("The end date must be on or after the start date."); }
    let link = String(f.get("link_url") || "").trim() || null;
    if (link && !link.startsWith("/") && !/^https?:\/\//i.test(link)) link = "https://" + link;

    setState("busy"); setMessage("");
    const supabase = createClient();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${starts.slice(0, 7)}/${crypto.randomUUID()}.${ext}`;

    const up = await supabase.storage.from("promotions").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (up.error) { setState("error"); return setMessage("Image upload failed: " + up.error.message); }
    const imageUrl = supabase.storage.from("promotions").getPublicUrl(path).data.publicUrl;

    const { error } = await supabase.from("promotions").insert({
      title: String(f.get("title")).trim(),
      subtitle: String(f.get("subtitle") || "").trim() || null,
      image_url: imageUrl,
      link_url: link,
      button_label: String(f.get("button_label") || "").trim() || null,
      starts_on: starts,
      ends_on: ends,
      sort_order: Number(f.get("sort_order") || 0),
      is_active: true,
    });
    if (error) {
      await supabase.storage.from("promotions").remove([path]);
      setState("error");
      return setMessage("Could not save the promotion: " + error.message);
    }
    formRef.current?.reset();
    pick(null);
    if (fileRef.current) fileRef.current.value = "";
    setState("saved");
    setMessage("Promotion saved. It shows on the home page between its start and end dates.");
    (refreshWebsite(), router.refresh());
  }

  return (
    <section>
      <h2 className="text-2xl font-bold">Add a promotion</h2>
      <form ref={formRef} onSubmit={onSubmit} className="mt-4 space-y-4 rounded-lg border border-line bg-white p-5">
        <div>
          <span className="label">Promotion image *</span>
          <label htmlFor="promo-image" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line bg-bench p-4 text-center text-sm hover:border-brand">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview" className="max-h-64 w-auto rounded object-contain" />
            ) : (
              <>
                <span className="font-semibold">Click to choose an image</span>
                <span className="text-slate">JPG, PNG or WebP. Large images are resized automatically. Wide banner, 1920 × 800 px (2.4 : 1), works best.</span>
              </>
            )}
          </label>
          <input ref={fileRef} id="promo-image" type="file" accept={TYPES.join(",")} onChange={(e) => pick(e.target.files?.[0])} className="sr-only" />
          {file && <p className="mt-1 text-xs text-slate">{file.name} · click the image to change it</p>}
          {photoNote && <p className="mt-1 text-xs text-green-800" role="status">{photoNote}</p>}
        </div>

        <div><label className="label" htmlFor="promo-title">Title *</label><input id="promo-title" name="title" required maxLength={120} placeholder="e.g. Buy 1 Free 1 on Micropipettes" className="field" /></div>
        <div><label className="label" htmlFor="promo-sub">Short description</label><textarea id="promo-sub" name="subtitle" rows={2} maxLength={300} placeholder="e.g. Buy any LACHOI magnetic stirrer and get a second one free. While stocks last." className="field" /></div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="promo-start">Start date *</label><input id="promo-start" name="starts_on" type="date" required defaultValue={today} className="field" /></div>
          <div><label className="label" htmlFor="promo-end">End date</label><input id="promo-end" name="ends_on" type="date" defaultValue={endOfMonth(today)} className="field" /><p className="mt-1 text-xs text-slate">Leave empty to keep it in the home page slider until you hide it.</p></div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="promo-link">Button link</label><input id="promo-link" name="link_url" maxLength={500} placeholder="/products?q=pipette or https://…" className="field" /></div>
          <div><label className="label" htmlFor="promo-btn">Button text</label><input id="promo-btn" name="button_label" maxLength={40} placeholder="View promotion" className="field" /></div>
        </div>
        <div className="sm:w-1/2"><label className="label" htmlFor="promo-order">Order</label><input id="promo-order" name="sort_order" type="number" defaultValue={0} className="field" /><p className="mt-1 text-xs text-slate">Lower numbers show first when several are live.</p></div>

        {message && (
          <p role={state === "error" ? "alert" : "status"} className={`text-sm font-medium ${state === "error" ? "text-red-700" : "text-green-800"}`}>{message}</p>
        )}
        <button type="submit" disabled={state === "busy"} className="btn-main px-6 py-3 disabled:opacity-60">
          {state === "busy" ? "Uploading..." : "Save promotion"}
        </button>
      </form>
    </section>
  );
}
