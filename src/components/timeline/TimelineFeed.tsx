"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { TimelineEntry } from "@/types/entries";
import { deleteEntry } from "@/app/actions/entries";

type TimelineFeedProps = {
  entries: TimelineEntry[];
  highlightSlug: string;
  currentAuthorSlug?: string;
  /**
   * Map of profile slug → accent hex (from `EnrichedProfile.accent`). Used to
   * color the author's display name in their chosen color so it's quickly
   * scannable on the timeline.
   */
  accentBySlug?: Record<string, string>;
};

export function TimelineFeed({
  entries,
  highlightSlug,
  currentAuthorSlug,
  accentBySlug = {},
}: TimelineFeedProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "you">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter(
      (e) =>
        e.recipient?.slug === highlightSlug ||
        e.tagged.some((t) => t.slug === highlightSlug) ||
        e.author?.slug === highlightSlug,
    );
  }, [entries, filter, highlightSlug]);

  return (
    <section className="mt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-2xl text-foreground">Timeline</h2>
        <div className="flex gap-2 rounded-full bg-card/60 p-1 text-sm">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 transition ${
              filter === "all"
                ? "bg-accent/90 text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            Everyone
          </button>
          <button
            type="button"
            onClick={() => setFilter("you")}
            className={`rounded-full px-4 py-2 transition ${
              filter === "you"
                ? "bg-accent/90 text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            Involving this profile
          </button>
        </div>
      </div>

      <ul className="mt-8 space-y-8">
        {filtered.length === 0 && (
          <li className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-muted">
            No entries yet—add a memory, note, photodrop, or milestone below.
          </li>
        )}
        {filtered.map((entry) => (
          <li key={entry.id}>
            <article
              className={`rounded-2xl border border-white/10 bg-card/60 p-6 shadow-lg backdrop-blur ${
                involvesSlug(entry, highlightSlug)
                  ? "ring-1 ring-accent-gold/40"
                  : ""
              }`}
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-foreground">
                    {labelForType(entry.type)}
                  </span>
                  <span>
                    {entry.author ? (
                      <>
                        <span
                          className="font-medium"
                          style={{
                            color:
                              accentBySlug[entry.author.slug] ??
                              "var(--color-foreground, #f5f5f4)",
                          }}
                        >
                          {entry.author.display_name}
                        </span>
                        <span className="text-muted"> · </span>
                      </>
                    ) : null}
                    {formatDate(entry.created_at)}
                  </span>
                </div>
                {currentAuthorSlug && entry.author?.slug === currentAuthorSlug && (
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        await deleteEntry(entry.id);
                        router.refresh();
                      })();
                    }}
                    className="text-xs text-rose-300 underline-offset-4 hover:underline"
                  >
                    Delete
                  </button>
                )}
              </header>

              {entry.type === "love_note" && entry.recipient && (
                <p className="mt-3 text-sm text-accent">
                  For{" "}
                  <span className="font-medium text-foreground">
                    {entry.recipient.display_name}
                  </span>
                </p>
              )}

              {entry.title && (
                <h3 className="mt-4 font-display text-xl text-foreground">{entry.title}</h3>
              )}

              {entry.body && (
                <p className="mt-3 whitespace-pre-wrap leading-relaxed text-foreground/95">
                  {entry.body}
                </p>
              )}

              {(entry.event_date || entry.location_text) && (
                <p className="mt-4 text-sm text-muted">
                  {entry.event_date && (
                    <span>{formatEventDate(entry.event_date)}</span>
                  )}
                  {entry.event_date && entry.location_text && " · "}
                  {entry.location_text}
                </p>
              )}

              {entry.tagged.length > 0 && (
                <p className="mt-4 text-sm text-muted">
                  With:{" "}
                  {entry.tagged.map((t) => (
                    <span key={t.slug} className="mr-2 inline-block text-foreground/90">
                      {t.display_name}
                    </span>
                  ))}
                </p>
              )}

              {entry.photos.length > 0 && (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {entry.photos.map((ph) =>
                    ph.signedUrl ? (
                      <figure key={ph.id} className="overflow-hidden rounded-xl border border-white/10">
                        <Image
                          src={ph.signedUrl}
                          alt={ph.caption || "Memory photo"}
                          width={800}
                          height={600}
                          className="h-auto w-full object-cover"
                          unoptimized
                        />
                        {ph.caption && (
                          <figcaption className="px-3 py-2 text-sm text-muted">
                            {ph.caption}
                          </figcaption>
                        )}
                      </figure>
                    ) : null,
                  )}
                </div>
              )}
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

function involvesSlug(entry: TimelineEntry, slug: string) {
  return (
    entry.recipient?.slug === slug ||
    entry.tagged.some((t) => t.slug === slug) ||
    entry.author?.slug === slug
  );
}

function labelForType(t: TimelineEntry["type"]) {
  switch (t) {
    case "memory":
      return "Memory";
    case "love_note":
      return "Love note";
    case "photodrop":
      return "Photodrop";
    case "milestone":
      return "Milestone";
    default:
      return t;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatEventDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString(undefined, {
    dateStyle: "long",
  });
}
