import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StorageUsage from "./StorageUsage";

export default async function Dashboard() {
  const supabase = (await createClient())!;
  const count = async (table: string, filter?: [string, string]) => {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) q = q.eq(filter[0], filter[1]);
    return (await q).count ?? 0;
  };
  const [newQuotes, newService, newEnq, products, promos] = await Promise.all([
    count("quotations", ["status", "new"]), count("service_requests", ["status", "new"]), count("enquiries", ["status", "new"]), count("products"),
    count("promotions", ["is_active", "true"]),
  ]);
  const stats = [
    { label: "New quotations", value: newQuotes, href: "/admin/quotations" },
    { label: "New service requests", value: newService, href: "/admin/service-requests" },
    { label: "New enquiries", value: newEnq, href: "/admin/enquiries" },
    { label: "Products", value: products, href: "/admin/products" },
    { label: "Active banners", value: promos, href: "/admin/promotions" },
  ];
  return (
    <>
      <h1 className="text-4xl font-bold">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-white p-5">
            <p className="text-sm text-slate">{s.label}</p>
            <p className="mt-1 font-display text-4xl font-bold">{s.value}</p>
            {s.href && <Link href={s.href} className="mt-2 inline-block text-sm font-semibold text-brand hover:underline">Open</Link>}
          </div>
        ))}
      </div>
      <StorageUsage />
    </>
  );
}
