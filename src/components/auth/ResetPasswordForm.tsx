"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don’t match.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError("Sign-in is not available right now.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || "Could not update your password.");
      return;
    }
    router.replace("/profiles");
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
      <label className="block text-sm text-muted">
        New password
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground"
          autoComplete="new-password"
        />
      </label>
      <label className="block text-sm text-muted">
        Confirm new password
        <input
          type="password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground"
          autoComplete="new-password"
        />
      </label>
      {error && (
        <p
          className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"
          role="alert"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-accent-gold py-3 text-sm font-medium text-background transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save new password & sign in"}
      </button>
    </form>
  );
}
