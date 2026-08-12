import { locales } from "@/lib/i18n";
import { urlFor, alternatesFor } from "@/lib/seo";

// Public routes still served by THIS app (relative to a locale). The marketing
// pages — home, features, pricing, about, team, contact — moved to the
// standalone nompany-main-website deployment and are listed in its own sitemap,
// not here. Admin and API are excluded on purpose.
const PATHS = ["/careers", "/terms", "/signup", "/login"];

export default async function sitemap() {
  const now = new Date();
  const entries = [];
  for (const path of PATHS) {
    for (const locale of locales) {
      entries.push({
        url: urlFor(locale, path),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: { languages: alternatesFor(path) },
      });
    }
  }

  return entries;
}
