import { SiteHeader } from "@/components/layout/SiteHeader";
import { getCurrentMember } from "@/lib/auth/member";
import { isAuthBypassed, isSupabaseConfigured } from "@/lib/env";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The page itself handles the auth redirects (so the auth-bypass mode
  // shortcut can render its banner). This layout only wraps the page in
  // the same chrome as /profiles so navigation feels seamless.
  const member =
    isSupabaseConfigured() && !isAuthBypassed()
      ? await getCurrentMember()
      : null;

  return (
    <div className="min-h-screen">
      <SiteHeader profileName={member?.profiles.display_name} />
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
        {children}
      </div>
    </div>
  );
}
