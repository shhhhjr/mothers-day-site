export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Set `NEXT_PUBLIC_SKIP_AUTH=1` to bypass login/onboarding middleware and layout redirects (family testing only — never ship). */
export function isAuthBypassed(): boolean {
  return process.env.NEXT_PUBLIC_SKIP_AUTH === "1";
}
