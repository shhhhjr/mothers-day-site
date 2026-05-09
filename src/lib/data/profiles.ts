import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  ACCENT_PALETTE,
  PROFILES,
  getAccent,
  getProfileSeed,
  type AccentKey,
  type ProfileSlug,
} from "@/lib/constants";

/** A single profile row, enriched with palette lookups for the UI. */
export type EnrichedProfile = {
  id: string;
  slug: ProfileSlug;
  displayName: string;
  initial: string;
  avatarUrl: string | null;
  accentKey: AccentKey;
  /** Tailwind gradient class string, e.g. `"from-rose-400 to-pink-600"`. */
  hue: string;
  /** CSS hex color string, e.g. `"#fb7185"`. */
  accent: string;
};

type RawProfileRow = {
  id: string;
  slug: string;
  display_name: string | null;
  avatar_url: string | null;
  accent_key: string | null;
};

function enrich(row: RawProfileRow): EnrichedProfile {
  const seed = getProfileSeed(row.slug);
  const accentKey = (row.accent_key ?? seed.defaultAccentKey) as AccentKey;
  const palette = getAccent(accentKey);
  return {
    id: row.id,
    slug: seed.slug,
    displayName: row.display_name?.trim() || seed.displayName,
    initial: seed.initial,
    avatarUrl: row.avatar_url,
    accentKey,
    hue: palette.hue,
    accent: palette.accent,
  };
}

/**
 * Fetch all 5 family profiles, in the canonical order defined by
 * `PROFILES` in `constants.ts`. Falls back to the seeded defaults if
 * Supabase isn't configured (so the UI still renders during local dev).
 */
export async function fetchAllProfiles(): Promise<EnrichedProfile[]> {
  let rows: RawProfileRow[] = [];
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, slug, display_name, avatar_url, accent_key");
    if (data) rows = data;
  } catch {
    rows = [];
  }
  const bySlug = new Map(rows.map((r) => [r.slug, r] as const));

  // Re-order according to the static PROFILES array so the picker layout is
  // stable regardless of insertion order in Postgres.
  return PROFILES.map((seed) => {
    const row = bySlug.get(seed.slug);
    if (row) return enrich(row);
    return enrich({
      id: seed.slug,
      slug: seed.slug,
      display_name: seed.displayName,
      avatar_url: null,
      accent_key: seed.defaultAccentKey,
    });
  });
}

export async function fetchProfileBySlug(
  slug: string,
): Promise<EnrichedProfile | null> {
  const all = await fetchAllProfiles();
  return all.find((p) => p.slug === slug) ?? null;
}

/** Curated palette re-export, so client components can import from one place. */
export const PALETTE = ACCENT_PALETTE;
