# Mother’s Day — family memory site

A narrative intro (five-click gift unwrap → two story slides → Netflix-style profiles), then a shared timeline backed by **Supabase** (Postgres + Auth + Storage) so the family can add memories, love notes, photodrops, and milestones from anywhere.

## Local development

```bash
npm install
cp .env.example .env.local
# Add your Supabase URL and anon key, then:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The intro saves completion in `localStorage` (`mothersday_intro_v1`); clear it or use **Replay intro** in the header to watch again.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the migration in [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql) (profiles seed, tables, RLS, storage bucket `memory-photos`).
3. In **Authentication → URL configuration**, add:
   - **Site URL**: your deployed URL (or `http://localhost:3000` for dev).
   - **Redirect URLs**: `http://localhost:3000/auth/callback` and your production `/auth/callback`.
4. Invite family emails under **Authentication → Users** (or enable sign-ups if you prefer). Each person completes **Who are you today?** once (`/onboarding`) and picks their profile (Mama, Daddy, Jais, Haas, Dadi). Each profile can only be linked to one account.

### Magic link email

Configure SMTP or use Supabase’s built-in email so magic links arrive. Password sign-in is also available on `/login` if you enable it and users set passwords.

## Deploy (e.g. Vercel)

1. Push this repo and import it in Vercel.
2. Set environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Update Supabase redirect URLs to include your production domain.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS v4  
- Framer Motion (intro + transitions)  
- Supabase (Auth, Postgres, Row Level Security, Storage)  
- Optional client-side image compression before upload  

## Project structure (high level)

- `src/app/` — routes: `/`, `/login`, `/onboarding`, `/profiles`, `/profiles/[slug]`, `/auth/callback`
- `src/components/intro/` — gift unwrap + story slides
- `src/components/forms/` — memory, love note, photodrop, milestone
- `src/lib/data/` — timeline fetch + signed photo URLs + stats
- `supabase/migrations/` — schema and policies
