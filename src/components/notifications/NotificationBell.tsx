"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  countMyUnreadNotifications,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/app/actions/notifications";
import { getAccent } from "@/lib/constants";

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Periodically refresh the unread count so the badge updates without a
  // page refresh. 30s feels right for a low-volume family site — frequent
  // enough that a relative who's poking around sees new posts within a
  // minute, infrequent enough that we don't hammer Supabase.
  const refreshCount = useCallback(async () => {
    const n = await countMyUnreadNotifications();
    setUnreadCount(n);
  }, []);

  useEffect(() => {
    // Defer the first fetch a tick so we don't call setState synchronously
    // inside the effect body (React 19 lint rule).
    let cancelled = false;
    const initial = window.setTimeout(() => {
      if (!cancelled) refreshCount();
    }, 0);
    const id = window.setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(id);
    };
  }, [refreshCount]);

  // Close the dropdown when the user clicks outside or hits Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    const list = await listMyNotifications(20);
    setItems(list);
    setLoading(false);
  }

  function handleItemClick(n: NotificationRow) {
    if (!n.read_at) {
      // Optimistically clear the badge for this row, refresh the count.
      setItems(
        (prev) =>
          prev?.map((x) =>
            x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x,
          ) ?? prev,
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      startTransition(async () => {
        await markNotificationRead(n.id);
      });
    }
    setOpen(false);
    if (n.entry?.type) {
      // We don't have a per-entry route — closest semantic destination is
      // the timeline highlighting the actor's profile. Send the user there.
      const slug = n.actor?.profile?.slug;
      if (slug) {
        router.push(`/profiles/${slug}`);
        return;
      }
      router.push("/profiles");
    }
  }

  async function handleMarkAllRead() {
    setUnreadCount(0);
    setItems((prev) =>
      prev?.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })) ??
      prev,
    );
    await markAllNotificationsRead();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-foreground transition hover:border-accent-gold hover:text-accent-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-accent-gold px-1.5 text-[11px] font-semibold text-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-[320px] max-w-[90vw] overflow-hidden rounded-2xl border border-white/10 bg-card/95 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-medium text-foreground">Notifications</p>
            <button
              type="button"
              disabled={unreadCount === 0}
              onClick={handleMarkAllRead}
              className="text-xs text-muted underline-offset-4 transition hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <p className="px-4 py-6 text-center text-sm text-muted">
                Loading…
              </p>
            )}
            {!loading && items && items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted">
                Nothing yet. When someone posts a memory, it’ll show up here.
              </p>
            )}
            {!loading && items && items.length > 0 && (
              <ul className="divide-y divide-white/5">
                {items.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onClick={() => handleItemClick(n)}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-white/10 px-4 py-2 text-right">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
            >
              Notification settings →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: NotificationRow;
  onClick: () => void;
}) {
  const actor = notification.actor?.profile;
  const palette = actor ? getAccent(actor.accent_key) : null;
  const isTagged = notification.kind === "tagged";

  const verbLabel =
    notification.entry?.type === "love_note"
      ? "wrote a love note"
      : notification.entry?.type === "milestone"
        ? "added a milestone"
        : notification.entry?.type === "photodrop"
          ? "added a photo drop"
          : notification.entry?.type === "memory"
            ? "posted a memory"
            : "did something";

  const headline = isTagged
    ? `${actor?.display_name ?? "Someone"} tagged you in a ${
        notification.entry?.type ?? "post"
      }`
    : `${actor?.display_name ?? "Someone"} ${verbLabel}`;

  const snippet =
    notification.entry?.title?.trim() ||
    notification.entry?.body?.trim()?.slice(0, 100);

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/5 ${
          notification.read_at ? "" : "bg-accent-gold/5"
        }`}
      >
        <span
          aria-hidden
          className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${palette?.hue ?? "from-white/20 to-white/10"} text-sm font-semibold text-white`}
        >
          {actor?.display_name?.[0] ?? "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block text-sm ${isTagged ? "font-semibold text-foreground" : "text-foreground"}`}
          >
            {headline}
          </span>
          {snippet && (
            <span className="mt-0.5 line-clamp-2 block text-xs text-muted">
              {snippet}
            </span>
          )}
          <span className="mt-1 block text-[11px] text-muted">
            {formatRelative(notification.created_at)}
          </span>
        </span>
        {!notification.read_at && (
          <span
            aria-label="unread"
            className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent-gold"
          />
        )}
      </button>
    </li>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function formatRelative(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.max(1, Math.round((now - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
