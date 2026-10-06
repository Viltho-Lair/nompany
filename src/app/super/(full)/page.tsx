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
  // THE CONSOLE LANDS ON PULSE — the owner's instruction. It landed on
  // /super/dashboard, which was an alias; Pulse is the screen left open.
  if (await currentSuperAdmin()) redirect(`${BASE}/pulse`);
  return <SignIn />;
}
