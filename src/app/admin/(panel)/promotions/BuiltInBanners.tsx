"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { refreshWebsite } from "@/lib/refreshWebsite";
import { todayMY } from "@/lib/types";
import type { BuiltInBanner } from "@/lib/defaultAds";

/**
 * Ready-made banners that ship with the website (in /public/ads/). One click adds a banner to the home page
 * slider as a normal promotion, so it can then be hidden, deleted or reordered like any uploaded banner.
 */
export default function BuiltInBanners({ banners, added, nextOrder }: { banners: BuiltInBanner[]; added: string[]; nextOrder: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const missing = banners.filter((b) => !added.includes(b.image_url));

  async function add(list: BuiltInBanner[]) {
    setBusy(list.length > 1 ? "all" : list[0].id); setError("");
    const today = todayMY();
    const rows = list.map((b, k) => ({
      title: b.title.slice(0, 120), image_url: b.image_url, link_url: b.link_url,
      starts_on: today, ends_on: b.ends_on && b.ends_on >= today ? b.ends_on : null,
      sort_order: nextOrder + k * 10, is_active: true,
    }));
    const { error } = await createClient().from("promotions").insert(rows);
    setBusy(null);
    if (error) setError("Could not add: " + error.message); else (refreshWebsite(), router.refresh());
  }

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Ready-made banners</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate">Banners that come with the website. Add one to the slider with one click, no upload needed.</p>
        </div>
        {missing.length > 1 && (
          <button type="button" onClick={() => add(missing)} disabled={!!busy} className="btn-line px-4 py-2 text-sm">
            {busy === "all" ? "Adding..." : `Add all ${missing.length}`}
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {banners.map((b) => {
          const isAdded = added.includes(b.image_url);
          return (
            <li key={b.id} className="overflow-hidden rounded-lg border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image_url} alt="" className="aspect-[12/5] w-full bg-mist object-cover" />
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-semibold">{b.title}</p>
                {b.note && <p className="mt-0.5 text-xs text-slate">{b.note}</p>}
                {isAdded ? (
                  <p className="mt-2 text-xs font-semibold text-green-800">In the slider list (manage it above)</p>
                ) : (
                  <button type="button" onClick={() => add([b])} disabled={!!busy} className="btn-main mt-2 px-3 py-1.5 text-sm">
                    {busy === b.id ? "Adding..." : "Add to slider"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
