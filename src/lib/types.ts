export type Product = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string | null;
  /** Either { label: value } or an ordered list of [label, value] pairs (keeps catalogue order). */
  specs?: Record<string, string> | [string, string][] | null;
  /** Bullet list of key features */
  features?: string[] | null;
  image_url: string | null;
  brand?: { name: string; slug: string } | null;
  category?: { name: string; slug: string } | null;
};
export type Category = { id: string; name: string; slug: string };
export type Brand = { id: string; name: string; slug: string; logo_url: string | null };
export type Service = { id: string; title: string; description: string | null };
export const QUOTE_STATUSES = ["new", "reviewing", "quoted", "accepted", "rejected", "expired"] as const;
export type Promotion = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  button_label: string | null;
  starts_on: string;
  ends_on: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
};

/** Today's date in Malaysia as YYYY-MM-DD (promotion dates are Malaysia dates). */
export function todayMY(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date());
}
