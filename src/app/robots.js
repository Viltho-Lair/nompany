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
          // The hero preview ships to production because that is where it is
          // looked at, and it is a preview surface rather than a page. Refused
          // by path as well as by the route's own noindex.
          "/*/preview",
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
