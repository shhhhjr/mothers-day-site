export const INTRO_STORAGE_KEY = "mothersday_intro_v1";

/**
 * The 10 curated accent colors a user can pick for their profile. Each entry
 * carries:
 *   - `key`: stored in `profiles.accent_key` in Postgres,
 *   - `label`: shown in the settings UI palette,
 *   - `hue`: a Tailwind gradient class string used on the round profile bubble,
 *   - `accent`: a CSS hex used for the user's name color in the timeline and
 *     anywhere else we want a quick "this is X's color".
 *
 * Adding/removing entries is safe — the column is plain `text` so unknown
 * keys just fall back to the seeded default for that slug.
 */
export const ACCENT_PALETTE = [
  { key: "rose",    label: "Rose",     hue: "from-rose-400 to-pink-600",       accent: "#fb7185" },
  { key: "amber",   label: "Amber",    hue: "from-amber-400 to-orange-600",    accent: "#fbbf24" },
  { key: "violet",  label: "Violet",   hue: "from-violet-400 to-purple-700",   accent: "#c084fc" },
  { key: "emerald", label: "Emerald",  hue: "from-emerald-400 to-teal-600",    accent: "#34d399" },
  { key: "sky",     label: "Sky",      hue: "from-sky-400 to-blue-600",        accent: "#38bdf8" },
  { key: "fuchsia", label: "Fuchsia",  hue: "from-fuchsia-400 to-pink-600",    accent: "#e879f9" },
  { key: "indigo",  label: "Indigo",   hue: "from-indigo-400 to-purple-600",   accent: "#818cf8" },
  { key: "lime",    label: "Lime",     hue: "from-lime-400 to-green-600",      accent: "#a3e635" },
  { key: "cyan",    label: "Cyan",     hue: "from-cyan-400 to-teal-600",       accent: "#22d3ee" },
  { key: "red",     label: "Red",      hue: "from-red-400 to-rose-600",        accent: "#f87171" },
] as const;

export type AccentKey = (typeof ACCENT_PALETTE)[number]["key"];

/**
 * Return the palette entry matching a given key, or the first entry if the
 * key is unknown (e.g. an old DB row written before the palette was tightened).
 */
export function getAccent(key: string | null | undefined) {
  if (!key) return ACCENT_PALETTE[0];
  return ACCENT_PALETTE.find((c) => c.key === key) ?? ACCENT_PALETTE[0];
}

/**
 * Seeded defaults for the 5 fixed family profiles. Used as:
 *   1. Fallback `displayName` / `initial` if the DB hasn't been queried yet
 *      (e.g. inside loading skeletons), and
 *   2. Source of truth for the slug union type `ProfileSlug`.
 *
 * The runtime UI prefers values from `lib/data/profiles.ts` (which reads the
 * Supabase `profiles` row, including any rename/avatar/color changes).
 */
export const PROFILES = [
  { slug: "mama",  displayName: "Mama",  initial: "M",  defaultAccentKey: "rose"    as AccentKey },
  { slug: "daddy", displayName: "Daddy", initial: "D",  defaultAccentKey: "amber"   as AccentKey },
  { slug: "jais",  displayName: "Jais",  initial: "J",  defaultAccentKey: "violet"  as AccentKey },
  { slug: "haas",  displayName: "Haas",  initial: "H",  defaultAccentKey: "emerald" as AccentKey },
  { slug: "dadi",  displayName: "Dadi",  initial: "Da", defaultAccentKey: "sky"     as AccentKey },
] as const;

export type ProfileSlug = (typeof PROFILES)[number]["slug"];

export function getProfileSeed(slug: string) {
  return PROFILES.find((p) => p.slug === slug) ?? PROFILES[0];
}
