import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600; // rebuilt at most once an hour

/** Every public page for Google: main pages, all active products, brands, categories and events. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly" = "weekly") =>
    ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency, priority });

  const entries: MetadataRoute.Sitemap = [
    page("", 1, "daily"), page("/products", 0.9, "daily"), page("/brands", 0.8), page("/services", 0.8),
    page("/events", 0.6), page("/careers", 0.5), page("/enquiry", 0.6), page("/check-service", 0.4, "monthly"),
  ];

  const supabase = createPublicClient();
  if (!supabase) return entries;

  // Supabase returns up to 1,000 rows per request, so products are read in pages
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("products").select("slug").eq("is_active", true).order("slug").range(from, from + 999);
    if (error || !data?.length) break;
    data.forEach((p) => entries.push(page(`/products/${p.slug}`, 0.7)));
    if (data.length < 1000) break;
  }
  const [{ data: brands }, { data: cats }, { data: events }] = await Promise.all([
    supabase.from("brands").select("slug"),
    supabase.from("categories").select("slug"),
    supabase.from("events").select("slug,event_date").eq("is_published", true),
  ]);
  brands?.forEach((b) => entries.push(page(`/brands/${b.slug}`, 0.6)));
  cats?.forEach((c) => entries.push(page(`/products?category=${encodeURIComponent(c.slug)}`, 0.7)));
  events?.forEach((e) => entries.push({ ...page(`/events/${e.slug}`, 0.5, "monthly"), lastModified: new Date(`${e.event_date}T00:00:00+08:00`) }));
  return entries;
}
