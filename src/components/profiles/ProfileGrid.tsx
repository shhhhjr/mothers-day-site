import Link from "next/link";
import { PROFILES } from "@/lib/constants";

export function ProfileGrid() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-center font-display text-4xl text-foreground sm:text-5xl">
        Who&apos;s watching?
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-muted">
        Choose a profile to see memories involving them, your shared timeline, and add something new.
      </p>

      <ul className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-5 md:gap-10">
        {PROFILES.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/profiles/${p.slug}`}
              className="group flex flex-col items-center gap-4 rounded-2xl px-2 pb-4 pt-2 outline-none transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring-focus"
            >
              <span
                className={`flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${p.hue} text-2xl font-semibold text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)] transition group-hover:scale-105 group-hover:ring-2 group-hover:ring-accent-gold/80 sm:h-28 sm:w-28`}
              >
                {p.initial}
              </span>
              <span className="text-center text-lg font-medium text-foreground/90 group-hover:text-foreground">
                {p.displayName}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
