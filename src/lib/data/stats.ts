import type { TimelineEntry } from "@/types/entries";

export type ProfileStats = {
  memoriesTaggingYou: number;
  entriesInvolvingYou: number;
  photosTouchingYou: number;
};

/** Stats use profile slug (matches tagged + recipient + authored entries). */
export function computeProfileStatsBySlug(
  entries: TimelineEntry[],
  slug: string,
): ProfileStats {
  const involves = (e: TimelineEntry) =>
    e.recipient?.slug === slug ||
    e.tagged.some((t) => t.slug === slug) ||
    e.author?.slug === slug;

  const memoriesTaggingYou = entries.filter(
    (e) => e.type === "memory" && e.tagged.some((t) => t.slug === slug),
  ).length;

  const entriesInvolvingYou = entries.filter(involves).length;

  const photosTouchingYou = entries.reduce((acc, e) => {
    if (!involves(e)) return acc;
    return acc + e.photos.length;
  }, 0);

  return {
    memoriesTaggingYou,
    entriesInvolvingYou,
    photosTouchingYou,
  };
}
