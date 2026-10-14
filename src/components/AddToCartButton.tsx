"use client";
import { useState } from "react";
import { useCart } from "./CartProvider";
import type { Product } from "@/lib/types";

export default function AddToCartButton({ product, withQty = false }: { product: Product; withQty?: boolean }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function onAdd() {
    add({ productId: product.id, slug: product.slug, name: product.name, sku: product.sku, image: product.image_url }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className="flex items-center gap-2">
      {withQty && (
        <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          className="field !w-20" aria-label="Quantity" />
      )}
      <button onClick={onAdd} className="btn-main" aria-live="polite">
        {added ? "Added to quote" : "Add to quote"}
      </button>
    </div>
  );
}
