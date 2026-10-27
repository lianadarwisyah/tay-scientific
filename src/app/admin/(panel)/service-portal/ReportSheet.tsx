import { REPORT_JOB_TYPES, REPORT_LETTERHEAD as L, longDate, shortDate, type ServiceJob } from "@/lib/serviceJobs";

/** Same order as the paper form */
const REPORT_WARRANTY_ORDER = ["Over warranty", "Maintenance contract", "Under warranty", "Non-TSI sales"];

/** The printable service report (same layout as the paper form SR V2.0). */
const Box = ({ on }: { on: boolean }) => <span className="mr-1 inline-block w-4 text-center">{on ? "☒" : "☐"}</span>;
const SectionLabel = ({ code, title }: { code: string; title: string }) => (
  <div className="mt-5 flex items-center gap-3">
    <span className="inline-block w-28 bg-[#FFC000] px-2 py-0.5 text-[11px] font-bold">{code}</span>
    <span className="text-[12px]">{title}</span>
  </div>
);

function Letterhead() {
  return (
    <div className="flex items-start gap-3 text-[10.5px] leading-snug">
      <div className="flex h-[86px] w-[86px] shrink-0 items-center justify-center bg-[#FFC000] p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="" className="h-full w-full object-contain" />
      </div>
      <div>
        <p className="text-[17px] font-bold">{L.name} <sup className="text-[8px]">{L.regNo}</sup></p>
        <p>[{L.hq.label}] {L.hq.address}</p>
        <p className="pl-6">Tel. No.: {L.hq.tel}</p>
        <p className="pl-6">Email: <span className="text-[#0563C1] underline">{L.hq.email}</span></p>
        <p>[{L.branch.label}] {L.branch.address}</p>
        <p className="pl-6">Tel. No.: {L.branch.tel}</p>
        <p className="pl-6">Email: <span className="text-[#0563C1] underline">{L.branch.email}</span></p>
      </div>
    </div>
  );
}

export default function ReportSheet({ j }: { j: ServiceJob }) {
  const otherType = !(REPORT_JOB_TYPES as readonly string[]).includes(j.service_type);
  const work = j.work_items.filter((w) => w.task || w.photos.length);
  const td = "border border-black px-1.5 py-0.5";
  return (
      <article className="report-sheet mx-auto bg-white p-8 text-[11.5px] leading-snug text-black shadow-sm print:p-0 print:shadow-none" style={{ fontFamily: "Verdana, Tahoma, Arial, sans-serif", maxWidth: "210mm" }}>
        {/* The letterhead is in a table header so the browser repeats it at the top of every printed page */}
        <table className="w-full border-collapse">
          <thead><tr><td className="p-0 pb-3"><Letterhead /></td></tr></thead>
          <tbody><tr><td className="p-0 align-top">

        <div className="mt-4 flex items-start justify-between gap-4">
          <p className="text-[54px] font-bold leading-none text-[#A6A6A6]">Service Report</p>
          <div className="pt-2 text-[15px] font-bold">
            <p>SR No.: {j.sr_no}</p>
            <p>Issue Date: {longDate(j.report_date) || longDate(j.date_out)}</p>
          </div>
        </div>

        {/* A: Warranty */}
        <SectionLabel code="SECTION A" title="Warranty Status" />
        <div className="mt-2 grid grid-cols-5 gap-2">
          <span><Box on={!!j.invoice_no} />Invoice</span>
          {REPORT_WARRANTY_ORDER.map((w) => <span key={w}><Box on={j.warranty === w} />{w.replace("Maintenance contract", "Maintenance Contract")}</span>)}
        </div>
        <p className="mt-1">[Document No.: <span className="inline-block min-w-[140px] border-b border-black text-center">{j.invoice_no ?? ""}</span>]</p>

        {/* B: Job type */}
        <SectionLabel code="SECTION B" title="Job Type" />
        <div className="mt-2 grid grid-cols-4 gap-2">
          {REPORT_JOB_TYPES.map((t) => <span key={t}><Box on={j.service_type === t} />{t.replace("New unit installation", "New Unit Installation")}</span>)}
        </div>
        {otherType && <p className="mt-1"><Box on />Other: {j.service_type}</p>}

        {/* C: Customer */}
        <SectionLabel code="SECTION C" title="Customer Details" />
        <table className="mt-2 w-full border-collapse">
          <tbody>
            {[["Company Name", j.company.toUpperCase()], ["Delivery Address", (j.delivery_address ?? "").toUpperCase()], ["Contact Person", (j.contact_person ?? "").toUpperCase()],
              ["Contact No.", j.company_phone ?? ""], ["Email", j.company_email]].map(([k, v]) => (
              <tr key={k}>
                <td className={`${td} w-[150px] border-r-0`}>{k}</td>
                <td className="w-3 border-y border-black align-top">:</td>
                <td className={`${td} whitespace-pre-line border-l-0`}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* D: Equipment */}
        <SectionLabel code="SECTION D" title="Equipment Details" />
        <table className="mt-2 w-[85%] border-collapse">
          <tbody>
            {[["Equipment/Item Description", j.instrument], ["Brand", j.brand.toUpperCase()], ["Model", j.model], ["Serial Number", j.serial_number]].map(([k, v]) => (
              <tr key={k}>
                <td className={`${td} w-[190px] font-bold`}>{k}</td>
                <td className={`${td} text-center`}>{v}</td>
                <td className={`${td} w-[19%]`} />
                <td className={`${td} w-[19%]`} />
              </tr>
            ))}
          </tbody>
        </table>

        {/* E: Work */}
        <SectionLabel code="SECTION E" title="Work Description" />
        <div className="mt-2 min-h-[120px] border border-black p-2">
          <p>Work scope:</p>
          <ol className="ml-8 list-decimal space-y-1">
            {work.map((w, i) => (
              <li key={i}>
                {w.task}{w.result ? ` – ${w.result}` : ""}{w.note ? ` (${w.note})` : ""}
                {w.photos.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1 break-inside-avoid">
                    {w.photos.map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p} src={p} alt="" className="max-h-[230px] max-w-[45%] break-inside-avoid object-contain" />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* F: Time */}
        <SectionLabel code="SECTION F" title="Working/Travelling Time" />
        <table className="mt-2 w-full border-collapse text-center">
          <thead>
            <tr>{["Date", "Start", "Stop", "Working Hours", "Travelling Hours", "Distance (km)", "Overnight stay", "GA/GW"].map((h) => <th key={h} className={td}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {(j.time_logs.length ? j.time_logs : [null]).map((t, i) => (
              <tr key={i}>
                <td className={td}>{t ? shortDate(t.date) : "\u00a0"}</td>
                <td className={td}>{t?.start}</td><td className={td}>{t?.stop}</td><td className={td}>{t?.working_hours}</td>
                <td className={td}>{t?.travel_hours}</td><td className={td}>{t?.distance}</td><td className={td}>{t?.overnight}</td><td className={td}>{t?.ga_gw}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* G, H, I */}
        <div className="mt-2 grid grid-cols-[1fr_330px] gap-2 break-inside-avoid">
          <div>
            <SectionLabel code="SECTION G" title="Service" />
            <p className="mt-2">The service job is completed. The customer was informed about any changes made.</p>
            <div className="mt-1 grid grid-cols-3"><span><Box on={j.job_completed === "yes"} />Yes</span><span><Box on={j.job_completed === "no"} />No</span><span><Box on={j.job_completed === "n/a"} />N/A</span></div>
            <p className="mt-2">The instrument is <span className="ml-4"><Box on={j.repairable === "repairable"} />repairable</span><span className="ml-6"><Box on={j.repairable === "non-repairable"} />non-repairable.</span></p>
            <p className="mt-2">The service will continue on: {j.continue_on ?? ""}</p>
            <SectionLabel code="SECTION H" title="Recommendation" />
            <div className="mt-2 min-h-[70px] whitespace-pre-line border border-black p-1.5">{j.recommendation}</div>
          </div>
          <div className="mt-5 border border-black p-2">
            <div className="flex items-center gap-3"><span className="inline-block w-28 bg-[#FFC000] px-2 py-0.5 text-[11px] font-bold">SECTION I</span><span>Declaration</span></div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[["Service Engineer", j.engineer_name || j.serviced_by, j.report_date], ["Customer Approval", j.customer_approval_name, j.customer_approval_date]].map(([label, name, date]) => (
                <div key={label as string}>
                  <p>{label}</p>
                  <div className="mt-1 flex h-16 items-center justify-center rounded-xl border border-[#1F3864] text-[18px] font-bold italic text-[#D9D9D9]">Signature</div>
                  <p className="mt-2 italic">Name</p>
                  <p className="font-bold underline">{(name as string | null)?.toUpperCase() ?? "\u00a0"}</p>
                  <p className="mt-2 italic">Date</p>
                  <p className="font-bold underline">{longDate(date as string | null) || "\u00a0"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-2 text-right text-[9px] font-bold italic">{L.formVersion}</p>
          </td></tr></tbody>
        </table>
      </article>
  );
}
