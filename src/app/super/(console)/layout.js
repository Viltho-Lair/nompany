import { redirect } from "next/navigation";
import { currentSuperAdmin, publicSuperAdmin } from "@/platform/auth/superAuth";
import ConsoleChrome from "./ConsoleChrome";

/* THE CONSOLE'S LAYOUT — every screen, the Pulse wall among them, and a URL that
   says nothing about it.
   ------------------------------------------------------------------
   `(console)` IS A ROUTE GROUP, and that is the correction. The first version
   put every screen under `(full)/pulse/`, which made Pulse a URL PREFIX —
   `/super/pulse/users`, `/super/pulse/dashboard` — when it is one page among
   several. The owner's words: "pulse is only a page not a container". A group
   gives every screen this layout without a segment in any address, so the wall
   is `/super/pulse` and the rest are `/super/dashboard`, `/super/users` and so
   on — the addresses they had before the sidebar went, less `/application/`.

   THE GATE LIVES HERE, once. `(full)` holds the SIGN-IN and so can gate nothing;
   a per-page `currentSuperAdmin()` call nine times over is nine chances to
   forget one, and forgetting is silent — the screen renders, the data is there.
   The edge redirect in `src/proxy.js` only knows the cookie EXISTS; this is
   where the claim is verified.

   `admindek ad-scope` IS NOT DECORATION. The console's tokens (`--ad-*`) are
   scoped to that class, and `(full)`'s layout was what supplied it. A group
   outside `(full)` gets nothing unless it asks — and every screen would then
   paint from unset custom properties, transparent cards and invisible borders,
   with nothing failing to build.

   IT HANDS THE CHROME THE SIGNED-IN ADMIN, which the header's avatar and
   sign-out need. `publicSuperAdmin` is the id and the email and nothing else —
   the same shape the deleted `(shell)` layout passed to the deleted header. */
export default async function ConsoleLayout({ children }) {
  const admin = await currentSuperAdmin();
  if (!admin) redirect("/super");
  return (
    <div className="admindek ad-scope">
      <ConsoleChrome admin={publicSuperAdmin(admin)}>{children}</ConsoleChrome>
    </div>
  );
}
