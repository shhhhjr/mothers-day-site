/**
 * Base URL sent to Supabase as emailRedirectTo / OAuth redirect.
 * In **development**, uses the browser’s current origin (`localhost`, LAN IP, etc.) so
 * you never have to keep editing `.env` when testing from another device.
 *
 * Production: `NEXT_PUBLIC_SITE_URL` → Vercel preview URL → `window.location.origin`.
 *
 * Override: set `NEXT_PUBLIC_AUTH_USE_CURRENT_ORIGIN=1` to always prefer the browser origin
 * (e.g. temp preview testing).
 * @see https://supabase.com/docs/guides/auth/redirect-urls
 */
export function getAuthSiteOrigin(): string {
  if (typeof window !== "undefined") {
    const forceCurrentOrigin =
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_AUTH_USE_CURRENT_ORIGIN === "1";
    if (forceCurrentOrigin) {
      return window.location.origin;
    }
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    return site.replace(/\/$/, "");
  }

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercel) {
    const v = vercel.replace(/\/$/, "");
    return v.startsWith("http") ? v : `https://${v}`;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3000";
}
