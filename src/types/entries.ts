export type EntryType = "memory" | "love_note" | "photodrop" | "milestone";

export type ProfileRef = {
  slug: string;
  display_name: string;
};

export type TimelinePhoto = {
  id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string | null;
  sort_order: number | null;
  signedUrl: string | null;
};

export type TimelineEntry = {
  id: string;
  type: EntryType;
  title: string | null;
  body: string | null;
  event_date: string | null;
  location_text: string | null;
  created_at: string;
  recipient_profile_id: string | null;
  recipient: ProfileRef | null;
  author: ProfileRef | null;
  tagged: ProfileRef[];
  photos: TimelinePhoto[];
};
