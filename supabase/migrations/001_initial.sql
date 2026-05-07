-- Mother's Day family site — run in Supabase SQL editor or via CLI

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles (fixed family members)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

insert into public.profiles (slug, display_name) values
  ('mama', 'Mama'),
  ('daddy', 'Daddy'),
  ('jais', 'Jais'),
  ('haas', 'Haas'),
  ('dadi', 'Dadi')
on conflict (slug) do nothing;

-- Links Supabase auth users to a profile (who you are in the family)
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz default now(),
  unique (user_id),
  unique (profile_id)
);

create index if not exists members_user_id_idx on public.members (user_id);
create index if not exists members_profile_id_idx on public.members (profile_id);

create type public.entry_type as enum ('memory', 'love_note', 'photodrop', 'milestone');

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  type public.entry_type not null,
  author_member_id uuid not null references public.members (id) on delete cascade,
  title text,
  body text,
  recipient_profile_id uuid references public.profiles (id) on delete set null,
  event_date date,
  location_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint entries_love_note_recipient check (
    type <> 'love_note' or recipient_profile_id is not null
  ),
  constraint entries_photodrop_fields check (
    type <> 'photodrop' or event_date is not null
  ),
  constraint entries_milestone_fields check (
    type <> 'milestone' or (event_date is not null and title is not null)
  )
);

create index if not exists entries_created_at_idx on public.entries (created_at desc);
create index if not exists entries_type_idx on public.entries (type);
create index if not exists entries_author_idx on public.entries (author_member_id);
create index if not exists entries_recipient_idx on public.entries (recipient_profile_id);

-- Who this memory / entry involves (tagged profiles)
create table if not exists public.entry_profiles (
  entry_id uuid not null references public.entries (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (entry_id, profile_id)
);

create index if not exists entry_profiles_profile_idx on public.entry_profiles (profile_id);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  storage_path text not null,
  caption text,
  taken_at timestamptz,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists photos_entry_idx on public.photos (entry_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.entries enable row level security;
alter table public.entry_profiles enable row level security;
alter table public.photos enable row level security;

-- Profiles: readable by logged-in family
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Members
create policy "members_select_authenticated"
  on public.members for select
  to authenticated
  using (true);

create policy "members_insert_own"
  on public.members for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "members_update_own"
  on public.members for update
  to authenticated
  using (auth.uid() = user_id);

-- Entries: author must be current user's member row
create policy "entries_select_authenticated"
  on public.entries for select
  to authenticated
  using (true);

create policy "entries_insert_author"
  on public.entries for insert
  to authenticated
  with check (
    exists (
      select 1 from public.members m
      where m.id = author_member_id and m.user_id = auth.uid()
    )
  );

create policy "entries_update_author"
  on public.entries for update
  to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = author_member_id and m.user_id = auth.uid()
    )
  );

create policy "entries_delete_author"
  on public.entries for delete
  to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = author_member_id and m.user_id = auth.uid()
    )
  );

-- entry_profiles
create policy "entry_profiles_select_authenticated"
  on public.entry_profiles for select
  to authenticated
  using (true);

create policy "entry_profiles_insert_author"
  on public.entry_profiles for insert
  to authenticated
  with check (
    exists (
      select 1 from public.entries e
      join public.members m on m.id = e.author_member_id
      where e.id = entry_id and m.user_id = auth.uid()
    )
  );

create policy "entry_profiles_delete_author"
  on public.entry_profiles for delete
  to authenticated
  using (
    exists (
      select 1 from public.entries e
      join public.members m on m.id = e.author_member_id
      where e.id = entry_id and m.user_id = auth.uid()
    )
  );

-- photos
create policy "photos_select_authenticated"
  on public.photos for select
  to authenticated
  using (true);

create policy "photos_insert_author"
  on public.photos for insert
  to authenticated
  with check (
    exists (
      select 1 from public.entries e
      join public.members m on m.id = e.author_member_id
      where e.id = entry_id and m.user_id = auth.uid()
    )
  );

create policy "photos_delete_author"
  on public.photos for delete
  to authenticated
  using (
    exists (
      select 1 from public.entries e
      join public.members m on m.id = e.author_member_id
      where e.id = entry_id and m.user_id = auth.uid()
    )
  );

-- Storage bucket (private)
insert into storage.buckets (id, name, public)
  values ('memory-photos', 'memory-photos', false)
on conflict (id) do nothing;

create policy "memory_photos_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'memory-photos');

create policy "memory_photos_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'memory-photos');

create policy "memory_photos_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'memory-photos');

create policy "memory_photos_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'memory-photos');

-- updated_at trigger
create or replace function public.set_entries_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists entries_updated_at on public.entries;
create trigger entries_updated_at
  before update on public.entries
  for each row execute procedure public.set_entries_updated_at();
