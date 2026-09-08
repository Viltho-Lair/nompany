import { unstable_cache } from "next/cache";
import { getSiteSettings } from "@/lib/data/site";

/* THE SITE SETTINGS, READ ONCE A MINUTE INSTEAD OF ONCE A REQUEST.
   ------------------------------------------------------------------
   `getSiteSettings()` is called by the ROOT LAYOUT, which means every page in
   the product — marketing, account and studio alike — paid a Postgres round
   trip through the Cloud Run gateway before it could render its <head>. It
   feeds `organizationLd` and `websiteLd`: brand name, contact details and
   social links, edited by hand in /super perhaps a few times a year.

   THE PAGES WERE ALSO ALL `force-dynamic`, AND THAT WAS NEVER THE PROBLEM.
   It reads as the cause and is a no-op: the root layout calls `cookies()` for
   the theme and `headers()` for the pathname, so every route is dynamically
   rendered whatever a page declares. Removing the directive from the four
   pages that read nothing per-request does not make them static — nothing can,
   while the layout reads a cookie — it stops them opting OUT of the data
   cache, which is the thing that actually helps. Said plainly here because the
   obvious next step is to delete this file and "just make the pages static",
   and that will not work until the theme cookie leaves the root layout.

   A MINUTE, NOT AN HOUR. This is the tolerance for an edit in /super showing up
   on the public site, and a minute is short enough that nobody wonders whether
   the save worked. The old behaviour is the degenerate case of this one with
   the window set to zero.

   IT IS SAFE TO CACHE GLOBALLY BECAUSE IT IS NOT TENANT DATA. `g:site:*` is the
   platform's own content, owned by no studio and outside every cascade — the
   one class of record where a process-wide cache cannot serve one tenant's
   bytes to another. Nothing tenant-scoped may be added to this file. */

export const REVALIDATE_SECONDS = 60;

export const publicSiteSettings = unstable_cache(
  async () => getSiteSettings(),
  ["site-settings"],
  { revalidate: REVALIDATE_SECONDS, tags: ["site-settings"] },
);
