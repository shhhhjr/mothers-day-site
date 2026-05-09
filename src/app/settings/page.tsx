import { redirect } from "next/navigation";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { fetchProfileBySlug } from "@/lib/data/profiles";
import { getCurrentMember } from "@/lib/auth/member";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAuthBypassed, isSupabaseConfigured } from "@/lib/env";

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  if (isAuthBypassed()) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="font-display text-3xl text-foreground">Settings</h1>
        <p className="mt-4 text-muted">
          Settings are disabled in <code>NEXT_PUBLIC_SKIP_AUTH=1</code> testing
          mode — there’s no real signed-in user to attach changes to. Sign in to
          a real account to edit profile, notifications, or password.
        </p>
      </main>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const member = await getCurrentMember();
  if (!member) {
    // Unclaimed user — send them to the picker so they can claim a profile
    // first; settings only make sense for someone with a profile to edit.
    redirect("/profiles");
  }

  const profile = await fetchProfileBySlug(member.profiles.slug);
  if (!profile) redirect("/profiles");

  // Pull the current notification preferences from the members row so the
  // toggles render in their persisted state.
  const { data: prefs } = await supabase
    .from("members")
    .select("notify_on_post, notify_on_tag")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main>
      <h1 className="font-display text-4xl text-foreground sm:text-5xl">
        Settings
      </h1>
      <p className="mt-2 max-w-xl text-muted">
        Customize how your profile appears to the rest of the family and
        decide which posts you want to be notified about.
      </p>

      <SettingsTabs
        profile={profile}
        email={user.email ?? "(no email)"}
        notifyOnPost={prefs?.notify_on_post ?? true}
        notifyOnTag={prefs?.notify_on_tag ?? true}
      />
    </main>
  );
}
