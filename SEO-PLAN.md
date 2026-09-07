# nompany — search and AI visibility: assessment, plan, and criticism

**Written 2026-09-07.** Companion to `SEO-LOG.md` (the running log of what was actually
changed) and to the 280 answers in `Downloads/search-visibility-answers.html`. Dates here
are ISO, matching `SEO-LOG.md`.

Everything below is grounded in two things and nothing else: the code on `main` at
`81ba08b`, and live HTTP measurements taken against `www.nompany.com` and three competitor
domains on 2026-09-07. Where a number came from a measurement, the measurement is stated.
Where something is an opinion, it is written as an opinion.

**How to use this file.** Sections 1–3 are judgement. Sections 4–6 are plans. Section 7 is
what nobody asked about. Section 8 is the argument against doing any of it, made as
strongly as I can make it, because a plan that cannot survive its own counter-argument is
not a plan.

---

## 0 · The position, in one paragraph

The technical foundation is better than the product's search position suggests, and the
content position is worse. Server-rendered HTML, correct reciprocal hreflang, a genuine
Arabic site at word-for-word parity, no third-party scripts, real security headers, and —
critically — **no bot wall in front of the AI crawlers**. On that foundation sits twelve
public URLs, no documentation, no changelog, no external profiles, no analytics, and a
landing page making six claims the software cannot support. The nearest Arabic competitor
publishes, measured today, **roughly six thousand URLs across forty-seven sitemaps**. The
gap is not technique. The gap is that there is almost nothing to index.

---

## 1 · What should be improved

Ordered by how much each returns per hour spent, not by how broken it is.

**1.1 Stop claiming things the product cannot do.** The live page asserts 3.2M
transactions/day, 180+ connectors, 99.99% uptime, 120+ countries, SSO/SCIM, and "Nompany
4.0 — now with agentic workflows". None exist in the codebase. This is first not because
it is the biggest lever but because every other lever amplifies it: an AI engine quoting
this page quotes those sentences, a buyer who checks one loses trust in all of them, and
a case study written later inherits the credibility they spent. Replace them with figures
the product can stand behind — even small true numbers beat large invented ones, and the
GEO research is explicit that dated, sourced statistics are what gets cited.

**1.2 Give the marketing site more than one URL.** Pricing, contact, about and security
are React views inside one page today. A view cannot rank, cannot be cited, cannot be
linked to from a directory listing, and cannot be a conversion step. The string "SAR" does
not appear anywhere in the served HTML of a product with a public price list. This single
change turns one thin URL into five substantial ones and unblocks `SoftwareApplication`
schema, the pricing prompt (the most-asked AI question about any B2B product), and the
entity-home page every external profile needs to point at.

**1.3 Restore a way to ask for a demo.** The work-email capture and "Request demo" pair
was removed from the hero in August 2026 and archived. The only conversion that exists is
self-serve signup. Every measurement plan in section 5 is meaningless without a defined
conversion, and every directory listing wants a URL to send people to.

**1.4 Make the page readable by a machine that does not run JavaScript.** Two defects,
both small: the H1 is split per character into `aria-hidden` spans so a tag-stripping
extractor reads `T h e O p e r a t i n g S y s t e m`, and a full-screen preloader ships
inside the HTML and is dismissed only by JavaScript. Google renders JS; ChatGPT, Claude
and Perplexity's crawlers do not. Fix by rendering the settled headline text as one string
and animating from a visible resting state, and by making the preloader a progressive
enhancement rather than the initial state.

**1.5 Tell the truth in the sitemap.** `lastmod` is `new Date()` — every fetch claims
every page changed at that instant. Google discounts inaccurate `lastmod`, and for normal
pages it is the only general indexing signal that exists. Derive it from a content hash.
While in the file, drop `/login` and `/signup`: two thin auth pages are currently a third
of the sitemap and are marked `index, follow`.

**1.6 Give the entity edges.** `CONTACT.socials` is `[]`, so `sameAs` names nothing.
LinkedIn, Crunchbase, G2, Capterra, GetApp — five profiles, one afternoon, and they are
the strongest single correlate with AI visibility in every study the brief cites. An
entity with no off-site corroboration is one an LLM has no reason to mention.

**1.7 Publish documentation.** Thirty-eight functionality files exist in `docs/`, written
to a standard most products never reach, describing behaviour that users need explained.
"How do I do X in [product]" prompts cite documentation above every other source type.
Rewritten for customers and published bilingually, this is the largest content asset
available and most of it is already written. See §8.4 for the constraint that makes this
harder than it looks, and §7.2 for what must never be published.

**1.8 Fix the Arabic details that cost matches.** The Arabic title carries a diacritic
(`أدِر`). Nobody types diacritics into a search box. Strip them from titles, descriptions
and headings. Settle an Arabic-script brand name — there is currently none, so an Arabic
searcher typing the brand phonetically matches nothing.

**1.9 Make the pages cacheable and serve them closer.** Every public route is
`force-dynamic` and reads settings from Postgres, producing
`Cache-Control: private, no-cache, no-store`. Measured TTFB was ~1.0s, from `bom1`
(Mumbai), for an audience in Riyadh. The marketing pages change on deploy, not per
request; they should be static or revalidated on a timer.

**1.10 Measure anything at all.** No Search Console, no Bing Webmaster, no analytics
beyond a first-party page-view tracker. Every question about performance in this document
currently ends in "unknown". Search Console is a DNS record and twenty minutes, and its
data starts accruing from the day it is verified, not the day it is needed.

**1.11 Close the 307 catch-all.** Any unreserved first path segment is treated as a studio
slug and redirects to login, so `/anything` answers 307 and there is no 404 in that space.
Resolve the slug at the edge against a cached list, or reject anything failing a slug
format check, so wrong URLs 404 like wrong URLs.

**1.12 Put visibility assertions in CI.** The pipeline already enforces a per-route bundle
budget, a shrink-only lint budget, 257 golden responses and database hop counts. Adding
one H1, unique title and description, self-referencing canonical, reciprocal hreflang,
parseable JSON-LD and a robots.txt snapshot is a small extension of an existing habit —
which is exactly why it will survive, whereas a checklist in a wiki will not.

---

## 2 · What should be avoided

Saying no is most of the value in a document like this. Each of these is something the
brief, an agency, or common practice would push toward, and each is wrong for this product
at this stage.

**2.1 Do not write regulatory topic hubs yet.** ZATCA, Mudad, GOSI, Qiwa and WASL are the
highest-intent queries in the market and the product implements none of them. Finance has
a `vatRate` field and a VAT-payable account; that is the whole of it. A ZATCA Phase 2
explainer from a vendor that cannot clear an invoice is a content-marketing page competing
against fifty identical ones, and it converts the visitor to a competitor who can. This is
the single biggest divergence from the brief's own priority table, and it is deliberate:
**build the adapter, then own the topic.**

**2.2 Do not build programmatic page families.** Comparison, alternatives, city and
industry templates all work by having data competitors lack. With no customers, no
integrations and no benchmark data, the templates would be filled with paraphrase — which
is what the scaled-content-abuse policy now describes regardless of whether a human or a
model wrote it. The one defensible family later is trade verticals, because the product
genuinely holds twenty-five per-trade department structures and role libraries nobody else
has.

**2.3 Do not ship `llms.txt` or Markdown twins as a strategy.** 97% of published files
receive zero requests; Google ignores them. If a docs build makes them free, take them.
Never spend an hour on them that a real URL could have.

**2.4 Do not add FAQ or HowTo markup expecting rich results.** FAQ rich results were
removed in May 2026, HowTo in 2023. The SEO backlog still recommends adding FAQPage "to
target featured snippets" — correct that line. Answer-first *content* still works; the
markup is now hygiene.

**2.5 Do not chase the Local Pack.** Nobody buys an ERP from a map result. A Business
Profile is worth having as an entity and trust signal (Knowledge Panel, AI Mode card), not
as a lead channel, and grid-tracking spend on "ERP near me" would measure a query that
leads nowhere. If there is no staffed, signed office, skip GBP entirely and remove the
opening-hours claim currently sitting in the site's schema.

**2.6 Do not buy an AI-visibility tool yet.** The OpenAI, Anthropic and Google SDKs are
already dependencies of this repository. A weekly script that asks fifty fixed prompts and
stores the answers is days of work and answers the only question that matters right now
("does anyone mention us"). Buy a tool when the question becomes "why does that competitor
get mentioned", which is a harder question.

**2.7 Do not add Google Tag Manager or a third-party analytics script.** The site
currently loads no third-party JavaScript at all — measurable in the CSP, which is
Report-Only and heading toward enforcement. Adding GTM widens `script-src` permanently,
adds a consent obligation, and puts the INP the site is trying to protect in someone
else's hands. Send Core Web Vitals down the existing first-party `/api/track` endpoint
instead. If GA4 is needed for the AI-referrer channel, add GA4 alone, not a tag manager.

**2.8 Do not copy Wafeq's locale matrix.** They emit sixteen hreflang variants —
`en`/`ar` × eight countries — for what is largely the same content. That is a duplicate-
content surface and eight times the maintenance for a product with one Arabic writer.
Stay on generic `ar` and `en` until there is content that genuinely differs by country.

**2.9 Do not machine-translate Arabic.** The current Arabic is hand-written and good, and
it is the site's strongest asset in this market. Arabic-speaking buyers detect translated
copy immediately, and a compliance product cannot afford to read as foreign.

**2.10 Do not introduce a CMS to solve the content problem.** See §8.5 — it is a second
write path into content, in a codebase whose entire design philosophy is single doors.
Keep content in the repository until there is an Arabic writer who cannot use git, and
then solve that specific problem rather than the general one.

**2.11 Do not rank-track yet.** With twelve URLs, rank tracking measures the absence of
pages. It becomes useful the quarter after the docs corpus is indexed.

**2.12 Do not advertise the four empty sections.** Manufacturing & Production, Assets &
Equipment, Quality & HSE and Reports & BI are declared and render nothing. They are
correctly hidden from the product's own sidebar; they must not appear in a feature list, a
schema `featureList`, or a comparison table.

---

## 3 · The good, the bad, the critical

### The good — protect these, they are why the rest is fixable

| | Why it matters |
|---|---|
| **AI crawlers are not blocked** | GPTBot, PerplexityBot and ClaudeBot all returned 200. No Cloudflare bot wall. This is the failure that has silently removed most sites from ChatGPT and Perplexity since July 2025, and it has not happened here. |
| **Everything is server-rendered** | `force-dynamic` on every public route means real HTML for crawlers that do not execute JavaScript. Costly for latency (§1.9), correct for extraction. |
| **Arabic at parity, structurally enforced** | 553 Arabic words to 611 English, correct `lang`/`dir`, and both locales in one typed dictionary where a missing Arabic string is a compile error. Parity is guaranteed by the type system rather than by discipline. |
| **hreflang generated from one helper** | Reciprocal and self-referencing on every page, in head and sitemap, from a single function — so the two sides cannot drift. |
| **Tenants are paths, not subdomains** | No index leak, no duplicate-content surface from customer instances, and the studio noindexes itself and redirects the signed-out. |
| **No third-party JavaScript** | No chat widget, no tag manager, no heatmap, no ad pixel. Rare, and worth defending (§2.7). |
| **Security headers and secrets handling** | HSTS, frame-ancestors, nosniff, Permissions-Policy, a CSP heading toward enforcement, and workload-identity federation with no long-lived keys. GBP and Search Console credentials fit that pattern directly. |
| **A CI culture that already enforces budgets** | Per-route bundle budgets against recorded baselines, a shrink-only lint budget, 257 golden responses, hop counts as contract. Visibility gates will be adopted because the habit exists. |
| **The internal documentation** | Thirty-eight functionality files, maintained in the same commit as the behaviour they describe. This is the raw material for §1.7. |

### The bad — fix in the normal course of work

Empty `sameAs`. No `SoftwareApplication` or `Offer` markup on a product with public
prices. Login and signup in the sitemap and marked indexable. `/` → `/en` as a 307 where
it should be 308. Seven font families loaded through a blocking CSS `@import`. Brand
spelled two ways on one page (`nompany` in metadata, `Nompany` in copy). No consent
management while the privacy policy commits to GDPR. No `dateModified` anywhere. No
visible "updated" dates. No cookie policy. No 404 for a bad slug. Unused schema helpers
(`servicesLd`, `videoObjectLd`) that suggest intentions never finished. `keywords` meta
tag doing nothing for Google. No OG image verification since the rebrand.

### The critical — these change outcomes, not polish

1. **Unverifiable claims on the live page.** Trust, legal exposure under Saudi advertising
   norms, and — specifically — the sentences an AI engine will repeat. §1.1.
2. **No measurement of any kind.** Every decision for the next two quarters would be made
   blind, and history not captured cannot be recovered. §1.10.
3. **Two thirds of the marketing site has no URL, and no demo path exists.** The product
   cannot be ranked for its own prices, and traffic that arrives cannot convert. §1.2, §1.3.
4. **Machine-unreadable hero.** The split headline and the JS-gated preloader together
   mean the most important page presents badly to exactly the crawlers this whole exercise
   is about. §1.4.
5. **The regulatory product gap.** Not a content problem. ZATCA is the query set, the
   trust signal, the directory listing (ZATCA publishes an official Solution Providers
   Directory), and the reason a Saudi buyer shortlists a vendor. Everything in §6 says the
   same thing from a different angle. §2.1.
6. **The legal pages are written for the wrong market.** The live Terms page is 6,539
   words — by far the largest content page on the site — mentioning GDPR fourteen times,
   Saudi Arabia twice, and PDPL zero times, with governing law deliberately open pending
   incorporation. A Saudi enterprise buyer performing diligence reads that as a product
   built for somewhere else. §7.1.

---

## 4 · Implementation plan — fixing what is broken

Three waves. Wave 1 needs no decisions from anyone and no new infrastructure. Wave 2 needs
answers to §9. Wave 3 needs a product decision.

### Wave 1 — days, no dependencies

| # | Change | Files | Done when |
|---|---|---|---|
| 1.1 | Delete the unverifiable statistics and the "4.0 / agentic workflows" badge; replace with true statements | `src/shared/landing.ts` | No claim on the page lacks a source in the product |
| 1.2 | Render the H1 as one text node; animate from a visible resting state | `src/components/landing/text/AnimatedHeadline.js` | Stripping tags from `/en` yields the headline as words |
| 1.3 | Make the preloader a progressive enhancement | `src/components/landing/{LandingPage,Preloader}.js` | Page content is the first paint with JS disabled |
| 1.4 | `lastmod` from a content hash; drop `/login` and `/signup`; `noindex` both | `src/app/sitemap.js`, the two page files | Two consecutive sitemap fetches return identical `lastmod` |
| 1.5 | `/` → `/en` becomes 308 | `src/proxy.js` | One permanent hop from the apex to the locale root |
| 1.6 | Preload fonts, subset, drop unused families from the `@import` | `src/app/globals.css` | No `@import` chain in front of first paint |
| 1.7 | One brand string everywhere | `src/shared/landing.ts` | `Nompany` appears nowhere |
| 1.8 | Strip diacritics from Arabic titles and descriptions | `src/lib/seo.ts` | `أدر` not `أدِر` |
| 1.9 | 404 for slugs that do not resolve or fail a format check | `src/proxy.js`, `src/app/studio/_shell.js` | `/zzz-not-a-studio` returns 404 |
| 1.10 | Verify Search Console and Bing Webmaster; submit the sitemap | DNS + `src/app/layout.js` if a token is needed | Both properties verified, sitemap accepted |

**Wave 1 acceptance:** a single script that fetches the live pages and asserts the above,
committed as `tests/seo-live.mjs`, run manually after deploy. It becomes the CI gate in
Wave 2.

### Wave 2 — a week or two, needs §9 answers

| # | Change | Notes |
|---|---|---|
| 2.1 | Pricing, contact, about and security become real routes under `/[locale]/` | The largest change in this plan. See §8.2 for what it costs structurally |
| 2.2 | A demo-request page with a form that records a lead | Defines the conversion everything in §5 measures |
| 2.3 | `SoftwareApplication` + `Offer` JSON-LD driven by the existing pricing data | The SAR figures already exist in `lib/pricing`; they have simply never reached the markup |
| 2.4 | Type the JSON-LD builders with `schema-dts` | Server-only, no client cost; invalid properties become build errors |
| 2.5 | Fill `CONTACT.socials`; create LinkedIn, Crunchbase, G2, Capterra, GetApp | One description, written once (§9.3), used identically on all five |
| 2.6 | Make marketing routes cacheable; pin the function region | Requires the settings read to move off the request path or be cached |
| 2.7 | Core Web Vitals through the existing `/api/track` | No third-party script, no consent question |
| 2.8 | Page-shape assertions in CI | H1, title, description, canonical, hreflang reciprocity, JSON-LD parse, robots snapshot, sitemap URLs return 200 |
| 2.9 | Rewrite the legal pages for the Saudi market, or state the position plainly | Needs counsel, not engineering. §7.1 |

### Wave 3 — a quarter, needs a product decision

| # | Change | Blocked on |
|---|---|---|
| 3.1 | Public docs: twenty customer-facing pages, both languages, from the functionality files | The publishing model in §8.4 and the security filter in §7.2 |
| 3.2 | Public changelog with an Atom feed | Docs pipeline; the raw material is already in commit subjects |
| 3.3 | Product screenshots, both languages, automated from the sandbox | `npm run dev:sandbox` already seeds a studio and prints a login |
| 3.4 | A public demo tenant, read-only | A product decision with a real security surface |
| 3.5 | ZATCA adapter, then the regulatory hubs | The product roadmap, not this plan |

---

## 5 · Implementation plan — building SEO, and keeping it improving

The question "how do we maintain progressive improvement" has a specific answer for this
codebase, and it is not "remember to do SEO". It is: **encode each thing that has been
fixed as something that fails a build, and put the rest on a clock.** This project already
does exactly that for bundle size, permissions, response bodies and database round trips.
Visibility gets the same treatment.

### 5.1 The four loops

**Per commit — CI gates (automatic, blocking).**
One H1 per page; title and description present, unique, in the page's language;
self-referencing canonical; reciprocal hreflang; JSON-LD parses and type-checks;
`robots.txt` matches its snapshot; every sitemap URL returns 200 with a matching canonical;
no page contains a claim not on the claims register (§5.4). A regression becomes a red
build rather than a discovery three months later.

**Per deploy — post-deploy assertions (automatic, alerting).**
Fetch the live pages, assert the Wave 1 list, record HTML size and TTFB. If a deploy
doubles the HTML or triples TTFB, that is a finding on the day, not in the next audit.

**Weekly — the prompt panel (a job, ~30 minutes to review).**
Fifty fixed prompts, twenty-five Arabic and twenty-five English, through the OpenAI,
Anthropic, Google and Perplexity APIs with web search on. Store the raw answers, not just
parsed citations — the parser will change, the record of what an engine said on a date
cannot be recreated. Report mention rate, citation rate and sentiment per engine per
language. This is the only measurement that works before Search Console has data, and it
is the one leadership will actually read.

**Monthly — the log entry (a person, one hour).**
`SEO-LOG.md` already has the right shape: dated entries, what changed, what was verified.
Extend it with the month's numbers. This is also the annotation layer that makes it
possible to separate the effect of the work from a Google core update — a change nobody
dated cannot be attributed.

**Quarterly — the review (a decision).**
Re-measure everything, including the numbers in this file. Decide continue or stop per
tactic against the rule written in §9.6. This project's own working notes are full of
corrections to figures that decayed silently; the same will happen here unless re-measuring
is scheduled rather than intended.

### 5.2 Content cadence, honestly sized

One person, part-time, in both languages. That means roughly **four to six pages a month**,
not forty. Sequenced:

- Months 1–2: the five marketing routes (§4 Wave 2), plus the entity home page.
- Months 3–5: twenty docs pages covering the questions support actually receives, both
  languages, each with a 40–80 word direct answer under a question-shaped heading before
  the detail.
- Month 4 onward: the changelog, appended per release — freshness for near-zero marginal
  cost, since the material is generated by committing.
- Month 6: the first case study, if there is a customer willing to be named. Quotations
  and statistics are the two highest-scoring tactics in the GEO literature and a case study
  is the only page type that naturally carries both.

Publishing less and keeping it accurate beats publishing more. A compliance-adjacent
product is judged on whether its documentation is right, and a wrong answer served
confidently costs more than a missing one.

### 5.3 What gets measured, from day one

Baseline captured before the first change (this document plus the answers file is the
start of it): indexable URLs, TTFB, HTML size, word counts per locale, JSON-LD types,
external profiles, measured citations. Then, monthly: index coverage; Core Web Vitals p75
per template from first-party RUM; branded vs non-branded queries in both scripts (with
care — "nompany" is one character from "company"); AI-referral sessions, understood as a
floor because a third to two thirds arrive with no referrer; mention and citation rate per
engine; conversions, once a conversion exists.

### 5.4 One new invariant, in the house style

The codebase keeps seventeen invariants, each written because a real failure produced it.
This work produces an eighteenth, and it is the one that prevents §1.1 recurring:

> **A public claim must have a source in the product.** Every number, capability and
> certification stated on a public page names the code path, measurement or document that
> backs it, in a claims register. A claim whose source is removed fails the build. This
> exists because the marketing site shipped 3.2M transactions/day, 180+ connectors,
> 99.99% uptime and SSO/SCIM for a product that had none of them, and nothing in the
> pipeline could notice.

---

## 6 · Competitors: what feeds them, and how to overcome it

### 6.1 What was measured, 2026-09-07

Two Arabic-first accounting/ERP vendors were inspected directly, and the money queries
were searched in both languages.

**Qoyod** (`qoyod.com`, WordPress) publishes **forty-seven sitemaps**. Sampled URL counts
(each file caps near 200): blog ~1,300 across seven files; **glossary ~1,800 across ten
files**; **knowledge base ~1,900 across ten files**; accounting templates ~500; business
fields 164; calculators 47; **releases 179**; case studies 31; pages 170; plus podcast,
reports, marketplace, careers and a local sitemap. Conservatively **six thousand-plus
URLs**, and twenty-eight of the forty-seven sitemaps carried a `lastmod` within the last
48 hours.

**Wafeq** (`wafeq.com`, Next.js) publishes **1,942 URLs in one sitemap**, with a
**sixteen-variant hreflang matrix** — `en`/`ar` across SA, AE, EG, QA, OM, KW, BH plus
generics — on essentially the same content.

**nompany** publishes **twelve**.

The English money query — "best ERP software Saudi Arabia 2026 ZATCA compliant" — returns
a first page composed almost entirely of **vendor-owned listicles**: halsimplify,
tabsyst, maasconsult, adoxerp, erplax, nyggs, qeemahcloud. Each is a "Top 10 ERP in Saudi
Arabia" article published by one of the ten. The Arabic equivalent returns the same
pattern in Arabic, led by Qoyod's own blog.

### 6.2 What actually feeds them

1. **Volume in structured families, not one blog.** Qoyod does not run a blog; it runs six
   content machines with different shapes — glossary, knowledge base, templates,
   calculators, business fields, case studies. Each family has a repeatable template and a
   unique data block, which is what keeps it on the right side of the scaled-content line.
2. **A public changelog as a freshness engine.** 179 release entries. AI-cited URLs are
   measurably fresher than organic ones, and a changelog manufactures freshness as a
   by-product of shipping.
3. **Tools, not prose.** Forty-seven calculators and five hundred downloadable templates
   earn links and repeat visits in a way an article never does, and they are the assets
   competitors cannot cheaply copy.
4. **Owning the vocabulary in Arabic.** An 1,800-entry Arabic accounting glossary answers
   the long tail that AI query fan-out now surfaces, and it makes them the definitional
   source in Arabic for the whole category.
5. **Regulatory authority backed by a real product.** They clear invoices, so they can
   write about clearing invoices — and they appear in **ZATCA's official Solution
   Providers Directory**, a government-domain listing that is simultaneously a trust
   signal, a citation source and a link no competitor can buy.
6. **The listicle ecosystem.** Ten vendors each publish a "Top 10" that includes
   themselves. That corpus is precisely what an AI engine synthesises when asked for the
   best ERP in Saudi Arabia — and being absent from all of them is being absent from the
   answer.

### 6.3 How to overcome it — and where not to try

**Do not fight on volume.** Six thousand URLs against a part-time bilingual writer is a
losing race, and a hurried attempt produces exactly the thin content the policies now
punish. Fight on three axes where their volume does not help them:

**Axis 1 — the vertical they do not serve.** Qoyod, Wafeq and Daftra are accounting and
invoicing first, generalist second. nompany is the only one of them with tendering, bills
of quantity, variations, retention, subcontracts, site reports, cost codes and earned
value. "Best accounting software in Saudi Arabia" is unwinnable; **"tender and cost
control software for Saudi contractors" is nearly uncontested**, and it is the software
that actually exists. Every content decision should be made against the contractor, not
against the category.

**Axis 2 — assets they cannot copy, that this product already holds.**
- A **bilingual construction and ERP glossary** — hundreds of terms are already settled
  in `src/shared/studio/*` in both languages, as a by-product of building the product.
  Published, it is a real corpus produced from work already done.
- **Trade-specific organisational structures** for twenty-five fields of work, with role
  libraries — nobody else has this data, and it makes an "ERP for [trade]" family
  substantive rather than templated.
- **Calculators grounded in the domain**: retention release, variation impact on contract
  value, earned-value and CPI, VAT on a progress application. The arithmetic is already
  written, tested and pure — `modules/projects/earnedValue.ts`, `projectBilling`,
  `boqTotals`. A calculator is a page competitors must build from scratch and this product
  can publish from code it already ships.

**Axis 3 — the listicle corpus, entered honestly.** Get onto G2, Capterra and GetApp so
the aggregators that feed AI answers have an entry to cite. Then publish one comparison
family — but sourced, dated and legally reviewed, and only against products genuinely
competed with. Being the one comparison that is accurate is a durable position; being the
eleventh "Top 10" is not.

**And the unlock that makes all three compound: the ZATCA adapter.** It converts the
biggest content gap into the biggest content asset, puts the product in a government
directory that competitors cite as authority, and removes the objection that currently
ends every Saudi enterprise conversation. No amount of writing substitutes for it. It
belongs on the product roadmap as a marketing decision as much as a compliance one.

### 6.4 Sequenced competitive plan

| Quarter | Move | Measured by |
|---|---|---|
| Q1 | Directory listings (G2, Capterra, GetApp), LinkedIn, Crunchbase; positioning narrowed to contractors; five marketing routes live | Profiles live, `sameAs` populated, prompt-panel baseline recorded |
| Q1–Q2 | Twenty docs pages, both languages, aimed at contractor questions | Indexed count, AI-bot fetches per URL |
| Q2 | Bilingual glossary published from the product's own dictionaries | Long-tail impressions in both scripts |
| Q2–Q3 | Three to five domain calculators from existing pure modules | Links earned, returning sessions |
| Q3 | Changelog and the first case study | Freshness signals, citation rate |
| Q3–Q4 | ZATCA adapter ships → regulatory hubs written → Solution Providers Directory listing | Directory listing live; mention rate on ZATCA prompts |

---

## 7 · What was not asked, and should have been

The question bank is thorough on search and thin on the things that decide whether search
matters. These are mine, not the brief's.

**7.1 The legal pages are written for Europe.** Measured on the live page: 6,539 words,
GDPR fourteen times, Saudi Arabia twice, PDPL zero times, governing law deliberately open
pending incorporation. It is also, by a wide margin, the largest content page on the site.
A Saudi enterprise buyer doing diligence reads that as a product built for somewhere else,
and "PDPL compliant ERP" is a real query the product currently cannot answer or rank for.
This needs counsel, and it is more urgent than most of §4.

**7.2 Publishing the internal docs has a security dimension.** The functionality files and
the working notes describe the permission model, the row-level security posture, the
key-namespacing rules and several real incidents in useful detail. That is excellent
engineering documentation and a map for an attacker. Public docs must be rewritten
customer-facing artefacts, never the internal files as they stand — and the review that
enforces that needs an owner before the first page ships.

**7.3 The brand name is a measurable liability.** "nompany" is one character from
"company". Branded search will be contaminated in both directions, autocomplete will
correct against you, and an LLM asked about "nompany" may reasonably answer about
companies. This is not a reason to rename, but it is a reason to (a) settle the Arabic
spelling, (b) always pair the brand with a category word in titles and profiles, and (c)
expect branded-query data to need manual cleaning.

**7.4 Nobody asked who owns the domain and DNS.** The registrar, the DNS provider and the
Vercel and Cloud accounts are a single point of failure that can end the programme rather
than delay it — and the working notes already record an apex/`www` mismatch and a possible
leftover Cloudflare record. Two-factor authentication, recovery contacts and a second
admin on every one of those accounts, this month.

**7.5 Email deliverability is part of the entity.** The product sends notifications and
OTPs. SPF, DKIM and DMARC on `nompany.com` affect whether those arrive, and mail
authentication is one of the signals that separates a real company from a shell. Not
search, adjacent to trust, cheap to fix.

**7.6 There is no trust or security page.** Enterprise buyers search "[vendor] security"
and "[vendor] uptime" before they search anything else. This product has genuinely good
material for such a page — row-level security, bcrypt with rehash on login, console MFA,
session digests at rest, an append-only audit log, per-request observability — and
publishing it truthfully would answer the objection that the fabricated SSO/SCIM claim was
trying to answer dishonestly.

**7.7 Accessibility is a procurement question here, not only an ethics one.** Saudi
public-sector-adjacent tenders increasingly ask about it. The product has decent instincts
already (semantic headings, focus states, logical properties, reduced-motion handling) and
no automated check. A conformance statement is a page competitors mostly do not have.

**7.8 Removed URLs have no redirect map.** `/services`, `/projects`, `/vendors`,
`/clients`, `/gallery`, `/about`, `/features` and `/c/<slug>` have all been retired. Any
link that ever pointed at them now lands in the 307 catch-all. A redirect map is an hour
and recovers whatever equity exists.

**7.9 Dogfood the CRM.** The product has a pipeline, clients, engagements and quotations.
Running nompany's own sales in nompany makes the analytics-to-pipeline join in §5.3
possible, and it is the most credible case study the company will ever publish.

**7.10 The desktop client is an unlisted entity node.** A Tauri desktop app exists and is
mentioned nowhere public. App listings and download pages are entity nodes and mentions.

---

## 8 · A criticism of the idea of change, and what it does to the code

This section argues against the rest of the document. Not as a formality — every point
below is a real cost, and two of them are strong enough that I would want them accepted
explicitly before Wave 2 starts.

### 8.1 The strongest objection: this may be the wrong investment right now

The product has a handful of live studios, four sections that render nothing, and no
regulatory adapter. Content velocity competes directly with product velocity for the same
scarce hours, and every serious content asset in §6 is blocked behind product work anyway.
A pre-fit product usually learns faster from ten sales conversations than from ten
articles — and search compounds slowly, which means it pays back after the period in
which the company most needs to learn.

The counter, which I believe: Wave 1 is days, not weeks, and it is mostly *deleting* wrong
things. Search Console accrues history from the day it is verified and cannot be
backdated. Directory listings are an afternoon. None of that competes meaningfully with
product time. **What does compete is the docs corpus and the content cadence — and that is
the part that should be deferred until the ZATCA adapter is done.** The plan above is
already sequenced that way; the risk is that it gets re-sequenced by enthusiasm.

### 8.2 Splitting the landing page has a real architectural cost

Today the marketing site is one route with three client-switched views. Splitting it into
five routes means: five entries in the bundle baselines file, each gated by the per-route
first-load budget (an unlisted route is held to 300 KB from its first build); a shared
layout carrying the nav, footer and ambient background so the split does not multiply the
payload; and `motion/react` — which is confined to `components/landing/` precisely so the
studio's chunk never carries its ~30 KB — now spread across five routes instead of one.
The confinement rule still holds, but the cost is paid five times unless the animated
pieces stay in shared, lazily-loaded components.

This is not an argument against the split. It is an argument for doing it as one
deliberate change with baselines re-recorded in the same commit, rather than adding routes
one at a time and discovering the budget three routes later.

### 8.3 Making pages cacheable touches a shared read path

`getSiteSettings()` is why the public pages are `force-dynamic`, and it is not only the
marketing site's. Making the marketing routes static or time-revalidated means either
moving that read off the request path or caching it — and caching a settings read that
other surfaces also perform is exactly the shape of change that produces two sources of
truth for the same record. The safe version is a marketing-only accessor with its own
revalidation window, which is duplication of a kind this codebase deliberately avoids. The
trade is explicit: a small, named duplication in exchange for the largest performance win
available. I would take it, and I would write the reason in the code, because otherwise
somebody deletes it later for looking redundant.

### 8.4 The docs corpus creates a second source of truth — this codebase's recurring failure mode

The working notes are, at this point, substantially a record of prose that drifted from
code: section lists that were wrong for a fortnight, golden counts quoted from memory that
were off by more than fifty, a bundle ceiling stated a hundred kilobytes slacker than the
script enforcing it, a "waiting on the gateway" note that outlived the gateway by days.
The lesson in every one of those is the same: **a claim nobody re-measures decays
silently.**

Public documentation is that failure mode with an audience. `docs/functionality/media.md`
already documents flags of a script that is not in the tree. Publish a customer-facing
version of that file and the error is on a page a customer reads and an AI engine cites.

There is no clean solution — the internal file cannot be the public page (§7.2), and two
files drift. The least-bad arrangement, and the one I would build:

- Public docs live in their own directory, written for customers, never generated blindly
  from the internal notes.
- Each public page names, in frontmatter, the functionality file it corresponds to and the
  commit at which it was last verified.
- A test fails when the internal file has changed since that commit — the same shape as
  the architectural assertions that already shell out to `git grep`. It does not prove the
  page is right; it proves nobody can quietly change behaviour without the page being
  looked at. Given this project's history, that is the property worth buying.

### 8.5 SEO invites a CMS, and a CMS is a second door

The obvious answer to "we need to publish more, faster" is a CMS. This codebase's entire
design philosophy is single doors: one place keys are built, one context factory, one
create path for a project so the engagement attach cannot be forgotten, one write door per
approval-chain type so there is never a moment with two writers. A CMS is a second write
path into content, with its own review state, its own validation, and no type checking —
and the parity guarantee that currently makes Arabic structurally impossible to forget
(§3, "the good") exists *only* because both languages are keys of one typed object. Move
content into a database and that guarantee evaporates on the first commit.

Keep content in the repository until there is a specific person who cannot use git, and
then solve that person's problem — a small editorial UI that writes files, or a
pull-request-based editor — rather than adopting a general-purpose CMS.

### 8.6 The deploy pipeline makes content changes expensive

Marketing and the ERP ship through one pipeline: the full test suite, two TypeScript
passes, the build, the bundle budget. Fixing a typo in Arabic copy runs the whole ERP
suite. That friction is invisible today because content changes are rare — and a freshness
strategy makes them frequent, which turns the friction into the reason the cadence
quietly stops. Options, none free: accept it at four to six pages a month; add a
content-only CI path that skips the ERP suite when the diff touches only content
directories (cheap, and safe only if the boundary is enforced); or move content to a
runtime source, which reintroduces §8.5. I would accept it at the current volume and
revisit only if the cadence actually reaches weekly.

### 8.7 Every gate added is a gate that can block the wrong thing

The CI additions in §5.1 are the right shape, and they have a cost this team has already
paid once elsewhere: a deployment refused for eight consecutive pushes over a cron
schedule, presenting as a dead Git integration. Gates fail in ways that look like
something else. Each visibility gate must name, in its failure message, exactly which page
and which property failed and how to fix it — otherwise the first false positive during a
release gets it disabled, and a disabled gate is worse than none because it is still
believed.

### 8.8 And a caution about this document

It is a snapshot of 2026-09-07, and it contains measured numbers: twelve URLs, ~1.0s TTFB,
611 and 553 words, 1,942 and ~6,000 competitor URLs, 6,539 words of terms. Every one of
those will decay. Re-measure at the commit you are working from, not from this file. That
warning is written here because this project's own notes prove it is needed.

---

## 9 · Decisions needed from you

Nothing in Wave 1 is blocked. These block Wave 2 and beyond.

1. **Is there a staffed, signed office in Riyadh?** Decides the whole of the Business
   Profile section, and decides whether the opening-hours claim currently in the site's
   schema stays or goes.
2. **What is the Arabic-script brand name?** Blocks the Arabic entity, the profile name,
   and every directory listing. Irreversible in practice once published.
3. **What is the one-sentence company description, in both languages?** Every external
   profile created from a different draft is a permanent inconsistency.
4. **Which vertical leads — contractors, or generalist SME?** §6 assumes contractors and
   the argument for it is strong, but it is a positioning decision, not a search one.
5. **Where does ZATCA sit on the product roadmap?** More of this plan depends on that
   answer than on anything in it.
6. **What result after two quarters would mean stop?** Write the rule before the data
   arrives, or it is not a rule.
7. **Does an earlier-brand domain still exist**, and should it redirect here?

---

## Appendix — measurements taken 2026-09-07

**nompany:** apex 308 → `www`; `/` → `/en` 307; 12 sitemap URLs, all `lastmod` = request
time; `/en` 200, 121 KB HTML uncompressed, TTFB ~1.0s, served `bom1`, `Cache-Control:
private, no-cache, no-store`; 611 English / 553 Arabic words; JSON-LD Organization,
WebSite, ProfessionalService; H1 present but split per character; no `hreflang` errors;
`/en/login` `index, follow`; `/zzz-not-a-studio` → 307 `/en/login`; GPTBot, PerplexityBot
and ClaudeBot each 200; `Server: Vercel`, no CDN bot management; `/en/terms` 6,539 words,
GDPR ×14, PDPL ×0.

**Competitors:** `wafeq.com` 1,942 sitemap URLs, 16 hreflang variants;
`qoyod.com` 47 sitemaps (blog ~1,300, glossary ~1,800, knowledge base ~1,900, templates
~500, releases 179, business fields 164, calculators 47, case studies 31), 28 of 47 with a
`lastmod` inside 48 hours. SERP for the English and Arabic money queries: vendor-owned
listicles throughout.

**Sources for the competitive research:**
[Top 10 ERP System Solutions in Saudi Arabia](https://www.halsimplify.com/knowledge-center/erp-system-solutions-saudi-arabia) ·
[Best ERP Software in Saudi Arabia (TABSYST)](https://www.tabsyst.com/articles/best-erp-software-in-saudi-arabia) ·
[ERP Software in Saudi Arabia buyer's guide (MAAS)](https://maasconsult.co/erp-software-saudi-arabia/) ·
[Top 10 ERP Software in Saudi Arabia (AdoxERP)](https://adoxerp.com/blog/top-10-erp-software-saudi-arabia-2026) ·
[أفضل برنامج فاتورة إلكترونية في السعودية — مدونة قيود](https://www.qoyod.com/blog/e-invoicing/%D9%81%D8%A7%D8%AA%D9%88%D8%B1%D8%A9-%D8%A5%D9%84%D9%83%D8%AA%D8%B1%D9%88%D9%86%D9%8A%D8%A9/) ·
[أفضل برنامج فاتورة إلكترونية — Saudisoft](https://saudisoft.com/ar/%D9%81%D8%A7%D8%AA%D9%88%D8%B1%D8%A9-%D8%A5%D9%84%D9%83%D8%AA%D8%B1%D9%88%D9%86%D9%8A%D8%A9-%D9%81%D9%8A-%D8%A7%D9%84%D8%B3%D8%B9%D9%88%D8%AF%D9%8A%D8%A9/) ·
[ZATCA Solution Providers Directory](https://zatca.gov.sa/en/E-Invoicing/SolutionProviders/Pages/SolutionProvidersDirectory.aspx) ·
[ZATCA E-Invoicing](https://zatca.gov.sa/en/E-Invoicing/Pages/default.aspx) ·
[ZATCA approved e-invoicing service providers (ClearTax)](https://www.cleartax.com/sa/zatca-approved-e-invoicing-service-providers-saudi-arabia)
