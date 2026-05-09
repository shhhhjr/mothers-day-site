# Mother’s Day — family memory site

The homepage is a sign-up / sign-in form. A relative types their email and a password, picks their family profile, and lands on a shared timeline backed by **Supabase** (Postgres + Auth + Storage) where everyone can add memories, love notes, photodrops, and milestones from any device.

The original Mother’s Day gift-unwrap intro lives at [`/intro`](src/app/intro/page.tsx) and is also reachable via the **Replay intro** link in the header once you’re signed in.

---

## ⚠️ Four one-time settings to flip BEFORE the family will be able to use the site

These are not bugs in the code — they are toggles that live in **Vercel**, **Supabase**, and (for reliable email) **Resend**. Until you do them once, the site will look broken from a relative’s phone.

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

### 3. Supabase: turn “Confirm email” OFF (recommended for a 5-person family site)

> **Supabase Dashboard → Authentication → Providers → Email**
>
> - **Enable Email provider** → **ON**
> - **Confirm email** → **OFF** ← this one
> - Click **Save**

Why off: Supabase’s built-in (free) email is rate-limited to **about 3 sends per hour**, and switching to a custom SMTP provider (Resend, Mailgun, etc.) has enough sharp edges to cost you an evening (sender restrictions, domain verification, port 587 vs 465, etc. — see step 4 below). For a private site shared between five family members, requiring email verification is more friction than security value.

With it off, the **Sign up** flow becomes:

1. Family member visits `/`, types their email + a password they pick → submits.
2. The app logs them straight in. No email needed.
3. They pick their family profile on `/onboarding` and they’re in.

Password sign-in and password reset still work — for password reset to function they will need email delivery, but that’s a one-off and a single rate-limited send is fine.

### 4. (Optional) Supabase: set up Resend SMTP if you really want email verification

If you want “Confirm email” on — so new sign-ups have to click a link in their inbox before getting access — you need custom SMTP. Below is the **exact** procedure with the gotchas that have bitten us.

#### 4a. Create the Resend API key

1. Sign up at [resend.com](https://resend.com) using **the email address you’ll be testing sign-ups with** (this matters — see warning below).
2. **Resend → API Keys → Create API Key** (full access). Copy the value — it begins with `re_`.

#### 4b. Plug it into Supabase

> **Supabase Dashboard → Project Settings → Authentication → SMTP Settings → Enable Custom SMTP**

| Field | Value | Common mistake |
|---|---|---|
| Host | `smtp.resend.com` | — |
| Port | `587` | If your platform blocks 587, try `2587` |
| Username | `resend` *(literal string, not your email)* | Pasting your account email here is the #1 cause of `unexpected_failure` |
| Password | the `re_…` API key from 4a | Watch for trailing whitespace |
| Sender email | `onboarding@resend.dev` *(testing only — see warning)* OR `noreply@your-verified-domain.com` | — |
| Sender name | e.g. `Family memories` | — |

Click **Save**.

> ⚠️ **Critical: `onboarding@resend.dev` only sends to the address you used to register your Resend account.** If you signed up to Resend with `jaisraj@gmail.com`, then SMTP sends from `onboarding@resend.dev` will **succeed only when delivering to `jaisraj@gmail.com`**. Any other recipient gets rejected by Resend, which Supabase surfaces as **`HTTP 500 unexpected_failure`** when the family member tries to sign up. To send to anyone else (i.e. your actual family) you must verify a domain you own at **Resend → Domains** and use a sender address at that domain. There is no way around this; it’s a Resend anti-abuse policy.

#### 4c. Verify it’s actually working

1. Sign up at `/` with the email that owns your Resend account.
2. The email should arrive within seconds.
3. **Resend → Logs** should show the send. If Logs is empty, Supabase never reached Resend → SMTP credentials in step 4b are wrong (re-check Username = `resend` and Password = full API key).

If you don’t want to bother with domain verification right now, just leave step 3 (Confirm email OFF) in place. You can flip Confirm email back on later once a custom domain is verified at Resend.

---

## How sign-in works

`/` is the sign-up / sign-in form with three tabs:

1. **Sign up** *(default)* — email + password. With “Confirm email” OFF (the recommended setting in step 3), the user is logged in instantly. With it on, Supabase emails a confirmation link and a “Resend confirmation email” button appears below the form in case the first send was rate-limited.
2. **Sign in** — email + password for returning visitors.
3. **Reset password** — sends a recovery email; the link lands on `/reset-password` where the user picks a new password and is signed straight into the app.

Flow for a brand-new family member (with Confirm email OFF — the default we recommend):

1. They visit the URL → see the **Sign up** form.
2. Enter email + a password they pick → submit.
3. They are logged in immediately and redirected to `/profiles`.
4. The big Netflix-style **“Who’s watching?”** picker tells first-timers to tap their face — that single tap both **claims** that profile (links it to their auth account) and takes them into that profile’s timeline.
5. From then on, that profile is theirs (a “you” badge appears under it on the picker), and they can browse anyone else’s timeline read-only.

If you flip Confirm email ON, insert “open the email and tap the verification link” between steps 2 and 3 — `/auth/callback` then verifies the `token_hash`, sets the session cookie, and continues into `/profiles`. The link is cross-device safe because the email-sending server actions deliberately bypass PKCE.

> **Bookmarked `/onboarding`?** That route now permanently redirects to `/profiles` — the picker handles claim-on-first-click, so the dedicated onboarding screen would just be a duplicate ask.

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
3. Do the **four one-time settings at the top of this README**.

---

## Deploy (Vercel)

1. Push the repo and import it in Vercel.
2. **Environment Variables**: set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` (your stable `.vercel.app` or custom domain — must include `https://`).
3. Do the **four one-time settings at the top of this README**.

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
- `src/app/profiles/`, `src/app/profiles/[slug]/` — main app (the "Who's watching?" picker also handles claim-on-first-click)
- `src/app/onboarding/page.tsx` — permanent redirect to `/profiles` (kept so old links don't 404)
- `src/app/auth/callback/route.ts` — verifies email links via `verifyOtp({ token_hash, type })`
- `src/app/actions/auth.ts` — non-PKCE server actions for sign-up + magic-link send (so emailed tokens work cross-device)
- `src/app/actions/member.ts` — `completeOnboarding(slug)` server action used by `ProfileGrid` to claim a profile on first click
- `src/components/auth/LoginForm.tsx` — three-tab form (Sign up / Sign in / Reset password)
- `src/components/profiles/ProfileGrid.tsx` — the big "Who's watching?" picker; claims on first click, navigates after
- `supabase/email-templates/` — paste-into-Supabase HTML
- `supabase/migrations/001_initial.sql` — schema + RLS
