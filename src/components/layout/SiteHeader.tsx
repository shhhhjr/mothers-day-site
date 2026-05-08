"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

type SiteHeaderProps = {
  profileName?: string;
};

export function SiteHeader({ profileName }: SiteHeaderProps) {
  const router = useRouter();

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.replace("/login");
    router.refresh();
  }

  const authReady = isSupabaseConfigured();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/profiles" className="font-display text-xl text-foreground">
          Family memories
        </Link>
        <div className="flex items-center gap-3">
          {profileName && (
            <span className="hidden text-sm text-muted sm:inline">Hi, {profileName}</span>
          )}
          <Link
            href="/?replay=1"
            className="text-sm text-accent underline-offset-4 hover:underline"
          >
            Replay intro
          </Link>
          {authReady && (
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-foreground transition hover:border-accent-gold hover:text-accent-gold"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
