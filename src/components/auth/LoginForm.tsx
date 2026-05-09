"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getAuthSiteOrigin } from "@/lib/auth/site-url";
import {
  resendConfirmation,
  sendPasswordReset,
  signUpWithPassword,
  type AuthActionResult,
} from "@/app/actions/auth";

type Mode = "signup" | "password" | "reset";

type Status =
  | { kind: "info"; text: string }
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

function describeAuthFailure(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback;
  const message =
    typeof (err as { message?: unknown }).message === "string"
      ? ((err as { message: string }).message || "").trim()
      : "";
  const status = Number((err as { status?: unknown }).status);
  const code =
    typeof (err as { code?: unknown }).code === "string"
      ? ((err as { code: string }).code || "").trim()
      : "";

  const parts = [message || fallback];
  if (Number.isFinite(status) && status > 0) parts.push(`(HTTP ${status})`);
  if (code) parts.push(`(${code})`);
  return parts.join(" ");
}

function describeServerActionFailure(
  result: Extract<AuthActionResult, { ok: false }>,
): string {
  const parts = [result.error];
  if (result.status) parts.push(`(HTTP ${result.status})`);
  if (result.code) parts.push(`(${result.code})`);
  return parts.join(" ");
}

function maskEmail(normalized: string): string {
  const [loc, dom] = normalized.split("@");
  if (!loc || !dom) return "(invalid email)";
  const head = loc.length <= 2 ? `${loc.slice(0, 1)}•` : `${loc.slice(0, 2)}•••`;
  return `${head}@${dom}`;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/profiles";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("signup");
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  // The email used in the most recent successful signup; surfaces a
  // "resend confirmation email" affordance underneath the success message
  // for cases where Supabase's free-tier SMTP delays/rate-limits delivery.
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(
    null,
  );

  const authError = searchParams.get("auth_error");
  const authDetail = searchParams.get("auth_detail");
  let authBanner: string | null = null;

  if (authError === "session_exchange_failed" && authDetail) {
    authBanner =
      authDetail === "pkce_cross_device"
        ? `That email link was tied to a different device than the one you opened it on.

Use the “Sign in” tab below with the email + password you signed up with — that always works on every device.`
        : (() => {
            try {
              return decodeURIComponent(authDetail);
            } catch {
              return authDetail;
            }
          })();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setPendingConfirmEmail(null);
    const origin = getAuthSiteOrigin();
    const result = await signUpWithPassword(
      email.trim(),
      password,
      `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    );
    setLoading(false);

    if (!result.ok) {
      setStatus({ kind: "error", text: describeServerActionFailure(result) });
      return;
    }

    if (!result.needsEmailConfirm) {
      // Project has "Confirm email" off — sign them in with the same password.
      const supabase = createBrowserSupabaseClient();
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (!error) {
          router.replace(next);
          router.refresh();
          return;
        }
      }
      setStatus({
        kind: "success",
        text: `Account created. Use the “Sign in” tab to log in with the same email + password.`,
      });
      setMode("password");
      return;
    }

    setPendingConfirmEmail(email.trim());
    setStatus({
      kind: "success",
      text: `Confirmation email sent to ${maskEmail(email.trim().toLowerCase())}.

Open that email on ANY device and tap the link inside — it will log you in. The page you’re on now can be closed.

If you don’t see it in a few minutes, check spam, then use the “Resend confirmation email” button below.`,
    });
  }

  async function handleResendConfirmation() {
    if (!pendingConfirmEmail) return;
    setLoading(true);
    setStatus(null);
    const origin = getAuthSiteOrigin();
    const result = await resendConfirmation(
      pendingConfirmEmail,
      `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    );
    setLoading(false);
    if (!result.ok) {
      setStatus({
        kind: "error",
        text: `${describeServerActionFailure(result)}

This usually means Supabase’s free-tier email service is rate-limited (only ~3 emails per hour). Either wait an hour or have the project owner set up Resend SMTP — see README.`,
      });
      return;
    }
    setStatus({
      kind: "success",
      text: `Resent. Check ${maskEmail(pendingConfirmEmail.toLowerCase())} again — it can take a couple of minutes.`,
    });
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
      setStatus({
        kind: "error",
        text: describeAuthFailure(error, "Sign-in failed."),
      });
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const origin = getAuthSiteOrigin();
    const result = await sendPasswordReset(
      email.trim(),
      `${origin}/auth/callback?type=recovery&next=/reset-password`,
    );
    setLoading(false);

    if (!result.ok) {
      setStatus({
        kind: "error",
        text: describeServerActionFailure(result),
      });
      return;
    }

    setStatus({
      kind: "success",
      text: `If ${maskEmail(email.trim().toLowerCase())} is on file, a reset link is on its way.

Tap the link in the email and you’ll be taken to a page to choose a new password.`,
    });
  }

  const tabs: { id: Mode; label: string }[] = [
    { id: "signup", label: "Sign up" },
    { id: "password", label: "Sign in" },
    { id: "reset", label: "Reset password" },
  ];

  const statusColor =
    status?.kind === "error"
      ? "text-rose-300"
      : status?.kind === "success"
        ? "text-emerald-300"
        : "text-muted";

  return (
    <div className="mt-8 space-y-6">
      <div className="flex gap-2 rounded-full bg-background/50 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setMode(t.id);
              setStatus(null);
            }}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
              mode === t.id
                ? "bg-accent text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === "signup" && (
        <form onSubmit={(e) => void handleSignUp(e)} className="space-y-4">
          <p className="text-xs text-muted">
            New here? Pick a password (6+ characters) and we’ll email a
            confirmation link to verify your address. After you tap the link,
            you’ll choose your family profile.
          </p>
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground"
              autoComplete="new-password"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-accent-gold py-3 text-sm font-medium text-background transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account & email me a link"}
          </button>
        </form>
      )}

      {mode === "password" && (
        <form onSubmit={(e) => void handlePassword(e)} className="space-y-4">
          <p className="text-xs text-muted">
            Already signed up and confirmed? Use the email + password you
            picked. This works on any device.
          </p>
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

      {mode === "reset" && (
        <form
          onSubmit={(e) => void handlePasswordReset(e)}
          className="space-y-4"
        >
          <p className="text-xs text-muted">
            Forgot your password? Enter the email you signed up with and we’ll
            send a link to set a new one. The link works on any device.
          </p>
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
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      {authBanner && (
        <p
          className="whitespace-pre-line rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"
          role="alert"
        >
          {authBanner}
        </p>
      )}

      {status && (
        <p
          className={`whitespace-pre-line text-sm ${statusColor}`}
          role={status.kind === "error" ? "alert" : "status"}
        >
          {status.text}
        </p>
      )}

      {pendingConfirmEmail && mode === "signup" && (
        <button
          type="button"
          onClick={() => void handleResendConfirmation()}
          disabled={loading}
          className="w-full rounded-full border border-white/15 bg-background/40 py-3 text-sm text-foreground transition hover:border-accent-gold disabled:opacity-50"
        >
          {loading ? "Sending…" : "Resend confirmation email"}
        </button>
      )}
    </div>
  );
}
