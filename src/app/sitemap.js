import { locales } from "@/shared/i18n";
import { urlFor, alternatesFor } from "@/lib/seo";
import lastmod from "./sitemap-lastmod.json";

/* THE SITEMAP, AND ITS DATES ARE DERIVED NOW.
   ------------------------------------------------------------------
   `lastModified` was `new Date()`, so every fetch told Google that every page
   had changed at that instant. Two consecutive requests returned two different
   answers, which is not a freshness signal — it is noise, and Google discounts
   a `lastmod` it catches being inaccurate. For an ordinary page it is the only
   general indexing signal there is, so spending it on a lie costs the one thing
   this file exists to provide.

   THEN IT WAS A DATE MAP MAINTAINED BY HAND. That fixed the noise and moved the
   failure onto a person: the date is right only while somebody remembers to
   edit it in the same commit as the copy, and nothing complains when they do
   not. It is a promise the repository cannot keep.

   IT IS A CONTENT HASH NOW. `scripts/sitemap-lastmod.mjs` hashes the source
   files that decide what each page says — named in
   `shared/marketing/sitemapSources` — and moves the date only when the hash
   moves, so running it twice in a row changes nothing. The suite fails when the
   committed answer disagrees with the tree, which is the property neither
   earlier version had: a copy change without a date change is a red test rather
   than a wrong signal nobody can see.

   STALE-BUT-OLD REMAINS THE SAFE DIRECTION. A date behind the truth understates
   freshness; a date that is always `now` is a claim the crawler disproves on
   its next visit.

   LOGIN AND SIGNUP LEFT THIS FILE. They were two of the twelve URLs it
   advertised — a third of the sitemap — and both are thin auth screens with
   nothing to rank for. They are `noindex` on the pages themselves too, because
   dropping a URL from a sitemap does not stop it being indexed; it only stops
   it being suggested. */

export const SITEMAP_PATHS = Object.keys(lastmod);

export default async function sitemap() {
  const entries = [];
  for (const path of SITEMAP_PATHS) {
    for (const locale of locales) {
      entries.push({
        url: urlFor(locale, path),
        lastModified: new Date(`${lastmod[path].date}T00:00:00Z`),
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : 0.8,
        alternates: { languages: alternatesFor(path) },
      });
    }
  }
  return entries;
}
