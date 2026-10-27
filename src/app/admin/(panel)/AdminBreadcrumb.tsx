"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ADMIN_AREAS, areaFor } from "./adminGroups";

/** "Dashboard / Sales / Quotations" at the top of admin pages, so staff can always go back. */
export default function AdminBreadcrumb() {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pathname === "/admin") return null;
  const area = areaFor(pathname, params.get("area"));
  const seg = pathname.split("/")[2] ?? "";
  const isAreaPage = ADMIN_AREAS.some((a) => a.slug === seg);
  const tile = area?.tiles.find((t) => t.href.split("?")[0].split("/")[2] === seg);
  const deeper = pathname.split("/").length > 3;

  return (
    <nav aria-label="Breadcrumb" className="no-print mb-6 flex flex-wrap items-center gap-2 text-sm">
      <Link href="/admin" className="font-semibold text-brand hover:underline">Dashboard</Link>
      {area && (
        <>
          <span className="text-slate">/</span>
          {isAreaPage ? <span className="font-semibold">{area.title}</span>
            : <Link href={`/admin/${area.slug}`} className="font-semibold text-brand hover:underline">{area.title}</Link>}
        </>
      )}
      {tile && (
        <>
          <span className="text-slate">/</span>
          {deeper ? <Link href={tile.href} className="font-semibold text-brand hover:underline">{tile.label}</Link> : <span className="font-semibold">{tile.label}</span>}
        </>
      )}
    </nav>
  );
}
