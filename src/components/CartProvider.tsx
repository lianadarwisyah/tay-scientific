"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = { productId: string; slug: string; name: string; sku: string; image: string | null; quantity: number };

type CartCtx = {
  items: CartItem[];
  count: number;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "tay-quote-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready]);

  const value: CartCtx = {
    items,
    count: items.reduce((n, i) => n + i.quantity, 0),
    add: (item, qty = 1) =>
      setItems((prev) => {
        const found = prev.find((i) => i.productId === item.productId);
        if (found) return prev.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + qty } : i));
        return [...prev, { ...item, quantity: qty }];
      }),
    setQty: (id, qty) =>
      setItems((prev) => prev.map((i) => (i.productId === id ? { ...i, quantity: Math.max(1, qty || 1) } : i))),
    remove: (id) => setItems((prev) => prev.filter((i) => i.productId !== id)),
    clear: () => setItems([]),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
};
