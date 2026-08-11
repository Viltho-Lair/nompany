# nompany.com — SEO Working Log

A running log of daily SEO work. Newest entry on top. The goal is steady,
compounding improvement toward higher search ranks for nompany.com.

**Primary target terms:** applications, operations, statistics, companies, corporates
(woven around the core positioning: a modular ERP that runs a company's whole
operation from one platform).

**How to use this file:** each working session, (1) pick the highest-value items
from the Backlog, (2) implement + verify, (3) add a dated entry describing what
changed, (4) move done items out of the Backlog. Reference guides:
Semrush "How to Improve SEO", SEO.com "How to Improve SEO", Shopify SEO checklist.

---

## Backlog (prioritized)

### Technical / on-page
- [ ] **Verify the dynamic OG card** — routes `/-/opengraph-image` and
      `/-/twitter-image` already generate share images (`[locale]/opengraph-image.js`
      + `src/lib/ogImage.js`). Confirm the image content/branding is current (nompany,
      not MegaTech) and that og:image/twitter:image resolve on each page.
- [ ] **Audit `<h1>` per public page** — exactly one H1, primary keyword near the
      front (home, /features, /about, /careers, /contact, /team).
- [ ] **Image alt text audit** across public pages/components; ensure descriptive,
      keyword-aware alt on all `<img>`/`next/image`.
- [ ] **Core Web Vitals pass** — run PageSpeed Insights on home + /features once
      deployed; check LCP/INP/CLS, image sizing, font loading.
- [ ] Consider `FAQPage` JSON-LD on /features or a dedicated FAQ (targets featured
      snippets / AI Overviews). Add `SoftwareApplication` / `Product` schema for the
      ERP product itself with `offers` once pricing is unlocked.

### Content / keywords
- [ ] **Per-department landing content** — sections or pages targeting each module as
      a search term: "operations management", "business statistics/analytics",
      "inventory management", "project management", "HR", "finance". Map each to intent.
- [ ] Add question-style H2s ("What is a modular ERP?", "How do companies run
      operations from one platform?") to capture long-tail + snippets.
- [ ] Internal linking pass — link home ↔ /features ↔ /about ↔ /contact with
      descriptive anchor text using target terms.
- [ ] Localize (AR) content parity check — ensure Arabic pages carry the same
      keyword coverage as English.

### Off-page / measurement (needs owner action — not code)
- [ ] Set up **Google Search Console** + **Bing Webmaster Tools**; verify domain;
      submit `https://nompany.com/sitemap.xml`.
- [ ] Install analytics (GA4 or Vercel Web Analytics) to track traffic, CTR, ranks.
- [ ] Track target-keyword positions weekly; find pages ranking 4–10 to push.
- [ ] Begin backlink / directory building (SaaS directories, LinkedIn company page
      → fill `CONTACT.socials` in `src/lib/site.js` so `sameAs` populates).

---

## 2026-08-07 — Day 1: baseline audit + post-pivot cleanup

Baseline audit of the SEO stack after the MegaTech → nompany pivot. Fixed the
highest-impact foundational issues. All changes verified on the local dev server.

**Changed**
- `src/lib/seo.js`
  - Removed 5 dead `PAGES` entries for deleted routes (`/services`, `/projects`,
    `/vendors`, `/clients`, `/gallery`) that still carried off-brand audio-visual copy.
  - Added `PAGES` entries for the live `/features` and `/about` routes with
    keyword-rich, bilingual (EN/AR) titles + descriptions.
  - Rewrote the home title/description around "operation", "companies", "statistics".
  - Expanded `KEYWORDS` (EN + AR) to cover target terms: business **applications**,
    business **operations**, **corporate** management, business **statistics**.
  - Fixed stale `jobPostingLd` industry ("Audio Visual…" → "Enterprise Software (ERP/SaaS)").
- `src/app/[locale]/features/page.js`, `src/app/[locale]/about/page.js`
  - Routed metadata through `buildMetadata()` so both pages now emit **canonical
    URLs, hreflang alternates (en/ar/x-default), OpenGraph and Twitter tags** —
    previously they had none of these.
- `src/app/robots.js`
  - Was disallowing a non-existent `/admin` while leaving the real private app open.
    Now blocks `/api`, `/studio`, `/super` (top-level) and `/*/account`,
    `/*/onboarding`, `/*/subscribe`, `/*/verify`, `/*/reset`, `/*/forgot`
    (locale-prefixed, via wildcard).
- `src/app/manifest.js`
  - Full rebrand MegaTech → nompany (name, description, categories); theme color
    aligned to the slate palette (`#0f172a`); added a maskable icon entry.

**Verified (local dev, no build errors)**
- Titles: home → "Run your company's whole operation from one platform · nompany";
  /features → "Modular business applications for every department · nompany";
  /about → "One platform for company operations · nompany".
- /features `<head>`: canonical + en/ar/x-default hreflang + OG + Twitter + expanded keywords.
- robots.txt renders the corrected disallow list.
- sitemap.xml: 16 URLs, zero dead routes.

**Deployed** to Vercel production (`vercel deploy --prod`), aliased to
https://www.nompany.com. Live robots.txt confirmed serving the new disallow list.
Note: the deploy briefly failed on an unrelated half-built `/studio/vacation` page
(missing `VacationSheet` component, since added) — nothing to do with SEO.
Reminder (from deploy memory): the apex `nompany.com` may still have a Cloudflare
DNS parking record; canonicals point at the bare apex, so confirm the apex resolves.
