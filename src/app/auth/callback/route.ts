import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const VALID_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "magiclink",
  "recovery",
  "invite",
  "email",
  "email_change",
]);

function safeRelativePath(candidate: string | null): string {
  const fallback = "/profiles";
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }
  return candidate;
}

function loginRedirect(
  origin: string,
  next: string,
  detail: string,
): NextResponse {
  // Send users to the homepage (which is now the sign-up / sign-in form),
  // not /login — that route redirects here anyway.
  const home = new URL("/", origin);
  home.searchParams.set("next", next);
  home.searchParams.set("auth_error", "session_exchange_failed");
  home.searchParams.set("auth_detail", detail);
  return NextResponse.redirect(home);
}

/**
 * Auth callback that handles BOTH supported email link styles:
 *
 *   1. `?token_hash=...&type=...`  →  cross-device safe; uses `verifyOtp`.
 *      Configure Supabase email templates to point here (see README).
 *
 *   2. `?code=...`                 →  legacy/PKCE; only works in the same
 *      browser that requested the link (default Supabase template).
 *
 * @see https://supabase.com/docs/guides/auth/server-side/email-based-auth
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeRelativePath(requestUrl.searchParams.get("next"));
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const typeParam = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const code = requestUrl.searchParams.get("code");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* ignore — read-only contexts */
        }
      },
    },
  });

  if (tokenHash && typeParam && VALID_OTP_TYPES.has(typeParam)) {
    const { error } = await supabase.auth.verifyOtp({
      type: typeParam,
      token_hash: tokenHash,
    });
    if (error) {
      return loginRedirect(
        requestUrl.origin,
        next,
        encodeURIComponent(error.message.slice(0, 280)),
      );
    }
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const msg = `${error.message}`.toLowerCase();
      const isPkceCrossDevice =
        msg.includes("verifier") ||
        msg.includes("code verifier") ||
        msg.includes("non-empty");
      return loginRedirect(
        requestUrl.origin,
        next,
        isPkceCrossDevice
          ? "pkce_cross_device"
          : encodeURIComponent(error.message.slice(0, 280)),
      );
    }
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  return loginRedirect(requestUrl.origin, next, "missing_token");
}
