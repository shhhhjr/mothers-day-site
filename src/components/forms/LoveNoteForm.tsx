"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createLoveNote } from "@/app/actions/entries";
import { PROFILES, type ProfileSlug } from "@/lib/constants";

export function LoveNoteForm({
  disabled,
  defaultRecipient,
}: {
  disabled?: boolean;
  defaultRecipient: ProfileSlug;
}) {
  const router = useRouter();
  const [recipient, setRecipient] = useState<ProfileSlug>(defaultRecipient);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setLoading(true);
    setStatus(null);
    const res = await createLoveNote({ body, recipientSlug: recipient });
    setLoading(false);
    if ("error" in res && res.error) {
      setStatus(res.error);
      return;
    }
    setBody("");
    setStatus("Sent with love.");
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
      <label className="block text-sm text-muted">
        To
        <select
          value={recipient}
          onChange={(e) => setRecipient(e.target.value as ProfileSlug)}
          disabled={disabled || loading}
          className="mt-2 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground focus:border-accent-gold focus:outline-none"
        >
          {PROFILES.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.displayName}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm text-muted">
        Note
        <textarea
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          disabled={disabled || loading}
          className="mt-2 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground focus:border-accent-gold focus:outline-none"
          placeholder="Say what’s on your heart."
        />
      </label>

      {status && <p className="text-sm text-muted">{status}</p>}

      <button
        type="submit"
        disabled={disabled || loading}
        className="rounded-full bg-accent py-3 px-8 text-sm font-medium text-background transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? "Sending…" : "Send love note"}
      </button>
    </form>
  );
}
