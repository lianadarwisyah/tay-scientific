import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { blankCalibration } from "@/lib/calibrations";
import CalibrationForm from "../CalibrationForm";

export const dynamic = "force-dynamic";

export default async function NewCalibration() {
  const supabase = (await createClient())!;
  const year = Number(new Date().toLocaleString("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric" }));
  const { data: counter } = await supabase.from("calibration_sticker_counters").select("last_number").eq("year", year).maybeSingle();
  const nextSticker = `TSI/CR/${year}/${String((counter?.last_number ?? 0) + 1).padStart(3, "0")}`;
  return (
    <>
      <Link href="/admin/calibrations" className="text-sm text-brand hover:underline">← Calibration log</Link>
      <h1 className="mt-2 text-4xl font-bold">Add calibration</h1>
      <div className="mt-6"><CalibrationForm initial={blankCalibration()} nextSticker={nextSticker} /></div>
    </>
  );
}
