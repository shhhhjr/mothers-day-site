import { notFound } from "next/navigation";
import { ContributionTabs } from "@/components/profile/ContributionTabs";
import { StatsBar } from "@/components/profile/StatsBar";
import { TimelineFeed } from "@/components/timeline/TimelineFeed";
import { fetchTimelineEntries } from "@/lib/data/entries";
import { computeProfileStatsBySlug } from "@/lib/data/stats";
import { PROFILES, type ProfileSlug } from "@/lib/constants";
import { getCurrentMember } from "@/lib/auth/member";
import { isSupabaseConfigured } from "@/lib/env";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const match = PROFILES.find((p) => p.slug === slug);
  if (!match) notFound();

  const configured = isSupabaseConfigured();
  const entries = configured ? await fetchTimelineEntries() : [];
  const stats = computeProfileStatsBySlug(entries, slug as ProfileSlug);
  const member = configured ? await getCurrentMember() : null;

  return (
    <main>
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-muted">Profile</p>
        <h1 className="mt-2 font-display text-4xl text-foreground sm:text-5xl">
          {match.displayName}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted">
          Every memory the family adds appears on the timeline. Filter to focus on entries that
          involve {match.displayName}.
        </p>
      </div>

      <div className="mt-12">
        <StatsBar displayName={match.displayName} stats={stats} />
      </div>

      <TimelineFeed
        entries={entries}
        highlightSlug={slug}
        currentAuthorSlug={member?.profiles.slug}
      />

      <ContributionTabs
        contextSlug={slug as ProfileSlug}
        disabled={!configured || !member}
      />
    </main>
  );
}
