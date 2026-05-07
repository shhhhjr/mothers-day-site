"use client";

import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMemory, registerPhotos } from "@/app/actions/entries";
import { PROFILES, type ProfileSlug } from "@/lib/constants";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function MemoryForm({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [slugs, setSlugs] = useState<ProfileSlug[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleSlug(s: ProfileSlug) {
    setSlugs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    if (!body.trim()) {
      setStatus("Write something first.");
      return;
    }
    setLoading(true);
    setStatus(null);

    const res = await createMemory({ body, taggedSlugs: slugs });
    if ("error" in res && res.error) {
      setStatus(res.error);
      setLoading(false);
      return;
    }
    const entryId = "entryId" in res ? res.entryId : null;
    if (!entryId) {
      setStatus("Could not create entry.");
      setLoading(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (files?.length && supabase) {
      const uploads: { storage_path: string }[] = [];
      for (const file of Array.from(files)) {
        const compressed = await imageCompression(file, {
          maxWidthOrHeight: 1920,
          maxSizeMB: 2,
          useWebWorker: true,
        });
        const path = `${entryId}/${crypto.randomUUID()}-${compressed.name.replace(/\s+/g, "-")}`;
        const { error: upErr } = await supabase.storage
          .from("memory-photos")
          .upload(path, compressed, { upsert: false });
        if (upErr) {
          setStatus(upErr.message);
          setLoading(false);
          return;
        }
        uploads.push({ storage_path: path });
      }
      const reg = await registerPhotos({ entryId, items: uploads });
      if ("error" in reg && reg.error) {
        setStatus(reg.error);
        setLoading(false);
        return;
      }
    }

    setBody("");
    setSlugs([]);
    setFiles(null);
    setLoading(false);
    setStatus("Saved.");
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
      <label className="block text-sm text-muted">
        Your memory
        <textarea
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          disabled={disabled || loading}
          className="mt-2 w-full rounded-xl border border-white/15 bg-background/60 px-4 py-3 text-foreground placeholder:text-muted focus:border-accent-gold focus:outline-none disabled:opacity-50"
          placeholder="What happened? What made it special?"
        />
      </label>

      <fieldset>
        <legend className="text-sm text-muted">Who is this memory with / about?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {PROFILES.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => toggleSlug(p.slug)}
              disabled={disabled || loading}
              className={`rounded-full px-4 py-2 text-sm transition ${
                slugs.includes(p.slug)
                  ? "bg-accent-gold text-background"
                  : "bg-white/10 text-foreground hover:bg-white/15"
              }`}
            >
              {p.displayName}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm text-muted">
        Photos (optional)
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={disabled || loading}
          onChange={(e) => setFiles(e.target.files)}
          className="mt-2 block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-accent/90 file:px-4 file:py-2 file:text-sm file:text-background"
        />
      </label>

      {status && <p className="text-sm text-muted">{status}</p>}

      <button
        type="submit"
        disabled={disabled || loading}
        className="rounded-full bg-accent py-3 px-8 text-sm font-medium text-background transition hover:brightness-110 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save memory"}
      </button>
    </form>
  );
}
