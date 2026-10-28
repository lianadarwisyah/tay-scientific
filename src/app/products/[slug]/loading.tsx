/** Shown instantly while a product page loads, so a click always responds straight away. */
export default function Loading() {
  return (
    <div className="container-x py-12" role="status" aria-live="polite">
      <div className="h-4 w-48 animate-pulse rounded bg-mist" />
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-lg bg-mist" />
        <div className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded bg-mist" />
          <div className="h-10 w-4/5 animate-pulse rounded bg-mist" />
          <div className="h-4 w-32 animate-pulse rounded bg-mist" />
          <div className="mt-6 h-24 animate-pulse rounded bg-mist" />
          <div className="h-12 w-56 animate-pulse rounded bg-mist" />
        </div>
      </div>
      <span className="sr-only">Loading product</span>
    </div>
  );
}
