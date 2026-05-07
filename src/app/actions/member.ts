"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileSlug } from "@/lib/constants";

export async function completeOnboarding(profileSlug: ProfileSlug) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("slug", profileSlug)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found." };
  }

  const { error } = await supabase.from("members").insert({
    user_id: user.id,
    profile_id: profile.id,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error:
          "That profile is already linked to another account. Ask Jais for help or pick another.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/profiles");
  return { ok: true };
}
