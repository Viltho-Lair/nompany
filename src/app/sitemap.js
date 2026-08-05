import { locales } from "@/lib/i18n";
import { urlFor, alternatesFor } from "@/lib/seo";
import { getCollection } from "@/lib/db";

// Public routes (relative to a locale). Admin and API are excluded on purpose.
const PATHS = ["", "/services", "/projects", "/vendors", "/clients", "/team", "/gallery", "/careers", "/contact"];

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

  // Individual open-role pages.
  const jobs = await getCollection("careers");
  for (const job of jobs) {
    const path = `/careers/${job.id}`;
    for (const locale of locales) {
      entries.push({
        url: urlFor(locale, path),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
        alternates: { languages: alternatesFor(path) },
      });
    }
  }

  return entries;
}
