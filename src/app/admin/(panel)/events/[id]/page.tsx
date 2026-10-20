import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EventItem } from "@/lib/events";
import EventForm from "../EventForm";

export const dynamic = "force-dynamic";

export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = (await createClient())!;
  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const e = data as EventItem;
  return (
    <>
      <Link href="/admin/events" className="text-sm text-brand hover:underline">← Events</Link>
      <h1 className="mt-2 text-4xl font-bold">Edit event</h1>
      <div className="mt-6"><EventForm event={{ ...e, images: Array.isArray(e.images) ? e.images : [] }} /></div>
    </>
  );
}
