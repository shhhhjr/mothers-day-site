import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAuthBypassed, isSupabaseConfigured } from "@/lib/env";

export default async function HomePage() {
  if (isSupabaseConfigured() && !isAuthBypassed()) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      redirect("/profiles");
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="grain" aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-card/80 p-8 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.18em] text-accent-gold/80">
          For our family
        </p>
        <h1 className="mt-2 font-display text-3xl text-foreground">
          Welcome to family memories
        </h1>
        <p className="mt-2 text-sm text-muted">
          Sign up with the email Jais sent you and any password you’ll
          remember. We’ll email you a link to confirm your account, and once
          you click it you’ll pick which family member you are.
        </p>

        {!isSupabaseConfigured() ? (
          <p className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
            Site isn’t fully set up yet. Add{" "}
            <code className="rounded bg-black/30 px-1 py-0.5">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="rounded bg-black/30 px-1 py-0.5">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            (see README).
          </p>
        ) : (
          <Suspense
            fallback={
              <div className="mt-8 rounded-xl border border-white/10 bg-background/40 p-4 text-sm text-muted">
                Loading…
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        )}

        <p className="mt-8 text-center text-sm text-muted">
          <Link
            href="/intro"
            className="text-accent underline-offset-4 hover:underline"
          >
            Watch the Mother’s Day intro
          </Link>
        </p>
      </div>
    </div>
  );
}
