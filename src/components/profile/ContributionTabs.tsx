"use client";

import { useState } from "react";
import type { ProfileSlug } from "@/lib/constants";
import { MemoryForm } from "@/components/forms/MemoryForm";
import { LoveNoteForm } from "@/components/forms/LoveNoteForm";
import { PhotodropForm } from "@/components/forms/PhotodropForm";
import { MilestoneForm } from "@/components/forms/MilestoneForm";

const tabs = [
  { id: "memory", label: "Memory" },
  { id: "love_note", label: "Love note" },
  { id: "photodrop", label: "Photodrop" },
  { id: "milestone", label: "Milestone" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function ContributionTabs({
  contextSlug,
  disabled,
}: {
  contextSlug: ProfileSlug;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState<TabId>("memory");

  return (
    <section className="mt-16 rounded-2xl border border-white/10 bg-card/40 p-6 backdrop-blur">
      <h2 className="font-display text-2xl text-foreground">Add something</h2>
      <p className="mt-2 text-sm text-muted">
        Memories can include photos. Love notes go to one person. Photodrops capture a place &amp;
        date. Milestones mark big dates.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-accent text-background"
                : "bg-white/5 text-muted hover:bg-white/10 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {disabled && (
          <p className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            Connect Supabase and sign in to add entries.
          </p>
        )}
        {tab === "memory" && <MemoryForm disabled={disabled} />}
        {tab === "love_note" && (
          <LoveNoteForm disabled={disabled} defaultRecipient={contextSlug} />
        )}
        {tab === "photodrop" && (
          <PhotodropForm disabled={disabled} defaultTagged={[contextSlug]} />
        )}
        {tab === "milestone" && (
          <MilestoneForm disabled={disabled} defaultTagged={[contextSlug]} />
        )}
      </div>
    </section>
  );
}
