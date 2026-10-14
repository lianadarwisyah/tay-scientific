import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductForm, { type ProductInput } from "../ProductForm";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = (await createClient())!;
  const [{ data: product }, { data: brands }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("brands").select("id,name").order("name"),
    supabase.from("categories").select("id,name").order("sort_order"),
  ]);
  if (!product) notFound();
  return (
    <>
      <Link href="/admin/products" className="text-sm text-brand hover:underline">← All products</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl font-bold">Edit product</h1>
        <a href={`/products/${product.slug}`} target="_blank" rel="noopener" className="text-sm font-semibold text-brand hover:underline">View on website ↗</a>
      </div>
      <ProductForm brands={brands ?? []} categories={categories ?? []} initial={product as ProductInput} />
    </>
  );
}
