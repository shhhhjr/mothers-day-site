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

/**
 * Recognize Supabase signup errors that look scary but actually have a clean
 * recovery path inside this UI (most commonly: "user already registered" when
 * the user signed up earlier but never confirmed). Returns null if no special
 * handling is appropriate and the raw error should be shown.
 */
function explainSignupFailure(
  result: Extract<AuthActionResult, { ok: false }>,
): string | null {
  const message = (result.error || "").toLowerCase();
  const code = (result.code || "").toLowerCase();
  const isAlreadyRegistered =
    code === "user_already_exists" ||
    code === "email_exists" ||
    message.includes("already registered") ||
    message.includes("user already") ||
    message.includes("email exists");

  if (isAlreadyRegistered) {
    return `An account with that email already exists.

If you remember the password, switch to the “Sign in” tab.

If you don’t — or you signed up earlier and never received the confirmation email — switch to the “Reset password” tab. The recovery link will both confirm the email and let you set a new password in one step.`;
  }
  return null;
}

/**
 * Supabase returns the same "Invalid login credentials" message for two very
 * different situations: (a) wrong password, and (b) the email isn't confirmed
 * yet. (b) is impossible for a user to diagnose from the error alone — they
 * just see "wrong password" forever. So when sign-in fails on credentials,
 * always surface the password-reset escape hatch.
 */
function explainSigninFailure(error: {
  message?: string | null;
  status?: number;
  code?: string;
}): string | null {
  const message = (error.message || "").toLowerCase();
  const code = (error.code || "").toLowerCase();
  const isCredentialMismatch =
    code === "invalid_credentials" ||
    error.status === 400 ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials");
  const isEmailNotConfirmed =
    code === "email_not_confirmed" || message.includes("email not confirmed");

  if (isEmailNotConfirmed) {
    return `Your account exists but the email address hasn’t been confirmed yet.

Open the “Reset password” tab and request a recovery email — clicking the link in it will confirm your email and let you set a (new) password in one step.`;
  }

  if (isCredentialMismatch) {
    return `That email + password combination didn’t match an account.

Two possibilities:
• You typed the wrong password — try again.
• You signed up earlier but never confirmed the email (Supabase masks this as “invalid credentials”). In that case, open the “Reset password” tab — the recovery email both confirms your address and lets you pick a fresh password.`;
  }

  return null;
}

/**
 * Recognize the most common Supabase "I tried to send an email and it broke"
 * failure modes and render advice the family member can actually act on.
 * Returns null if the error is something else and the raw message is fine.
 */
function explainEmailDeliveryFailure(
  result: Extract<AuthActionResult, { ok: false }>,
): string | null {
  const message = (result.error || "").toLowerCase();
  const isUnexpectedFailure =
    result.code === "unexpected_failure" || result.status === 500;
  const mentionsSmtp =
    message.includes("smtp") ||
    message.includes("sender") ||
    message.includes("email") ||
    message.includes("confirmation");
  const isRateLimit =
    result.status === 429 ||
    message.includes("rate") ||
    message.includes("over_email_send_rate_limit");

  if (isRateLimit) {
    return `Supabase’s free-tier email service blocked this send because it has been used too many times in the last hour (it limits us to ~3 messages an hour). Wait an hour, or ask Jais to disable “Confirm email” in Supabase so signups don’t need an email step.`;
  }

  if (isUnexpectedFailure && mentionsSmtp) {
    return `Supabase tried to email the confirmation link and the email service rejected it. This is almost always a Supabase ↔ SMTP misconfiguration — NOT a problem with your email address.

Quickest fix (Jais): in Supabase Dashboard → Authentication → Providers → Email, toggle “Confirm email” OFF. Sign-up will then log you in instantly with the password you chose, no email needed.`;
  }

  return null;
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
      const friendly =
        explainSignupFailure(result) ?? explainEmailDeliveryFailure(result);
      setStatus({
        kind: "error",
        text: friendly
          ? `${friendly}\n\nRaw error: ${describeServerActionFailure(result)}`
          : describeServerActionFailure(result),
      });
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
      const friendly = explainEmailDeliveryFailure(result);
      setStatus({
        kind: "error",
        text: friendly
          ? `${friendly}\n\nRaw error: ${describeServerActionFailure(result)}`
          : describeServerActionFailure(result),
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
      const friendly = explainSigninFailure({
        message: error.message,
        status: typeof error.status === "number" ? error.status : undefined,
        code: typeof error.code === "string" ? error.code : undefined,
      });
      const raw = describeAuthFailure(error, "Sign-in failed.");
      setStatus({
        kind: "error",
        text: friendly ? `${friendly}\n\nRaw error: ${raw}` : raw,
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
      const friendly = explainEmailDeliveryFailure(result);
      setStatus({
        kind: "error",
        text: friendly
          ? `${friendly}\n\nRaw error: ${describeServerActionFailure(result)}`
          : describeServerActionFailure(result),
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
            New here? Pick a password (6+ characters). Once you’re in, you’ll
            choose which family member you are on the next screen.
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
