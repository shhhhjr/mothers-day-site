import { redirect } from "next/navigation";

// /login is kept as a permanent alias for backwards-compat with any old
// magic-link emails or bookmarks. The real sign-in form lives on `/`.
export default function LoginAlias() {
  redirect("/");
}
