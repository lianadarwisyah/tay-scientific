import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import AdminBreadcrumb from "./AdminBreadcrumb";

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
    <div className="container-x py-10 print:max-w-none print:p-0">
      <Suspense fallback={null}><AdminBreadcrumb /></Suspense>
      <div>{children}</div>
    </div>
  );
}
