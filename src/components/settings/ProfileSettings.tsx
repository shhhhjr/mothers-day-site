"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { updateMyProfile, uploadAvatar } from "@/app/actions/settings";
import {
  ACCENT_PALETTE,
  getAccent,
  type AccentKey,
} from "@/lib/constants";
import type { EnrichedProfile } from "@/lib/data/profiles";

type Status =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

export function ProfileSettings({ profile }: { profile: EnrichedProfile }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [accentKey, setAccentKey] = useState<AccentKey>(profile.accentKey);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [isPending, startTransition] = useTransition();

  const palette = getAccent(accentKey);
  const dirty =
    displayName.trim() !== profile.displayName ||
    accentKey !== profile.accentKey ||
    avatarUrl !== profile.avatarUrl;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const result = await updateMyProfile({
        displayName: displayName.trim(),
        accentKey,
        avatarUrl,
      });
      if (!result.ok) {
        setStatus({ kind: "error", text: result.error });
        return;
      }
      setStatus({ kind: "success", text: "Saved." });
      router.refresh();
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);
    const result = await uploadAvatar(fd);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!result.ok) {
      setStatus({ kind: "error", text: result.error });
      return;
    }
    setAvatarUrl(result.data);
    setStatus({
      kind: "success",
      text: "Avatar uploaded. Don’t forget to hit Save below if you also changed your name or color.",
    });
    router.refresh();
  }

  function handleRemoveAvatar() {
    setAvatarUrl(null);
    setStatus({
      kind: "success",
      text: "Avatar removed. Hit Save to make it permanent.",
    });
  }

  return (
    <form className="space-y-8" onSubmit={handleSave}>
      <section className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div
          className={`relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${palette.hue} text-3xl font-semibold text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)]`}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={`${displayName} avatar`}
              fill
              sizes="112px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span>{profile.initial}</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={uploading || isPending}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-foreground transition hover:border-accent-gold hover:text-accent-gold disabled:opacity-60"
            >
              {uploading ? "Uploading…" : avatarUrl ? "Replace photo" : "Upload photo"}
            </button>
            {avatarUrl && (
              <button
                type="button"
                disabled={uploading || isPending}
                onClick={handleRemoveAvatar}
                className="rounded-full border border-rose-300/40 px-4 py-2 text-sm text-rose-200 transition hover:border-rose-300 hover:text-rose-100 disabled:opacity-60"
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-muted">
            JPEG, PNG, or WebP. Max 4 MB. Square images look best.
          </p>
        </div>
      </section>

      <label className="block text-sm text-muted">
        Display name
        <input
          type="text"
          required
          maxLength={40}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground"
        />
        <span className="mt-1 block text-xs text-muted">
          What everyone in the family sees on the picker, headers, and timeline.
        </span>
      </label>

      <fieldset>
        <legend className="text-sm text-muted">Accent color</legend>
        <p className="mt-1 text-xs text-muted">
          Used for your profile bubble and your name on the timeline.
        </p>
        <div className="mt-3 grid grid-cols-5 gap-3">
          {ACCENT_PALETTE.map((c) => {
            const active = c.key === accentKey;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setAccentKey(c.key)}
                aria-label={c.label}
                aria-pressed={active}
                title={c.label}
                className={`relative flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br ${c.hue} transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus ${
                  active
                    ? "ring-2 ring-accent-gold ring-offset-2 ring-offset-background"
                    : "hover:scale-105"
                }`}
              >
                {active && (
                  <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                    {c.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {status && (
        <p
          role="alert"
          className={`text-sm ${status.kind === "error" ? "text-rose-300" : "text-emerald-300"}`}
        >
          {status.text}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!dirty || isPending || uploading}
          className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition hover:brightness-110 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
