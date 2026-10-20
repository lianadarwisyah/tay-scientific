import Link from "next/link";
import EventForm from "../EventForm";

export default function NewEvent() {
  return (
    <>
      <Link href="/admin/events" className="text-sm text-brand hover:underline">← Events</Link>
      <h1 className="mt-2 text-4xl font-bold">Add event</h1>
      <div className="mt-6"><EventForm /></div>
    </>
  );
}
