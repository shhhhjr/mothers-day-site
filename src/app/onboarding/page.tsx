import { redirect } from "next/navigation";

// The /profiles "Who's watching?" picker now handles claim-on-first-click,
// so the dedicated /onboarding screen would just be a duplicate ask. Keep
// this route as a permanent redirect so any old bookmarks / emails / status
// messages still land somewhere sensible.
export default function OnboardingPage() {
  redirect("/profiles");
}
