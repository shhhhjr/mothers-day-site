"use server";

import { createClient } from "@supabase/supabase-js";

export type AuthActionResult =
  | { ok: true; needsEmailConfirm: boolean }
  | { ok: false; error: string; status?: number; code?: string };

function failure(error: {
  message?: string;
  status?: unknown;
  code?: unknown;
}): Extract<AuthActionResult, { ok: false }> {
  return {
    ok: false,
    error: error.message?.trim() || "Something went wrong.",
    status: typeof error.status === "number" ? error.status : undefined,
    code: typeof error.code === "string" ? error.code : undefined,
  };
}

/**
 * Build a Supabase client that does NOT use PKCE.
 *
 * Why: `@supabase/ssr`'s browser/server clients hardcode `flowType: "pkce"`
 * so they can sync session cookies for SSR. PKCE works fine for cookie-based
 * sessions, but it makes any token Supabase emails (`pkce_…` prefix) require
 * the requesting browser's code-verifier cookie at completion time — which
 * silently breaks the email link if it is opened on any other device.
 *
 * For the OUTBOUND email-trigger calls (`signInWithOtp`, `signUp`) we don't
 * care about cookie-syncing — we just want a non-PKCE token in the email so
 * `verifyOtp({ token_hash, type })` on `/auth/callback` can complete from any
 * device.
 */
function createNonPkceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Sends a magic-link email using a non-PKCE Supabase client.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/email-based-auth
 */
export async function sendMagicLink(
  email: string,
  emailRedirectTo: string,
): Promise<AuthActionResult> {
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = createNonPkceClient();
  if (!supabase) {
    return { ok: false, error: "Supabase env vars are missing on the server." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: { emailRedirectTo },
  });
  if (error) return failure(error);
  return { ok: true, needsEmailConfirm: true };
}

/**
 * Creates a Supabase auth account using a non-PKCE client so that — if
 * "Confirm email" is on in the project — the confirmation email's token_hash
 * is NOT pkce_-prefixed and therefore works cross-device.
 *
 * Returns:
 *   - `{ ok: true, needsEmailConfirm: true }`  if Supabase still needs the
 *     user to click the email link to finish confirming. The browser must
 *     prompt them to check their inbox.
 *   - `{ ok: true, needsEmailConfirm: false }` if Supabase confirmed
 *     immediately (i.e. "Confirm email" is OFF in the project). The user
 *     should now be told to use the "Sign in" tab with the same password —
 *     this server action cannot directly establish the browser session.
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  emailRedirectTo: string,
): Promise<AuthActionResult> {
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  const supabase = createNonPkceClient();
  if (!supabase) {
    return { ok: false, error: "Supabase env vars are missing on the server." };
  }

  const { data, error } = await supabase.auth.signUp({
    email: trimmed,
    password,
    options: { emailRedirectTo },
  });
  if (error) return failure(error);

  const needsEmailConfirm = !data.session;
  return { ok: true, needsEmailConfirm };
}
