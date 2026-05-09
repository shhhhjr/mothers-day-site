"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completeOnboarding } from "@/app/actions/member";
import type { ProfileSlug } from "@/lib/constants";
import type { EnrichedProfile } from "@/lib/data/profiles";

type ProfileGridProps = {
  /** All 5 family profiles, in canonical order, with palette + avatar applied. */
  profiles: EnrichedProfile[];
  /** The profile slug this user has already claimed, if any. */
  claimedSlug: string | null;
  /**
   * True when the page should treat the first click as a CLAIM action
   * (records `members.user_id -> profile_id` in Supabase, then navigates).
   * False = plain navigation, e.g. for already-claimed users or in
   * unauthenticated/bypass modes.
   */
  canClaim: boolean;
};

export function ProfileGrid({
  profiles,
  claimedSlug,
  canClaim,
}: ProfileGridProps) {
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = useState<ProfileSlug | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClaim(slug: ProfileSlug) {
    setError(null);
    setPendingSlug(slug);
    startTransition(async () => {
      const result = await completeOnboarding(slug);
      if (result?.error) {
        setError(result.error);
        setPendingSlug(null);
        return;
      }
      router.replace(`/profiles/${slug}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-center font-display text-4xl text-foreground sm:text-5xl">
        Who&apos;s watching?
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-muted">
        {canClaim
          ? "Tap your face below — that profile gets linked to your account so memories you add show up under your name. (You can always browse the others.)"
          : "Choose a profile to see memories involving them, your shared timeline, and add something new."}
      </p>

      {error && (
        <p
          role="alert"
          className="mx-auto mt-6 max-w-md rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-200"
        >
          {error}
        </p>
      )}

      <ul className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-5 md:gap-10">
        {profiles.map((p) => {
          const isClaimedByMe = claimedSlug === p.slug;
          const isThisLoading = pendingSlug === p.slug && isPending;

          const innerVisual = (
            <>
              <span
                className={`relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${p.hue} text-2xl font-semibold text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)] transition group-hover:scale-105 group-hover:ring-2 group-hover:ring-accent-gold/80 sm:h-28 sm:w-28`}
              >
                {p.avatarUrl ? (
                  <Image
                    src={p.avatarUrl}
                    alt={`${p.displayName} avatar`}
                    fill
                    sizes="(min-width: 640px) 112px, 96px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  p.initial
                )}
                {isClaimedByMe && (
                  <span
                    aria-hidden
                    className="absolute -bottom-1 -right-1 rounded-full border-2 border-background bg-accent-gold px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background"
                  >
                    you
                  </span>
                )}
              </span>
              <span
                className="text-center text-lg font-medium group-hover:text-foreground"
                style={{ color: p.accent }}
              >
                {p.displayName}
              </span>
              {isThisLoading && (
                <span className="text-xs text-muted">Linking…</span>
              )}
            </>
          );

          if (canClaim) {
            return (
              <li key={p.slug}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleClaim(p.slug)}
                  className="group flex w-full flex-col items-center gap-4 rounded-2xl px-2 pb-4 pt-2 outline-none transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring-focus disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {innerVisual}
                </button>
              </li>
            );
          }

          return (
            <li key={p.slug}>
              <Link
                href={`/profiles/${p.slug}`}
                className="group flex flex-col items-center gap-4 rounded-2xl px-2 pb-4 pt-2 outline-none transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring-focus"
              >
                {innerVisual}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
