import { createClient } from "@/lib/supabase/server";
import EnquiryStatus from "./EnquiryStatus";

type E = { id: string; name: string; email: string; phone: string | null; subject: string | null; message: string; status: string; created_at: string };

export default async function EnquiriesAdmin() {
  const supabase = (await createClient())!;
  const { data } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as E[];

  return (
    <>
      <h1 className="text-4xl font-bold">Enquiries</h1>
      {rows.length === 0 && <p className="mt-6 text-slate">No enquiries yet. They will appear here when customers use the contact form.</p>}
      <div className="mt-6 space-y-4">
        {rows.map((q) => (
          <article key={q.id} className="rounded-lg border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{q.subject || "No subject"}</h2>
                <p className="text-sm text-slate">{new Date(q.created_at).toLocaleString("en-MY")}</p>
              </div>
              <EnquiryStatus id={q.id} status={q.status} />
            </div>
            <p className="mt-3 text-sm">
              <strong>{q.name}</strong> ·{" "}
              <a className="text-brand underline" href={`mailto:${q.email}`}>{q.email}</a>
              {q.phone && ` · ${q.phone}`}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm">{q.message}</p>
          </article>
        ))}
      </div>
    </>
  );
}
