import { redirect } from "next/navigation";
import { currentSuperAdmin } from "@/platform/auth/superAuth";
import PulseChrome from "./PulseChrome";

/* THE GATE FOR EVERY CONSOLE SCREEN, and it belongs here rather than on each
   page.
   ------------------------------------------------------------------
   `(full)` deliberately checks nothing — it also holds the SIGN-IN, so a layout
   that redirected would redirect the door. That is why `pulse/page.js` called
   `currentSuperAdmin()` itself, with a comment warning that a page added beside
   it without the same call would be served to anybody who typed the URL.

   Nine pages are moving in beside it. Nine copies of that call is nine chances
   to forget one, and forgetting is silent: the screen renders, the data is
   there, and nothing says the reader was not signed in. So the check moves to
   this layout — one door for the whole group, the same shape `(shell)` has
   always used — and the pages under it stop carrying it.

   The edge redirect in `src/proxy.js` only knows whether the cookie EXISTS; the
   edge cannot reach the store. This is where the claim is actually verified, so
   a hand-written cookie gets a redirect from here. */
export default async function PulseLayout({ children }) {
  if (!(await currentSuperAdmin())) redirect("/super");
  return <PulseChrome>{children}</PulseChrome>;
}
