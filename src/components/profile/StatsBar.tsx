import type { ProfileStats } from "@/lib/data/stats";

type StatsBarProps = {
  displayName: string;
  stats: ProfileStats;
};

export function StatsBar({ displayName, stats }: StatsBarProps) {
  const items = [
    { label: "Memories tagging you", value: stats.memoriesTaggingYou },
    { label: "Entries involving you", value: stats.entriesInvolvingYou },
    { label: "Photos in your story", value: stats.photosTouchingYou },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/10 bg-gradient-to-br from-card to-background p-5 shadow-inner"
        >
          <p className="text-3xl font-semibold text-accent-gold">{item.value}</p>
          <p className="mt-2 text-sm text-muted">{item.label}</p>
        </div>
      ))}
      <p className="sr-only">
        Snapshot for {displayName}: {items.map((i) => `${i.label} ${i.value}`).join(", ")}
      </p>
    </section>
  );
}
