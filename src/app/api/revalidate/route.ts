import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_TAG } from "@/lib/supabase/public";

/** Clears the cached public pages after an admin change (logged-in admins only). */
export async function POST() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ ok: false }, { status: 403 });
  revalidateTag(PUBLIC_TAG);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
