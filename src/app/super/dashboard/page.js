import { redirect } from "next/navigation";
import { BASE } from "../_components/nav";

/* /super/dashboard — the console's HOME, and an alias rather than a screen.
   ------------------------------------------------------------------
   It pointed at `/super/dashboard/analytics`, which is where the one real
   dashboard lived. That screen moved under the Pulse shell with the rest of the
   console, so this points at `/super/pulse/dashboard` now.

   THE ALIAS IS WHY THIS FILE EXISTS AT ALL, and the reason has not changed:
   `(full)/page.js` redirects here when a session already exists, and `SignIn`
   sends you here after a successful post. Both say `${BASE}/dashboard`, and both
   were once served a 404 because every nav link pointed at the analytics path
   instead — signing in landed on nothing while the sidebar was correct. Keeping
   one address for "the console's home" is what stops that recurring: the two
   callers never need to know where the screen actually is.

   IT SITS OUTSIDE BOTH ROUTE GROUPS deliberately. A redirect renders no markup,
   so it wants neither the sign-in shell nor the Pulse chrome — and putting it
   under `(full)/pulse` would have made it a bar item's sibling and given it a
   header and a bar it never draws. */
export default function SuperDashboardHome() {
  redirect(`${BASE}/pulse/dashboard`);
}
