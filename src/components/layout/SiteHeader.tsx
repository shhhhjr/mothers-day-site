"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isAuthBypassed, isSupabaseConfigured } from "@/lib/env";
import { NotificationBell } from "@/components/notifications/NotificationBell";

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
    router.replace("/");
    router.refresh();
  }

  const authReady = isSupabaseConfigured();
  const showAuthChrome = authReady && !isAuthBypassed();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/profiles" className="font-display text-xl text-foreground">
          Family memories
        </Link>
        <div className="flex items-center gap-3">
          {profileName && (
            <span className="hidden text-sm text-muted sm:inline">
              Hi, {profileName}
            </span>
          )}
          <Link
            href="/intro?replay=1"
            className="hidden text-sm text-accent underline-offset-4 hover:underline sm:inline"
          >
            Replay intro
          </Link>
          {showAuthChrome && <NotificationBell />}
          {showAuthChrome && (
            <Link
              href="/settings"
              aria-label="Settings"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-foreground transition hover:border-accent-gold hover:text-accent-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus"
            >
              <SettingsIcon />
            </Link>
          )}
          {showAuthChrome && (
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

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
