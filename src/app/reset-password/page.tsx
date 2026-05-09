import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAuthBypassed, isSupabaseConfigured } from "@/lib/env";

export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  if (isAuthBypassed()) {
    redirect("/profiles");
  }

  // The recovery link in the email puts the user into a temporary
  // password-recovery session via /auth/callback → verifyOtp({ type:
  // 'recovery' }). If we don't see that session here, the link was
  // never clicked (or has expired) — bounce back to the homepage.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="grain" aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-card/80 p-8 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.18em] text-accent-gold/80">
          Almost done
        </p>
        <h1 className="mt-2 font-display text-3xl text-foreground">
          Set a new password
        </h1>
        <p className="mt-2 text-sm text-muted">
          Pick something at least 6 characters. Once you save, you’ll be
          signed in and taken into the family memories app.
        </p>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
