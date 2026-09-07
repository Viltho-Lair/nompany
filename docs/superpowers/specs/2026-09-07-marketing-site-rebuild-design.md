# Marketing site rebuild — design

**Date:** 2026-09-07 · **Status:** approved, not started · **Branch:** to be cut in the
implementation session (`marketing-site-rebuild`).

Companion documents, both required reading before implementing:
`SEO-PLAN.md` (why each SEO constraint below exists) and the 280 answered questions in
`Downloads/search-visibility-answers.html`.

---

## 1 · Why

The public site is one client-rendered page with three in-page views. It cannot be ranked,
cited, linked to per-topic, or measured. Concretely, measured on 2026-09-07:

- **Twelve public URLs exist.** Pricing and Contact have no address at all — the string
  "SAR" does not appear in the served HTML of a product with a published price list.
- **Twelve of the footer's fifteen links go nowhere.** Only careers, terms and privacy
  resolve. The rest are design placeholders, including Manufacturing — a department that
  renders nothing in the product.
- **The contact form sends nothing.** `ContactView.js` validates, calls `setSent(true)`,
  and shows a success animation. Every enquiry ever submitted was discarded while the
  sender was told it arrived.
- **The copy claims what the software cannot do**: 3.2M transactions/day, 180+ connectors,
  99.99% uptime, 120+ countries, SSO/SCIM, "Nompany 4.0 — now with agentic workflows".
  None exist in the codebase.
- **The H1 reaches a text extractor as separated letters**, and a JavaScript-gated
  preloader ships inside the HTML.

This rebuild replaces the public site with independent pages carrying real content, in the
same visual language, with the SEO defects fixed at the source rather than patched.

## 2 · Scope

**In scope.** The ten public pages below; the hero; a real contact backend; the featured-
companies consent and control path; a nightly platform-statistics job; a bilingual
screenshot pipeline; the SEO corrections from `SEO-PLAN.md` Wave 1 and Wave 2 that touch
these files.

**Not in scope, deliberately.** Documentation and changelog surfaces (reserved URLs only);
per-department pages (reserved URLs only); `/status` and any uptime figure — dropped by
decision, so that footer link is deleted rather than filled; the ZATCA adapter and every
regulatory content hub that depends on it; Search Console, analytics and the AI prompt
panel, which are `SEO-PLAN.md`'s work and independent of this build.

**Approved judgement calls** (confirmed 2026-09-07):

1. Pricing shows **headcount plans only** (`PLANS` in `src/lib/pricing.ts`). The in-app
   à-la-carte department checkout (`CORE`/`DEPARTMENTS`/`PRESETS`) never appears on the
   marketing site. They are two models in one file and are easy to confuse.
2. **Only the eleven live departments are named** anywhere. Manufacturing & Production,
   Assets & Equipment, Quality & HSE and Reports & BI appear in no page, no schema
   `featureList`, and no footer — they are in `NO_SCREEN_YET` and hidden from the
   product's own sidebar for the same reason.
3. **"Start free" is the only primary CTA.** No demo request anywhere: the free tier is
   the demo.
4. **The preloader is removed.** The settled state is the server-rendered first frame.
5. **The contact form gets a real backend.**

## 3 · Information architecture

Ten pages per locale, English and Arabic, both at parity.

| URL | Purpose | Primary CTA |
|---|---|---|
| `/[locale]` | Home — hero, what it is, departments at a glance, featured companies, statistics, pricing teaser | Start free |
| `/[locale]/platform` | The system explained: the eleven live departments, general statistics, how the pieces fit | Start free |
| `/[locale]/pricing` | Free for 1–9 users; paid bands for 10+; what is included | Start free |
| `/[locale]/customers` | Featured companies using the platform | Start free |
| `/[locale]/security` | Row-level security, MFA, audit log, password handling, data location | Contact |
| `/[locale]/about` | Entity home — the page every external profile links back to | Contact |
| `/[locale]/contact` | A form that actually sends; sales path for 10+ | Send |
| `/[locale]/careers` | Existing, restyled to the new system | Apply |
| `/[locale]/terms` | Existing | — |
| `/[locale]/privacy` | Existing | — |

**Reserved now, filled later, so no URL ever moves:** `/[locale]/platform/<section>` for
per-department pages, `/[locale]/docs`, `/[locale]/changelog`. URL structure is the
irreversible decision; content depth is not.

**Deleted, not stubbed:** `/status`, and every other footer placeholder that does not become
a page in this build. A dead link is removed, never left pointing at a "coming soon".

**Redirects.** Retired URLs get a map, 308 to the nearest new page: `/features` →
`/platform`, `/services`, `/projects`, `/vendors`, `/clients`, `/gallery` → home,
`/c/<slug>` → home. `/about` needs none — the old route's path is reused by the new page.

## 4 · Page specifications

Each page states where its content genuinely comes from. Nothing is written that no source
backs (§7.3).

### 4.1 Home

Hero (§5) · a one-paragraph statement of what the product is · **departments at a glance**
(the eleven live sections, from `SECTION_DEFS` filtered by `NO_SCREEN_YET` so the page
cannot drift from the software) · **featured companies** band (§6.1) · **statistics** row
(§6.2) · pricing teaser linking to `/pricing` · closing CTA.

Schema: `Organization`, `WebSite`, `SoftwareApplication` with `offers` from `PLANS`.

### 4.2 Platform

The system in one page: the shared data model, permissions to the row, bilingual RTL,
real-time updates, and each of the eleven live departments with two or three sentences and
a screenshot. Source for each department's description: `docs/functionality/*.md`,
rewritten for customers — never published verbatim (§7.4).

Each department block is authored so it can be lifted into `/platform/<section>` later
without rewriting.

Schema: `SoftwareApplication` with `featureList` naming the eleven.

### 4.3 Pricing

Server-rendered from the public packages catalogue (the same source `/api/pricing` reads)
with `PLANS` as the authored fallback, so the page never renders empty. Free plan for 1–9
users stated first and plainly. Paid bands for 10+ with VAT-inclusive SAR, the yearly
discount, and the currency switcher kept as a client enhancement over server-rendered SAR.

**The prices must be in the HTML.** Today they arrive from a client fetch, which is why no
engine has ever seen one.

Schema: `Offer` per plan, `priceCurrency: SAR`, `priceSpecification` noting VAT inclusion.

### 4.4 Customers

The featured companies (§6.1), each with name, logo, sector and — where the studio has
agreed — a sentence about what they run on it. Degrades to nothing rather than to
placeholders: if no studio has consented, the page is not in the sitemap and not linked.

### 4.5 Security

Real material, all of it traceable to code: row-level security forced on tenant data,
membership as the only authorisation, bcrypt at cost 12 with rehash on login, console MFA,
session digests at rest, an append-only audit log, credential rate limiting, security
headers, private media served only after a membership check.

States plainly what is **not** claimed: no ISO certification, no SOC 2, no NCA assessment,
no stated data residency anywhere, and no company address yet (§12.1). Saying so is worth
more than silence to the buyer who asks — and it is the page where the location answer
belongs, rather than a schema field quietly asserting a city.

### 4.6 About

The entity home. What the company is, where it is, what it makes, contact. Carries the one
canonical description (§7.3) that every external profile will reuse verbatim.

Schema: `Organization` with `sameAs` populated and `alternateName` `نومباني` (§12.1). No
answered.

### 4.7 Contact

Name, work email, company, message, and an explicit "team size" field that routes 10+
enquiries differently. Posts to a real route (§6.3).

## 5 · Hero

**Two or three variants are built first, behind a preview route, and the winner is chosen
from the running thing rather than from a description.** This is the first task of the
implementation session.

Variants to build:

- **V1 — the studio assembling itself.** Structure after 21st.dev's
  [Enterprise Dual-CTA](https://21st.dev/@uniquesonu/components/hero-section-enterprise-ready-landing-page-hero-with-dual-ctas):
  dark, badge pill, large headline, *Start free* / *See how it works*. The product surface
  builds itself in place — cards arriving, figures counting up — settling into a real
  captured screen. `src/components/landing/hero/DashboardAssembly.js` is the existing
  synthetic version and the starting point.
- **V2 — scroll reveal.** As V1, plus a scroll-driven tilt and expansion of the product
  frame in the manner of
  [Hero scroll animation](https://21st.dev/@uilayout.contact/components/hero-scroll-animation),
  handing off into the platform section.
- **V3 — continuity.** [Animated Hero](https://21st.dev/@tommyjepsen/components/animated-hero):
  badge, two-line headline with a rotating department name, dual CTA, logo strip beneath.
  Closest to the current site; the control against which the other two are judged.

Beneath whichever wins: the featured-companies trust band, and a marquee streaming the
**eleven departments** — the treatment from
[IntegrationHero](https://21st.dev/@ruixen.ui/components/integration-hero) with honest
content. It must never say "integrate with your favourite tools": there are no
integrations, and that is the same false claim as 180+ connectors in a new coat.

**Ruled out despite the impact.** `MacBook Neo Hero` is a scroll-driven image sequence —
hundreds of frames, ruinous for LCP and mobile data. `Gateway Flow` and every WebGL/shader
hero on that site would dominate INP on the page that matters most and would need CSP
changes.

**Non-negotiable constraints on all variants:**

- The settled state is what the server renders. No element is parked at `opacity: 0`
  waiting on an observer, and no overlay gates the page on JavaScript.
- The H1 is a single text node. The current per-character split renders as
  `T h e O p e r a t i n g S y s t e m` to any tag-stripping extractor.
- Responsive by design, not by hiding: on narrow viewports the assembly collapses to one
  card plus a static screenshot.
- All scroll- and pointer-driven motion drops out under `prefers-reduced-motion`.
- `motion/react` stays confined to `src/components/landing/**` (Gate A enforces it).

## 6 · Product work

### 6.1 Featured companies

Three parts, each with one owner:

1. **Consent, in the studio's own settings.** A toggle under Administration & Settings
   gated by `administration.settings.edit`, storing the decision with the CollaboratorID
   that made it and a timestamp. Consent is the studio's to give and to withdraw; the
   public feed reflects a withdrawal on the next read.
2. **Curation, in `/super`.** A `featured` flag plus display order. Featured alone is not
   enough — a studio appears publicly only when **consent AND featured** are both true.
3. **A public read-only endpoint** returning name, logo, sector and order for those
   studios and nothing else. No counts, no slugs, no member information.

### 6.2 Platform statistics

A nightly job following the existing `main-rollup` pattern: rebuild-and-replace into one
`platform_stats` document, never a delta, pruning by named field. Counts across studios
require a deliberate aggregate read path — RLS is forced on tenant rows and `withTenant`
is the only door, so this is a design decision rather than a query. **Aggregate only:
nothing per-tenant is exposed, ever.**

Home and platform read that document server-side. Figures print only above a stated
threshold, so the copy switches on by itself when the numbers are worth showing and shows
product facts until then.

**Facts available today, all verifiable:** fifteen departments (eleven live), free for
teams up to nine, Arabic and English with true RTL throughout, 166 currencies with daily
FX, every record permissioned to the row.

**No uptime figure.** Vercel publishes none, the cron budget cannot compute a credible
one, and an external monitor was declined. The claim is dropped rather than estimated.

### 6.3 Contact backend

A route that validates, rate-limits, stores the enquiry, and notifies. Reuses the existing
rate-limit and notification platform rather than adding either. If the enquiry cannot be
stored, the form says so — the current silent success is the defect being fixed, and
replacing it with a different silent failure would be worse.

A new collection needs its entry in `COLLECTION_TABLE`
(`src/platform/db/migrate/mapping.ts`) or `next build` refuses — the guard that previously
caught `contracts` and `tenders`.

## 7 · Content system

### 7.1 Where copy lives

`src/shared/marketing/<page>.ts`, **one module per page**, following the studio's own
convention — and, as there, **nothing may enumerate them**: a barrel would make every
page's copy reachable from every component and the split stops paying.

### 7.2 Parity

Both locales are keys of one typed object per module, so **a missing Arabic string is a
compile error**. This is the property that has kept the current site at parity without
anybody policing it, and it is the reason content stays in the repository rather than
moving to a CMS.

### 7.3 The claims register

Every number, capability and certification on a public page names its source — a code
path, a measurement, or a document — in one register module. A claim whose source is
removed fails the build. This is `SEO-PLAN.md`'s proposed invariant 18, and this rebuild
is what creates it.

One canonical company description, in both languages, in one place, reused by: the About
page, `Organization` schema, OpenGraph, and every external profile created later. Profiles
created from different drafts are a permanent inconsistency.

### 7.4 Documentation is rewritten, never republished

`docs/functionality/*.md` describes the permission model, the RLS posture, key namespacing
and several real incidents. It is the raw material for customer-facing copy and must never
be published as it stands.

## 8 · Motion and performance

- Server-rendered settled state; animation plays from visible.
- `motion/react` confined to `src/components/landing/**`.
- Every new route is gated by the per-route first-load budget; an unlisted route is held to
  300 KB. Baselines are re-recorded in the **same commit** as the routes that change them.
- Shared chrome (nav, footer, background) lives in one layout so the split does not
  multiply the payload across ten routes.
- The blocking Google Fonts `@import` in `globals.css` is replaced with preloaded, subset
  faces. Seven families currently load through a serialised request chain in front of
  first paint.
- Marketing routes become cacheable. `force-dynamic` plus a settings read from Postgres
  currently produces `no-store` on every public page, with ~1.0s measured TTFB. A
  marketing-only settings accessor with its own revalidation window is acceptable
  duplication here; the reason goes in the code so it is not deleted later for looking
  redundant.

## 9 · SEO requirements carried into this build

Each of these is a defect this rebuild must not reproduce. Full reasoning in `SEO-PLAN.md`.

- One `<h1>` per page, matching the page's own title intent.
- Unique title and description per page per locale, self-referencing canonical, reciprocal
  hreflang with `x-default` — all through the existing `buildMetadata()` helper.
- Sitemap covers every new route in both locales, with **`lastmod` from a content hash**,
  not the request clock. `/login` and `/signup` leave the sitemap and become `noindex`.
- `/` → `/[locale]` becomes a 308.
- Any first path segment that is not a resolvable studio slug returns **404**, not a 307 to
  login.
- `SoftwareApplication` + `Offer` markup driven by the pricing data, `BreadcrumbList` on
  every page below home, `Organization` with a populated `sameAs`.
- Arabic titles and descriptions carry **no diacritics** — the current Arabic title is
  `أدِر`, which nobody types.
- One brand string: `nompany`, lowercase, everywhere.
- No `keywords` meta tag; it does nothing.

## 10 · Screenshot pipeline

A script seeds a sandbox studio with realistic example data, drives the app, and captures
each screen in **both languages**, committing the results as assets. Regenerable on demand
so screenshots do not rot as the UI changes. `npm run dev:sandbox` already seeds a studio
and prints a login; this extends it rather than inventing a new path.

No real tenant is touched. The sandbox runs under `NOMPANY_KEY_PREFIX` and is swept by
`npm run dev:sandbox:clean`, which sweeps tenant rows before the key prefix — that order is
load-bearing.

## 11 · Verification

- `npm test`, `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.strict.json`,
  `npx next build`, plus `node scripts/bundle-budget.mjs`.
- **`git add` every new file before believing a green suite** — the architectural
  assertions shell out to `git grep`, which sees tracked files only.
- New goldens for the contact route, the public featured-companies endpoint and the stats
  endpoint. Existing goldens must not move; if one does, the change is wrong until
  deliberately re-recorded in its own commit with a stated reason.
- A live-page assertion script (`tests/seo-live.mjs`) covering §9, run after deploy and
  then promoted into CI.
- Every page opened in the browser pane in **both languages** before it is called done. A
  server component calling a client locale hook throws only on the first request — neither
  `tsc` nor `next build` catches it.

## 12 · Open questions

Both of the questions this section opened are **answered**, 2026-09-07, along with five of
`SEO-PLAN.md` §9's seven. The answers are recorded here rather than only in the log because
two of them change what may be written on a page.

1. **The Arabic-script brand name is `نومباني`.** Settled. The Latin string stays `nompany`,
   lowercase, everywhere, and Arabic copy carries no diacritics. Unblocks Arabic titles,
   `alternateName` on `Organization`, and every external profile — all of which must now be
   created from this one spelling, because a profile made from a second draft is a permanent
   inconsistency.
2. **The sales path for 10+ teams is still open**, but its address is not:
   `sales@nompany.com` and `support@nompany.com` are live aliases onto the owner's mailbox
   and both deliver. Whether the 10+ path is that address, a WhatsApp number, or the contact
   form alone is the part still to decide; §6.3's backend can be built against the address
   either way.

### 12.1 · The three answers that change the copy

**THE PRODUCT IS NOT SAUDI.** The company is not based anywhere yet, is not originally
Saudi, and **will be based in Jordan**. The market is **the whole region**, not one country.
Nothing on a public page may imply otherwise — and `src/lib/seo.ts` currently asserts the
opposite in machine-readable form: `organizationLd` hardcodes `addressLocality: "Riyadh"`,
`addressCountry: "SA"` and `areaServed` Saudi Arabia, and `localBusinessLd` carries opening
hours for a place that does not exist. Those are live false claims of exactly the kind §7.3's
register exists to prevent, and they are corrected in the SEO pass (§13 step 9) at the latest.
`SEO-PLAN.md` §2.5's advice to drop the opening-hours claim stands for a stronger reason
than it was written for.

**ZATCA IS NOT IN SCOPE, AND NOT ON THE ROADMAP.** `SEO-PLAN.md` builds its whole
competitive thesis on the opposite — §2.1 defers the regulatory hubs only until the adapter
ships, §6.2.5 and §6.3 call it "the unlock that makes all three compound", and §6.4's Q3–Q4
is nothing else. **That thesis does not hold and the plan is wrong there.** What survives is
its evidence: the Arabic-market competitor measurements, the structured-content-family
argument, and axis 2 — the assets this product already holds. What does not survive is
anything conditional on clearing an invoice or on a government directory listing.

**THE POSITIONING LEADS WITH GENERALIST SMEs**, region-wide — not contractors.
`SEO-PLAN.md` §6.3 argues for narrowing to Saudi contractors; that argument is now
answered no. The construction depth (tendering, BOQ, variations, retention, cost codes,
earned value) stays a genuine differentiator worth naming on `/platform`, but it is depth
the product has rather than the audience it addresses.

### 12.2 · Still open, and needing a person

- **The one canonical company description** (§7.3), in both languages. A draft is written
  during the build and **marked for revision** rather than left blank, because every external
  profile and the `Organization` schema reuse it verbatim and profiles created from different
  drafts are a permanent inconsistency. Revise it before anything external is created.
- **The stop rule** (`SEO-PLAN.md` §9.6): what result, two quarters after the marketing
  routes are live, would mean stop spending hours here and put them back into the product.
  Written before the data arrives or it is not a rule — every number has a story afterwards.

Closed with no work: there is no earlier or previous brand domain (§9.7).

## 13 · Sequencing for the implementation session

1. Hero variants behind a preview route → choose one.
2. Shared chrome: layout, nav, footer with **no dead links**, the new type and motion
   primitives.
3. Home, platform, pricing — the three pages that carry the product story.
4. Contact backend, then contact page.
5. Featured companies: consent → `/super` control → endpoint → band and page.
6. Statistics job → endpoint → home and platform blocks.
7. Security, about, careers restyle.
8. Screenshot pipeline, then real screenshots into the hero and platform pages.
9. SEO pass (§9), sitemap, redirects, bundle baselines re-recorded.
10. Verification (§11), then deploy.
