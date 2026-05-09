"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type NotificationKind = "new_post" | "tagged";

export type NotificationRow = {
  id: string;
  kind: NotificationKind;
  entry_id: string | null;
  actor_member_id: string | null;
  created_at: string;
  read_at: string | null;
  // Joined fields
  actor: {
    profile: {
      slug: string;
      display_name: string;
      accent_key: string | null;
    } | null;
  } | null;
  entry: {
    type: string;
    title: string | null;
    body: string | null;
  } | null;
};

/**
 * Internal helper called from each entry-creating server action to fan a
 * single new entry out into per-recipient rows in `notifications`. Honors
 * each member's `notify_on_post` / `notify_on_tag` preference.
 *
 * Idempotent because of the `(user_id, entry_id, kind)` unique constraint —
 * if called twice it just gets `23505` on the second insert and ignores it.
 */
export async function fanoutNotifications(input: {
  entryId: string;
  authorMemberId: string;
  /** Profile IDs (NOT slugs) that were tagged in this entry. */
  taggedProfileIds: string[];
}): Promise<void> {
  if (!input.entryId || !input.authorMemberId) return;

  const supabase = await createServerSupabaseClient();

  const { data: members } = await supabase
    .from("members")
    .select("id, user_id, profile_id, notify_on_post, notify_on_tag");
  if (!members || members.length === 0) return;

  const taggedSet = new Set(input.taggedProfileIds);

  type Row = {
    user_id: string;
    kind: NotificationKind;
    entry_id: string;
    actor_member_id: string;
  };
  const rows: Row[] = [];

  for (const m of members) {
    if (m.id === input.authorMemberId) continue; // don't notify the author
    const isTagged = taggedSet.has(m.profile_id);
    if (isTagged && m.notify_on_tag) {
      rows.push({
        user_id: m.user_id,
        kind: "tagged",
        entry_id: input.entryId,
        actor_member_id: input.authorMemberId,
      });
    } else if (m.notify_on_post) {
      rows.push({
        user_id: m.user_id,
        kind: "new_post",
        entry_id: input.entryId,
        actor_member_id: input.authorMemberId,
      });
    }
  }

  if (rows.length === 0) return;

  // We don't `.throwOnError()` — fanout is best-effort. A missed
  // notification shouldn't fail the user's create-entry call.
  await supabase.from("notifications").insert(rows, { defaultToNull: true });
}

// ---------------------------------------------------------------------------
// Reads (used by the bell dropdown and the Settings page's notifications tab)
// ---------------------------------------------------------------------------

export async function listMyNotifications(
  limit = 20,
): Promise<NotificationRow[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select(
      `id, kind, entry_id, actor_member_id, created_at, read_at,
       actor:actor_member_id ( profile:profile_id ( slug, display_name, accent_key ) ),
       entry:entry_id ( type, title, body )`,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as unknown as NotificationRow[];
}

export async function countMyUnreadNotifications(): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Writes (mark read)
// ---------------------------------------------------------------------------

export async function markNotificationRead(notificationId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllNotificationsRead() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
