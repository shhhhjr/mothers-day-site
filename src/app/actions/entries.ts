"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fanoutNotifications } from "@/app/actions/notifications";
import type { ProfileSlug } from "@/lib/constants";

async function getAuthorMemberId(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." as const, memberId: null };

  const { data: member, error } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !member) return { error: "Complete onboarding first.", memberId: null };
  return { error: null, memberId: member.id };
}

async function profileIdsForSlugs(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  slugs: ProfileSlug[],
) {
  if (slugs.length === 0) return [] as { id: string; slug: string }[];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, slug")
    .in("slug", slugs);
  if (error || !data) return [];
  return data;
}

export async function createMemory(input: {
  body: string;
  taggedSlugs: ProfileSlug[];
}) {
  const supabase = await createServerSupabaseClient();
  const { memberId, error: authError } = await getAuthorMemberId(supabase);
  if (authError || !memberId) return { error: authError ?? "Unauthorized" };

  const { data: entry, error: insertError } = await supabase
    .from("entries")
    .insert({
      type: "memory",
      author_member_id: memberId,
      body: input.body.trim(),
    })
    .select("id")
    .single();

  if (insertError || !entry) return { error: insertError?.message ?? "Could not save." };

  const profiles = await profileIdsForSlugs(supabase, input.taggedSlugs);
  if (profiles.length > 0) {
    await supabase.from("entry_profiles").insert(
      profiles.map((p) => ({
        entry_id: entry.id,
        profile_id: p.id,
      })),
    );
  }

  await fanoutNotifications({
    entryId: entry.id,
    authorMemberId: memberId,
    taggedProfileIds: profiles.map((p) => p.id),
  });

  revalidatePath("/profiles");
  return { entryId: entry.id };
}

export async function createLoveNote(input: {
  body: string;
  recipientSlug: ProfileSlug;
}) {
  const supabase = await createServerSupabaseClient();
  const { memberId, error: authError } = await getAuthorMemberId(supabase);
  if (authError || !memberId) return { error: authError ?? "Unauthorized" };

  const { data: recipient } = await supabase
    .from("profiles")
    .select("id")
    .eq("slug", input.recipientSlug)
    .single();

  if (!recipient) return { error: "Recipient not found." };

  const { data: entry, error } = await supabase
    .from("entries")
    .insert({
      type: "love_note",
      author_member_id: memberId,
      body: input.body.trim(),
      recipient_profile_id: recipient.id,
    })
    .select("id")
    .single();

  if (error || !entry) return { error: error?.message ?? "Could not save." };

  // Treat the love note's recipient as a tag for notification routing —
  // the recipient deserves the louder "tagged" notification, not just
  // the default "new_post".
  await fanoutNotifications({
    entryId: entry.id,
    authorMemberId: memberId,
    taggedProfileIds: [recipient.id],
  });

  revalidatePath("/profiles");
  return { ok: true };
}

export async function createPhotodrop(input: {
  body?: string;
  eventDate: string;
  locationText: string;
  taggedSlugs: ProfileSlug[];
}) {
  const supabase = await createServerSupabaseClient();
  const { memberId, error: authError } = await getAuthorMemberId(supabase);
  if (authError || !memberId) return { error: authError ?? "Unauthorized" };

  const { data: entry, error: insertError } = await supabase
    .from("entries")
    .insert({
      type: "photodrop",
      author_member_id: memberId,
      body: input.body?.trim() || null,
      event_date: input.eventDate,
      location_text: input.locationText.trim(),
    })
    .select("id")
    .single();

  if (insertError || !entry) return { error: insertError?.message ?? "Could not save." };

  const profiles = await profileIdsForSlugs(supabase, input.taggedSlugs);
  if (profiles.length > 0) {
    await supabase.from("entry_profiles").insert(
      profiles.map((p) => ({
        entry_id: entry.id,
        profile_id: p.id,
      })),
    );
  }

  await fanoutNotifications({
    entryId: entry.id,
    authorMemberId: memberId,
    taggedProfileIds: profiles.map((p) => p.id),
  });

  revalidatePath("/profiles");
  return { entryId: entry.id };
}

export async function createMilestone(input: {
  title: string;
  body?: string;
  eventDate: string;
  taggedSlugs: ProfileSlug[];
}) {
  const supabase = await createServerSupabaseClient();
  const { memberId, error: authError } = await getAuthorMemberId(supabase);
  if (authError || !memberId) return { error: authError ?? "Unauthorized" };

  const { data: entry, error: insertError } = await supabase
    .from("entries")
    .insert({
      type: "milestone",
      author_member_id: memberId,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      event_date: input.eventDate,
    })
    .select("id")
    .single();

  if (insertError || !entry) return { error: insertError?.message ?? "Could not save." };

  const profiles = await profileIdsForSlugs(supabase, input.taggedSlugs);
  if (profiles.length > 0) {
    await supabase.from("entry_profiles").insert(
      profiles.map((p) => ({
        entry_id: entry.id,
        profile_id: p.id,
      })),
    );
  }

  await fanoutNotifications({
    entryId: entry.id,
    authorMemberId: memberId,
    taggedProfileIds: profiles.map((p) => p.id),
  });

  revalidatePath("/profiles");
  return { entryId: entry.id };
}

export async function registerPhotos(input: {
  entryId: string;
  items: { storage_path: string; caption?: string | null; taken_at?: string | null }[];
}) {
  const supabase = await createServerSupabaseClient();
  const { memberId, error: authError } = await getAuthorMemberId(supabase);
  if (authError || !memberId) return { error: authError ?? "Unauthorized" };

  const { data: entry } = await supabase
    .from("entries")
    .select("id, author_member_id")
    .eq("id", input.entryId)
    .single();

  if (!entry || entry.author_member_id !== memberId) {
    return { error: "Not allowed." };
  }

  const rows = input.items.map((item, index) => ({
    entry_id: input.entryId,
    storage_path: item.storage_path,
    caption: item.caption ?? null,
    taken_at: item.taken_at ?? null,
    sort_order: index,
  }));

  const { error } = await supabase.from("photos").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/profiles");
  return { ok: true };
}

export async function deleteEntry(entryId: string) {
  const supabase = await createServerSupabaseClient();
  const { memberId, error: authError } = await getAuthorMemberId(supabase);
  if (authError || !memberId) return { error: authError ?? "Unauthorized" };

  const { data: entry } = await supabase
    .from("entries")
    .select("id, author_member_id")
    .eq("id", entryId)
    .single();

  if (!entry || entry.author_member_id !== memberId) {
    return { error: "Not allowed." };
  }

  const { data: photoRows } = await supabase.from("photos").select("storage_path").eq("entry_id", entryId);

  if (photoRows?.length) {
    await supabase.storage
      .from("memory-photos")
      .remove(photoRows.map((p) => p.storage_path));
  }

  const { error } = await supabase.from("entries").delete().eq("id", entryId);
  if (error) return { error: error.message };

  revalidatePath("/profiles");
  return { ok: true };
}
