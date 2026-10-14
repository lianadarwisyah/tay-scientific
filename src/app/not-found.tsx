import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <p className="font-display text-7xl font-bold text-brand">404</p>
      <h1 className="mt-2 text-4xl font-bold">We could not find that page</h1>
      <p className="mt-3 text-slate">The link may be old, or the page may have moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-main">Go to home</Link>
        <Link href="/products" className="btn-line">Browse products</Link>
      </div>
    </div>
  );
}
