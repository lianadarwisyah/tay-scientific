export default function Loading() {
  return (
    <div className="container-x py-24" role="status" aria-live="polite">
      <div className="h-2 w-40 animate-pulse rounded-full bg-brand/30" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
