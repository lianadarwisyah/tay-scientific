import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Public_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import Header from "@/components/Header";
import AdminBar from "@/components/AdminBar";
import Footer from "@/components/Footer";
import { company } from "@/lib/company";

// Barlow Condensed echoes the condensed lettering in the Tay Scientific logo.
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://labstoreonline.com"),
  title: { default: `${company.name} | Laboratory Instruments & Supplies`, template: `%s | ${company.shortName}` },
  description: company.tagline,
  openGraph: {
    siteName: company.name,
    type: "website",
    locale: "en_MY",
    images: [{ url: "/tay-scientific-building.jpg", width: 563, height: 374 }],
  },
};

export const viewport: Viewport = { themeColor: "#0848A0" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <a href="#main" className="no-print sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:font-semibold focus:text-ink">
          Skip to content
        </a>
        <CartProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <AdminBar />
        </CartProvider>
      </body>
    </html>
  );
}
