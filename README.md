# Mother’s Day — family memory site

The homepage is a sign-up / sign-in form. Once a relative confirms their email and picks their family profile, they land on a shared timeline backed by **Supabase** (Postgres + Auth + Storage) where everyone can add memories, love notes, photodrops, and milestones from any device.

The original Mother’s Day gift-unwrap intro lives at [`/intro`](src/app/intro/page.tsx) and is also reachable via the **Replay intro** link in the header once you’re signed in.

---

## ⚠️ Three one-time settings to flip BEFORE the family will be able to use the site

These are not bugs in the code — they are toggles that live in **Vercel** and **Supabase**. Until you do them once, the site will look broken from a relative’s phone.

### 1. Vercel: turn OFF Deployment Protection

If visiting the site shows a Vercel sign-in screen, **Deployment Protection is on**:

> **Vercel Dashboard → your project → Settings → Deployment Protection**
>
> - **Vercel Authentication** → **Disabled**
> - **Password Protection** → off
> - Click **Save**

There is no way to flip this from `vercel.json` or code — it is a project-level dashboard setting only. ([Docs](https://vercel.com/docs/security/deployment-protection))

### 2. Supabase: configure URL + Redirect URLs + email templates

Three sub-steps. Skip any one of them and links from emails will land on the wrong place or fail silently.

#### 2a. Set the Site URL **with `https://`**

> **Supabase Dashboard → Authentication → URL Configuration → Site URL**

Set it to your full HTTPS URL:

```
https://mother-s-day-iota.vercel.app
```

NOT `mother-s-day-iota.vercel.app` (no protocol). The bare-hostname version is what produces the `x-webdoc://...` non-clickable link in iOS Mail. Replace the hostname with your own production domain if different.

#### 2b. Add the production callback to **Redirect URLs**

> **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**

Add at least:

```
https://mother-s-day-iota.vercel.app/**
```

(Replace with your domain.) For Vercel preview deployments also add:

```
https://*-.vercel.app/**
```

(That wildcard is the [official Supabase pattern](https://supabase.com/docs/guides/auth/redirect-urls) for Vercel previews.) For local dev, run `npm run dev:urls` and paste the `http://localhost:3000/**` and LAN-IP variants it prints.

If a callback URL isn’t in this allow-list, Supabase silently falls back to the Site URL (the homepage) instead of completing auth — that is the “link sends me back to the homepage” bug.

#### 2c. Replace the email templates

Four ready-to-paste templates live in this repo:

| Supabase template | File in this repo |
|---|---|
| **Magic Link** | [`supabase/email-templates/magic-link.html`](supabase/email-templates/magic-link.html) |
| **Confirm Signup** | [`supabase/email-templates/confirm-signup.html`](supabase/email-templates/confirm-signup.html) |
| **Reset Password** *(optional)* | [`supabase/email-templates/recovery.html`](supabase/email-templates/recovery.html) |
| **Invite User** *(optional)* | [`supabase/email-templates/invite.html`](supabase/email-templates/invite.html) |

For each one:

1. Open the file in this repo, **select all**, copy.
2. **Supabase Dashboard → Authentication → Email Templates** → pick the matching template → **Message Body** → paste, replacing whatever was there.
3. Click **Save**.

> ⚠️ **Do NOT wrap the contents in triple backticks (` ``` `) when pasting.** The Supabase template editor is plain HTML — backticks will appear as literal text in the email and the `<a>` link inside them will not render. Just paste the raw HTML from the file.

### 3. Supabase: leave “Confirm email” ON

> **Supabase Dashboard → Authentication → Providers → Email**
>
> - **Enable Email provider** → **ON**
> - **Confirm email** → **ON**

This is the default. With it on, the **Sign up** form on `/` creates the account and emails a confirmation link. Clicking that link verifies the address and signs the person in (on whatever device they opened the email on). The app supports cross-device confirmation — both magic-link and signup emails are routed through a non-PKCE server action so the token in the email is not browser-locked.

> **If Supabase email starts rate-limiting you and confirmation mails stop arriving**, temporarily flip “Confirm email” to **OFF**. The Sign up form will then log people in instantly with the password they chose, without waiting for an email. Flip it back on once the rate limit clears.

---

## How sign-in works

`/` is the sign-up / sign-in form with three tabs:

1. **Sign up** *(default)* — email + password. Sends a confirmation email if “Confirm email” is on; otherwise logs in instantly.
2. **Sign in** — email + password for returning visitors.
3. **Email link** — magic-link fallback for relatives who forget their password. The link works cross-device.

Flow for a brand-new family member:

1. They visit the URL → see the **Sign up** form.
2. Enter email + a password they pick → submit.
3. Supabase emails a confirmation link.
4. They open the email **on any device** and tap the link.
5. `/auth/callback` verifies the token, sets the session cookie, redirects to `/profiles`.
6. `/profiles/layout` sees they don’t have a profile yet → redirects to `/onboarding`.
7. They pick which family member they are (Mama, Daddy, Jais, Haas, Dadi).
8. Done — they’re on the timeline.

After that, the everyday flow is **Sign in** with email + password from any device.

---

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY, then:
npm run dev
```

`npm run dev` listens on `0.0.0.0`, so phones / tablets on the same Wi-Fi can hit `http://YOUR-LAN-IP:3000`. Run `npm run dev:urls` to print the exact `http://IP:3000/**` lines to paste into Supabase **Redirect URLs**.

Locally, magic-link redirects use whatever host is in the browser’s address bar (localhost or LAN IP), so you don’t have to keep editing `.env` when you switch machines.

### Skip auth temporarily (UI-only testing)

Set `NEXT_PUBLIC_SKIP_AUTH=1` in `.env.local`, restart `npm run dev`, then `/profiles` will load without sign-in. Row Level Security still blocks writes; never ship this flag.

---

## Supabase project setup (one-time)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql) (creates the schema, RLS policies, and the `memory-photos` storage bucket).
3. Do the **three one-time settings at the top of this README**.

---

## Deploy (Vercel)

1. Push the repo and import it in Vercel.
2. **Environment Variables**: set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` (your stable `.vercel.app` or custom domain — must include `https://`).
3. Do the **three one-time settings at the top of this README**.

After this you should never have to debug auth again.

---

## Stack

- Next.js App Router, TypeScript, Tailwind CSS v4
- Framer Motion (intro + transitions)
- Supabase (Auth, Postgres, Row Level Security, Storage)
- Optional client-side image compression before upload

## Project structure (high level)

- `src/app/page.tsx` — homepage = sign-up / sign-in form
- `src/app/intro/page.tsx` — the Mother’s Day gift-unwrap intro
- `src/app/onboarding/`, `src/app/profiles/`, `src/app/profiles/[slug]/` — main app
- `src/app/auth/callback/route.ts` — verifies email links via `verifyOtp({ token_hash, type })`
- `src/app/actions/auth.ts` — non-PKCE server actions for sign-up + magic-link send (so emailed tokens work cross-device)
- `src/components/auth/LoginForm.tsx` — three-tab form (Sign up / Sign in / Email link)
- `supabase/email-templates/` — paste-into-Supabase HTML
- `supabase/migrations/001_initial.sql` — schema + RLS
