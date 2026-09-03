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

Five of those are declared and **render nothing yet** — Tendering, Manufacturing, Assets,
Reports and Quality & HSE. They are listed in `NO_SCREEN_YET` (`platform/access/resolve.ts`)
and are hidden from the sidebar rather than shown empty, and they hold no permission areas:
a right nothing can exercise is a bug (invariant 16). Adding a screen means removing its
entry there, and a test refuses any section that has neither a right nor a declaration.

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

- **Golden responses are the contract.** If a response body changes, the change is
  wrong until deliberately re-recorded in its own commit with a stated reason.
  `NOMPANY_RECORD_GOLDENS` is never set in CI.
- **Hop counts are part of the contract.** A route regressing from 2 Redis round trips
  to 8 fails the build.
- **The bundle budget pins the regression, not the size.** Two gates, and the
  first is the one that matters: the LARGEST CHUNK is 158 KB gz against a 250 KB
  ceiling, because that is what every route pays. Total client JS is 1582 KB gz
  against 1600 KB, which catches sprawl rather than splitting. The studio’s
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
  already there. The largest chunk did not move at any point (158 KB), which is the
  gate that matters.
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
153 golden responses over every surface, the 123-key permission matrix, hop counting, six
architectural assertions, **per-route permission enforcement in every module**, **ESLint**
(flat config + shrink-only warning budget), **observability** (request ids, per-request hop
counts), and CI enforcing all of it.

Both of those numbers have moved once already — 139 goldens and 102 keys before the
fifteen-section restructure. They are stated here as MEASURED (`ls tests/goldens | wc -l`, and
the catalogue assertion in `tests/gate-a.mjs`), because a pass condition quoted from memory is
a pass condition nobody can check.

**Wave 2 (seams + performance) is mostly done; Gate B is 2 of 3.** Zero direct `readCol` in
service code ✅, goldens unchanged at 153 ✅, hops ≤2 for the studio route and 3 for sales
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
