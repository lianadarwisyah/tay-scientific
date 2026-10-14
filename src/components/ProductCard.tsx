import Link from "next/link";
import type { Product } from "@/lib/types";
import AddToCartButton from "./AddToCartButton";

export function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className="h-full w-full object-contain p-4" loading="lazy" />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center text-brand/40" aria-hidden="true">
      <svg width="64" height="64" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3h8M13.5 3v8.5L6 25a3 3 0 0 0 2.6 4.5h14.8A3 3 0 0 0 26 25l-7.5-13.5V3" />
      </svg>
    </div>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-line bg-white">
      <Link href={`/products/${product.slug}`} className="block aspect-[4/3] bg-mist">
        <ProductImage src={product.image_url} alt={product.name} />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {product.brand && <p className="text-xs font-medium text-brand">{product.brand.name}</p>}
        <h3 className="mt-1 text-base font-semibold leading-snug">
          <Link href={`/products/${product.slug}`} className="hover:text-brand">{product.name}</Link>
        </h3>
        <p className="mt-1 text-xs text-slate">SKU {product.sku}</p>
        <div className="mt-4 pt-1 md:mt-auto"><AddToCartButton product={product} /></div>
      </div>
    </article>
  );
}
