import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list: { name: string; value: string; options: CookieOptions }[]) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin") && path !== "/admin/login" && !user) {
    // Not signed in: go to the login page, then come back here afterwards
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  if (path === "/admin/login" && user) {
    // Already signed in: skip the password page
    const next = request.nextUrl.searchParams.get("next");
    return NextResponse.redirect(new URL(next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin", request.url));
  }
  return response;
}

export const config = {
  // Only admin routes need the session check. Running it on public pages added a network call to every request.
  matcher: ["/admin/:path*"],
};
