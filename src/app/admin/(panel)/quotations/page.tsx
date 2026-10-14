import { createClient } from "@/lib/supabase/server";
import StatusSelect from "./StatusSelect";

type Q = {
  id: string; ref: string; customer_name: string; company: string | null; address?: string | null; email: string;
  phone: string | null; message: string | null; status: string; created_at: string;
  quotation_items: { id: string; product_name: string; sku: string | null; quantity: number }[];
};

export default async function QuotationsAdmin() {
  const supabase = (await createClient())!;
  const { data } = await supabase
    .from("quotations")
    .select("*, quotation_items(id,product_name,sku,quantity)")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as Q[];

  return (
    <>
      <h1 className="text-4xl font-bold">Quotations</h1>
      {rows.length === 0 && <p className="mt-6 text-slate">No quotation requests yet. They will appear here when customers submit their quote cart.</p>}
      <div className="mt-6 space-y-4">
        {rows.map((q) => (
          <article key={q.id} className="rounded-lg border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold">{q.ref}</h2>
                <p className="text-sm text-slate">{new Date(q.created_at).toLocaleString("en-MY")}</p>
              </div>
              <StatusSelect id={q.id} status={q.status} />
            </div>
            <p className="mt-3 text-sm">
              <strong>{q.customer_name}</strong>{q.company && `, ${q.company}`} ·{" "}
              <a className="text-brand underline" href={`mailto:${q.email}`}>{q.email}</a>
              {q.phone && ` · ${q.phone}`}
            </p>
            {q.address && <p className="mt-1 whitespace-pre-line text-sm text-slate">Address: {q.address}</p>}
            {q.message && <p className="mt-2 text-sm text-slate">Note: {q.message}</p>}
            <ul className="mt-3 divide-y divide-line/60 border-t border-line text-sm">
              {q.quotation_items.map((i) => (
                <li key={i.id} className="flex justify-between py-2"><span>{i.product_name} <span className="text-slate">({i.sku})</span></span><span>x {i.quantity}</span></li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}
