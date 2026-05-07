export const INTRO_STORAGE_KEY = "mothersday_intro_v1";

export const PROFILES = [
  { slug: "mama", displayName: "Mama", initial: "M", hue: "from-rose-400 to-pink-600" },
  { slug: "daddy", displayName: "Daddy", initial: "D", hue: "from-amber-400 to-orange-600" },
  { slug: "jais", displayName: "Jais", initial: "J", hue: "from-violet-400 to-purple-700" },
  { slug: "haas", displayName: "Haas", initial: "H", hue: "from-emerald-400 to-teal-600" },
  { slug: "dadi", displayName: "Dadi", initial: "Da", hue: "from-sky-400 to-blue-600" },
] as const;

export type ProfileSlug = (typeof PROFILES)[number]["slug"];
