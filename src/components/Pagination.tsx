import Link from "next/link";

export default function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-10 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
      {page > 1 && <Link className="btn-line" href={hrefFor(page - 1)}>Previous</Link>}
      <span className="text-slate">Page {page} of {pages}</span>
      {page < pages && <Link className="btn-line" href={hrefFor(page + 1)}>Next</Link>}
    </nav>
  );
}
