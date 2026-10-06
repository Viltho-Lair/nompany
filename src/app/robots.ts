import { SITE_URL } from "@/lib/seo";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep the private app + API and thin auth/onboarding routes out of the
        // index. /api, /studio and /super are top-level; the rest live under a
        // locale prefix (/en/…, /ar/…) so they need a leading "/*/" wildcard.
        disallow: [
          "/api",
          "/studio",
          "/super",
          "/*/account",
          "/*/questionnaire",
          "/*/subscribe",
          "/*/verify",
          "/*/reset",
          "/*/forgot",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
