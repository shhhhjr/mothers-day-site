"use client";

import { useState, useTransition } from "react";
import { updateNotificationPrefs } from "@/app/actions/settings";

type Status =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

type Props = {
  initialNotifyOnPost: boolean;
  initialNotifyOnTag: boolean;
};

export function NotificationSettings({
  initialNotifyOnPost,
  initialNotifyOnTag,
}: Props) {
  const [notifyOnPost, setNotifyOnPost] = useState(initialNotifyOnPost);
  const [notifyOnTag, setNotifyOnTag] = useState(initialNotifyOnTag);
  const [status, setStatus] = useState<Status | null>(null);
  const [isPending, startTransition] = useTransition();

  // Save-on-toggle (no explicit save button) — matches the iOS Settings
  // pattern most relatives are familiar with.
  function persist(next: { notifyOnPost?: boolean; notifyOnTag?: boolean }) {
    setStatus(null);
    startTransition(async () => {
      const result = await updateNotificationPrefs(next);
      if (!result.ok) {
        setStatus({ kind: "error", text: result.error });
        // Roll back the optimistic UI on failure.
        if (typeof next.notifyOnPost === "boolean") {
          setNotifyOnPost(!next.notifyOnPost);
        }
        if (typeof next.notifyOnTag === "boolean") {
          setNotifyOnTag(!next.notifyOnTag);
        }
        return;
      }
      setStatus({ kind: "success", text: "Saved." });
    });
  }

  return (
    <div className="space-y-8">
      <ToggleRow
        title="Notify me when anyone posts something"
        subtitle="A bell icon in the header will count unread family activity."
        checked={notifyOnPost}
        disabled={isPending}
        onChange={(next) => {
          setNotifyOnPost(next);
          persist({ notifyOnPost: next });
        }}
      />
      <ToggleRow
        title="Notify me when I’m tagged in a post"
        subtitle="Tagged notifications are highlighted in the dropdown so you don’t miss them. (Always recommended on.)"
        checked={notifyOnTag}
        disabled={isPending}
        onChange={(next) => {
          setNotifyOnTag(next);
          persist({ notifyOnTag: next });
        }}
      />

      <div className="rounded-xl border border-white/10 bg-background/40 p-4">
        <ToggleRow
          title="Email me too"
          subtitle="Coming soon — requires the project owner to set up custom SMTP (Resend) with a verified domain. See the README."
          checked={false}
          disabled
          onChange={() => {
            /* disabled until SMTP is configured */
          }}
        />
      </div>

      {status && (
        <p
          role="status"
          aria-live="polite"
          className={`text-sm ${status.kind === "error" ? "text-rose-300" : "text-emerald-300"}`}
        >
          {status.text}
        </p>
      )}
    </div>
  );
}

function ToggleRow({
  title,
  subtitle,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start justify-between gap-6 ${disabled ? "opacity-60" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus ${
          checked ? "bg-accent" : "bg-white/15"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          aria-hidden
          className={`inline-block h-6 w-6 rounded-full bg-background shadow transition ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
