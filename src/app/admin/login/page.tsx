"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const f = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(f.get("email")), password: String(f.get("password")),
    });
    setBusy(false);
    if (error) return setError("Email or password is incorrect.");
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
    router.refresh();
  }

  return (
    <div className="container-x flex min-h-[60vh] items-center justify-center py-16">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-line bg-white p-8">
        <h1 className="text-2xl font-bold">Admin sign in</h1>
        <p className="text-sm text-slate">You stay signed in on this device until you choose Sign out.</p>
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="field" autoComplete="username" /></div>
        <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required className="field" autoComplete="current-password" /></div>
        {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
        <button disabled={busy} className="btn-main w-full">{busy ? "Signing in..." : "Sign in"}</button>
      </form>
    </div>
  );
}
