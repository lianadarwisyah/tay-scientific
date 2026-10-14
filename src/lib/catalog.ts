import type { createClient } from "@/lib/supabase/server";

type Client = NonNullable<Awaited<ReturnType<typeof createClient>>>;

/**
 * Number of ACTIVE products per category and per brand.
 * Used to hide categories/brands that have no products yet.
 * One tiny "count only" request per category/brand, so it stays fast even with thousands of products.
 */
export async function activeCounts(
  supabase: Client,
  ids: { categories?: string[]; brands?: string[] },
): Promise<{ byCategory: Map<string, number>; byBrand: Map<string, number> }> {
  const count = async (column: "category_id" | "brand_id", id: string) => {
    const { count } = await supabase.from("products").select("id", { count: "exact", head: true })
      .eq("is_active", true).eq(column, id);
    return [id, count ?? 0] as const;
  };
  const [cats, brands] = await Promise.all([
    Promise.all((ids.categories ?? []).map((id) => count("category_id", id))),
    Promise.all((ids.brands ?? []).map((id) => count("brand_id", id))),
  ]);
  return { byCategory: new Map(cats), byBrand: new Map(brands) };
}
