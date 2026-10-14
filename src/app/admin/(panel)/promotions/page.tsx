import { createClient } from "@/lib/supabase/server";
import { todayMY, type Promotion } from "@/lib/types";
import PromotionForm from "./PromotionForm";
import PromotionActions from "./PromotionActions";
import BuiltInBanners from "./BuiltInBanners";
import { builtInBanners } from "@/lib/defaultAds";

function status(p: Promotion, today: string) {
  if (!p.is_active) return { label: "Hidden", cls: "bg-mist text-slate" };
  if (p.starts_on > today) return { label: "Scheduled", cls: "bg-brand-soft text-brand-dark" };
  if (p.ends_on && p.ends_on < today) return { label: "Ended", cls: "bg-mist text-slate" };
  return { label: "Live on home page", cls: "bg-green-100 text-green-800" };
}

const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });

export default async function PromotionsAdmin() {
  const supabase = (await createClient())!;
  const { data, error } = await supabase.from("promotions").select("*").order("sort_order").order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as Promotion[];
  const today = todayMY();
  const order = rows.map((p) => p.id);
  const nextOrder = rows.reduce((m, p) => Math.max(m, p.sort_order ?? 0), 0) + 10;

  return (
    <>
      <h1 className="text-4xl font-bold">Home page banners</h1>
      <p className="mt-2 max-w-3xl text-slate">
        Everything in the banner slider at the top of the home page is managed here. Upload a new banner (1920 × 800 px works best),
        or add a ready-made one below with one click. Use ↑ ↓ to change the order, <b>Hide</b> to take a banner down for now,
        <b> End date</b> to change when it stops, and <b>Delete</b> to remove it. A banner with an end date disappears by itself after that day.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-md bg-red-50 p-4 text-sm text-red-800">
          Could not load promotions. Have you run <code>supabase/migration_promotions.sql</code> in the Supabase SQL Editor?
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <PromotionForm />

        <section>
          <h2 className="text-2xl font-bold">Banners in the slider</h2>
          <p className="mt-1 text-sm text-slate">Shown on the home page in this order (top first).</p>
          {rows.length === 0 && !error && <p className="mt-4 text-slate">No banners yet, so the home page shows the ready-made Tay Scientific, LACHOI and FSTest banners. Add banners here to take control of the slider.</p>}
          <ul className="mt-4 space-y-4">
            {rows.map((p) => {
              const s = status(p, today);
              return (
                <li key={p.id} className="flex gap-4 rounded-lg border border-line bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url} alt="" className="h-24 w-40 shrink-0 rounded-md bg-mist object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
                    </div>
                    <p className="mt-1 truncate font-display text-xl font-semibold">{p.title}</p>
                    <p className="text-sm text-slate">
                      {fmt(p.starts_on)} – {p.ends_on ? fmt(p.ends_on) : "no end date"}
                      {p.link_url && <> · links to <span className="break-all">{p.link_url}</span></>}
                    </p>
                    <PromotionActions id={p.id} isActive={p.is_active} imageUrl={p.image_url} title={p.title} endsOn={p.ends_on} order={order} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {!error && <BuiltInBanners banners={builtInBanners} added={rows.map((p) => p.image_url)} nextOrder={nextOrder} />}
    </>
  );
}
