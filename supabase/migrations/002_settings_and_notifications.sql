-- Mother's Day family site — second migration
-- Adds: per-profile customization (accent color), per-member notification
-- preferences, in-app notifications table + RLS, avatars storage bucket.
--
-- Safe to re-run: every statement is `if not exists` / `on conflict` guarded.
-- Run in Supabase Dashboard → SQL Editor (or `supabase db push` via CLI).

-- ---------------------------------------------------------------------------
-- 1. Profile customization: accent_key (curated palette key in app code).
--    `display_name` and `avatar_url` already exist from migration 001.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists accent_key text;

-- Backfill the seeded 5 family profiles to reasonable defaults so the UI
-- still has colors before anyone visits the settings page.
update public.profiles set accent_key = 'rose'    where slug = 'mama'  and accent_key is null;
update public.profiles set accent_key = 'amber'   where slug = 'daddy' and accent_key is null;
update public.profiles set accent_key = 'violet'  where slug = 'jais'  and accent_key is null;
update public.profiles set accent_key = 'emerald' where slug = 'haas'  and accent_key is null;
update public.profiles set accent_key = 'sky'     where slug = 'dadi'  and accent_key is null;

-- Allow the user that has CLAIMED a profile (via the members table) to
-- update its display_name, avatar_url, and accent_key. We don't restrict
-- which columns they can update at the SQL layer — the server action gates
-- that — but in practice only those three are exposed in the form.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.profile_id = profiles.id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.profile_id = profiles.id and m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Per-member notification preferences.
-- ---------------------------------------------------------------------------

alter table public.members
  add column if not exists notify_on_post boolean not null default true;

alter table public.members
  add column if not exists notify_on_tag boolean not null default true;

-- ---------------------------------------------------------------------------
-- 3. In-app notifications table.
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- Recipient (auth.users.id, not member.id, so cascade is automatic when
  -- a user is deleted — and so we can notify users who haven't claimed a
  -- profile yet, even though we don't currently do that).
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('new_post', 'tagged')),
  entry_id uuid references public.entries (id) on delete cascade,
  -- Who DID the thing (optional; nullable if the actor's member row was
  -- deleted later).
  actor_member_id uuid references public.members (id) on delete set null,
  created_at timestamptz default now(),
  read_at timestamptz,
  -- One notification per (recipient, entry, kind) — protects against double
  -- fanout on retry. ('new_post' and 'tagged' for the same entry+user are
  -- both allowed; the UI shows whichever is more specific.)
  unique (user_id, entry_id, kind)
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc) where read_at is null;
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id);

-- The fanout server action runs as the AUTHOR of the new entry. It needs
-- to be able to insert notifications addressed to OTHER users. We bound
-- this by requiring the actor_member_id to belong to the calling user.
create policy "notifications_insert_as_actor"
  on public.notifications for insert
  to authenticated
  with check (
    exists (
      select 1 from public.members m
      where m.id = actor_member_id and m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Avatars storage bucket (private, mirrors memory-photos pattern).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "avatars_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

create policy "avatars_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

create policy "avatars_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars');

create policy "avatars_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars');
