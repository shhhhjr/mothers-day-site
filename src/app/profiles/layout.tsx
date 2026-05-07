import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getCurrentMember } from "@/lib/auth/member";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function ProfilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const member = await getCurrentMember();
    if (!member) {
      redirect("/onboarding");
    }

    return (
      <div className="min-h-screen">
        <SiteHeader profileName={member.profiles.display_name} />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-amber-500/30 bg-amber-500/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-display text-lg">Family memories</span>
          <p className="text-sm text-muted">
            Add Supabase env vars to enable sign-in, photos, and cloud sync (see README).
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">{children}</div>
    </div>
  );
}
