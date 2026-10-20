import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  if (!supabase) redirect("/admin/login");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-2xl font-bold">No admin access</h1>
        <p className="mt-2 text-slate">{user.email} is signed in but is not on the admin list. Add this user to the admin_users table in Supabase.</p>
      </div>
    );
  }
  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold" aria-label="Admin">
          <Link href="/admin" className="hover:text-brand">Dashboard</Link>
          <Link href="/admin/products" className="hover:text-brand">Products</Link>
          <Link href="/admin/quotations" className="hover:text-brand">Quotations</Link>
          <Link href="/admin/service-requests" className="hover:text-brand">Service requests</Link>
          <Link href="/admin/enquiries" className="hover:text-brand">Enquiries</Link>
          <Link href="/admin/events" className="hover:text-brand">Events</Link>
          <Link href="/admin/promotions" className="hover:text-brand">Banners</Link>
        </nav>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="text-sm font-semibold text-brand hover:underline">View website ↗</Link>
          <span className="text-sm text-slate">{user.email}</span>
          <SignOutButton />
        </div>
      </div>
      <div className="pt-8">{children}</div>
    </div>
  );
}
