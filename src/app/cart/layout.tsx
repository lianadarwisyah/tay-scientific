import type { Metadata } from "next";

// The quote cart is personal to each visitor: keep it out of Google
export const metadata: Metadata = { title: "Quote cart", robots: { index: false, follow: true } };

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
