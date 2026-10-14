import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "../ProductForm";

export default async function NewProduct() {
  const supabase = (await createClient())!;
  const [{ data: brands }, { data: categories }] = await Promise.all([
    supabase.from("brands").select("id,name").order("name"),
    supabase.from("categories").select("id,name").order("sort_order"),
  ]);
  return (
    <>
      <Link href="/admin/products" className="text-sm text-brand hover:underline">← All products</Link>
      <h1 className="mt-2 text-4xl font-bold">Add product</h1>
      <ProductForm brands={brands ?? []} categories={categories ?? []} />
    </>
  );
}
