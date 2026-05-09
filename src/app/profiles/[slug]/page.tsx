import Image from "next/image";
import { notFound } from "next/navigation";
import { ContributionTabs } from "@/components/profile/ContributionTabs";
import { StatsBar } from "@/components/profile/StatsBar";
import { TimelineFeed } from "@/components/timeline/TimelineFeed";
import { fetchTimelineEntries } from "@/lib/data/entries";
import { computeProfileStatsBySlug } from "@/lib/data/stats";
import { fetchAllProfiles, fetchProfileBySlug } from "@/lib/data/profiles";
import { type ProfileSlug } from "@/lib/constants";
import { getCurrentMember } from "@/lib/auth/member";
import { isSupabaseConfigured } from "@/lib/env";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const profile = await fetchProfileBySlug(slug);
  if (!profile) notFound();

  const configured = isSupabaseConfigured();
  const entries = configured ? await fetchTimelineEntries() : [];
  const stats = computeProfileStatsBySlug(entries, slug as ProfileSlug);
  const member = configured ? await getCurrentMember() : null;
  const allProfiles = await fetchAllProfiles();
  const accentBySlug = Object.fromEntries(
    allProfiles.map((p) => [p.slug, p.accent]),
  );

  return (
    <main>
      <div className="text-center">
        <div
          className={`mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${profile.hue} text-3xl font-semibold text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)] sm:h-28 sm:w-28`}
        >
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt={`${profile.displayName} avatar`}
              width={112}
              height={112}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span>{profile.initial}</span>
          )}
        </div>
        <p className="mt-4 text-sm uppercase tracking-[0.25em] text-muted">
          Profile
        </p>
        <h1
          className="mt-2 font-display text-4xl sm:text-5xl"
          style={{ color: profile.accent }}
        >
          {profile.displayName}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted">
          Every memory the family adds appears on the timeline. Filter to focus
          on entries that involve {profile.displayName}.
        </p>
      </div>

      <div className="mt-12">
        <StatsBar displayName={profile.displayName} stats={stats} />
      </div>

      <TimelineFeed
        entries={entries}
        highlightSlug={slug}
        currentAuthorSlug={member?.profiles.slug}
        accentBySlug={accentBySlug}
      />

      <ContributionTabs
        contextSlug={slug as ProfileSlug}
        disabled={!configured || !member}
      />
    </main>
  );
}
