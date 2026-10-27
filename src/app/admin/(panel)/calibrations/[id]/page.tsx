import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normaliseCal } from "@/lib/calibrations";
import CalibrationForm from "../CalibrationForm";

export const dynamic = "force-dynamic";

export default async function EditCalibration({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = (await createClient())!;
  const { data } = await supabase.from("calibrations").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const c = normaliseCal(data);
  return (
    <>
      <Link href="/admin/calibrations" className="text-sm text-brand hover:underline">← Calibration log</Link>
      <h1 className="mt-2 text-4xl font-bold">{c.sticker_no}</h1>
      <p className="mt-1 text-slate">{c.instrument} · {c.company}</p>
      {c.reminder_log.length > 0 && (
        <details className="mt-4 rounded-md border border-line bg-white p-3 text-sm">
          <summary className="cursor-pointer font-semibold">Reminder emails ({c.reminder_log.length})</summary>
          <ul className="mt-2 space-y-1 text-slate">
            {c.reminder_log.slice().reverse().map((r, i) => (
              <li key={i}>{new Date(r.at).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}: to {r.to} {r.ok ? "✓" : "(failed)"}</li>
            ))}
          </ul>
        </details>
      )}
      <div className="mt-6">
        <CalibrationForm id={id} initial={{
          sticker_no: c.sticker_no, date_in: c.date_in, instrument: c.instrument, brand: c.brand, model: c.model, serial_number: c.serial_number,
          company: c.company, contact_person: c.contact_person, contact_no: c.contact_no, email: c.email, calibration_date: c.calibration_date,
          validity_months: c.validity_months, service_provider: c.service_provider, cert_no: c.cert_no,
          remarks: c.remarks, reminders_enabled: c.reminders_enabled, service_job_id: c.service_job_id,
        }} />
      </div>
    </>
  );
}
