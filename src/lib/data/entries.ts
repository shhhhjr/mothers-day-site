import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TimelineEntry, TimelinePhoto } from "@/types/entries";

type RawEntry = {
  id: string;
  type: TimelineEntry["type"];
  title: string | null;
  body: string | null;
  event_date: string | null;
  location_text: string | null;
  created_at: string;
  recipient_profile_id: string | null;
  recipient_profile?: { slug: string; display_name: string } | null;
  members?: {
    profiles: { slug: string; display_name: string } | null;
  } | null;
  entry_profiles?: {
    profile_id: string;
    profiles: { slug: string; display_name: string } | null;
  }[];
  photos?: {
    id: string;
    storage_path: string;
    caption: string | null;
    taken_at: string | null;
    sort_order: number | null;
  }[];
};

export async function fetchTimelineEntries(): Promise<TimelineEntry[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("entries")
      .select(
        `
        id,
        type,
        title,
        body,
        event_date,
        location_text,
        created_at,
        recipient_profile_id,
        recipient_profile:profiles!entries_recipient_profile_id_fkey (
          slug,
          display_name
        ),
        members!entries_author_member_id_fkey (
          profiles ( slug, display_name )
        ),
        entry_profiles (
          profile_id,
          profiles ( slug, display_name )
        ),
        photos ( id, storage_path, caption, taken_at, sort_order )
      `,
      )
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error(error);
      return [];
    }

    const rows = data as unknown as RawEntry[];

    const withUrls = await Promise.all(
      rows.map(async (row) => mapRow(supabase, row)),
    );
    return withUrls;
  } catch {
    return [];
  }
}

async function mapRow(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  row: RawEntry,
): Promise<TimelineEntry> {
  const authorProfiles = row.members?.profiles;
  const recipient = row.recipient_profile
    ? {
        slug: row.recipient_profile.slug,
        display_name: row.recipient_profile.display_name,
      }
    : null;

  const tagged =
    row.entry_profiles
      ?.map((ep) => ep.profiles)
      .filter(Boolean)
      .map((p) => ({
        slug: p!.slug,
        display_name: p!.display_name,
      })) ?? [];

  const photosRaw = row.photos ?? [];
  const photos: TimelinePhoto[] = await Promise.all(
    photosRaw.map(async (p) => {
      const signed = await signPath(supabase, p.storage_path);
      return {
        id: p.id,
        storage_path: p.storage_path,
        caption: p.caption,
        taken_at: p.taken_at,
        sort_order: p.sort_order,
        signedUrl: signed,
      };
    }),
  );

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    event_date: row.event_date,
    location_text: row.location_text,
    created_at: row.created_at,
    recipient_profile_id: row.recipient_profile_id,
    recipient,
    author: authorProfiles
      ? {
          slug: authorProfiles.slug,
          display_name: authorProfiles.display_name,
        }
      : null,
    tagged,
    photos,
  };
}

async function signPath(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("memory-photos")
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
