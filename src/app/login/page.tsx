import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="grain" aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-card/80 p-8 shadow-2xl backdrop-blur">
        <h1 className="font-display text-3xl text-foreground">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with the email your family invited—then pick your profile.
        </p>

        {!isSupabaseConfigured() ? (
          <p className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
            Add{" "}
            <code className="rounded bg-black/30 px-1 py-0.5">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="rounded bg-black/30 px-1 py-0.5">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            to{" "}
            <code className="rounded bg-black/30 px-1 py-0.5">.env.local</code>{" "}
            (see README).
          </p>
        ) : (
          <LoginForm />
        )}

        <p className="mt-8 text-center text-sm text-muted">
          <Link href="/" className="text-accent underline-offset-4 hover:underline">
            Replay the Mother&apos;s Day intro
          </Link>
        </p>
      </div>
    </div>
  );
}
