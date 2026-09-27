# The public site

The pages anybody can open without signing in, at `/en/…` and `/ar/…`: home, platform,
pricing, customers, security, about, contact, careers, the blog, terms and privacy. Rebuilt
in a new design on the owner's instruction (27/09/2026); every public page is in it, and the
sign-in screens match it.

## How it is put together

- **One chrome, mounted once.** Pages in the `src/app/[locale]/(site)/` route group render
  inside `SiteShell` (`src/components/landing/site/`): a floating glass header, a thread of
  light down the page's starting edge drawn by the scroll, a curtain footer the page lifts off,
  film grain, and the analytics consent. The group is invisible in the address, so moving a
  page into it changes no URL. `(marketing)`, `MarketingShell`, `TopNav` and the old footer
  are deleted; terms and privacy moved in from the account chrome. The sign-in, sign-up and
  forgot-password screens stay outside the group (their own narrow frame, `AuthShell` →
  `site/pages/auth/AuthScene`) but share the look: a subdued shader field, a glass card.
- **Dark only.** The root layout gives every marketing path the dark theme whatever the
  `theme` cookie says; the site offers no switch. The account hub and the studio keep their
  own switch and that cookie.
- **Both languages, mirrored.** Every word comes from `src/shared/marketing/*` (both locales
  in one typed object) or the site dictionary. Layout uses logical properties; motion that has
  a direction (the hero window's entrance and tilt) flips with the language. Arabic is set in
  Readex Pro, English in Geist. The language menu keeps the reader on the same page.
- **Nothing starts hidden in the HTML.** A boot script in `(site)/layout.js` marks `<html>`
  before first paint when script runs and motion is allowed; only then are animatable
  elements (`data-sm`) hidden, and the mark is removed after 2.5s if the bundle never
  arrives. Crawlers that do not run JavaScript read the settled page. Reduced motion gets
  the settled page, with the pinned sections as plain lists.
- **The header knows who you are.** Signed out: Log in and Start free (through
  `/api/intent`). Signed in: the person's picture, with Go to account and Sign out
  (`nav/useAccount`).

## The home page

In order: the hero (the shader field bends toward the cursor; a real product screen in glass
tilts toward it and straightens as the page scrolls), what it is (read in by the scroll), one
record start to finish (pinned: a node moves down six departments while the reference flips
DEAL → Q-0001 → … → INVOICE and the matching screen settles), what one system changes (five
cells), screens you can open today (a scroll-driven 3D deck), the same screen in both
languages (a real slider, keyboard included), the product's own charts (live, sample
figures), every department (read from `SECTION_DEFS`, never typed), and where it stands.

- **SEO.** `buildMetadata` (canonical, hreflang, share images); Organization and WebSite
  from the root layout; SoftwareApplication with the real offers on the home page. The
  sitemap date is a hash of the page's sources (`sitemapSources.ts`).
- **Where it stands** uses `platformStatLines`, the same function `/platform` uses: a
  nightly figure replaces a fact only once it clears its threshold, rounded down.
- **Featured customers** appear only when a studio has consented and been featured; with
  none, there is no band and no link to `/customers`.
- **The intro** plays on the home page once a session (1.2s), and not at all under reduced
  motion.

## The other pages

Each page's body is in `src/components/landing/site/pages/<page>/`, over the same data,
copy, metadata and JSON-LD it always had. Shared by all of them: `PageHero` (the opening
title and lead) and `Reveal` (a server-rendered block that arrives out of focus). The sitemap
hashes each page's component files as well as its page and copy (`sitemapSources.ts`).

The blog is its own file: `blog.md`; careers openings and applications: `careers.md`.

## Cookies and consent

- **The banner** (`landing/chrome/AnalyticsConsent.jsx`): Accept all and Reject all at equal
  weight, and Manage preferences, which opens a panel with two categories — Strictly necessary
  (always on) and Analytics. No Marketing category: nothing sets one. The choice is one cookie,
  `analytics_consent` (`granted`/`denied`), so earlier answers carry over; refusing deletes
  Google's cookies. Cookie settings in the footer reopens the panel.
- **Google Analytics** loads only after a yes, only on the live host, and only COUNTS the pages
  §9 of the privacy policy names (`ANALYTICS_PATHS` in `shared/marketing/consent.ts`; the blog
  since policy 1.4): on the terms, privacy and cookie pages Google's own per-page switch turns it
  off. The policy's cookie table and the cookie page name the same cookies, checked by the suite. Widening the
  list means widening that sentence of the policy; the suite holds the two together.
- **`/cookies`** lists every cookie the code sets, with purpose, lifetime and kind, in both
  languages (`shared/marketing/cookies.ts`); the suite checks the table against the cookie
  constants in `platform/auth` and `consent.ts`. `?consent-preview` shows the banner on any
  host in development, without ever loading the tag.
- **The 404** (`site/NotFoundView.jsx`, used by both not-found files) and **the share image**
  (`lib/ogImage.tsx`: the hero's headline and registered claims) are in the site's design.

## Not built yet

- The share image is English in both languages (the image renderer has no Arabic font loaded).
- Some sign-in strings are still English on `/ar`: the `/forgot` subtitle and metadata title,
  the code step's "We sent a 6-digit code…", "Resend in Ns", "6-digit code", and the social
  buttons' "Continue with Google" and "or".
- The `globals.css` rules of the old design (`.letterhead`, `lh-*`, `.auth-panel`,
  `.landing-link`) are unused and not yet removed.
