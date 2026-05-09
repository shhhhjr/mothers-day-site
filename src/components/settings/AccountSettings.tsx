"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  changePassword,
  deleteMyAccount,
  signOutEverywhere,
} from "@/app/actions/settings";

type Status =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

export function AccountSettings({ email }: { email: string }) {
  const router = useRouter();
  const [pwStatus, setPwStatus] = useState<Status | null>(null);
  const [signOutStatus, setSignOutStatus] = useState<Status | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<Status | null>(null);
  const [pwLoading, startPwTransition] = useTransition();
  const [signOutLoading, startSignOutTransition] = useTransition();
  const [deleteLoading, startDeleteTransition] = useTransition();

  // Local state for password change
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwStatus(null);
    if (newPw.length < 6) {
      setPwStatus({
        kind: "error",
        text: "Password must be at least 6 characters.",
      });
      return;
    }
    if (newPw !== confirmPw) {
      setPwStatus({ kind: "error", text: "Passwords don’t match." });
      return;
    }
    startPwTransition(async () => {
      const result = await changePassword(newPw);
      if (!result.ok) {
        setPwStatus({ kind: "error", text: result.error });
        return;
      }
      setPwStatus({ kind: "success", text: "Password updated." });
      setNewPw("");
      setConfirmPw("");
    });
  }

  function handleSignOutEverywhere() {
    setSignOutStatus(null);
    startSignOutTransition(async () => {
      const result = await signOutEverywhere();
      if (!result.ok) {
        setSignOutStatus({ kind: "error", text: result.error });
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  function handleDelete() {
    setDeleteStatus(null);
    const confirmed = window.confirm(
      "Permanently delete your account? This will:\n\n" +
        "  • Remove your linked profile\n" +
        "  • Delete every memory, love note, photodrop, and milestone you authored\n" +
        "  • Sign you out everywhere\n\n" +
        "This cannot be undone. Are you sure?",
    );
    if (!confirmed) return;
    startDeleteTransition(async () => {
      const result = await deleteMyAccount();
      if (!result.ok) {
        setDeleteStatus({ kind: "error", text: result.error });
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      <section>
        <p className="text-sm text-muted">Signed in as</p>
        <p className="mt-1 font-medium text-foreground">{email}</p>
      </section>

      <section>
        <h2 className="text-lg font-medium text-foreground">Change password</h2>
        <p className="mt-1 text-sm text-muted">
          Pick a new password (at least 6 characters). You won’t need to enter
          your old one — you’re already signed in.
        </p>
        <form
          onSubmit={handlePasswordChange}
          className="mt-4 space-y-3"
        >
          <label className="block text-sm text-muted">
            New password
            <input
              type="password"
              required
              minLength={6}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground"
            />
          </label>
          <label className="block text-sm text-muted">
            Confirm new password
            <input
              type="password"
              required
              minLength={6}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground"
            />
          </label>
          {pwStatus && (
            <p
              role="alert"
              className={`text-sm ${pwStatus.kind === "error" ? "text-rose-300" : "text-emerald-300"}`}
            >
              {pwStatus.text}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwLoading}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background transition hover:brightness-110 disabled:opacity-50"
            >
              {pwLoading ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-foreground">
          Sign out of all devices
        </h2>
        <p className="mt-1 text-sm text-muted">
          Useful if you signed in on a phone or browser you no longer have.
          You’ll need to sign in again on this device too.
        </p>
        {signOutStatus && (
          <p
            role="alert"
            className={`mt-3 text-sm ${signOutStatus.kind === "error" ? "text-rose-300" : "text-emerald-300"}`}
          >
            {signOutStatus.text}
          </p>
        )}
        <button
          type="button"
          disabled={signOutLoading}
          onClick={handleSignOutEverywhere}
          className="mt-4 rounded-full border border-white/15 px-5 py-2.5 text-sm text-foreground transition hover:border-accent-gold hover:text-accent-gold disabled:opacity-50"
        >
          {signOutLoading ? "Signing out…" : "Sign out everywhere"}
        </button>
      </section>

      <section className="rounded-xl border border-rose-400/30 bg-rose-500/5 p-5">
        <h2 className="text-lg font-medium text-rose-200">Delete my account</h2>
        <p className="mt-1 text-sm text-rose-200/80">
          Permanently removes your linked profile and every memory, love note,
          photodrop, and milestone you authored. Other people’s posts that
          tagged or mentioned you stay (with your tag removed). This cannot be
          undone.
        </p>
        {deleteStatus && (
          <p
            role="alert"
            className={`mt-3 text-sm ${deleteStatus.kind === "error" ? "text-rose-300" : "text-emerald-300"}`}
          >
            {deleteStatus.text}
          </p>
        )}
        <button
          type="button"
          disabled={deleteLoading}
          onClick={handleDelete}
          className="mt-4 rounded-full border border-rose-400/60 bg-rose-500/10 px-5 py-2.5 text-sm font-medium text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
        >
          {deleteLoading ? "Deleting…" : "Delete my account"}
        </button>
      </section>
    </div>
  );
}
