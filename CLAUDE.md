# nompany — working notes

Multi-tenant ERP. Next.js 16 · React 19 · Redis · Tailwind v3 + shadcn/ui + MUI v9 · Vercel.
Three surfaces in one app: the tenant ERP at `nompany.com/<slug>/…` (rewritten by
`src/proxy.js` → `src/app/studio`), account pages at `/{en,ar}/…`, and nompany's own
console at `/super`. **Fifteen sections** (the blueprint's), plus Main and Tasks, which are
not sections — Main is the home surface and Tasks is a cross-cutting control: CRM & Sales,
Tendering & Estimating, Projects, Engineering & Documents, Procurement & Subcontracting,
Inventory & Warehouse, Manufacturing & Production, Field Operations & Service, Logistics &
Fleet, Assets & Equipment, Quality & HSE, Human Resources, Finance & Accounting, Reports &
BI, Administration & Settings.

Four of those are declared and **render nothing yet** — Manufacturing, Assets,
Reports and Quality & HSE. (Tendering was the fifth until its register landed.) They are listed in `NO_SCREEN_YET` (`platform/access/resolve.ts`)
and are hidden from the sidebar rather than shown empty, and they hold no permission areas:
a right nothing can exercise is a bug (invariant 16). Adding a screen means removing its
entry there, and a test refuses any section that has neither a right nor a declaration.
**`administration-master` is in that list too and is the only CHILD in it** — Master data has
no screen; its three siblings left when Administration was folded (see Current state).

**What each thing does is written down: `docs/functionality/`, one file per system
functionality.** Read the one file you need and start — do not re-derive it from the code,
and do not read the whole folder. Every file ends with "Not built yet", stated in words,
because a silent gap reads as a finished feature. When you change behaviour, update that
file in the same commit.

Full detail lives in `docs/` — architecture, audit, and the wave plan. This file is
only what must be true in every session.

---

## The invariants

Each of these exists because a real failure produced it. Breaking one is a bug even
when the code looks cleaner afterwards.

1. **Keys are built only in `src/platform/db/keys.ts`.** Never a literal, never a
   template at a call site. Two incidents came from this: `sweepOrphans` reaped
   bare `u:`/`s:` prefixes and would have prefix-deleted production, and
   `lib/media.js` wrote its blob key from a literal so the test suite put real
   blobs in the live key space. The suite asserts every builder is namespaced — a
   new builder is covered automatically, a new literal is the third incident.
2. **Membership authorises; the URL never does.** A slug names a tenant, and a slug
   is a **public address** — `requestJoinByCode` exists precisely so somebody can
   type one they were told, so existence is discoverable by design and 403-vs-404
   is not a leak. What a non-member learns is **nothing about the contents**: not a
   row, not a name, not a count, not a section. Never widen that from "contents" to
   "existence" — this text used to claim both rendered identically, three places in
   the code disagreed with it, and the code was right.
3. **Access is resolved once**, in `effectivePermissions` (`src/platform/access/resolve.ts`), and
   every module context is built on `studioContext`. No route re-derives it.
4. **Default deny.** No role means nothing. There is no fallback path.
5. **Nobody grants what they do not hold** — `escalates()`, enforced at **both** doors:
   the People screen and join-request approval.
6. **CollaboratorID is the identity inside a studio**, never UserID. Notifications,
   signatures and assignments are addressed to CollaboratorIDs.
7. **Reviewer ≠ approver** on any signable. Enforced at the transition, not in the
   permission model — holding both rights is legitimate, using both on one record is
   not.
8. **Writes go through `editArr`/`editJSON`** (compare-and-set). No blind whole-
   collection write; there is deliberately no `writeCol`. `updateRow` takes a
   **function** patch so "flip this field" stays a flip under contention.
9. **Backoff is small and flat, not exponential.** Every contended round has one
   winner, so N writers need N rounds — a queue draining. Exponential backoff would
   idle the key while writers that could progress waited.
10. **Reference numbers only move forward.** `bumpCounter(key, field, floor)` is
    self-seeding; deleting the newest invoice must not let the next create reissue a
    number a client holds.
11. **Deletion is children-first, registry-last**, and only through `cascade.js`, so a
    crashed cascade is idempotent on re-run.
12. **The stream is truth; pub/sub is a doorbell.** `XADD` strictly before `publish` —
    the id is the client's cursor. `Last-Event-ID` replay is what makes polling-free
    safe.
13. **One Redis subscriber connection per process**, fan-out in memory. Connection
    count is this deployment's hard ceiling and cannot be raised.
14. **One `EventSource` per tab**, not per hook — browsers cap 6 per domain and
    `useLiveUpdates` has 21 call sites.
15. **Cron fails closed.** A missing `CRON_SECRET` refuses; it never opens the door.
16. **A right nothing can exercise is a bug.**
17. **No database is destroyed without two confirmations.** Every store is live and
    shared — Redis now, Postgres (Cloud SQL for PostgreSQL 18) next — so a delete, flush, drop or mass-overwrite
    is unrecoverable and hits every tenant at once. A broad-scan delete
    (`delPrefix("")` / `scanPrefix("")`) once wiped the whole instance. So any such
    action waits on the user confirming it **twice in the same exchange**: the first
    answer authorises the plan, the second — asked back with the exact scope spelled
    out — authorises the run. `FLUSHDB`/`FLUSHALL`/`SCRIPT FLUSH`/`CONFIG SET`, an
    empty-or-unbounded prefix, and `sweepOrphans()` from a test or script are never
    run at all. When a twice-confirmed deletion does proceed: export first, delete by
    an explicit key list, re-scan to prove it. Verification stays read-only by
    default. (Rule 7 in every `.claude/agents/*.md` says the same.)

---

<!-- Commented out on 29/08/2026 — the agent team is disabled. The ten briefs in
     `.claude/agents/` are commented out too, so no agent is defined. Delete this
     wrapper and theirs to bring them back.

## The agent team

Ten agents in `.claude/agents/`. Each file carries the same **Rules** section —
byte-identical in all ten, so edit it in all ten or not at all — and then its own
domain notes, a **Do not** list and a **Constraint log**. The files were rebuilt
short on 28/08/2026 (3,641 lines → 1,525): the shared block went from 155 lines to
34, and everything `CLAUDE.md` already says was cut from all ten rather than
restated ten times. A brief that takes longer to read than the task takes to do is
the thing that was wrong.

| Agent | Owns |
|---|---|
| `orchestrator` | Sequencing, handoffs, and the **global Do-Not list** |
| `researcher` | New ideas, provider and library evaluation, the **decision ledger** |
| `frontend-ui` | Components, component state, tokens, skeletons, the Electron task-bar |
| `business-logic` | Sales→quotation chain, approvals, `platform/relations`, signables |
| `backend-db` | `src/platform/db/**` and `src/lib/data/**`, keys, cascade, the repository seam, the SQL migration |
| `operations-integration` | HR, Finance, Inventory, Operations, and what an external payload *means* to a record |
| `devops` | CI, deploys, environments, secrets, crons, and the *wiring* of external services |
| `qa-security` | Tests, permission matrix, tenant-bleed proofs, hop counts. Read-only over `src/**` |
| `data-scientist` | KPIs, rollups, the numbers behind the charts — analytics is paid and tiered |
| `seo-improver` | Public metadata, sitemaps, hreflang, structured data. Never the studio or `/super` |

**`operations-integration` and `devops` were one agent, and it was two-headed by
accident.** The record departments stayed whole; the pipeline moved out. The seam:
`devops` provisions the credential, the schedule, the timeout and the retry;
`operations-integration` decides what the response does to a shipment, an invoice or
a cost. A carrier integration runs `researcher` → `devops` → `operations-integration`,
in that order, never concurrently on one file.

The rules that bind everyone: **match effort to the task** — most requests are one file
and one rule, and the full sweep is for work that crosses modules; find it in the code
before asking; consult `researcher` before adopting anything new; never duplicate, and
trace every dependant before removing; verify and report against the acceptance
criteria; log constraints — major ones to `orchestrator`'s global list, minor ones to
your own file; two confirmations before any destructive database action; and end with a
question only when the answer changes what happens next.

---
-->

## Where the code lives

Wave 3 is moving `src/lib` apart, one folder per step, and each folder becomes
TypeScript as it lands. What has moved has moved for good:

| Folder | Holds | State |
|---|---|---|
| `src/shared/**` | Pure values with no dependants — currencies, countries, i18n, slug | TypeScript |
| `src/platform/access/**` | The permission catalogue and the resolver | TypeScript |
| `src/platform/db/**` | Everything that knows Redis or Postgres exists — keys, store, cascade, repo, sections, `pg.ts` | TypeScript |
| `src/platform/auth/**` | Identity, the console's own auth, passwords, OTP, devices, rate limits | JavaScript |
| `src/platform/realtime/**` | The event stream, the pub/sub bus, live patches | JavaScript |
| `src/platform/notify/**` | Notifications and email | JavaScript |
| `src/platform/http/**` | The route wrapper, the status table, idempotency, audit, observability | JavaScript |
| `src/modules/<name>/**` | The twelve departments, one folder each | JavaScript |
| `src/lib/**` | What has not been assigned yet — chat, media, the catalogue, presentation helpers | JavaScript |

Two rules that came out of doing it:

- **Siblings import each other relatively** (`./keys`), never through the alias.
  A folder's internals routing through its own public door is how a module ends
  up importing itself once a barrel exists.
- **A barrel is a judgement call, not a habit.** `platform/access` has one,
  because nothing in it touches Redis and a client component may safely import
  any of it. `platform/db` deliberately has none: `store` imports `redis`, which
  opens a connection, and a landing-page component already imports a key builder.

**Constraint-log and Do-Not-list dates are `dd/mm/yyyy`.** Always, in every agent
file. (`docs/` keeps ISO dates; the logs do not.)

---

## Working against the live Redis

`REDIS_URL` is a **live, shared** Redis Cloud instance. There is no dev database.

- Tests run under `NOMPANY_KEY_PREFIX` and sweep that namespace at the end. CI gets
  an ephemeral `redis:8` container instead, so the prefix is the second line of
  defence there and the only one locally.
- **Never call `sweepOrphans()` from a test.** The suite shares one Redis with
  production, so a test that ran it to prove it safe would be the thing it guards
  against — and would fire hardest when the fix was absent. Its two guards are pure
  values (`SWEEP_SCOPES`, `sweepRefusal`) precisely so they assert without a `DEL`.
- **Never** `FLUSHDB`, `FLUSHALL`, `SCRIPT FLUSH`, `CONFIG SET`.
- Before deleting anything live: export, delete by **explicit key list**, re-scan to
  prove the result.
- The connection drops occasionally and self-heals via `redis.js`. Pre-existing.
- **Gotcha:** a JS template literal normalises CRLF→LF at parse time. Files here are
  CRLF on disk, so an embedded Lua script has LF endings at runtime — a SHA-1 taken
  over the on-disk text will never match what Redis cached.

---

## Working against the live Postgres

`DATABASE_URL` is **equally live and shared** — the P1 store swap's `collection_rows`
table lives in the same real, shared database production will use, there is no dev
database here either, and **`NOMPANY_KEY_PREFIX` does NOT protect it.** The prefix is a
Redis-only mechanism: it namespaces a key string, and `collection_rows` has no such
string to namespace — `tenant_id` there is a real studio id, exactly what a live tenant
also uses. A developer who assumes the prefix sandboxes them the way it does for Redis is
one command away from writing to the real table. This is why `tests/pg-sweep.mjs` deletes
by an **explicit id list** read back from the run's own `REG.studios`, never a predicate,
and why `withTenant` is the only door onto the table at all (RLS is FORCED, so nothing can
even discover which tenants hold rows without one already in hand).

- **`npm run test:parity` (and CI's `NOMPANY_DB=parity` step) write real rows.** Every
  fixture `tests/pg-parity.mjs` creates is either a synthetic tenant id the test deletes
  in its own `finally` block, or one of the studios the integration suite / Gate A create
  for real — those are swept via `sweepPgTenants` using the exact ids `REG.studios`
  names, the same invariant-17 shape as the Redis sweep, and it must run **before** the
  Redis `delPrefix` that would otherwise erase that id list.
- Locally, `DATABASE_URL` lives in `.env.local`, same as `REDIS_URL`. If it is unset,
  `tests/pg-parity.mjs`'s assertions skip **loudly** (a banner, plus a per-test "skipped"
  line) rather than the whole suite dying mid-run — but that also means the Postgres
  paths are **not verified** on that run. CI always sets `DATABASE_URL`, so there the
  absence of it is a real failure, not a skip.
- CI connects as a dedicated **non-superuser** role (`ci_app`, `rolsuper=false`,
  `rolbypassrls=false`) rather than the `postgres:18` image's bootstrap superuser — a
  superuser bypasses row-level security entirely, which would make every RLS test pass
  for a reason that does not hold in production. `.github/workflows/ci.yml` asserts the
  role's shape as its own step.
- **Never** `DROP TABLE`, `TRUNCATE`, `DROP DATABASE`, or disable/alter the RLS policy on
  `collection_rows` — `pgSchemaQuery`'s DDL-only door refuses all of these unconditionally
  (invariant 17), so reaching for them even by accident fails before Postgres is asked.
- `payload` is `json`, never `jsonb` — `jsonb` normalises key order and the golden
  responses pin it. Do not "fix" this column type.

---

## Verification — every change, no exceptions

```bash
npm test            # access rules, integration suite, Gate A — real routes, real Redis, prefixed namespace
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.strict.json   # converted folders, with noImplicitAny
npx next build
```

CI (`.github/workflows/ci.yml`) runs all three plus `scripts/bundle-budget.mjs` on
every push to `main` and every pull request.

- **`git add` a new file BEFORE you believe a green suite.** The architectural
  assertions in `tests/restructure.mjs` shell out to `git grep`, which searches TRACKED
  files only — so a brand-new screen or module is invisible to them, the suite passes
  locally, and the identical tree fails in CI the moment it is committed. This cost a red
  build on the pipeline board.
- **Golden responses are the contract.** If a response body changes, the change is
  wrong until deliberately re-recorded in its own commit with a stated reason.
  `NOMPANY_RECORD_GOLDENS` is never set in CI.
- **Hop counts are part of the contract.** A route regressing from 2 Redis round trips
  to 8 fails the build.
- **The bundle budget pins the regression, not the size.** Two gates, and the
  first is the one that matters: the LARGEST CHUNK is 158 KB gz against a 250 KB
  ceiling, because that is what every route pays. Total client JS is 1612 KB gz
  against 1620 KB, which catches sprawl rather than splitting. **This line said
  1593 against 1600 and BOTH halves were wrong**: the script's constant was 1700,
  never lowered — the commit that claimed to lower it wrote the comment and left
  the number — so the real gate was a hundred kilobytes slacker than this file,
  the script's own comment and everybody reading either. Corrected in both places
  on 04/09/2026, to the measured total plus a deliberate nine. The studio’s
  department screens are `nextDynamic()` now — the chunk fell from 307 to 197 and
  the total rose 12 KB in the same commit, which is the two ceilings doing their
  job. The total came down 1659 → 1559 when jsPDF stopped shipping html2canvas
  and canvg, which it only needs for `doc.html()` and SVG and which nothing ever
  loaded; the ceiling came down with it. Lower the chunk ceiling further as the
  screens are rewritten. (This line said 1091/1200, then 305/400, then 1529/1600,
  as the script moved on — a stale number in the invariants file is worse than
  none.) 1559 → 1562 with the vendor CSV import: a dependency-free reader and a
  dialog, which is what NOT taking `xlsx` (~400 KB gz) buys. 1562 → 1566 with
  Nova's speech bubble — four of those kilobytes are its twenty sentences in two
  languages, which is the price of translating on DISPLAY rather than shipping
  prose from an API. 1566 → 1568 when the planner and the sheet viewer
  started importing the dictionaries they were already reading — three screens
  shipped with an UNBOUND `tr`, which is a runtime ReferenceError and not a
  build error, so `no-undef` is on for the untyped browser files now.
  1568 → 1570 across the media→Blob port. `@vercel/blob` is server-only and
  ships nothing to a browser; what moved is `keys.ts`, which a landing-page
  component already imports (the reason `platform/db` deliberately has no
  barrel) and which gained `MEDIA.object`. Measured, not attributed to a single
  commit — the port landed over several. 1570 → 1571 with the template-driven
  deal screen: a flow-name line, an off-template badge, six stage icons and two
  dictionary strings in two languages. The LARGEST chunk did not move (158 KB), which
  is the gate that matters — the screen was already `nextDynamic()`. 1571 → 1574 with the flow
  editor: the seven templates, the twenty-five industries and `templateProblems`
  now ship to the browser, deliberately — a studio editing a flow is validated by
  the SAME function the server refuses with, rather than a second copy free to
  disagree about what is allowed. The largest chunk again did not move. 1574 → 1576 with the
  warning before a flow that already has work on it is changed — a deal count, a
  confirm dialog and eleven strings in two languages. 1576 → 1577 when a locked-out
  sign-in and a locked-out reset started saying how long the wait is — four strings
  in two languages and the pure function that chooses between them. 1577 → 1580 with
  the studio's loading boundary (`app/studio/loading.js`): until it existed the App
  Router had nothing to show for a `force-dynamic` page and BLOCKED the navigation —
  measured, the DOM did not change at all and the URL took 767ms to move. Three
  kilobytes bought the shell's geometry, which that file had to reproduce in full
  because with no `layout.js` a loading boundary replaces the whole studio, sidebar
  included. **1580 → 1576 when the shell became a real `layout.js`** and the boundary
  gave all of it back — it is `<ScreenSkeleton />` and nothing else now. 1576 → 1577
  with `RecordSkeleton`, the three shapes ScreenSkeleton is not: a record profile, a
  document of lines and the project board's information sidebar. A department
  skeleton on those screens reserves a chart where a document is coming, which
  makes the arrival a jump. 1577 to 1578 with the bill approval chain: nine strings
  in two languages and the block that draws how far a bill has got. 1578 → 1582 with
  the Google Calendar screen: `src/shared/calendar.ts` is a few hundred bytes of pure
  arithmetic with zero imports, plus two client components on a screen that was
  already there. 1582 → 1586 with connected calendars: a Calendars panel on the
  account screen and nineteen strings in two languages. The whole OAuth subsystem —
  both providers, the token lifecycle, the connection store — is server-only and ships
  nothing; what a browser gets is the panel. 1586 → 1587 when the Microsoft
  normaliser started converting Graph's offset-less date-times through `Intl`
  instead of copying them verbatim, plus the redirect-URI hint's two strings.
  1589 → 1593 with the planner's availability strip — thirteen strings in two
  languages, the strip itself, and `src/shared/calendar.ts` reaching a second
  bundle because the client has to clamp its request to the SAME 62-day bound
  the availability route refuses past (two copies of that number would be free
  to disagree). Both ends measured on this branch: the line above SAID 1587
  while a build of the branch before the strip landed measured 1589, so the
  headline had drifted two kilobytes behind the script — the delta is the four
  the strip actually cost, not the six the stale number would have implied.
  1597 → 1601 with the customer page, which is four kilobytes for a screen
  that adds no library at all: its thirty-two strings in two languages, and
  the page itself. It imports `modules/sales/pipeline.ts`, already in the
  bundle for the board.
  1593 → 1595 with the contracts register, 1595 → 1597 with the pipeline
  board — two screens, their strings in two languages, and
  `modules/sales/pipeline.ts`, which reaches the browser DELIBERATELY: the
  board offers a stage move only where the server would accept one, decided by
  the same function, because two copies of "a closed deal cannot be reopened"
  are two copies free to disagree. The largest chunk did not move at any
  point (158 KB), which is the gate that matters. **Measured 1593 on 04/09/2026**,
  against a headline that said 1582 — drift from somewhere between those two
  commits, NOT from the Privacy Policy that measured it: the legal documents are
  server-rendered and `grep -rl "Limited Use requirements" .next/static` finds
  nothing, before or after. Stated as measured rather than attributed, because a
  number this file cannot account for is still better than one it gets wrong.
  1612 → 1618 with the tender pack, ceiling 1620 → 1626 — six kilobytes for a
  screen that adds no library at all: about fifty strings in two languages, the
  panel, and `modules/tendering/documents.ts`, which reaches the browser
  DELIBERATELY so the screen offers a supersede only where the server would
  accept one. The largest chunk did not move (158 KB), which is the gate that
  matters — the tender page is `nextDynamic()`. 1618 → 1619 with the bid
  review, and ONE kilobyte is the point: `platform/approval` is read on the
  server and ships nothing, so what a browser gets is the review block and
  twenty-four strings. A feature does not cost what it weighs; it costs what
  crosses the wire. 1619 → 1620 with the handover, for the same reason:
  `tenderSource` is server-only, and the browser gets one panel and fifteen
  strings.
- Tests connect things — real repositories, real route handlers, **one assertion per
  bug that actually happened**. Each block names the defect it guards, so nobody
  deletes it later wondering what it was for.
- **Two sessions cannot share a test namespace.** `test_suite_` and `test_gatea_` are
  fixed, and several agent sessions work this repo at once, so a second run enters and
  sweeps the first one's fixtures — which surfaces as a wall of `forbidden` and
  `no-section` failures in whichever service was mid-call, nothing like a namespace
  problem. `tests/exclusive.mjs` now refuses the second run and names the PID holding
  it. When that happens, do not debug the failures: rerun under a namespace of your own.

```bash
NOMPANY_TEST_SESSION=<something-short> npm test
```


---

## Styling

Tailwind for layout/colour/spacing (default) · shadcn for primitives we own the source
of · MUI **only** for Data Grid, Date/Time pickers, Autocomplete.

**The cascade-layer order is load-bearing** and set in `globals.css`:

```css
@layer tw-base, tw-components, mui, tw-utilities;
```

Tailwind preflight **below** MUI, utilities **above** it. `enableCssLayer` alone is not
enough — unlayered preflight collapses MUI text fields. No `<CssBaseline />`. MUI dark
mode binds to the existing `.dark` class via `colorSchemeSelector: "class"`. Prefer
`className` over `sx`.

Bilingual EN/AR: use logical properties (`ps-`/`pe-`/`ms-`/`me-`/`border-s-`).
**The studio is bilingual, and `docs/functionality/language.md` is the file.** Which
language you get is ranked: the URL wins where there is one (`/en/…`, `/ar/…`), otherwise
the person's own choice (the `lang` cookie, written by every `LangMenu` in the product),
otherwise the studio's setting. `studioLocale` is the tenant's DEFAULT, not a ceiling —
it used to be both, and the studio was the one surface where nobody could pick their own
language.

Copy lives in `src/shared/studio/`, **one module per surface**, and **nothing may
enumerate them** — a barrel makes every department's words reachable from every screen and
the split stops paying. Screens read the language from `StudioLocaleProvider`, never a
prop. Statuses and engagement stages translate on DISPLAY only, keyed by the stored token,
so what the API returns and the goldens pin is unchanged. Anything a tenant TYPED — section
names, client names, roles, service actions — is data and is never translated.

**A Server Component cannot read the locale.** `useStudioLocale` is a client hook, and
neither `tsc` nor `next build` catches a server call to it or a `.jsx` reading an unbound
`tr` — both throw on the first request instead. Open the screen.
**MUI mirrors now.** The SHELL declares `lang`/`dir` rather than `<html>` — the root
layout never touches the database, so it cannot know a tenant's language — and an
Arabic studio nests `MuiRtlProvider`: a second Emotion cache keyed `muirtl`, with
`stylisPlugins: [prefixer, rtlPlugin]` and `enableCssLayer` still on, loaded through
`dynamic()` so an English tenant never fetches it. Everything hand-written mirrors
from the attribute alone, because logical properties are the browser's job; MUI
emits physical CSS at runtime and has to be rewritten as it is serialised.

Two traps, both paid for once: a rule anchored to `html[dir="rtl"]` never fires when
`dir` is on the shell (the studio's Arabic font rule had exactly that bug), and
`stylis-plugin-rtl` declares no `exports`, so Node's ESM loader takes the CJS `main`
and hands back the module object where a bundler takes `module` and hands back the
function.

Dates render through `fmtDate`/`fmtDateTime` in `src/lib/format.ts`, which resolves the
studio locale (`en-GB` default → **dd/mm/yyyy**). Never `toLocaleDateString()` at a call
site; roughly a dozen such calls survive and are being converged.

**Charts, numbers and skeletons are shared, and their tokens are on `:root`.**
`src/components/charts` draws with `--chart-1..5`; `.num` (tabular figures) and
`.skel`/`.skel-text`/`.skel-circle` are in `globals.css`. All of these were
`--ad-chart-*`, `.ad-num` and `.ad-skel` inside `.admindek`, which is imported by
`/super/layout.js` alone — a component carrying a console-scoped token into a studio
screen resolves it to nothing and still builds. `/super` aliases the shared ramp
rather than restating it. Gate A asserts both halves.

**`motion/react` may not be imported outside `src/components/landing/`.** It is ~30 KB
gzipped and that confinement is the only reason the studio's chunk does not carry it.
Shared motion primitives live in `src/components/motion` and are hand-driven —
`Reveal`, `CountUp`, and the house curves in `tokens.ts`, which the landing imports
back. Gate A holds the line.

**Browser-pane traps**, three of them, all paid for:

- **The pane proxies with `x-forwarded-proto: https`, so every auth cookie comes back
  `Secure` — and a browser drops a `Secure` cookie on `http://localhost`.** Silently. The
  symptom is a screen stuck on its loading state with 401s in the console while the server
  log says the login returned 307, which reads as a broken session rather than a dropped
  cookie. `requestIsHttps()` trusts that header, correctly, for production. `dev-login`
  therefore passes `false` outright rather than asking: the sandbox is only ever http on
  localhost, so there is no case where `Secure` is wanted. Also **front the tab** — a
  hidden pane would not take the cookie even once that was fixed.

- The pane does not composite unless displayed, which freezes CSS transitions, so
  `getComputedStyle` returns stale mid-transition colours. Inject
  `*{transition:none!important}` before measuring anything with `transition-colors`.
- For the same reason `requestAnimationFrame` never fires and `IntersectionObserver`
  never delivers, so **an animation cannot be observed there at all** — a working
  count-up and a broken one look identical. Assert the arithmetic instead, and have
  the component server-render its settled state so the pane is still worth looking at.

**Verifying a screen needs a session, and `npm run dev:sandbox` is how.** It sets
`NOMPANY_KEY_PREFIX` before Next starts, seeds one account and one studio, and prints
the login — `sandbox@nompany.test` at `localhost:3010/sandbox`. `npm run dev` has no
prefix and therefore *is* production. Sweep with `npm run dev:sandbox:clean`.

---

## Current state

*(Refreshed 01/09/2026, when P0 and P1 merged to `main`. Before that this section said Wave 5
(SQL) was "not started", which stopped being true the day `collection_rows` took its first
row — a stale status is worse than none.)*

**P0 and P1 are on `main`.** P0 restructured the product into the blueprint's fifteen
sections. **P1 put Postgres behind the same seam Redis already sat behind**: three modes via
`NOMPANY_DB` — `redis` (the DEFAULT, and what production runs), `postgres`, and `parity`,
which runs both and compares them as `JSON.stringify` TEXT because `payload` is `json` not
`jsonb` and key order is part of the contract. A full parity run dual-writes real rows to
Cloud SQL and finds zero disagreements, with the disagreement detector itself asserted so a
silent pass cannot masquerade as agreement.

**THE CUTOVER IS DONE. Production runs Postgres through the Cloud Run gateway, live
02/09/2026,** and it is proven by a write rather than assumed: a request to the live site
lands a row in Cloud SQL via Vercel → OIDC → STS → impersonation → Cloud Run → Cloud SQL.

**Redis is gone entirely.** No `REDIS_URL` in any Vercel environment or in `.env.local`,
nothing in `src` reads it, and nothing imports a Redis client. `DB_BACKEND` is
`NOMPANY_DB || "postgres"` and `NOMPANY_DB` is absent from production, so the default IS the
production configuration — do not read the old "absent means redis" note anywhere; it is
inverted now. Vercel still cannot reach Cloud SQL directly (zero authorized networks, private
IP on a VPC it is not in), so `PG_TRANSPORT=gateway` is load-bearing:
`services/pg-gateway/` holds the only path and shares `pg.ts`'s guards through
`sqlGuards.ts` rather than copying them.

**Four things blocked it, and every one was invisible in its own way.** Written down because
each cost a production deploy to discover:

1. **The deployment was refused for a cron.** `store-upkeep` asked for `30 * * * *`; Hobby
   allows one run per day and rejects THE WHOLE DEPLOYMENT over it. Eight pushes built green
   in CI and produced no deployment at all, which reads as a dead Git integration.
2. **The OIDC token is delivered PER REQUEST, on the `x-vercel-oidc-token` header** — not in
   `process.env`. The variable exists only during the build and in a local `vercel env pull`.
   Enabling OIDC federation therefore changed nothing observable while every request was
   already carrying the identity the code reported as missing.
3. **`run.invoker` was never granted to the service account.** The runbook's verification used
   a developer identity token, and that account holds Owner — so a 200 proved the service
   worked and said nothing about whether `pg-gateway@…` could invoke it.
4. **The database grants covered `collection_rows` only.** `documents` and `events` arrived
   later with the store swap; the IAM database user had no privileges on them, which surfaced
   as `permission denied for table documents` through the gateway.

**Redis's old data was NOT migrated.** The instance was deleted deliberately — this is a
from-zero Postgres database, registration included, and `ensureDefaultPlan()` self-seeds
packages and tiers on first use.

Cloud SQL's own Data API was evaluated for the gateway's job and **rejected: it has no bind
parameters**, and tenant-authored JSON interpolated into SQL text is an injection surface
across every tenant at once. Recorded in the design so it is not revisited.

**Media has left Redis.** Uploads go to Vercel Blob; the record keeps a couple of hundred
bytes. The Blob URL is NEVER given to a client — the route fetches server-side after the same
membership check and streams the bytes, so the access decision stays in code rather than
being delegated to a store that cannot express "private". The two live files are copied and
still hold their base64, so the pre-Blob and post-Blob paths are both correct; `--reclaim`
waits for the gateway.

**Waves 0–1 are complete; Gate A is green.** Wave 0 shipped (orphan-sweep guard,
credential rate limiting, console session expiry, traffic-ingest bounds, media tenancy,
security headers, bcrypt 12 with rehash-on-login, M-1 dead capabilities). Gate A shipped:
189 golden responses over every surface, the 143-key permission matrix, hop counting, six
architectural assertions, **per-route permission enforcement in every module**, **ESLint**
(flat config + shrink-only warning budget, 142 today), **observability** (request ids, per-request hop
counts), and CI enforcing all of it.

Both of those numbers keep moving — 139 goldens and 102 keys before the
fifteen-section restructure. They are stated here as MEASURED (`ls tests/goldens | wc -l`, and
the catalogue assertion in `tests/gate-a.mjs`), because a pass condition quoted from memory is
a pass condition nobody can check.

**Wave 2 (seams + performance) is mostly done; Gate B is 2 of 3.** Zero direct `readCol` in
service code ✅, goldens unchanged by the seam work ✅ (189 today), hops ≤2 for the studio route and 3 for sales
(the structural floor). Done: Seam A (route wrapper, all 96 routes), Seam B (repository
interface + the `readCol` migration across all 13 modules), Seam C (one context factory,
killed hop 7), request-scoped cache + batched prefetch (8→2 hops), targeted live updates,
audit log, security round 2 (session digests at rest, console MFA), notification producers.
**W7 speed refactors are done** (R2 `plantMissingSections` off the read path + a backfill CLI,
R6 `lastSeenAt`/`lastLoginAt` off `g:users` onto `u:<id>:activity` — the hottest CAS contention
gone, R9 `getProfile` N+1 → one `MGET`), all on `main`. The recurring Gate-A month-end
**date-drift** is fixed (vacation fixtures are clock-relative now). **Open Wave 2 remnants:** the
`sweepOrphans` rewrite (M-10); the gap items — soft-delete tombstones, the email/fan-out outbox,
`schemaVersion` on stored documents. (**media→Vercel Blob** was listed here as "blocked on the
Blob store being created" long after the store existed and the port had shipped — the same
paragraph's own "Media has left Redis" above contradicted it. Only `--reclaim`, which deletes
the two pre-Blob records' base64, is still outstanding, and it waits on the gateway.)

**Wave 3 (TypeScript) is done server-side** — every `.ts`/`.tsx` under `noImplicitAny`, all
twelve departments in `src/modules/<name>/` with a Zod schema each, all 99 route files
converted. What remains is `checkJs` over the 212 browser `.js` files and the `app/`
restructure, deferred into Wave 4. **Wave 4 (UI/UX)** is not started — a proposal in
`w4-dashboards-and-motion.md` awaiting approval. **Wave 5 (SQL) was overtaken by the ERP
program's P1** and is no longer a separate wave: the store swap it described is on `main`,
under `NOMPANY_DB`, with the Postgres half written and proven. What remains of it is the
cutover, which is a network problem rather than a code one.

**The engagement storage model is being built and shipped incrementally** (spec:
`docs/superpowers/specs/2026-08-26-engagement-storage-model-design.md` — stored engagement root,
one key per record, live-context / frozen-documents). On `main`: **Phase 0** (foundations — the
`ENG.*` keys, the pure stage registry `src/platform/engagement/registry.ts`, the engagement store
`src/platform/db/engagement.ts`), **Phase 1a** (backfill read layer — `backfill.ts`, the guarded
CLI `scripts/migrate/backfill-engagements.mjs`, `readEngagementView`; **applied to live**, 7
engagements proven), and **Phase 1b-i** (`createTicket` dual-writes its engagement — same
deterministic id/clustering the backfill uses, guarded, response byte-identical), and **Phase
1b-rest** (RFQ/quotation/project creation each attach to their engagement — internal quotation
mints its own, approved quotation recorded — so the whole spine now dual-writes on create). **The
engagements view** (`/<slug>/engagements`, branch `engagements-view`) is the first surface that READS
the layer: a `createdAt`-scored engagement index, the grantable `engagements.view` key, a read layer
that filters every stage by the permission its stage-registry entry declares, two GET routes, four new
goldens, and a screen reached from a nav entry above People. It is deliberately NOT a section — giving
Main a child would gate the parent and hide Main from every member without the right. See
`docs/progress.md` and the
`docs/superpowers/plans/2026-08-2{6,7}-engagement-*.md` plans. The read/write paths are NOT
wired to any route yet — the engagement layer is written alongside, reconciled by the backfill.

**P2's approval engine is built, for bills.** A studio sets the amount above which a bill
needs a second signature (Finance & Accounting settings), and `approveBill` walks the chain
instead of asking one right: the permission is chosen at runtime, invariant 7 is enforced
twice (the raiser never signs, and nobody signs two steps of one record), and `Approved` is
written only on the last step so `BILL_STATUSES` gained no value. Amounts convert to the
studio's currency through the daily FX table, and the rate that routed a bill is stored ON
the bill, so a rate moving overnight cannot re-route one already mid-chain. Catalogue 123 to
124 (`finance.payables.approveHigh`). `docs/functionality/approvals.md` is the file.

**AP had no golden at all** until this landed — nothing called the bills route, so the
response could have changed in any way without a contract noticing. It has one now, pinning
the state the feature introduced: a bill signed once and still `Received`.

**THE ROLLOUT CONSEQUENCE, because it is live behaviour and not a quiet default:** approving
a bill now requires the studio to have set its own currency, and **`createStudio` has never
set one**. So every existing studio must set a currency in Studio settings before it can
approve a bill. The Payables screen says exactly that, in both languages, in place of the
button. An amount cannot be judged against a limit without one; the alternative was
approving under an unknown amount.

**Only bills.** The controlled-document ladder (`moveSignable`) and the submit/answer pairs
on change orders and timesheets are untouched, and there is no approval inbox, no delegation
and no condition other than amount. See the "Not built yet" section of the functionality file.

**Administration & Settings is a real section, live 03/09/2026, and it changed who sees
what.** The fifteen-section restructure had landed for fourteen sections; Administration was
declared with children and rendered as three loose nav rows — People at the pre-restructure key
`/people` shown to EVERYONE, Access on `canAdminister`, Studio settings pinned in the footer.
All three were reached by routes that bypassed the section mechanism deliberately, which is why
they worked and why nobody noticed `SECTION_AREAS` had no entry for any of them. They are
ordinary gated sections now and the parent follows its children. Catalogue 124 to 126
(`administration.access` view/edit) — the roles screen had no area at all, so a studio could not
delegate role management without making somebody an admin. `escalates()` is untouched.

**THE ROLLOUT CONSEQUENCE, because it is live behaviour on every existing studio:** People is a
GRANTED screen now. Managers and Team Leads hold it by default; **Members and Viewers lost it**
— who else is in the studio, and with what roles, is a management view. And **reading Studio
settings now needs `administration.settings.view`**, a right that existed throughout the
restructure and enforced nothing, because the GET checked membership and stopped. Existing
studios were backfilled by `scripts/migrate/grant-administration.mjs` (additive, idempotent,
dry-run by default, by role id rather than name); **it has been run against production, 04/09/2026**
— dry run, apply, a second apply reporting zero changes, and an independent read-back. This line
said "sandbox only" for a day after that stopped being true. `/people` and `/access` still
resolve, aliased in `requestedKey`, because delivered notifications link to `/people` and cannot
be rewritten. `docs/functionality/sections.md` is the file.

**All four `scripts/migrate/*.mjs` were unrunnable** until the same day: each refused on a
missing `REDIS_URL`, deleted at the Postgres cutover, while reading through the store
abstraction and naming no backend otherwise. That mattered most for `plant-sections.mjs`, which
is the only way a seeded section key added after a studio exists reaches that studio now that
`listSections` no longer reconciles on read — and the fold adds exactly such a key.

**P4a is under way, in CRM & Sales.** Two slices are on `main`.

**Slice 1 — the contracts register** (`crm-sales-contracts`). Contracts and change orders were
built in P2 as records with schemas, services and routes and NO SCREEN: a contract existed and
was invisible. They borrowed `crmSales.quotations` for their guards, which the stage registry
recorded as a debt to be paid when a screen arrived. The screen arrived, so
`crmSales.contracts` is real (view/create/edit + `approve` for answering a variation) and
catalogue 130 → 134. The register shows a contract's signed value, its approved movement and
its current value together, because only approved variations count and that sum is the number
a project manager needs. No delete: a contract is the deal's value baseline.

**Slice 2 — the pipeline** (`crm-sales-pipeline`), catalogue 134 → 135 (`crmSales.pipeline.view`,
view ALONE — moving a deal is editing its ticket and answers to `crmSales.tickets.edit`).
`docs/functionality/pipeline.md` is the file.

Every stage on the board already existed: `TICKET_STATUSES` has carried Lead, Opportunity and
Commit from the beginning. What did not exist was anything treating them AS a pipeline — and
**`closedAt` and `lostReason` were declared on `SalesTicketSchema` and written by nothing at
all**, which is invariant 16 at the record level. A stage move is a transition now, not an
assignment: a closed deal cannot be reopened (409), Commit and Closed Won need a quotation (the
rule `tickets.ts` stated in prose and nothing enforced), and a losing close must say why. One
function decides what a move writes, because `editTicket` is not the only writer — Technical's
RFQ paths move the ticket too, and the one that forgot would leave a hole exactly where the
interesting move was. `stageHistory` is appended under a FUNCTION patch (invariant 8), and
days-in-stage falls back through `updatedAt` to `createdAt` so the board works on day one
against the deals a live studio already has. **No backfill.**

**A stale count found on the way:** the Manager starter role never named `crmSales.contracts`,
so slice 1 shipped a section whose own Manager could not open it. Both rights are seeded now.

**Slice 3 — customer 360** (`crm-sales-customer-360`), and it adds **no permission key and no
record**: catalogue stays at 135. `/<slug>/crm-sales-clients/<id>` is one client's page, the
same second-segment shape a ticket has, resolving through `crm-sales-clients`.
`docs/functionality/customer-360.md` is the file.

Before it, a client was a ROW: `linkToClient` appended `?client=<id>` and scrolled you to the
row you were already looking at, so "what is this relationship worth" meant opening four
screens and filtering each by hand. **Every block is gated by the right over its own records
— deals, quotations, contracts, projects — and a block the reader may not see is never READ,
so it costs no round trip either.** `crmSales.clients.view` opens the page; it does not open
the contents. **The totals move with the reader**, which is the design rather than a bug and
is pinned by two goldens of the same customer: the owner sees 1 open deal, 1 decided and a
0% win rate; a clients-only reader sees the same company with every block false, no deals and
a NULL win rate. A figure derived from records somebody cannot open would leak the very thing
the gate is for.

Won value is the figure the page exists for and no screen could answer before. "Open value"
excludes On-Hold, **matching the pipeline board exactly** — the same words for the same figure,
or the words stop meaning anything.

**Slice 4 — pricing and customer rates**, and again **no permission key**: catalogue stays at
135. `docs/functionality/pricing.md` is the file.

**A quotation line was priced at LANDED COST.** `catalogueItems` said so itself: "unitCost is
the only price Registered Items holds — if the studio needs to quote above cost, that margin
belongs on the item." It did not belong on the item because it **was not on the item**, so a
studio that did not hand-edit every line quoted its work at what it had paid. There are three
sources now, most specific first (`src/shared/pricing.ts`, pure and shared with the screens):
what THIS customer was promised (`rates` on the client, beside contacts and locations), then
the studio's own `sellPrice`, then cost — **and the basis travels with the number**, because on
a line a considered price and the cost fallback are the same digits.

**The rate table never leaves the server**: Technical is handed the resolved price and a token,
never the customer's prices for every other item. The catalogue is asked for WITH a customer
only when a builder opens on a real quotation, and the answer **carries whose prices they are**
— the screen uses it only when that matches the customer on screen, so quoting one client at
another's agreed rates is structurally impossible rather than timed away.

**Slice 5 — the CRM & Sales dashboard**, no key and no route: it is drawn from the ticket list
`/sales` already returns. `docs/functionality/sales-dashboard.md` is the file.

**The dashboard kept its own vocabulary.** `salesAnalytics` held its own list of closed
statuses, its own copy of the stage climb and its own weighted-value arithmetic — three answers
to questions `modules/sales/pipeline` owns. They agreed the day they were written, which is the
only day duplication looks harmless: a stage added to `TICKET_STATUSES` and not to the
hand-written arrays does not throw, it stops being COUNTED. All three now come from the
registry, and a test asserts the two agree on every status.

**It also spoke English to Arabic studios.** The funnel returned `label: "Lead"` and the screen
drew that string; the donut, the at-risk rows and five hard-coded fragments ("tickets",
"12d overdue") had no dictionary entry at all. The funnel returns TOKENS now and the screen
chooses the words, statuses through `./statuses` like everywhere else.

**Two widgets for what the earlier slices recorded and nothing showed:** why deals are lost
(grouped `lostReason`, commonest first — the field was written on every losing close and read
back one deal at a time, which cannot tell a studio it loses on price) and stalled deals (open,
30+ days in one stage, longest first). Won VALUE joins won count on the free row.

**`ItemSchema` gained `unitCost`, `notes` and `image`, which it stored all along and never
declared** — so `Item` did not have them and every reader wrote its own inline shape to reach
them. The same class of bug as `closedAt`/`lostReason`, from the other end: written but
undeclared rather than declared but unwritten.

**P4a's second section is open: Tendering & Estimating.** The root was declared at the
restructure and rendered nothing for a fortnight — it sat in `NO_SCREEN_YET` and held no
permission area, because a right nothing can exercise is a bug. **Slice 1, the tender register,
is on `main`:** a `tendering-register` sub-section owning a new `tenders` collection,
`tendering.tenders` view/create/edit/delete (catalogue 135 → 139), and a screen sorted by
DEADLINE rather than by entry date. `docs/functionality/tendering.md` is the file.

A tender is **not a deal**: most end in a decision not to bid or in somebody else winning, and
recording only the winners is how a studio loses the ability to say what it keeps losing. The
ladder is its own (`modules/tendering/stages.ts`) rather than a reuse of the pipeline's, which
is what the program design asks for — P4a is hand-built "so P4b's abstraction is extracted from
real screens". **A tender cannot be won or lost unless it was submitted**, a submitted one
cannot become a No Bid (the honest exit is Withdrawn), and delete is refused once the bid has
gone in. The list carries `asOf` and the screen never reads its own clock.

**THE SECTION LIST IS THE PRODUCT'S, NOT THE SIGNUP DATE'S — and it catches up on read
again.** A studio is still seeded complete at creation, but `listSections` now checks the rows
it has ALREADY fetched against `ALL_SECTION_KEYS` and plants what is short. R2 was right that
the old version was expensive and wrong about which part: it called `plantMissingSections`,
which did its OWN read, so the funnel every reader passes through paid TWO round trips. The
question costs a set membership test over rows in hand; only a studio genuinely short pays a
write, once. `sectionsAsStored` is the non-healing reader, and exists because
`plant-sections.mjs`'s dry run must not plant the rows it is reporting.

Why it went back: a manual backfill gets forgotten. `administration-access` shipped 03/09 and
was still missing from two of three live studios on 05/09 with nothing complaining, and the
tender register would have been unreachable on all three. **`plant-sections.mjs` remains**, for
walking every studio deliberately rather than waiting for each to be opened. It inherits one
assumption, stated on `plantMissingSections`: a seeded key missing from a studio can only mean
the studio predates it, never that somebody removed it — nothing deletes sections today, and if
that ever ships this resurrects what was just deleted.

**ROLES DO NOT CATCH UP, and that is the half this does not solve.** `STARTER_ROLES` seeds only
when a studio has ZERO roles (`listRoles`: `if (rows.length) return rows`), so a right added to
the Manager role never reaches an existing studio. The OWNER never notices —
`effectivePermissions` short-circuits on `role === "owner"` — which is exactly why it goes
unseen. `grant-administration.mjs` is the pattern; there is no equivalent yet for
`crmSales.pipeline`, `crmSales.contracts` or `tendering.tenders`.

**THE ORDER STILL MATTERS FOR A SECTION THAT OWNS A COLLECTION:** run
`scripts/migrate/plant-sections.mjs` **before** anybody uses the register on an existing
studio, not after. A sub-section FALLS BACK TO THE ROOT when absent — which is what makes every
module context safe — so the register works before its section is planted and writes tenders
under the `tendering` root. Planting afterwards moves `registerSection` to the child and leaves
those rows under the parent, where nothing reads them: not deleted, not corrupted, invisible.
Seen in the sandbox — three tenders created before planting, zero visible after, and their
references NOT reissued (TND-0004 followed TND-0003), which is invariant 10 preventing the one
thing that would have made it worse.

**Slice 2, the BOQ grid and the rate library, is on `main`.** Two collections — `boqItems`
under the register and `tenderRates` under a new `tendering-rates` sub-section — and ONE new
area, `tendering.rates` (catalogue 139 → 143). `docs/functionality/boq.md` is the file.

**The bill mints no right of its own**: a bill IS the tender's content, so it answers to
`tendering.tenders`, and a second right over the same act would be free to disagree with the
first about who works on a tender. The LIBRARY is the studio's reference data rather than any
tender's — "may price a bid" and "may change what the company charges" are different powers.

**The one thing the screen must never do is call the total of a part-priced bill the bid.**
`boqTotals` returns `complete`, true only when every line carries a rate, and it travels with
every total — per group as well as overall, so an estimator is told where to look. An unpriced
line shows a dash, not `0.00`: nought is a price and that line has none. `boqItems` is its own
collection rather than an array on the tender, because the migration design already names
nested line arrays "the arrays that grow without bound".

**A rate is applied by COPY.** Editing a library rate reprices nothing already written,
deleting a library row breaks no bill, and typing over a library rate clears `rateId` because
the number is no longer that row's. Asserted all three ways in Gate A.

**Slice 3 is the tender pack and the clarification log** (`docs/functionality/bid-documents.md`),
and it adds **no permission key** — the catalogue stays at 143. Two collections
(`tenderDocuments`, `tenderClarifications`) under `tendering-register`, both answering to
`tendering.tenders` on the bill's own argument: the pack IS the tender. Files go to Vercel Blob
through `/api/media?kind=private`, which verifies membership before it writes and again before
it serves — nothing new was built for storage.

**A reissued document does not overwrite the one before it.** Rev A is MARKED as replaced and
stays, because "what did we price against" has to be answerable afterwards. Three rules make a
chain a chain, all in the pure `modules/tendering/documents.ts` so the screen refuses exactly
what the server refuses: the replacement must itself be CURRENT — which is what stops
A←B←C←A from ever being WRITTEN, rather than detected afterwards by a walk that has to
guess — nothing is replaced twice, and **a document in a chain cannot be deleted at either
end**: deleting the old one destroys the history, deleting its replacement leaves the old one
reading as replaced by nothing.

**`changesSincePricing` answers the one question the bill cannot ask itself:** did anything
arrive after the last line was priced? A BOQ line has no idea a document was reissued, so
nothing in the bill can notice an addendum landing on Tuesday against a bill priced on Monday.
Measured from `createdAt`, NOT from the issuer's date — the question is whether the estimator
had it in front of them, and a document dated the 1st and uploaded on the 10th was not available
to a bill priced on the 5th. **Priced lines alone set the clock**, or typing in scope would
clear the warning by doing the one kind of work that does not answer it. A bill with nothing
priced is not behind anything; that is what `complete` already says.

**`tests/restructure.mjs` was orphaned — nothing ran it**, and this file has credited it with
"six architectural assertions" enforced by CI throughout. That is how its
`testNoAreaExistsForASectionWithNoScreen` sat red since slice 1, asserting that Tendering, which
had just shipped a register, must hold no rights: it kept a HAND-TYPED copy of NO_SCREEN_YET.
It reads the real list now, and the file is in `npm test`.

**Slice 4 is the bid review** (`docs/functionality/bid-review.md`), and it is P2's approval
engine's SECOND document type rather than a second engine. Catalogue 143 → 145
(`tendering.tenders.approve`, `.approveHigh` — extras on the register, because signing a bid is
an act ON a tender; what makes them separate RIGHTS is that "may price a bid" and "may commit
the company to it" are different powers).

**Submitting used to need `tendering.tenders.edit`** — the same right that types a rate into
the bill — so whoever priced the work also committed the company to it. A bid now walks a
seeded chain (Estimating at 0, Above the limit at 500000), invariant 7 is enforced twice, and
`tenderProblem` refuses the move to Submitted with `not-approved`. **Only that move**: Won and
Lost are behind it by construction, and a No Bid needs no signature because it commits the
company to nothing. **`status` gained no value** — a signed bid is still Preparing until
somebody submits it.

**THE CHAIN STORE LEFT FINANCE**, which `approvals.md` named as this exact commit: *"a chain
governing a record outside Finance does not belong in Finance's settings."* Chains live on the
STUDIO record now (`platform/approval/store`), beside `currency`, which approval already
depends on — one right (`administration.settings.edit`) rather than one per department, and no
section read from any module context. **Reading is layered** (seeds → what Finance stored →
the studio's own), so a studio that configured a bill chain keeps it with nobody running a
backfill. **Writing has one door per type** and `bill` is still Finance's; the day that editor
moves, `bill` joins `STUDIO_EDITABLE_CHAINS` and `saveFinanceSettings` stops accepting chains
IN THE SAME COMMIT, so there is never a moment with two writers.

**`valueFromBoq` is finally called.** The bill wins over the typed `estimatedValue` where there
is one, and `basis` travels with the number because on screen the two are the same digits and
mean different things. **A part-priced bill cannot be signed off** — `complete` exists because
the total of a part-priced bill is a number and not the bid, and a signature against it
authorises a figure that is going to change.

**THE ROLLOUT CONSEQUENCE, the same one bills carry:** approving a bid needs the studio's own
currency, and `createStudio` has never set one. The refusal names the fix and the screen says
it in place of the button.

**Slice 5 is the handover to Projects** (`docs/functionality/handover.md`), and Tendering's five
subsections are all built now. It adds **no permission key** — the catalogue stays at 145 —
because handing over IS opening a project and answers to `projects.list.create`.

**IT IS A THIRD HEAD OF `openProject`, NOT A FUNCTION IN TENDERING**, and that is the whole
structural decision. `openProject`'s own comment asks for it: everything below the head split —
the row, the two sheets, the engagement attach, the manager notification — cannot tell which
head ran, and "a second create path is a second place the engagement dual-write could be
forgotten, which is exactly how a record ends up on no deal at all". So `tenderSource` sits
beside `quotationSource` and `directSource`; a body with a `quotationId` opens from the
quotation, one with a `tenderId` hands over, one with neither is direct, and a body carrying
both takes the stricter gate.

**The project opens at the BILL's total, not the typed estimate** — `valueFromBoq`, the same
precedence `bid.ts` routes the approval by, so the number a project opens at is the number that
was signed. A source-level assertion in `tests/bid-review.mjs` guards it, because the wrong
version still passes every runtime test on a tender whose two numbers happen to agree.

**Only a WON tender is handed over** (the counterpart of `quotationApproved`), **one project per
tender** — derived from the projects rather than a flag written back onto the tender, so
deleting the project frees it — and the ISSUER is resolved into Sales' client model the way
every other head resolves one, because bidding is frequently how a company becomes a client.
`tenderRef` is COPIED and the rest is not: the ref is a number a client quotes, it never moves
(invariant 10), and it has to read correctly on the project in a studio where the reader cannot
open Tendering at all.

**What remains is the other half of "estimate → budget baseline":** a project's sheets compose
from a QUOTATION, and a handed-over project has none, so they are drawn up empty exactly as a
direct project's are. The bill stays on the tender, is not frozen, and can drift from the
project's value after the handover.

**Three guards caught real mistakes in this slice, each named in the file that caught it.**
`next build` refused until `tenders` was in `COLLECTION_TABLE` (`platform/db/migrate/mapping.ts`)
— the same guard that once caught `contracts`. The permission matrix refused a
`tendering.dashboard` nothing enforces: `DASHBOARD_MODULES` is the list of modules that HAVE a
dashboard, not a list of group labels, and an area carries its own `group` string. And ESLint's
`no-undef` found a per-block Gate A helper (`personWith`) my block had borrowed without
declaring — it had thrown AFTER writing its earlier goldens, so **the run read as "0 failures"
while having crashed**. Exit code and "gate A: all passed" are the signals; a FAIL count alone
is not.

**Open decisions (waiting on a person):** the Wave 4 palette (marketing dark-first
indigo/Sora vs the ERP's light-first blue/Saira); and whether to denormalise the slug index
to take the sales route from 3 hops to 2. The earlier `login()` suspended-check and
share-link questions are **closed** (kept deliberately; deleted, respectively).

---

## House style

Commit subjects are declarative sentences describing the state after the change
("A document knows how many pages it has"), not conventional-commit prefixes.

Comments explain **why**, especially where the obvious approach is wrong. Much of this
codebase's value is in those comments — when you change such code, update the reason,
do not delete it.

Never duplicate. Before writing a function, grep for the one that already exists; when
you copy a block into a second place, extract it instead. When a removal is asked for,
comply — but trace every caller, route path, permission key and key builder that
depends on it first, and land the removal and its dependants in one commit.
