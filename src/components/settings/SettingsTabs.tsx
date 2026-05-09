"use client";

import { useState } from "react";
import { ProfileSettings } from "./ProfileSettings";
import { NotificationSettings } from "./NotificationSettings";
import { AccountSettings } from "./AccountSettings";
import type { EnrichedProfile } from "@/lib/data/profiles";

type Tab = "profile" | "notifications" | "account";

type SettingsTabsProps = {
  profile: EnrichedProfile;
  email: string;
  notifyOnPost: boolean;
  notifyOnTag: boolean;
};

export function SettingsTabs({
  profile,
  email,
  notifyOnPost,
  notifyOnTag,
}: SettingsTabsProps) {
  const [tab, setTab] = useState<Tab>("profile");

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "notifications", label: "Notifications" },
    { id: "account", label: "Account" },
  ];

  return (
    <div className="mt-10 space-y-8">
      <div className="flex gap-2 rounded-full bg-background/50 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-accent text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-card/70 p-6 sm:p-8">
        {tab === "profile" && <ProfileSettings profile={profile} />}
        {tab === "notifications" && (
          <NotificationSettings
            initialNotifyOnPost={notifyOnPost}
            initialNotifyOnTag={notifyOnTag}
          />
        )}
        {tab === "account" && <AccountSettings email={email} />}
      </div>
    </div>
  );
}
