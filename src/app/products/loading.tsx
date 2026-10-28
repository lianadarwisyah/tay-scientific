/** Shown instantly while the product list or a category loads. */
export default function Loading() {
  return (
    <div className="container-x py-12" role="status" aria-live="polite">
      <div className="mx-auto h-12 w-72 animate-pulse rounded bg-mist" />
      <div className="mx-auto mt-6 h-12 max-w-2xl animate-pulse rounded bg-mist" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-line bg-white p-4">
            <div className="aspect-square animate-pulse rounded bg-mist" />
            <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-mist" />
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-mist" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading products</span>
    </div>
  );
}
