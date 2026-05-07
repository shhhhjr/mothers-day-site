"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PROFILES, type ProfileSlug } from "@/lib/constants";
import { completeOnboarding } from "@/app/actions/member";

export function OnboardingForm() {
  const router = useRouter();
  const [slug, setSlug] = useState<ProfileSlug | "">("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setLoading(true);
    setError(null);
    const res = await completeOnboarding(slug);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    router.replace("/profiles");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      <fieldset>
        <legend className="sr-only">Family profile</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROFILES.map((p) => (
            <label
              key={p.slug}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                slug === p.slug
                  ? "border-accent-gold bg-accent-gold/10"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <input
                type="radio"
                name="profile"
                value={p.slug}
                checked={slug === p.slug}
                onChange={() => setSlug(p.slug)}
                className="sr-only"
              />
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${p.hue} text-lg font-semibold text-white shadow-inner`}
              >
                {p.initial}
              </span>
              <span className="font-medium text-foreground">{p.displayName}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!slug || loading}
        className="w-full rounded-full bg-accent py-3 text-sm font-medium text-background transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Continue to family space"}
      </button>
    </form>
  );
}
