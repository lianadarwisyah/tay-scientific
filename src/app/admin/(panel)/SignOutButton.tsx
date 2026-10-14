"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button type="button" onClick={async () => { await createClient().auth.signOut(); router.push("/admin/login"); router.refresh(); }}
      className="text-sm font-semibold text-red-700 hover:underline">
      Sign out
    </button>
  );
}
