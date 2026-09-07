import { locales } from "@/shared/i18n";
import { urlFor, alternatesFor } from "@/lib/seo";

/* THE SITEMAP, AND ITS DATES ARE TRUE NOW.
   ------------------------------------------------------------------
   `lastModified` was `new Date()`, so every fetch told Google that every
   page had changed at that instant. Two consecutive requests returned
   two different answers, which is not a freshness signal — it is noise,
   and Google discounts a `lastmod` it catches being inaccurate. For an
   ordinary page it is the only general indexing signal there is, so
   spending it on a lie costs the one thing this file exists to provide.

   THE DATE IS THE DAY THE PAGE'S CONTENT LAST CHANGED, recorded by hand
   below. That is a deliberate choice over the alternatives: the deploy
   timestamp says every page changed whenever any code did, and a hash
   of the copy is stable but is not a date. A human updating a line in
   the same commit that edits the copy is the only version that is both
   stable across fetches and actually about the content.

   IT CAN GO STALE, and stale-but-old is the safe direction. A date that
   is behind the truth understates freshness; a date that is always
   `now` is a claim the crawler can disprove on its next visit. The
   suite asserts every listed path carries one, so a new page cannot be
   added without a date. */

// Path (relative to a locale) → the day its content last changed, ISO.
// UPDATE THE DATE IN THE SAME COMMIT THAT CHANGES THE PAGE.
const PAGES = {
  "": "2026-09-07",
  "/platform": "2026-09-07",
  "/pricing": "2026-09-07",
  "/security": "2026-09-07",
  "/about": "2026-09-07",
  "/contact": "2026-09-07",
  "/careers": "2026-08-12",
  "/terms": "2026-08-12",
  "/privacy": "2026-08-12",
};

// LOGIN AND SIGNUP LEFT THIS FILE. They were two of the twelve URLs it
// advertised — a third of the sitemap — and both are thin auth screens with
// nothing to rank for. They are `noindex` on the pages themselves too, because
// dropping a URL from a sitemap does not stop it being indexed; it only stops
// it being suggested.
export const SITEMAP_PATHS = Object.keys(PAGES);

export default async function sitemap() {
  const entries = [];
  for (const path of SITEMAP_PATHS) {
    for (const locale of locales) {
      entries.push({
        url: urlFor(locale, path),
        lastModified: new Date(`${PAGES[path]}T00:00:00Z`),
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : 0.8,
        alternates: { languages: alternatesFor(path) },
      });
    }
  }
  return entries;
}
