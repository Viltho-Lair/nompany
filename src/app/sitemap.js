import { locales } from "@/lib/i18n";
import { urlFor, alternatesFor } from "@/lib/seo";
import { PRICING_LOCKED } from "@/lib/site";

// Public routes (relative to a locale). Admin and API are excluded on purpose.
// /pricing is omitted while locked.
const PATHS = ["", "/features", ...(PRICING_LOCKED ? [] : ["/pricing"]), "/about", "/team", "/careers", "/contact", "/terms", "/signup", "/login"];

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
