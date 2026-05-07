"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMilestone } from "@/app/actions/entries";
import { PROFILES, type ProfileSlug } from "@/lib/constants";

export function MilestoneForm({
  disabled,
  defaultTagged,
}: {
  disabled?: boolean;
  defaultTagged: ProfileSlug[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [body, setBody] = useState("");
  const [slugs, setSlugs] = useState<ProfileSlug[]>(defaultTagged);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleSlug(s: ProfileSlug) {
    setSlugs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    if (!title.trim() || !eventDate) {
      setStatus("Title and date are required.");
      return;
    }
    setLoading(true);
    setStatus(null);
    const res = await createMilestone({
      title,
      body,
      eventDate,
      taggedSlugs: slugs,
    });
    setLoading(false);
    if ("error" in res && res.error) {
      setStatus(res.error);
      return;
    }
    setTitle("");
    setEventDate("");
    setBody("");
    setStatus("Milestone saved.");
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
      <label className="block text-sm text-muted">
        Title
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled || loading}
          placeholder="First day of uni, big trip, inside joke…"
          className="mt-2 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground focus:border-accent-gold focus:outline-none"
        />
      </label>

      <label className="block text-sm text-muted">
        Date
        <input
          type="date"
          required
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          disabled={disabled || loading}
          className="mt-2 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground focus:border-accent-gold focus:outline-none"
        />
      </label>

      <label className="block text-sm text-muted">
        Story (optional)
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          disabled={disabled || loading}
          className="mt-2 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground focus:border-accent-gold focus:outline-none"
        />
      </label>

      <fieldset>
        <legend className="text-sm text-muted">Who shares this milestone?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {PROFILES.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => toggleSlug(p.slug)}
              disabled={disabled || loading}
              className={`rounded-full px-4 py-2 text-sm transition ${
                slugs.includes(p.slug)
                  ? "bg-accent-gold text-background"
                  : "bg-white/10 text-foreground hover:bg-white/15"
              }`}
            >
              {p.displayName}
            </button>
          ))}
        </div>
      </fieldset>

      {status && <p className="text-sm text-muted">{status}</p>}

      <button
        type="submit"
        disabled={disabled || loading}
        className="rounded-full bg-accent py-3 px-8 text-sm font-medium text-background transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save milestone"}
      </button>
    </form>
  );
}
