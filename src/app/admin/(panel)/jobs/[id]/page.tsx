import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JobForm, { type JobRow } from "../JobForm";

export const dynamic = "force-dynamic";

export default async function EditJob({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = (await createClient())!;
  const { data } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  const job = { ...data, responsibilities: arr(data.responsibilities), requirements: arr(data.requirements), offer: arr(data.offer) } as JobRow;
  return (
    <>
      <Link href="/admin/jobs/openings" className="text-sm text-brand hover:underline">← Job openings</Link>
      <h1 className="mt-2 text-4xl font-bold">Edit job</h1>
      <div className="mt-6"><JobForm job={job} /></div>
    </>
  );
}
