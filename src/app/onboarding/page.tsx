import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { getCurrentMember } from "@/lib/auth/member";
import { isAuthBypassed, isSupabaseConfigured } from "@/lib/env";

export default async function OnboardingPage() {
  if (isSupabaseConfigured() && isAuthBypassed()) {
    redirect("/profiles");
  }

  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const member = await getCurrentMember();
  if (member) {
    redirect("/profiles");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="grain" aria-hidden />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-card/90 p-8 shadow-2xl backdrop-blur">
        <h1 className="font-display text-3xl text-foreground">Who are you today?</h1>
        <p className="mt-2 text-sm text-muted">
          Choose your profile so memories and notes are attributed correctly. Each
          profile can only be linked once—pick the one that&apos;s yours.
        </p>
        <OnboardingForm />
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/" className="text-accent underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
