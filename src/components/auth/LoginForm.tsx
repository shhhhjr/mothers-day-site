"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/profiles";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    setStatus(null);
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus("Check your email for the sign-in link.");
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    setStatus(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex gap-2 rounded-full bg-background/50 p-1">
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
            mode === "magic"
              ? "bg-accent text-background"
              : "text-muted hover:text-foreground"
          }`}
        >
          Magic link
        </button>
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
            mode === "password"
              ? "bg-accent text-background"
              : "text-muted hover:text-foreground"
          }`}
        >
          Password
        </button>
      </div>

      {mode === "magic" ? (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <label className="block text-sm text-muted">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground placeholder:text-muted focus:border-accent-gold focus:outline-none"
              placeholder="you@family.com"
              autoComplete="email"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-accent-gold py-3 text-sm font-medium text-background transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Sending…" : "Email me a link"}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePassword} className="space-y-4">
          <label className="block text-sm text-muted">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm text-muted">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground"
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-accent-gold py-3 text-sm font-medium text-background transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}

      {status && (
        <p className="text-sm text-muted" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
