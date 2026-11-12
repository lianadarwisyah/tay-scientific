import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Contact Tay Scientific Instruments in Masai, Johor and Inanam, Sabah. Phone, email, WhatsApp 018-779 0021, or send us an enquiry online.",
  alternates: { canonical: "/enquiry" },
};

export default function EnquiryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
