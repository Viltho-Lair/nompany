# Wave 4 — Dashboards, Finance, and Motion

**Brief (22/08/2026):** redesign and rewire the UI/UX of `/super`, `/{locale}/account`
and the studio. Rebuild Finance around AP / AR / GL / FA. Turn every department page
into a data-dense dashboard. Port nine animation techniques from the marketing site.

This document is the **research and proposal**. Nothing in it is built. It exists to
be argued with, and section 10 is the list of decisions that have to land before
any of it becomes code.

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
is the larger half of it. The shells are well made; the data is invented. Deciding
which of the eight dashboards nompany actually needs is a product decision, not a
frontend one — see §10.

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
  needs an explicit yes.

If the answer to 1b is no, Finance still gets a real dashboard; it gets AR and P&L
rather than the full four pillars, and the AP/GL/FA panels render as "not yet
tracked" rather than as invented numbers.

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
| 8 | `Nova` in the studio top bar, breathing loop, opening an "AI Insights" panel — **the panel is a later phase and must not ship a fake insight** |
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

### 8.4 Dates — the number is smaller than the memory of it

Surveyed rather than assumed: **17** raw `toLocaleDateString` calls outside
`lib/format.js`. Of those, **15 hard-code `"en-GB"`** — so they already render
dd/mm/yyyy and are wrong only in that they bypass the studio's configured locale.

**One is genuinely broken**: `StudioSettings.js:489` calls `toLocaleDateString()`
with no locale at all, so the FX "rates as of" line renders mm/dd/yyyy in a US
browser. That one is a bug, not a style drift.

The rest are `toLocaleString` and `toLocaleTimeString` — timestamps and numbers,
mostly in `/super`'s template pages, which the placeholder sweep removes anyway.

The rule stands and should be lint-enforced: **every date renders through `fmtDate`
/ `fmtDateTime`**, which resolve the studio's locale and default to `en-GB` →
dd/mm/yyyy. Arabic adds a wrinkle worth deciding now: Arabic locales default to
Arabic-Indic digits (٢٢/٠٨/٢٠٢٦). For an ERP, Western digits in Arabic text are
usually the right call — `ar-SA-u-nu-latn` — and `fmtDate` is the one place to make
that decision.

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

## 9. Sequence

Thirteen steps. Each one is shippable and each one ends green.

| Step | What | Why here |
|---|---|---|
| 0 | **The i18n frame**: studio locale source (§8.1), `dir` on the shells, the Arabic glossary, `stylis-plugin-rtl` | Every string written after this point is written once. Doing it later means writing the dashboards twice |
| 1 | Split the studio into route segments; add `loading.tsx` | Pays for everything after it; the 305 KB chunk is the constraint |
| 2 | Promote `charts/` and `motion/` into shared, TypeScript; `Frame` takes a direction | Two folders, no behaviour change, immediately reusable |
| 3 | **The login page** (§8.5) + the landing's language button (§8.3) | Small, contained, and it proves the motion kit outside the landing before the studio depends on it |
| 4 | `dashboard/` primitives + `registry.ts` + `analyticsLevelOf` | The pattern, proven on one page |
| 5 | **Technical and Sales dashboards** | Their analytics are already written and unused — fastest proof |
| 6 | **Finance 1a** — AR, aging, P&L, project margin | Real value with no schema change |
| 7 | The remaining eight department dashboards | Repetition of a settled pattern |
| 8 | Techniques 1–5, 7, 9 across the shells | Motion after the layout it moves |
| 9 | **Dates**: fix `StudioSettings.js:489`, route the other 16 through `fmtDate`, add the lint rule, settle Arabic digits (§8.4) | Cheap, and it wants doing after the screens have stopped moving |
| 10 | `/super` and `/account` rewire; **placeholder sweep** | The mock data goes when there is real data to replace it |
| 11 | **The ERP documentation** (§8.6), generated where it can be | Written against screens that have stopped changing, or it is wrong on arrival |
| 12 | **Finance 1b** — AP, GL, FA — *if approved* | Backend work; last, and separately |

Technique 6 (scrollytelling) lands with step 6, since Finance is the first
deep-dive. Technique 8 (Nova) lands with step 8 as chrome only.

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

## 10. Decisions needed before any of this is code

1. **Finance 1b — yes or no?** AP, GL and FA need new records, new sections and new
   permissions. That is backend work, and Rule 1 says not to do it. 1a is a real
   Finance dashboard without it. Which?

2. **How much of a ledger?** If 1b is yes: a *real* double-entry GL with a chart of
   accounts is a significant module and changes how invoices and bills post. A
   *summary* GL — income vs expense by account category, no double entry — is a
   quarter of the work and covers what the brief's "high-level income vs expenses,
   journal entry summaries" actually asks for. Full or summary?

3. **The eight `/super` dashboards.** `crm`, `ecommerce`, `marketing`, `saas`,
   `project`, `hr`, `finance`, `analytics` are template pages with invented data.
   nompany's own console plausibly needs three: **platform revenue** (studios,
   packages, tiers, MRR), **adoption** (sign-ups, active studios, module usage,
   traffic) and **support** (chat load, response time, open issues). Delete the
   other five, or keep them as shells to be wired later?

4. **Charts: confirm no new library.** The existing SVG kit is 0 KB, server-rendered
   and already themed. Recharts or Nivo would cost ~100 KB gzipped against a budget
   with 95 KB of headroom, and would hydrate on the client. My recommendation is to
   extend the kit. Agreed?

5. **Nova's panel.** A breathing icon in the top bar is chrome and is safe. An "AI
   Insights" panel implies insights, and we have no model wired. Ship the icon now
   with the panel showing genuinely-derived observations ("three invoices crossed 60
   days this week"), or hold the whole thing until there is something behind it?

6. **`/account`.** Worth the same treatment, or is it a smaller job — tidy the
   932-line component, rewrite the Security tab against real data, and leave the
   routing alone?

7. **Where a studio's language comes from.** The proposal is the user's profile
   `language` — which already exists and is already written at signup — with a
   per-studio override on the Collaborator row. The alternative is a studio-wide
   setting that everybody in that tenant shares. Which? (Not a URL segment: the slug
   is the address.)

8. **Arabic numerals.** In Arabic, dates and money default to Arabic-Indic digits
   (٢٢/٠٨/٢٠٢٦, ١٬٢٥٠٫٠٠). For an ERP the usual call is Western digits inside
   Arabic text — `ar-SA-u-nu-latn`. Confirm, and it is decided once inside
   `fmtDate`/`fmtMoney` rather than per screen.

9. **The documentation's home and language.** A docs site, or in-app contextual help
   beside the screens it describes? And bilingual from the start, or English first
   with Arabic following? An English-only manual for an Arabic operator is half a
   manual.

10. **Translation ownership.** I can produce the English strings and a first Arabic
    pass, but domain Arabic — "الذمم المدينة" for accounts receivable, not a
    transliteration — should be reviewed by somebody who works in it. Do you want to
    review the ~200-term glossary before the bulk extraction, or after?

---

## 11. What this does not change

The backend, on the 1a path: no new collection, no new key builder, no cascade
change, no permission key, no API response body. `derive.ts` reads what
`/api/studios/<slug>/finance` already returns.

And nothing in here relaxes an invariant. Keys are still built only in
`platform/db/keys.ts`. Membership still authorises. Access is still resolved once.
A locked widget is a permission answer, not a hidden one — `canViewDashboard`
already exists and still decides whether the page opens at all.
