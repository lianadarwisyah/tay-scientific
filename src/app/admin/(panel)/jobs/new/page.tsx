import Link from "next/link";
import JobForm from "../JobForm";

export default function NewJob() {
  return (
    <>
      <Link href="/admin/jobs/openings" className="text-sm text-brand hover:underline">← Job openings</Link>
      <h1 className="mt-2 text-4xl font-bold">Add job</h1>
      <div className="mt-6"><JobForm /></div>
    </>
  );
}
