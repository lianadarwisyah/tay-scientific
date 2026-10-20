import { todayMY } from "@/lib/types";

export type EventItem = {
  id: string; title: string; slug: string; event_date: string; time_text: string | null; location: string | null;
  partners: string | null; summary: string | null; body: string | null; images: string[]; is_published: boolean; created_at: string;
};

/** "30 September 2026 (Wednesday)" */
export function formatEventDate(d: string, withDay = false): string {
  const date = new Date(`${d}T00:00:00+08:00`);
  const main = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });
  if (!withDay) return main;
  return `${main} (${date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "Asia/Kuala_Lumpur" })})`;
}

export const isUpcoming = (e: Pick<EventItem, "event_date">) => e.event_date >= todayMY();

/** URL-friendly slug from the date and title: "2026-09-30-product-knowledge-sharing" */
export function eventSlug(date: string, title: string): string {
  const t = title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `${date}-${t || "event"}`;
}
