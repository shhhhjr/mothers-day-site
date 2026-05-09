import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getCurrentMember } from "@/lib/auth/member";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAuthBypassed, isSupabaseConfigured } from "@/lib/env";

export default async function ProfilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured() && !isAuthBypassed()) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    // Don't redirect-loop unclaimed users to /onboarding any more — the
    // /profiles "Who's watching?" picker now handles claim-on-first-click,
    // so the smaller /onboarding screen would just be a duplicate ask.
    const member = await getCurrentMember();

    return (
      <div className="min-h-screen">
        <SiteHeader profileName={member?.profiles.display_name} />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">{children}</div>
      </div>
    );
  }

  if (isSupabaseConfigured() && isAuthBypassed()) {
    return (
      <div className="min-h-screen">
        <div className="border-b border-amber-500/50 bg-amber-950/50 px-4 py-3 text-center text-sm text-amber-50">
          Testing mode: <code className="rounded bg-black/40 px-1">NEXT_PUBLIC_SKIP_AUTH=1</code> —
          login is skipped. Timeline writes may fail without a signed-in user (RLS). Remove before
          production.
        </div>
        <SiteHeader />
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
