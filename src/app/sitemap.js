import { locales } from "@/shared/i18n";
import { urlFor, alternatesFor } from "@/lib/seo";

// Public routes (relative to a locale). "" is the landing page, which carries
// features, pricing and contact as in-page views rather than routes of their
// own — so there is nothing else to list for them. Admin and API are excluded
// on purpose.
const PATHS = ["", "/careers", "/terms", "/signup", "/login"];

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
