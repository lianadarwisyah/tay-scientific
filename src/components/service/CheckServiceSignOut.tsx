"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CheckServiceSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} className="btn-line px-4 py-2 text-sm"
      onClick={async () => { setBusy(true); await fetch("/api/check-service/signout", { method: "POST" }).catch(() => {}); router.refresh(); }}>
      {busy ? "Signing out..." : "Sign out"}
    </button>
  );
}
