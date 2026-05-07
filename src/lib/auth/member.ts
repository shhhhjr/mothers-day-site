import { createServerSupabaseClient } from "@/lib/supabase/server";

export type MemberWithProfile = {
  id: string;
  user_id: string;
  profile_id: string;
  profiles: {
    id: string;
    slug: string;
    display_name: string;
    avatar_url: string | null;
  };
};

export async function getCurrentMember(): Promise<MemberWithProfile | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("members")
      .select("id, user_id, profile_id, profiles ( id, slug, display_name, avatar_url )")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) return null;

    const rawProfiles = data.profiles as
      | MemberWithProfile["profiles"]
      | MemberWithProfile["profiles"][]
      | null;
    const profiles = Array.isArray(rawProfiles) ? rawProfiles[0] : rawProfiles;
    if (!profiles) return null;

    return {
      id: data.id,
      user_id: data.user_id,
      profile_id: data.profile_id,
      profiles,
    };
  } catch {
    return null;
  }
}
