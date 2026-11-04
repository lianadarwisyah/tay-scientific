import type { Metadata } from "next";
import { cookies } from "next/headers";
import CheckServiceForm from "@/components/service/CheckServiceForm";
import ServiceHistory from "@/components/service/ServiceHistory";
import { SESSION_COOKIE, readSession } from "@/lib/checkService";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Check Service",
  description: "Check the status of your instruments in service, service reports, calibrations and quotation requests.",
};

/** Check Service: email → 6-digit code → the customer's history, all on this page. */
export default async function CheckServicePage() {
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  return session ? <ServiceHistory access={session} /> : <CheckServiceForm />;
}
