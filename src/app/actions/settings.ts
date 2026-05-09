"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ACCENT_PALETTE, type AccentKey } from "@/lib/constants";

const VALID_ACCENT_KEYS: ReadonlySet<string> = new Set(
  ACCENT_PALETTE.map((p) => p.key),
);

const MAX_DISPLAY_NAME_LEN = 40;
const MAX_AVATAR_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED_AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

type Result<T = void> = T extends void
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

async function getMyMember() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, member: null };
  const { data: member } = await supabase
    .from("members")
    .select("id, profile_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return { supabase, user, member };
}

// ---------------------------------------------------------------------------
// Profile customization (display name, avatar, accent color).
// ---------------------------------------------------------------------------

export async function updateMyProfile(input: {
  displayName?: string;
  accentKey?: AccentKey;
  /** Pass `null` to clear the avatar; omit to leave unchanged. */
  avatarUrl?: string | null;
}): Promise<Result> {
  const { supabase, member } = await getMyMember();
  if (!member) {
    return { ok: false, error: "You haven’t claimed a profile yet." };
  }

  const patch: Record<string, string | null> = {};

  if (input.displayName !== undefined) {
    const trimmed = input.displayName.trim();
    if (!trimmed) return { ok: false, error: "Display name can’t be empty." };
    if (trimmed.length > MAX_DISPLAY_NAME_LEN) {
      return {
        ok: false,
        error: `Display name must be ≤ ${MAX_DISPLAY_NAME_LEN} characters.`,
      };
    }
    patch.display_name = trimmed;
  }

  if (input.accentKey !== undefined) {
    if (!VALID_ACCENT_KEYS.has(input.accentKey)) {
      return { ok: false, error: "Unknown accent color." };
    }
    patch.accent_key = input.accentKey;
  }

  if (input.avatarUrl !== undefined) {
    patch.avatar_url = input.avatarUrl;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", member.profile_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/profiles", "layout");
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Receives the raw avatar file from a `<form>` (FormData) — uploaded by the
 * Settings page. Stores it in the private `avatars` bucket under
 * `<member_id>/<timestamp>.<ext>`, then patches `profiles.avatar_url` with a
 * signed URL good for 10 years (bucket is private but signed URL is shareable
 * inside the family). Returns the new URL on success.
 */
export async function uploadAvatar(formData: FormData): Promise<Result<string>> {
  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file provided." };
  }
  if (file.size === 0) {
    return { ok: false, error: "That file appears to be empty." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: "Image must be ≤ 4 MB." };
  }
  if (!ALLOWED_AVATAR_MIME.has(file.type)) {
    return {
      ok: false,
      error: "Use a JPEG, PNG, or WebP image.",
    };
  }

  const { supabase, member } = await getMyMember();
  if (!member) {
    return { ok: false, error: "You haven’t claimed a profile yet." };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${member.id}/${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` };
  }

  // 10-year signed URL — long enough that we don't need to refresh it for a
  // family site, short enough that a leaked URL eventually expires.
  const { data: signed, error: signError } = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);

  if (signError || !signed) {
    return {
      ok: false,
      error: `Could not generate URL: ${signError?.message ?? "unknown error"}`,
    };
  }

  const result = await updateMyProfile({ avatarUrl: signed.signedUrl });
  if (!result.ok) return result;

  return { ok: true, data: signed.signedUrl };
}

// ---------------------------------------------------------------------------
// Notification preferences.
// ---------------------------------------------------------------------------

export async function updateNotificationPrefs(input: {
  notifyOnPost?: boolean;
  notifyOnTag?: boolean;
}): Promise<Result> {
  const { supabase, user } = await getMyMember();
  if (!user) return { ok: false, error: "Not signed in." };

  const patch: Record<string, boolean> = {};
  if (typeof input.notifyOnPost === "boolean")
    patch.notify_on_post = input.notifyOnPost;
  if (typeof input.notifyOnTag === "boolean")
    patch.notify_on_tag = input.notifyOnTag;

  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase
    .from("members")
    .update(patch)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Account: change password, sign out everywhere, delete account.
// ---------------------------------------------------------------------------

export async function changePassword(newPassword: string): Promise<Result> {
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOutEverywhere(): Promise<Result> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Hard-deletes the current user's auth row. The DB cascade handles their
 * `members` record and any entries they authored (because the FK is
 * `on delete cascade`). RLS-wise this requires calling the admin endpoint;
 * the anon key can't delete users, so we delete via the service role key
 * if it's configured. If not, fall back to deleting the member row only
 * and signing the user out — the auth user is then orphaned but harmless.
 */
export async function deleteMyAccount(): Promise<Result> {
  const { supabase, user, member } = await getMyMember();
  if (!user) return { ok: false, error: "Not signed in." };

  // Best-effort: delete the member row, which cascades to entries authored
  // by this user via the on-delete-cascade FK on entries.author_member_id.
  if (member) {
    const { error: memberDeleteError } = await supabase
      .from("members")
      .delete()
      .eq("id", member.id);
    if (memberDeleteError) {
      return {
        ok: false,
        error: `Couldn’t delete member row: ${memberDeleteError.message}`,
      };
    }
  }

  // Try to also delete the auth user. Requires SUPABASE_SERVICE_ROLE_KEY in
  // env. If we don't have it, just sign out — the auth user becomes orphaned
  // but the family site will treat them as a brand new user if they ever
  // return (no member row -> picker treats them as a first-timer).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (serviceKey && url) {
    try {
      const adminRes = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
        method: "DELETE",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
      if (!adminRes.ok) {
        const body = await adminRes.text();
        return {
          ok: false,
          error: `Auth user deletion failed (${adminRes.status}): ${body}`,
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Auth user deletion failed: ${message}` };
    }
  }

  await supabase.auth.signOut({ scope: "global" });
  return { ok: true };
}
