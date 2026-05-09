import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (process.env.NEXT_PUBLIC_SKIP_AUTH === "1") {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.next();
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedPrefixes = ["/profiles", "/onboarding"];
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

  // Unauthenticated visitor trying to reach protected app pages → send them
  // to the homepage (which is now the sign-up / sign-in form).
  if (isProtected && !user) {
    const home = new URL("/", request.url);
    if (pathname !== "/") home.searchParams.set("next", pathname);
    return NextResponse.redirect(home);
  }

  // Signed-in user landing on the homepage or /login → skip the form and
  // jump straight to the app.
  if (user && (pathname === "/" || pathname === "/login")) {
    return NextResponse.redirect(new URL("/profiles", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
