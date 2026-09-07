import { locales } from "@/shared/i18n";
import { urlFor, alternatesFor } from "@/lib/seo";

// Public routes (relative to a locale). Pricing and the platform are REAL
// ROUTES now rather than in-page views: a view cannot be ranked, cited, or
// linked to from a directory listing, and the price list was invisible to every
// engine because it arrived from a client fetch. Admin and API are excluded on
// purpose.
const PATHS = ["", "/platform", "/pricing", "/security", "/about", "/careers", "/terms", "/privacy", "/signup", "/login"];

export default async function sitemap() {
  const now = new Date();
  const entries = [];
  for (const path of PATHS) {
    for (const locale of locales) {
      entries.push({
        url: urlFor(locale, path),
        lastModified: now,
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : 0.8,
        alternates: { languages: alternatesFor(path) },
      });
    }
  }

  return entries;
}
