import Link from "next/link";
import type { Product } from "@/lib/types";

/**
 * Home page "Our products": product photos that scroll on a loop, in the same style as
 * the Official Distributor Partners strip (uses the .marquee-viewport / .marquee-track styles in globals.css).
 * Hovering pauses it; clicking a product opens its page.
 */
function Card({ p, copy }: { p: Product; copy: boolean }) {
  return (
    <li className="w-[190px] shrink-0" aria-hidden={copy || undefined}>
      <Link
        href={`/products/${p.slug}`}
        tabIndex={copy ? -1 : undefined}
        className="group block h-full rounded-md border border-line bg-white p-3 shadow-[0_3px_8px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:border-brand"
      >
        <span className="flex h-[150px] items-center justify-center overflow-hidden rounded bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image_url ?? ""} alt={copy ? "" : p.name} loading="lazy" className="max-h-full max-w-full object-contain" />
        </span>
        <span className="mt-2 line-clamp-2 min-h-[2.5rem] text-center text-sm font-medium leading-snug text-ink/85 group-hover:text-brand">
          {p.name}
        </span>
      </Link>
    </li>
  );
}

export default function OurProducts({ products }: { products: Product[] }) {
  // Keep a steady speed whatever the number of products (about 3.5 s per product)
  const duration = `${Math.max(20, products.length * 3.5)}s`;
  return (
    <section aria-labelledby="our-products-title" className="border-y border-line bg-white py-16">
      <div className="container-x text-center">
        <h2 id="our-products-title" className="text-4xl font-bold sm:text-5xl">Our Products</h2>
        <p className="mt-2 text-slate">Quality instruments and supplies for your lab</p>
      </div>

      <div className="marquee-viewport mx-auto mt-8 max-w-[1660px] overflow-hidden px-5">
        <ul className="marquee-track flex w-max gap-[30px] py-3" style={{ animationDuration: duration }}>
          {products.map((p) => <Card key={p.id} p={p} copy={false} />)}
          {/* Second copy makes the loop seamless; hidden from screen readers */}
          {products.map((p) => <Card key={`${p.id}-copy`} p={p} copy />)}
        </ul>
      </div>

      <p className="mt-6 text-center">
        <Link href="/products" className="text-sm font-semibold text-brand hover:underline">View all products</Link>
      </p>
    </section>
  );
}
