import { ProfileGrid } from "@/components/profiles/ProfileGrid";
import { getCurrentMember } from "@/lib/auth/member";
import { isAuthBypassed, isSupabaseConfigured } from "@/lib/env";

export default async function ProfilesPage() {
  // Skip the DB roundtrip in environments without Supabase or in
  // NEXT_PUBLIC_SKIP_AUTH=1 testing mode — there's no real user to claim
  // anything to, so just behave like a returning visitor.
  const member =
    isSupabaseConfigured() && !isAuthBypassed()
      ? await getCurrentMember()
      : null;

  const claimedSlug = member?.profiles.slug ?? null;
  const canClaim = isSupabaseConfigured() && !isAuthBypassed() && !member;

  return (
    <main>
      <ProfileGrid claimedSlug={claimedSlug} canClaim={canClaim} />
    </main>
  );
}
