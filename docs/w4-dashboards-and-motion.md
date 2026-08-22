# Wave 4 — Dashboards, Finance, and Motion

**Brief (22/08/2026):** redesign and rewire the UI/UX of `/super`, `/{locale}/account`
and the studio. Rebuild Finance around AP / AR / GL / FA. Turn every department page
into a data-dense dashboard. Port nine animation techniques from the marketing site.

This document is the **research and the plan**. Nothing in it is built yet.
Section 10 was the list of decisions that had to land first; they landed on
22/08/2026 and it now records the answers. Step 0 of §9 is where the work starts.

`ui-ux-overhaul.md` already covers tokens, the component taxonomy, skeletons and
accessibility, and none of that is repeated here. This is what that document does
not cover: the Finance domain, the dashboard catalogue, the motion port, and the
routing split.

---

## 0. What the survey found, and how it changes the brief

Four findings, each of which makes the work smaller or bigger than it looks.

**The chart kit already exists, and it is free.**
`src/app/super/_components/charts.js` is 417 lines of dependency-free SVG:
`AreaChart`, `BarChart`, `BarList`, `Donut`, `Radial`, `Sparkline`, `ChartFrame`
and — already — `ChartSkeleton`. Every colour comes from `--ad-chart-*` tokens, so
light and dark follow the theme with no JavaScript. It renders on the server.

This answers the "suggest a visualisation library" question with evidence rather
than preference: **we should not add one.** Recharts is ~100 KB gzipped and hydrates
on the client; this is 0 KB and does not. The kit is currently trapped in `/super`
and should be promoted to `src/components/charts/`, converted to TypeScript, and
given the two shapes it lacks (waterfall, stacked-bar-with-target).

**The nine techniques already exist, and they are already numbered.**
`src/components/landing/` contains all nine, commented `TECHNIQUE 1` through
`TECHNIQUE 9`, tuned to one motion system in `lib/motion.js`:

| # | Brief's name | What is already built |
|---|---|---|
| 1 | Loading / skeleton | `Preloader.js`, `hero/DashboardSkeleton.js` |
| 2 | Ambient motion | `AmbientBackground.js` + `providers/PointerProvider.js` |
| 3 | Typography dynamics | `text/AnimatedHeadline.js`, `text/Typewriter.js` |
| 4 | Dashboard assembly | `hero/DashboardAssembly.js` |
| 5 | Microinteractions | `ui/MagneticButton.js`, `ui/FloatingField.js`, `ui/CountUp.js` |
| 6 | Scrollytelling | `sections/HowItWorks.js` — pinned graphic, scroll-driven state |
| 7 | Self-drawing SVG | `svg/DrawIcon.js`, `svg/MorphShape.js` |
| 8 | Illustrative assistant | `mascot/AiAssistant.js` — "Nova" |
| 9 | Route transitions | `views/ViewTransition.js` |

`motion` (v12) is already a dependency. **Phase 3 is a promotion, not a build** —
lift `landing/lib`, `landing/ui`, `landing/svg`, `landing/text` and the two
providers into a shared `src/components/motion/` that the landing, the studio and
`/super` all import.

**Roughly fifteen of `/super`'s twenty-two pages are template mock data.**
`dashboard/finance` invents bank accounts, invoices and a ledger. `dashboard/crm`,
`ecommerce`, `hr`, `marketing`, `project`, `saas`, `application/calendar`,
`application/invoices`, `ecommerce/orders` and `docs` are the same. Five are real:
`application/studios`, `application/users`, `application/notifications`,
`application/packages`, `application/tiers`, plus `dashboard/analytics`.

This is the *same task* as the standing "remove all placeholder data" item, and it
is the larger half of it. The shells are well made; the data is invented.

**Decided 22/08/2026: five of the eight go.** `crm`, `ecommerce`, `marketing`,
`saas` and `project` are deleted outright — nompany does not run a storefront or a
marketing funnel, and a dashboard about a business we are not in is not a shell
worth keeping. Three remain and get real data: **revenue** (studios, packages,
tiers, MRR), **adoption** (sign-ups, active studios, module usage, traffic) and
**support** (chat load, response time, open issues). `hr` and `finance` fold into
revenue and adoption rather than surviving as their own pages.

**The studio ships every department to every route.**
`src/app/studio/[[...segments]]/page.js` is one catch-all that imports all twenty
screens eagerly. That is why the largest shared chunk is **305 KB gzipped against a
400 KB ceiling** — every route pays for every department. Adding charts and motion
on top of that budget without splitting first would breach it.

So the routing overhaul the brief asks for is also the thing that pays for the rest
of the brief. **It goes first.**

---

## 1. Rule 1, honestly

> *Do NOT change the underlying structural backend functionalities of the studio.
> This is a frontend layout, routing, and data-visualization overhaul.*

Phase 1 cannot be built under that rule as written, and it is better to say so now
than to discover it at the third widget.

Of the four Finance pillars:

| Pillar | Derivable from what is stored today? |
|---|---|
| **AR** — outstanding invoices, collection rate, aging | **Yes, entirely.** `invoices` carries `issueDate`, `dueDate`, `status`, `lines`, `vatRate` and an append-only `payments[]`. Aging, DSO and collection rate are arithmetic over records that already exist. |
| **GL** — income vs expense, journal summaries | **Partly.** Income from invoices and outflow from `expenses` gives a real income-vs-expense view by month and category. A *general ledger* — chart of accounts, double-entry journal, trial balance — has no records at all. |
| **AP** — bills, aging, cash-out projection | **No.** Inventory holds `materialOrders` with a vendor, lines and an `expectedAt`, which is a *commitment*, not an obligation: there is no bill date, no due date, no terms and no payment record. "Who we owe and for how long" cannot be computed from it. |
| **FA / PPE** — asset value, depreciation | **No.** Nothing in the product records an owned asset. |

**The proposal.** Split Phase 1 in two and ship them in that order:

- **1a — AR and income-vs-expense, frontend-only.** A full Finance dashboard on
  existing data: aging buckets, collection rate, DSO, overdue ladder, income vs
  expense by month, expense mix, project margin. No schema change, no new
  permission, no new section. This is genuinely the overhaul the rule describes, and
  it is most of the visible value.
- **1b — AP, GL and FA, which need records.** Three new collections, three new
  sub-sections, three new permission groups. This is backend work by any reading and
  needed an explicit yes. **It has it** (22/08/2026), including a **full
  double-entry ledger** rather than the summary alternative — so invoices, bills,
  expenses and payments all post, and the trial balance is a real one.

1a still ships first and on its own. It is a real Finance dashboard on existing
data, it lands weeks before 1b, and it is what proves the widget pattern against
records that already exist.

**What a full ledger adds beyond §2.2's schema.** Double entry means every invoice,
bill, expense and payment *posts* — so the services that write them gain a posting
step, and the two rules that are not expressible in a Zod schema become transition
guards: an entry balances, and a posted entry is reversed rather than edited. It
also means a chart of accounts has to exist before the first posting, which makes
seeding it part of Finance settings rather than an afterthought.

---

## 2. Finance — the proposal

### 2.1 Sections

Today: `finance` → `finance-cash`, `finance-settings`. Cash is one screen with an
Invoices tab and an Expenses tab.

Proposed (the **1b** shape; 1a keeps the current sections and only changes the
dashboard):

```
finance                     dashboard — the four pillars in one view
├─ finance-receivables      invoices, payments, aging, collections     [exists as part of cash]
├─ finance-payables         bills, vendor terms, payment runs           NEW
├─ finance-ledger           accounts, journal, trial balance            NEW
├─ finance-assets           asset register, depreciation schedule       NEW
└─ finance-settings         VAT, categories, chart of accounts, terms   [exists]
```

`finance-cash` is **kept and not renamed.** Its SectionID is what every existing
invoice and expense row carries in `sectionId`, and renaming a section key would
orphan them. Receivables is `finance-cash` under a new display name; the invoices
and expenses collections stay exactly where they are.

The nav picks new sub-sections up automatically — `StudioFrame` renders from
`listSections`, so adding to `SECTION_DEFS` in `platform/db/keys.ts` is the whole
navigation change.

### 2.2 New records (1b only)

Transcribed the way every other department's are: a `schema.ts` per record, Zod,
inferred types, no runtime parsing until the coercion it replaces is deleted in its
own commit.

**`Bill` — what we owe.** The AP counterpart of an invoice, and deliberately the
same shape so the two aging reports share their arithmetic.

```
id, studioId, sectionId
reference          from bumpCounter, never from a count — invariant 10
vendorId           → inventoryVendors
vendorName         SNAPSHOT, like an invoice's clientName
orderId            optional → materialOrders, when the bill answers a PO
projectId          optional — what it is chargeable to
lines[]            { description, qty, unitPrice }
vatRate
status             Draft | Received | Approved | Paid | Cancelled | Disputed
billDate           when the vendor issued it
dueDate            billDate + terms
terms              net-0 | net-15 | net-30 | net-60 | on-receipt
payments[]         append-only, same shape as an invoice's
notes
approvedByCollaboratorId, approvedAt      ← invariant 7 applies: raiser ≠ approver
createdAt, createdByCollaboratorId
```

**`Account` + `JournalEntry` — the ledger.**

```
Account:  id, studioId, sectionId, code, name,
          type (asset|liability|equity|income|expense),
          parentId, active

JournalEntry: id, studioId, sectionId, reference, date, memo,
              lines[] { accountId, debit, credit, projectId? },
              source { kind: invoice|bill|expense|payment|manual, id },
              postedByCollaboratorId, postedAt, reversedByEntryId?
```

Two rules the schema does not enforce and the service must: **an entry balances**
(Σ debit = Σ credit) and **a posted entry is never edited, only reversed**. Both are
the same class of rule as invariant 7 — enforced at the transition, not in the type.

**`FixedAsset` — PPE.**

```
id, studioId, sectionId, reference, name, category,
acquiredOn, cost, salvageValue, usefulLifeMonths,
method (straight-line | reducing-balance),
disposedOn?, disposalProceeds?, projectId?, custodianCollaboratorId?
```

Depreciation is **derived, never stored** — the same call the product makes
everywhere else. A schedule stored at acquisition goes stale the moment anybody
corrects a useful life, and the whole schedule is a pure function of five fields.

### 2.3 Permissions

Four new groups, following the existing `finance.cash` shape:

```
finance.receivables   view create edit delete            (finance-cash, renamed)
finance.payables      view create edit delete approve pay
finance.ledger        view post reverse
finance.assets        view create edit dispose
```

`approve` on payables and `post` on the ledger are separate verbs on purpose:
raising a bill and authorising it are two acts, and invariant 7 says one person must
not do both to one record.

### 2.4 The Finance dashboard — every data point

Each widget carries the **analytics rung** it belongs to. A studio sees the widgets
its rung entitles it to; the rest render as a locked card naming what it would show.
See §4.

| # | Widget | Reads | Rung |
|---|---|---|---|
| **AR** ||||
| 1 | Outstanding total, count | invoices where status ∈ {Sent}, Σ outstanding | basic |
| 2 | Overdue total, count | + dueDate < today | basic |
| 3 | Collected this month | payments where date ∈ month | basic |
| 4 | **AR aging** — bars: current, 1-30, 31-60, 61-90, 90+ | invoice outstanding bucketed by days past dueDate | simple |
| 5 | **Top debtors** — BarList, name + owed + oldest | grouped by clientName | simple |
| 6 | **Collection rate** — Radial, collected ÷ invoiced over 90d | payments vs invoices | simple |
| 7 | **DSO** — Sparkline, 12 months | (AR ÷ credit sales) × days | moderate |
| 8 | **Cash-in projection** — AreaChart, next 90 days by due date | invoices, weighted by that client's historic lateness | advanced |
| **AP** *(1b)* ||||
| 9 | Payable total, count | bills where status ∈ {Received, Approved} | basic |
| 10 | Overdue to vendors | + dueDate < today | basic |
| 11 | **AP aging** — same five buckets, mirrored | bills | simple |
| 12 | **Top creditors** — BarList | grouped by vendorName | simple |
| 13 | **Due this week / next** — table, pay-run candidates | bills by dueDate | simple |
| 14 | **Cash-out projection** — AreaChart, next 90 days | bills + recurring expenses | moderate |
| 15 | **Net cash position** — AreaChart, in vs out overlaid, running balance | 8 + 14 | advanced |
| **GL** *(1b for the true ledger; a P&L view is 1a)* ||||
| 16 | Income, expense, net — this month vs last | invoices, expenses | basic |
| 17 | **Income vs expense** — BarChart, 12 months, two series | monthly rollup | simple |
| 18 | **Expense mix** — Donut, by category | expenses grouped | simple |
| 19 | **Recent journal** — table, last 20 entries | journalEntries | simple |
| 20 | **Trial balance** — table, debit/credit by account, totals agree | accounts + entries | moderate |
| 21 | **P&L waterfall** — revenue → COGS → opex → net | ledger rollup | advanced |
| **FA** *(1b)* ||||
| 22 | Asset count, gross book value, net book value | assets | basic |
| 23 | **Depreciation this month / YTD** | derived per asset | simple |
| 24 | **Assets by category** — Donut, at NBV | assets grouped | simple |
| 25 | **Depreciation schedule** — AreaChart, NBV falling over 5 years | derived | moderate |
| 26 | **Nearing full depreciation** — table, replacement planning | assets where remaining life < 6mo | moderate |
| **Cross-cutting** ||||
| 27 | **Project margin** — table, value/invoiced/collected/cost/margin% | exists today as `profitability` | simple |
| 28 | **Working capital** — Radial, (AR + stock − AP) ÷ monthly outflow | AR, AP, inventory value | advanced |

Widgets 1–7, 16–18 and 27 need **no new records**. That is the 1a deliverable, and
it is already a dashboard worth having.

---

## 3. Every department's dashboard

The same treatment, one page each. Listed as the researcher's proposed data points;
each still needs the same rung tagging as Finance above, which is mechanical once
the pattern is agreed.

- **Main** — already the closest thing to a dashboard. Add: activity sparkline per
  department, an "awaiting you" queue across modules, a 30-day event ribbon.
- **Sales** — pipeline funnel and probability buckets *already exist* in
  `salesAnalytics.ts` and are not drawn anywhere. Add: win rate over time, average
  deal size, at-risk tickets, days-in-stage, top clients by value.
- **Technical** — `technicalAnalytics.ts` already computes quotation stats, RFQ
  funnel, urgency mix, handler leaderboard, timeline, completion scatter and average
  turnaround. **None of it is drawn.** This department is a wiring job, not a
  research job.
- **Projects** — stage distribution, margin by project, SLA visit compliance,
  overtime by department, support-window expiry, milestone burn-down.
- **Inventory** — stock value, below-reorder count, movement in/out over 90 days,
  vendor lead-time performance, serial allocation rate, AWB exceptions, order aging.
- **HR** — headcount by department, expiring documents ladder, vacation calendar
  load, certification coverage, tenure distribution.
- **Operations** — permits expiring, shift coverage per week, hours by location,
  location utilisation, exception log.
- **Quality** — documents by state, revisions awaiting review/approval, average
  time-in-state, documents overdue for review, coverage by department.
- **Tasks** — open vs done, awaiting-me, stuck (orphaned authority), age
  distribution, throughput per week.
- **People / Access** — role distribution, permission overlap, dormant
  collaborators, escalation attempts refused.

Two of these — Sales and Technical — have their analytics **already written and
unused**. They should be the first two built, because they prove the widget pattern
against real computed data with nothing new to derive.

---

## 4. Tiering, because analysis is a paid service

Recorded from your instruction of 22/08/2026: **data analysis is sold, like packages
and tiers**, on four rungs — `basic`, `simple`, `moderate`, `advanced`.

The mechanism, kept deliberately thin because the entitlement model is deferred:

```ts
// One catalogue entry per widget. The rung travels with the widget, so a
// dashboard is assembled from what a studio has bought rather than from what
// the department could theoretically show.
export type WidgetSpec = {
  id: string;                       // "finance.ar.aging"
  section: string;                  // which section's dashboard it belongs to
  title: string;
  level: "basic" | "simple" | "moderate" | "advanced";
  /** What it would show, for the locked card. Never a fake number. */
  teaser: string;
};

/** THE ONE FUNCTION THE ENTITLEMENT MODEL WILL REPLACE. */
export function analyticsLevelOf(studio: StudioRow): AnalyticsLevel;
```

Today `analyticsLevelOf` returns a single constant and every studio sees everything.
When tiers become a paid product it reads the tier's `analyticsLevel`, and nothing
else in the dashboard code changes.

**A locked widget shows what it would show and never a number.** An invented
sparkline behind a blur is the same lie as the mock data we are removing.

---

## 5. Component structure — the frontend proposal

```
src/components/
├─ charts/                     ← promoted from app/super/_components/charts.js
│  ├─ Area.tsx  Bar.tsx  BarList.tsx  Donut.tsx  Radial.tsx  Sparkline.tsx
│  ├─ Waterfall.tsx            NEW — the P&L widget
│  ├─ Frame.tsx                axes, legend, grid
│  ├─ Skeleton.tsx             already exists as ChartSkeleton
│  └─ draw.ts                  stroke-dashoffset helpers  → TECHNIQUE 7
│
├─ motion/                     ← promoted from components/landing/**
│  ├─ tokens.ts                was landing/lib/motion.js — easings, springs, stagger
│  ├─ PointerProvider.tsx      → TECHNIQUE 2
│  ├─ Ambient.tsx              → TECHNIQUE 2
│  ├─ Assemble.tsx             staggered container   → TECHNIQUE 4
│  ├─ Heading.tsx              masked char reveal    → TECHNIQUE 3
│  ├─ Magnetic.tsx             → TECHNIQUE 5
│  ├─ FloatingField.tsx        → TECHNIQUE 5
│  ├─ CountUp.tsx              → TECHNIQUE 5
│  ├─ DrawIcon.tsx             → TECHNIQUE 7
│  ├─ Pinned.tsx               scroll-driven pin     → TECHNIQUE 6
│  ├─ RouteTransition.tsx      → TECHNIQUE 9
│  └─ Nova.tsx                 → TECHNIQUE 8
│
└─ dashboard/
   ├─ Dashboard.tsx            grid + Assemble + Suspense boundaries
   ├─ Kpi.tsx                  stat box: value, delta, sparkline, CountUp
   ├─ Widget.tsx               frame + title + rung badge + skeleton slot
   ├─ Locked.tsx               what this rung does not include
   └─ registry.ts              WidgetSpec[] — the catalogue of §2.4 and §3
```

And per department, the split `ui-ux-overhaul.md` §6 already specifies:

```
src/modules/finance/ui/
├─ FinanceDashboard.tsx        server — fetches, composes, owns Suspense
├─ ArAging.tsx                 server — pure SVG, no hydration
├─ Receivables.table.tsx       client island — sorting, filtering only
├─ Receivables.skeleton.tsx    matched shape
├─ InvoiceDialog.tsx           client island, dynamic() — not in initial bundle
└─ derive.ts                   pure: aging(), dso(), collectionRate(), schedule()
```

**`derive.ts` is the important file.** Every number on the dashboard is a pure
function of records the API already returns, so each one gets a unit test with a
worked example, and no chart can quietly disagree with the table beside it.

---

## 6. Routing

Three surfaces, three different problems.

**Studio** — one catch-all importing twenty screens becomes real segments:

```
/studio/[slug]/(shell)/layout.tsx        StudioFrame, LiveProvider, Ambient, RouteTransition
/studio/[slug]/(shell)/page.tsx          Main dashboard
/studio/[slug]/(shell)/finance/page.tsx  + loading.tsx
/studio/[slug]/(shell)/finance/receivables/page.tsx
…
```

The proxy rewrite is untouched — it still maps `nompany.com/<slug>/…` onto the
internal folder, and the browser still only ever shows `/<slug>/…`. What changes is
that Next can split the bundle, `loading.tsx` becomes possible for the first time
(there are zero today), and the sidebar's active state stops being derived from a
segments array.

**`/super`** — the `(shell)` group is right. The eight template dashboards are the
question (§9).

**`/account`** — one 932-line client component behind a 39-line page. It becomes a
shell with segments for profile, security, studios and devices, each with its own
loading state. Its Security tab is already on the list to be rewritten against real
data.

---

## 7. The nine techniques, placed

| # | Where it lands |
|---|---|
| 1 | `loading.tsx` per segment; `Widget` renders `Skeleton` inside `Suspense`; cross-fade on resolve |
| 2 | `Ambient` in the studio and `/super` shell layouts, behind the content, `pointer-events-none`, off under `prefers-reduced-motion` |
| 3 | `Heading` on every department page title |
| 4 | `Assemble` wraps the dashboard grid — KPI row, then charts, then tables, ~70 ms apart |
| 5 | `Magnetic` on primary actions; `FloatingField` across forms; `CountUp` in every KPI |
| 6 | `Pinned` on Finance deep-dives — the aging chart holds while the invoice list scrolls, and highlights the bucket in view |
| 7 | `DrawIcon` in the sidebar and empty states; `draw.ts` animates every line and area chart on first paint |
| 8 | `Nova` in the studio top bar, breathing loop, opening the assistant panel — **see §8A; the head ships before the assistant does, and neither ships a fake insight** |
| 9 | `RouteTransition` in the shell layouts — cross-fade between departments, slide within one |

**Three rules for all of it.** Every technique honours `prefers-reduced-motion`;
nothing animates a value the user has not seen settle (a KPI counts up once, not on
every poll); nothing on the critical path waits for an animation.

---

## 8. The six standing requirements

Added 22/08/2026. Each one surveyed before it was written down, because three of
the six are smaller than they sound and two are considerably larger.

### 8.1 Arabic in the studio — and the locale it has nowhere to come from

**The finding that decides this one: the studio has no locale at all.** Not one of
the thirty-four components in `components/studio2/` reads a dictionary, and the
studio's address — `nompany.com/<slug>/…` — carries no locale segment, because the
slug *is* the address. `x-locale` is set by the proxy and lands on `<html dir>` for
the public site; a studio page never sees it.

So the question is not "translate the studio", it is **"where does a studio's
language come from"**, and it has to be answered first.

Adding `/ar/` to a tenant address is the wrong answer: it changes every link a
studio has ever shared and makes the tenant's own address a two-form thing.

The right source already exists and is already written. `U.profile(id)` carries
`language: "en"`, set at signup and never read. The proposal:

1. **A collaborator's language is their profile's**, with a per-studio override on
   the Collaborator row for somebody who works bilingually.
2. The studio layout resolves it server-side and sets `lang`/`dir` on the shell,
   exactly as the root layout does for the public site.
3. A language control in the studio top bar writes the override.

**Scale.** i18n today has eight dictionary sections — `nav`, `common`, `careers`,
`apply`, `notFound`, `auth`, `contact`, `terms` — all of them public. The studio
needs roughly one section per department plus a shared one, and `/super` needs its
own. That is several thousand strings, and extracting them is mechanical but not
small: it touches every one of the twelve module screens.

**It has to happen during the dashboard rewrite, not after it.** Every widget title,
axis label, empty state and locked-card teaser written in §2.4 and §3 is a new
string. Writing them as literals and extracting them later means doing the whole job
twice.

**The Arabic must be Arabic, not translated English.** "Accounts receivable" is
"الذمم المدينة", not a transliteration; "aging" in a finance context is "أعمار
الديون". A glossary of the ~200 domain terms — the department names, the record
types, the statuses, the workflow verbs — should be agreed before the bulk
extraction, so twelve screens do not each invent their own word for "quotation".

### 8.2 RTL

Three distinct gaps, and only the first is hard.

**MUI renders LTR inside Arabic.** `stylis-plugin-rtl` is not installed, so the Data
Grid, the date/time pickers and Autocomplete — the three places MUI is used — do not
mirror. This is a known gap already recorded in `CLAUDE.md`. The fix is the plugin
plus an RTL-aware Emotion cache, and it interacts with the cascade-layer order that
is already load-bearing (`@layer tw-base, tw-components, mui, tw-utilities`), so it
needs care and a visual pass in both directions.

**The studio never sets `dir`.** Falls out of §8.1: once the shell knows the
language, it sets it. `/super`'s Shell already carries a `dir` in its own state, so
the console is closer than the studio.

**Logical properties are applied unevenly.** `StudioSales.js` uses `ps-`/`pe-`/`ms-`
fifty-seven times; `StudioFinance.js` nine. The rest are physical `pl-`/`pr-`/`ml-`
and will not mirror. Since every screen is being rewritten for §5's component split
anyway, the rule is simply enforced there — and worth an ESLint rule so it does not
drift back.

**Charts mirror too.** The SVG kit draws left-to-right with axes on the left. In RTL
the axis moves and the series direction reverses. `Frame.tsx` should take the
direction rather than each chart deciding — one place, not eight.

### 8.3 The language button the main website does not have

Confirmed: `AuthShell` and `AccountHome` carry a language control; the landing page
does not. So a visitor arriving at `nompany.com` in Arabic has no way to say so, and
the Arabic dictionary that already exists is only reachable by typing `/ar` into the
address bar.

Small piece of work, but it should ship with the login redesign (§8.5) since both
live in the same chrome.

### 8.4 Dates — done, and the number was bigger than the survey

The survey counted 17 raw `toLocaleDateString` calls and one genuine bug. Doing it
turned up a second, worse thing the survey missed: **a duplicate formatter**.

`components/studio2/ui.js` carried its own `fmtDate` — `(v) => String(v).slice(0, 10)`
— which rendered **yyyy-mm-dd, not the dd/mm/yyyy the product uses everywhere else**,
and a `fmtDateTime` hard-coded to `en-GB`. Ten studio screens imported them. So the
studio was not bypassing the tenant locale in seventeen scattered places; it was doing
it through one shared helper that had quietly forked from the real one. Both now
re-export `@/lib/format`, and the ten screens are correct without an import line
changing.

**The genuine bug** (moved to `StudioSettings.js:514` since the survey): the FX "rates
as of" line called `toLocaleDateString()` with no locale, so it rendered mm/dd/yyyy in
a US browser. Routed through `fmtDate`.

**What the one formatter now guarantees**, all in `companySettings.ts` so there is one
place to change any of it:

- **dd/mm/yyyy** by default (`en-GB`), and the tenant's configured locale when set.
- **A date-only string is LOCAL midnight**, not UTC — `new Date("2026-08-22")` parses
  as UTC and lands on the 21st in every Western timezone. The `T00:00:00` guard the
  call sites used to repeat moved into `toDate()`.
- **Western digits even in Arabic.** `toLocaleDateString("ar-SA")` returns
  Arabic-Indic digits *and* the Hijri calendar — both wrong for an invoice that
  reconciles against a Gregorian bank statement. `digitSafe()` pins
  `-ca-gregory-nu-latn` onto any `ar` locale. This is the one place a future per-user
  "show me Arabic-Indic digits" account setting (the decision to make digits a user
  preference) overrides.
- **A weekday is the exception**: `formatWeekday` localises fully, because "الإثنين"
  is what an Arabic tenant wants, not "Mon" — words localise, numbers do not.
- **Clock times** (`fmtTime`) for the live views' "last polled at", same digit rule.

**The rule is enforced**, not just stated: Gate A block 6 fails the build if anything
in `src/components/studio2` formats a date with a raw `toLocale*` call. `/super` is
deliberately exempt — English-only, and its template pages go with the placeholder
sweep.

Two `/super` and one `/account` cluster still call `toLocaleDateString("en-GB")`
directly. They render dd/mm/yyyy already and the console has no tenant locale to
honour, so they are correct today; they convert with step 10's rewire, not here.

### 8.5 The login page

`LoginForm` is 119 lines inside a 51-line `AuthShell`. It works and it is plain.

The redesign is small and self-contained, and it is the **first thing anybody ever
sees**, so it earns disproportionate polish: the ambient background from technique 2,
floating-label fields from technique 5, the headline reveal from technique 3, a
proper error and rate-limit state, the language control from §8.3, and the OTP step
as a real second panel rather than a swap.

Worth doing early — it is a contained page that proves the motion kit works outside
the landing before the whole studio depends on it.

### 8.6 The ERP documentation

**Nothing that exists today is this.** `docs/` is ten architecture and audit
documents written for whoever is building the system. What is being asked for is the
opposite audience: what every button does, what every flow means, and how the
system works for the person operating it.

Proposed shape — one page per department, each with the same five parts:

1. **What this department is for**, in a paragraph.
2. **The records it holds** — what a Ticket, a Quotation, an Invoice, a Bill *is*,
   and which fields matter.
3. **The flows** — order-to-cash end to end, RFQ → quotation → approval → project,
   requisition → PO → receipt → bill → payment. Each drawn, each naming the screen
   and the button at every step.
4. **Every control** — a table of button, what it does, what right it needs, and
   what it refuses.
5. **What it connects to** — the cross-department reads, which are the part nobody
   can infer from one screen.

Plus four cross-cutting pages: identity and membership, permissions and roles,
notifications and the live stream, and the document/approval model.

**Two decisions on it** (§9): does it live as a docs site, or in-app as contextual
help — and is it bilingual from the start? An ERP manual in English for an Arabic
operator is half a manual.

**And it must be generated from the source where it can be.** The permission
catalogue is a list in a file, the sections are a list in a file, the API surface is
99 typed routes. A control table hand-written beside code that moves is a control
table that is wrong within a month. The permission-and-refusal columns should be
derived from `platform/access/catalogue.ts` and the route table, the same way the
access suite already derives its matrix.

---

## 8A. Nova — the second chat, and what it is allowed to do

Added 22/08/2026. **Two chat surfaces, deliberately not one.**

### 8A.1 The two are different products

| | **Support chat** (exists) | **Nova** (new) |
|---|---|---|
| Who is on the other end | A person at nompany, in `/super` | The system itself |
| What it is for | "Something is wrong with the product" | "Help me get my work done in here" |
| Scope | The platform | This studio, this person, their rights |
| Lifetime | A room with a TTL; nothing is kept | A thread scoped to the collaborator |
| Trigger | The existing chat bubble | **A Nova-head button** |

They must not merge. Support is nompany's queue and its transcript is a support
record; Nova is a tenant's assistant and everything it touches is that tenant's
data. Merging them would put a studio's operational requests into nompany's
support queue and a support conversation inside a tenant's boundary. The two
buttons sit apart in the chrome for the same reason.

The existing widget already carries an allowance (`chatUsage`), which is another
reason to keep them separate: a question for Nova must not spend a support chat.

### 8A.2 What Nova does

Three capabilities, in increasing order of how much can go wrong:

**1. Answers questions about the product.** "How do I raise an RFQ?" "What does
*Sent for approval* mean?" This is a reader over the operator documentation of
§8.6 — which is the second reason that documentation earns its place: it is
Nova's corpus. No writes, no risk, and it works the day the docs exist.

**2. Answers questions about this studio's data.** "How many invoices are
overdue?" "Which projects am I on?" Every answer comes from the same services
the screens call, **through the same permission check**, and Nova says where it
looked. It never reaches past `effectivePermissions` — see §8A.4.

**3. Raises things, and routes them.** The example given: somebody in Sales asks
for leave; the request goes to whoever approves leave; the asker is told what
happened to it. This is the one that writes, and it is designed below.

### 8A.3 Routing a request — and why almost none of this is new

The mechanism already exists and is already load-bearing. `modules/tasks/taskRouting.ts`
declares seven typed tasks, each routed to one or more **authorities**
(`mng`, `fin`, `sales`, `log`, `hr`, `permit`), with Task settings recording who
currently holds each — resolved on every read, so appointing somebody hands them
the open items immediately. A typed task is a decision waiting on an authority,
and it already carries approvals, a reviewer/approver split (invariant 7) and a
withdrawal cooldown.

So Nova does not invent a workflow. **Nova is a front door onto the one that
exists.** The leave example, end to end:

```
Nova: "I'd like to take the 3rd to the 7th off."
  → recognises the intent
  → checks the asker holds hr.vacations.create in this studio
  → shows the request it is about to raise, in full, and asks for confirmation
  → the person confirms
  → createVacation(ctx, …)                     the same service the HR screen calls
  → a typed task, routed to the `hr` authority   the same table the board reads
  → notifyCollaborators(studio, holders, …)      the same producer the bell reads
  ← the approver sees it on their board, and in their bell
  → they approve or decline on the board — NOT inside Nova
  ← notifyCollaborators(studio, [asker], …)
  ← the bell tells the asker, and Nova's thread updates in place
```

Two things are deliberately absent from that chain. **Nova never approves** — it
raises and it reports, and the decision stays on the screen that owns it, behind
the right that guards it. And **Nova never writes without a confirmation step**
that shows the exact record it is about to create.

**What it needs that does not exist yet:** the leave example needs a `vacation`
task type added to `TASK_TYPE_AUTHORITIES` and a producer calling
`notifyCollaborators` — HR raises no notifications today (§8A.6). That is a small
addition to a table, not a new subsystem.

### 8A.4 The rules Nova operates under

Non-negotiable, and every one of them is an existing invariant rather than a new
policy:

1. **Nova holds no rights of its own.** Every read and every write runs as the
   person talking to it, through `effectivePermissions`. There is no service
   account. A studio's data cannot leave through a chat window that a screen
   would have refused.
2. **It never approves, signs, or decides.** Invariant 7 exists because reviewer
   and approver must be two people; an assistant that could sign would be a third
   way around it.
3. **It confirms before it writes.** The proposed record is shown in full first.
4. **It says where it looked.** An answer names the screen and the filter, so it
   can be checked. An assistant that produces a number nobody can trace is worse
   than no assistant.
5. **It refuses rather than guesses.** "I don't have that" is a valid answer.
   Every invented number in `/super` is being deleted this wave; Nova must not
   become a new source of them.
6. **It is bounded to one studio.** The thread is scoped to a collaborator in a
   studio — CollaboratorID, not UserID (invariant 6) — so somebody in two studios
   has two threads and neither can see the other.

### 8A.5 The button

The Nova head from `components/landing/mascot/AiAssistant.js`, promoted to
`components/motion/Nova.tsx` — technique 8, the breathing loop, unchanged.

- **Studio top bar**, beside the notification bell.
- The head **reacts to state**: idle breathing; attentive when there is an
  unread reply; a badge when a request it raised has been decided.
- Clicking opens a side panel, not a modal — the point is to keep working while
  it is open.
- **The support bubble stays where it is** and keeps its own icon.
- Reduced motion stops the breathing; the head stays.

### 8A.6 What has to exist first

In order:

1. **The operator documentation (§8.6)** — capability 1 has no corpus without it.
2. **Notification producers across the departments** (see the note below §9): the
   transport is finished and the producers are almost entirely missing, so today
   Nova could raise a request and nothing would tell the approver.
3. **A model decision.** Capability 1 is answerable by retrieval over the docs
   with no model at all. Capabilities 2 and 3 need intent recognition. Which
   provider, hosted where, and what leaves the tenant boundary is a decision on
   its own — nothing about a studio's data should reach a third party without an
   explicit yes. It belongs in the researcher's ledger, not in this document.

Until 3 is settled, Nova ships as **the head, the panel, and capability 1** —
which is genuinely useful and risks nothing.

---

## 8B. Notifications — the transport is finished, the producers are not

Surveyed 22/08/2026, because §8A depends on it and because it was worth checking
rather than remembering.

**Delivery is live and needs no refresh.** The chain is complete:

```
notifyCollaborators()  writes the row to S.notifications
      ↓                publishes ONLY { kind, id, studioId, recipientId }
publish(CH.user(id))   — the doorbell carries no message, finding L-7
      ↓
/api/studios/<slug>/stream  subscribes per user, re-reads the body from Redis
      ↓                     on a connection it has already authenticated
LiveProvider           one EventSource per tab, "notif" frames into state
      ↓
NotificationBell       merges streamed arrivals with what it fetched, dedup by id
```

It survives the things that usually break this: a hidden tab drops the connection
after a minute and replays from its cursor on return; a reconnect refetches
because a reconnect is exactly when something may have been missed; and a grants
or membership change closes the connection rather than patching it.

**The weakness is upstream.** Ten of the twelve departments raise no notification
at all. Three producers exist in the whole studio — join requested, join decided,
and a quality revision needing you. `NOTIFY.taskAssigned` and `NOTIFY.mention` are
declared and never fired; `NOTIFY.peopleChanged` likewise.

So today: a task assigned to you, an invoice going overdue, a quotation approved,
a permit expiring, an RFQ landing in your queue — none of them tell anybody. The
bell works perfectly and there is nothing to put in it.

### 8B.1 Clicking one — surveyed, and one bug

**Does it forward to the item?** Yes, when the notification carries an `href`.
The bell renders `<Link href={`/${slug}/${n.href}`}>`, built from the slug the tab
is actually on — so a renamed studio does not strand its own old notifications.

**Does it mark itself read?** **No, and it should.** Clicking navigates and closes
the panel; the row stays unread until somebody presses *mark all read*. The API
already accepts `PATCH { ids: [...] }` and `markRead()` already takes a list — the
capability exists and the bell simply does not call it. One `fetch` on click, plus
the same optimistic update `markAllRead` already does correctly.

**Two defects in what little exists:**

- `qualityDocRevisions.ts` writes an **absolute** href —
  `/${slug}/quality-documents/${id}` — where the contract, documented in
  `notifications.ts`, is studio-relative. The bell then builds
  `/acme//acme/quality-documents/doc_1`. **That link is broken today.**
- `lib/studios.ts` writes `href: ""` on join-decided, so the one notification
  telling somebody they were let into a studio goes nowhere when clicked.

Both are a line each, and both belong in step 11a.

### 8B.2 What deserves a notification — the answer to "is a new project not worth one?"

It is, and the research says so more strongly than expected: **the system already
knows.** `platform/db/sections.ts` emits `row.created`, `row.updated` and
`row.deleted` on every single write, carrying the section, the collection and the
row id. A project being opened, a sheet being created, a PO being received — all
three already publish an event, and that event is what refreshes the boards.

So nothing needs to be *detected*. What is missing is the second half: **who should
be told.** An event says "the projects collection changed"; a notification says
"this is yours, and it is waiting on you". Turning the first into the second is a
recipient rule per case, and that is the whole of step 11a.

The proposed test — and the reason not every event becomes a notification — is that
a notification is owed when **somebody is waiting on you**, or when **something you
raised was decided**. A row changing is neither. On that test:

| Event | Owed? | To whom |
|---|---|---|
| **Project assigned to you** | **Yes** | The manager named on it — it is now their work |
| **Project opened from a quotation** | Yes | Sales, who raised the ticket: their deal became a job |
| **Project sheets created** | No | A consequence of opening the project, not a separate fact. It rides on the project notification |
| **PO received** (`receivedAt` stamped) | **Yes** | Whoever raised it, and Finance — goods arriving is what makes a bill payable |
| **PO placed** | Yes | The approver, if the studio requires one |
| **Delivery issued** | Yes | The project's manager — stock left the building against their job |
| **Invoice overdue** | **Yes**, daily digest | Finance. The only one here that is time-driven rather than event-driven, so it needs the cron, not an emitter |
| **Task assigned / typed task raised** | **Yes** | The authority holders. `NOTIFY.taskAssigned` is declared and has never fired |
| **Approval given or refused** | **Yes** | Whoever raised it |
| **RFQ raised** | Yes | Technical's handlers |
| **Quotation submitted** | Yes | The Sales owner of the ticket |
| **Permit / certification expiring** | **Yes**, 30/7/1 days | The holder and Operations or HR. Time-driven — cron |
| **Leave requested / decided** | **Yes** | HR, then the asker. This is Nova's example (§8A.3) |
| **Stock below reorder** | Yes | Inventory, once per crossing — not once per movement |
| **Row edited by a colleague** | No | That is what the live refresh is for |

### 8B.3 Done, and what the recipient rule turned out to be

Four departments produce now, each following one shape — an `announce…` helper next
to the write, best-effort (the thing already happened, so failing to announce it
must never fail the write), with three guards baked in: **never a self-assignment**
(being handed your own work is not news), **never a no-op** (an edit that did not
change the assignee must not re-ring the holder), and **never an un-assignment**
(clearing a field has nobody to tell). What shipped:

| Producer | Fires | Recipient | Type |
|---|---|---|---|
| `tasks.createTask` / `updateTask` | a task is assigned or reassigned | the assignee | `taskAssigned` |
| `hr.requestVacation` | a request is left Pending | everyone holding `hr.vacations.approve` | `leaveRequested` |
| `hr.decideVacation` | a manager approves/declines | the person who **asked** (not the manager who filed it) | `leaveDecided` |
| `projects.openProject` / `updateProject` | a project gets a manager | the manager | `projectAssigned` |
| `inventory.receiveOrder` | an order is received **in full** | whoever raised the PO (not the storekeeper) | `purchaseReceived` |
| `tasks.decideTask` | an approval completes, or an authority withdraws | whoever raised it | `approvalDecided` |

The vacation pair is the whole of Nova's scenario (§8A.3): someone in Sales asks,
an approver decides, and the asker hears the outcome without refreshing anything —
end-to-end, and asserted that way in the suite.

**A guard was added to catch the next gap.** Gate A block 7 fails the build if any
`NOTIFY.*` type has no producer, with `mention` and `peopleChanged` on a named
allow-list — the two still declared-but-unproduced, now on the record rather than
silently missing. `taskAssigned` was exactly that kind of silent gap for a year.

**What remains**, and why each waits: the *approval given/refused* and *RFQ/quotation*
producers sit in the Sales→Technical chain (`business-logic`'s domain, and best done
with that agent); the *delivery issued* and *stock below reorder* producers are more
Inventory; and the two **time-driven** ones — overdue invoices, expiring
documents/permits — are not events and need the cron (`devops` + a sweep), which is
its own piece of work.

Two of these — overdue invoices and expiring documents — are **not events at all**.
Nothing happens on the day an invoice goes overdue; time simply passes. They need a
daily sweep, and `api/cron/year-rollover` shows the shape one takes here.

**Three gaps beyond the producers**, each a decision rather than a bug:

- **Delivery needs the studio open.** `LiveProvider` mounts in the studio shell, so
  a notification for studio A does not reach somebody sitting in studio B or on
  `/account`. `/super` has its own stream on `CH.super`.
- **Nothing is delivered outside the tab.** No web push, no service worker, and a
  notification does not email — `platform/notify/email.ts` exists but is wired to
  OTP and password flows, not to this.
- **There is no digest.** Somebody away for a day comes back to a list, not a
  summary.

**Step 11a of §9 is the producers**, and §10 decision 12 is how far they go.

---

## 9. Sequence

Thirteen steps. Each one is shippable and each one ends green.

| Step | What | Why here |
|---|---|---|
| 0 | **The i18n frame**: studio locale source (§8.1), `dir` on the shells, the Arabic glossary, `stylis-plugin-rtl` | Every string written after this point is written once. Doing it later means writing the dashboards twice |
| 1 | ✅ Split the studio's departments into per-screen chunks; skeleton while each loads | Pays for everything after it. **Done — 307→197 KB gz, the ceiling is 250 now** |
| 2 | ✅ Promote `charts/` and `motion/` into shared, TypeScript; the charts take a direction | Two folders, immediately reusable. **Done — see §9.2 for what it actually cost** |
| 3 | **The login page** (§8.5) + the landing's language button (§8.3) | Small, contained, and it proves the motion kit outside the landing before the studio depends on it |
| 4 | `dashboard/` primitives + `registry.ts` + `analyticsLevelOf` | The pattern, proven on one page |
| 5 | **Technical and Sales dashboards** | Their analytics are already written and unused — fastest proof |
| 6 | **Finance 1a** — AR, aging, P&L, project margin | Real value with no schema change |
| 7 | The remaining eight department dashboards | Repetition of a settled pattern |
| 8 | Techniques 1–5, 7, 9 across the shells | Motion after the layout it moves |
| 9 | ✅ **Dates**: fixed the mm/dd/yyyy bug, consolidated the studio's duplicate formatter, added Western-digit Arabic + a Gate-A rule (§8.4) | **Done — see §8.4** |
| 10 | `/super` and `/account` rewire; **placeholder sweep** | The mock data goes when there is real data to replace it |
| 11 | **The ERP documentation** (§8.6), generated where it can be | Written against screens that have stopped changing, or it is wrong on arrival — and it is Nova's corpus |
| 11a | 🟡 **Notification producers** — Tasks (assign + approval), HR (both halves), Projects, Inventory done; RFQ/quotation (Sales↔Technical) and the time-driven crons remain | Six producers live. **See §8B** |
| 11b | **Nova** — head, panel, and answering from the documentation (§8A) | Useful, and risks nothing. Capabilities 2 and 3 wait on the model decision |
| 12 | **Finance 1b** — AP, GL, FA — *if approved* | Backend work; last, and separately |
| 13 | **Nova capabilities 2 and 3** — reads its studio, raises and routes requests | Writes. Last, behind a confirmation step and a model decision |

Technique 6 (scrollytelling) lands with step 6, since Finance is the first
deep-dive. Technique 8 (Nova) lands with step 8 as chrome only.

### 9.1 Step 1: the split, and what it actually was

NOT route segments — one `dynamic()` per department on the existing catch-all.
The studio is a single page (`app/studio/[[...segments]]/page.js`): the proxy
rewrites `/<slug>/…` onto it and a switch at the bottom picks a department.
Real folder segments would have meant thirteen copies of that resolution — the
slug lookup, the membership gate, the questionnaire redirect, the visibility
filter — and the plan's own Rule 1 (do not touch the studio's structural
backend) argues against it. `nextDynamic()` gets the same chunk-per-screen with
none of that: the switch is unchanged, each screen fetches when the switch
reaches it.

- **307 → 197 KB gz** on the largest chunk — the number every studio route pays.
  The twenty-odd department screens were static imports on that one page, so a
  Sales-only tenant downloaded Projects, Inventory, Operations, HR, Finance,
  Tasks and both viewers too. The bundle ceiling is **250** now, and the total
  went *up* 12 KB in the same commit — twenty chunk headers where there was one —
  which is what the two ceilings exist to tell apart.
- **The name collision.** A page cannot `import dynamic` and also
  `export const dynamic = "force-dynamic"` — same binding, and it is a build
  error, not a warning. Imported as `nextDynamic`; the fix is always the import,
  never the export, or the studio silently goes static.
- **The skeleton is the other half.** A split screen suspends while its chunk
  arrives, and without a placeholder the shell renders around a hole — nav and
  header stay, the middle goes white, which reads as broken rather than loading.
  `ScreenSkeleton` reserves the shape a department page actually has (title, a
  row of figures, a chart, a table) so the real screen lands where it stood. The
  four full-screen screens that render *outside* the shell keep the default of
  nothing — there is no content box to hold yet, so the previous page stays.
- **UNVERIFIED ON SCREEN.** Signing into the sandbox needs an emailed OTP the
  sandbox cannot send, and recovering the code programmatically is exactly what
  the environment's guardrail stops — rightly. So the split is verified by
  build, bundle budget and both typecheck configs, and the rendered studio is
  not. This is the standing gap the CLAUDE.md sandbox note describes.

### 9.2 What step 2 turned out to involve

Billed as "no behaviour change", and the code movement was. Four things came with
it that the one-line description did not anticipate, all of them the same shape:
**a component moves, and the things it silently depended on do not.**

**The tokens.** `charts.js` drew with `--ad-chart-1..5`, `--ad-border`,
`--ad-muted` and `--ad-muted-foreground`. Every one of those is declared *inside*
`.admindek`, and `super.css` is imported by `/super/layout.js` alone — so the
same component in a studio screen resolves all five series to nothing. The ramp
is now `--chart-1..5` on `:root`, aliasing the `--doc-*` channels the semantic
layer already had, and `--ad-chart-*` aliases *that*. One definition; `/super`
unchanged.

**The utility classes.** `ChartSkeleton` and `BarList` use `.ad-skel` and
`.ad-num`, also console-only. A skeleton with no `.skel` rule is an invisible box
of the correct size — a card that reads as *empty* rather than as *loading*, which
is precisely the failure the skeleton was written to prevent. Both moved to
`globals.css` and lost the prefix: `.num`, `.skel`, `.skel-text`, `.skel-circle`,
`@keyframes skel-sweep`. 119 call sites renamed. `ad-` named a design system the
studio is not part of.

**The direction.** `ChartFrame` lays its x-axis labels out in a CSS grid, and a
grid *already* reverses under `dir="rtl"` — so in an Arabic studio the labels
would have run right-to-left over a line that still ran left-to-right, each
pointing at the other's data. That is worse than not mirroring. `AreaChart` and
`BarChart` now take `rtl`, which reflects the x mapping; `BarChart` also re-seats
the bars *within* each group, or a grouped chart would swap its series against
its own legend.

**The library.** This is the one with a price on it. `CountUp` lived in
`components/landing/ui`, driven by `motion/react` — ~30 KB gzipped, and today
confined entirely to `components/landing/**`, which is the only reason the
studio's chunk does not carry it. Every department dashboard wants a rolling KPI
figure. One import from a studio card and every studio route pays for the
landing's animation library. So the shared `CountUp` is hand-driven — a
`requestAnimationFrame` loop and a cubic-bezier sampler — and the landing now
uses that one too, which removed a duplicate rather than adding one. Gate A holds
the line: `motion/react` may not be imported outside `components/landing/`.

Two things fell out of doing it:

- **A re-export creates no local binding.** `landing/lib/motion.js` had its two
  curves replaced with `export { EASE_OUT_EXPO } from …` — and `fadeUp`, four
  lines below, eases with it. The build passed; the landing threw
  `EASE_OUT_EXPO is not defined` on load. A `.js` file has no type checker, and
  this is the argument for step 8 converting these files rather than editing them.
- **The browser pane cannot verify an animation at all.** It never composites, so
  `requestAnimationFrame` never fires and `IntersectionObserver` never delivers —
  a count-up observed there is indistinguishable from a broken one. `CountUp`
  server-renders its *final* value for that reason (it is also what a crawler and
  a reader with scripting off should see), and the easing is asserted
  arithmetically in Gate A instead: pinned at both ends, monotonic, and measurably
  ahead of linear at t=0.25 — which is the check that catches a solver quietly
  falling back to a straight line.

**Step 0 is not optional and it is not a formality.** §2.4 and §3 name well over a
hundred widget titles, axis labels, empty states and locked-card teasers. Every one
of them is a string. Writing them as English literals and extracting them in step 11
is doing the largest piece of work in this plan twice.

**What keeps it honest.** The bundle budget fails the build if the largest chunk
crosses 400 KB — step 1 should *lower* it, and the ceiling comes down with it. The
139 golden responses fail if any API body changes, which is the guarantee that a
frontend overhaul stays a frontend overhaul. Every `derive.ts` function gets a unit
test with a worked example. No step lands red.

---

## 10. Decisions — answered 22/08/2026

| # | Question | Answer |
|---|---|---|
| 1 | Finance 1b — AP, GL, FA | **Yes.** Build it |
| 2 | How much of a ledger | **Full double-entry.** Chart of accounts, journal, trial balance |
| 3 | The five surplus `/super` dashboards | **Delete them.** Keep revenue, adoption, support |
| 4 | A new chart library | See §10.1 — the honest version of my answer |
| 5 | Nova's placement | **Beside the chat button, same alignment.** The panel expands upward from the button like the chat box, and **only one may be open at a time** |
| 6 | `/account` | **Leave the routing.** Rewrite Security against real data, and research what account settings are missing (§10.2) |
| 7 | Studio language | **Per tenant**, with a language button |
| 8 | Arabic digits | **The user's own choice, in account settings** |
| 9 | Documentation language | **English first, Arabic after** |
| 10 | The Arabic glossary | **Reviewed after** the first pass |
| 11 | Nova's model | Deferred. **Pre-built buttons are valid and are the first build** — see §10.3 |
| 12 | How far the producers go | Widened — see §8B.2 |

### 10.1 The chart library — the honest answer

The question was whether I researched alternatives or merely found what we had, and
the honest answer is: **I found ours first, and I did not survey the field.**

What I did establish, and stand behind: the existing kit covers area, line, bar,
stacked bar, bar-list, donut, radial and sparkline; it renders on the server, costs
zero client JavaScript, themes off the same CSS tokens as everything else, and
already ships a matching skeleton. Against a budget with 95 KB of headroom, and a
plan whose first step is *reducing* the shared chunk, a library that hydrates on the
client is a poor trade for shapes we can already draw.

What I did **not** do is check whether anything on the §2.4 list is beyond it. Three
are: the **P&L waterfall**, the **depreciation schedule with a projected tail**, and
the **cash in-vs-out overlay with a running balance**. Each is a variation on paths
the kit already emits, and my estimate is a day for the three — but that is an
estimate, not a survey.

So the recommendation stands and the reasoning is now stated properly: **extend the
kit, and revisit only if a specific widget defeats it.** If you would rather I
actually survey the field before that is settled, say so and I will — the candidates
worth measuring are Recharts, visx and uPlot, on bundle cost, server rendering,
RTL and token theming.

### 10.2 `/account` — what to research

Routing stays. Security is rewritten against real data. The open question is what
else belongs there, and it is a real gap: the account hub is one 932-line component
covering personal info, the questionnaire, studios and devices — and the product has
grown past it. Candidates to research and bring back for approval: notification
preferences (which of §8B.2's list reach email, and a digest cadence), language and
number-format choice (decisions 7 and 8), the session and device list, sign-in
history, data export, account closure, and which studio opens by default.

### 10.3 Nova without a model

Confirmed as the first build, and it is stronger than it sounds. A guided tree —
**Human Resources → Request vacation → from when to when** — needs no model at all:
the branches are the departments, the leaves are the typed tasks that already exist
in `TASK_TYPE_AUTHORITIES`, and the form is the same one the screen renders.

It is also the safer product. Every path is one somebody designed, every request is
shown before it is raised, and there is no sentence to misread. Free-text intent
becomes an *addition* to a working assistant rather than the thing it depends on —
and if the model decision is never taken, Nova still works.

## 11. What this does not change

The backend, on the 1a path: no new collection, no new key builder, no cascade
change, no permission key, no API response body. `derive.ts` reads what
`/api/studios/<slug>/finance` already returns.

And nothing in here relaxes an invariant. Keys are still built only in
`platform/db/keys.ts`. Membership still authorises. Access is still resolved once.
A locked widget is a permission answer, not a hidden one — `canViewDashboard`
already exists and still decides whether the page opens at all.
