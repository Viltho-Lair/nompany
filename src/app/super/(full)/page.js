import { redirect } from "next/navigation";
import { currentSuperAdmin } from "@/platform/auth/superAuth";
import SignIn from "../_components/SignIn";
import { BASE } from "../_components/nav";

// /super — the super-admin sign-in, and the ONLY console page that serves while
// signed out. It posts to /api/super/login, which mints the `nc_super` session
// against the real super-admin record in `g:superAdmins`.

export const metadata = { title: "Sign in" };

export default async function SuperLoginPage() {
  // Already signed in → straight through; no reason to show the door again.
  if (await currentSuperAdmin()) redirect(`${BASE}/dashboard`);
  return <SignIn />;
}
