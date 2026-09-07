# nompany — working notes

Multi-tenant ERP. Next.js 16 · React 19 · Postgres · Tailwind v3 + shadcn/ui + MUI v9 · Vercel.
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
(**`administration-master` was in that list and is not any more** — Master data has a real
screen now: Locations, and Departments beside it. Its three siblings left when
Administration was folded; it left when its screen shipped. This file asserted the opposite
for longer than it was true.)

**What each thing does is written down: `docs/functionality/`, one file per system
functionality.** Read the one file you need and start — do not re-derive it from the code,
and do not read the whole folder. Every file ends with "Not built yet", stated in words,
because a silent gap reads as a finished feature. When you change behaviour, update that
file in the same commit.

**ONE PROGRESS FILE: `docs/progress.md`. DO NOT CREATE ANOTHER MARKDOWN FILE.**

This is a standing instruction from the user, given 07/09/2026, and it overrides the habit
of writing a spec or a plan per feature. **No new `.md` for a feature, a plan, a status, an
audit, a proposal or a suggestion.** It all goes in `docs/progress.md`.

Why: 110 markdown files existed on that date, and the audit in `progress.md` found five
describing things that no longer exist at all — including a 229-line file opening with
"this file is the source of truth" for a section that had been deleted, and a 396-line
migration to a database this product has never used. Three separate files claimed to track
progress. Every count quoted from prose rather than measured was wrong. **The cost is not
tidiness; it is that the user cannot tell what is true, and neither can I.**

**Major features get a ROW in the decision ledger** at the end of `progress.md`, never a
file. When the user rejects one, mark the row `REJECTED` and leave it. Deleted, `DELETED`.
Changed, `CHANGED TO: <what>`. **Rows are never removed** — a decision nobody can see is a
decision that gets argued again. Minor changes get no row.

`docs/functionality/` stays as it is: one file per shipped behaviour, each ending in "Not
built yet". Those describe what the product DOES; `progress.md` is the only thing that says
where the work IS.

Full detail lives in `docs/` — architecture, audit, and the wave plan. This file is
only what must be true in every session.

---

## The invariants

Each of these exists because a real failure produced it. Breaking one is a bug even
when the code looks cleaner afterwards.

1. **Keys are built only in `src/platform/db/keys.ts`.** Never a literal, never a
   template at a call site. Two incidents came from this: `sweepOrphans` reaped
   bare `u:`/`s:` prefixes and would have prefix-deleted production, and
   `lib/media.ts` wrote its blob key from a literal so the test suite put real
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
11. **Deletion is children-first, registry-last**, and only through `cascade.ts`, so a
    crashed cascade is idempotent on re-run.
12. **The stream is truth; the doorbell is only a doorbell.** `xAdd` strictly before
    `publish` — the id is the client's cursor. `Last-Event-ID` replay is what makes
    polling-free safe. The doorbell is a POLL of the `events` table now rather than
    Redis pub/sub (`platform/realtime/bus.ts` says why LISTEN/NOTIFY is not an
    option), which costs up to `BUS_POLL_MS` of latency and costs correctness
    nothing: a doorbell that rings a second late still rings.
13. **One poller per process**, fan-out in memory — never one per subscriber. A
    poller per handler multiplies one identical query by the number of open SSE
    streams, which on a busy studio is dozens of connections asking the same
    question.
14. **One `EventSource` per tab**, not per hook — browsers cap 6 per domain and
    `useLiveUpdates` has 63 call sites across 38 files (measured 07/09/2026; this
    said 43, and 21 before that).

    **AND A WATCH KEY NAMES THE SECTION THE ROWS ARE *WRITTEN* UNDER**, never the
    section the screen sits in. Nineteen boards passed the handler where `watch`
    belongs — `useLiveUpdates(slug, reload)`, two arguments to a three-argument
    hook — so `subscribe()` was handed a FUNCTION as a section key and every one
    of those screens was dead. Nothing could report it: `checkJs: false` exempts
    the browser `.js` files from tsc, a missing argument is legal JavaScript, and
    a board that never refreshes looks exactly like a board with nothing to
    refresh. The hook throws on that shape in development now, and
    `testEveryLiveWatchCanActuallyFire` (`tests/restructure.mjs`) refuses it in
    CI along with the subtler half: a key that is real and still unhearable,
    because nothing is written at it or beneath it. `crm-sales-pipeline`,
    `crm-sales-contracts`, `procurement-expediting` and `procurement-receiving`
    are all real sections that own no collection — the board's rows live
    somewhere else, and `SECTION_COLLECTIONS` is the authority on where.
    LiveProvider fans an event out to the watchers of every ANCESTOR of its
    section, which is what makes a department root (`finance`, `projects`) a
    legitimate watch again — it stopped being one the day the restructure moved
    the collections into sub-sections, silently, for a fortnight.
15. **Cron fails closed.** A missing `CRON_SECRET` refuses; it never opens the door.
16. **A right nothing can exercise is a bug.**
17. **No database is destroyed without two confirmations.** The store is live and
    shared — Postgres, Cloud SQL for PostgreSQL 18 — so a delete, drop or
    mass-overwrite is unrecoverable and hits every tenant at once. A broad-scan
    delete (`delPrefix("")` / `scanPrefix("")`) once wiped the whole instance. So any
    such action waits on the user confirming it **twice in the same exchange**: the
    first answer authorises the plan, the second — asked back with the exact scope
    spelled out — authorises the run. `DROP TABLE`/`TRUNCATE`/`DROP DATABASE`, any
    change to the RLS policy on `collection_rows`, an empty-or-unbounded prefix, and
    `sweepOrphans()` from a test or script are never run at all — `pgSchemaQuery`'s
    DDL-only door refuses the first three unconditionally, so reaching for them by
    accident fails before Postgres is asked. When a twice-confirmed deletion does
    proceed: export first, delete by an explicit key list, re-scan to prove it.
    Verification stays read-only by default.

---

## Where the code lives

The `src/lib` split is done, and every folder below is TypeScript. What is left in
JavaScript is the **272 browser files** under `src/components` and `src/app`, which
convert with the UI work in Wave 4 — that is the whole of what `checkJs: false` and
the `allowJs` escape hatch are still holding open.

| Folder | Holds |
|---|---|
| `src/shared/**` | Pure values with no dependants — currencies, countries, i18n, slug, departments |
| `src/platform/access/**` | The permission catalogue and the resolver |
| `src/platform/db/**` | Everything that knows Postgres exists — keys, store, cascade, repo, sections, `pg.ts`, the gateway client |
| `src/platform/auth/**` | Identity, the console's own auth, passwords, OTP, devices, rate limits, calendar OAuth |
| `src/platform/realtime/**` | The event stream, the doorbell bus, live patches |
| `src/platform/notify/**` | Notifications and email |
| `src/platform/http/**` | The route wrapper, the status table, idempotency, audit, observability |
| `src/platform/approval/**` | The approval chain store and walker (bills, bids, requisitions) |
| `src/platform/engagement/**` | The stage registry and the engagement backfill |
| `src/platform/nova/**` | Nova |
| `src/modules/<name>/**` | The departments, one folder each — fourteen today |
| `src/lib/**` | What belongs to no department — chat, media, the catalogue, presentation helpers |

Two rules that came out of doing it:

- **Siblings import each other relatively** (`./keys`), never through the alias.
  A folder's internals routing through its own public door is how a module ends
  up importing itself once a barrel exists.
- **A barrel is a judgement call, not a habit.** `platform/access` has one,
  because nothing in it touches the database and a client component may safely
  import any of it. `platform/db` deliberately has none: `store` reaches Postgres,
  and a landing-page component already imports a key builder.

**Dates in this file and in the logs are `dd/mm/yyyy`.** (`docs/` keeps ISO dates;
the logs do not.)

---

## Working against the live Postgres

`DATABASE_URL` is a **live, shared** Cloud SQL instance. There is no dev database.
It is the only store — Redis is gone: the package is uninstalled, no file imports a
client, and no environment carries a `REDIS_URL`.

**THE KEY PREFIX PROTECTS ONE HALF OF THE DATABASE AND NOT THE OTHER, which is the
trap worth reading twice.** `NOMPANY_KEY_PREFIX` namespaces a key *string*, so it
covers the `documents` and `events` tables, whose rows are addressed by the keys
`keys.ts` builds. **It does NOT protect `collection_rows`**, which has no such
string to namespace — `tenant_id` there is a real studio id, exactly what a live
tenant also uses. A developer who assumes the prefix sandboxes the whole database
is one command away from writing to the real table. This is why
`tests/pg-sweep.mjs` deletes by an **explicit id list** read back from the run's own
`REG.studios`, never a predicate, and why `withTenant` is the only door onto the
table at all (RLS is FORCED, so nothing can even discover which tenants hold rows
without one already in hand).

- Tests run under `NOMPANY_KEY_PREFIX` and sweep that namespace at the end. CI gets
  an ephemeral `postgres:18` container instead, so the prefix is the second line of
  defence there and the only one locally.
- **Never call `sweepOrphans()` from a test.** The suite shares one database with
  production, so a test that ran it to prove it safe would be the thing it guards
  against — and would fire hardest when the fix was absent. Its two guards are pure
  values (`SWEEP_SCOPES`, `sweepRefusal`) precisely so they assert without a delete.
- Before deleting anything live: export, delete by **explicit key list**, re-scan to
  prove the result.
- **`npm run test:parity` (and CI's `NOMPANY_DB=parity` step) write real rows.** Every
  fixture `tests/pg-parity.mjs` creates is either a synthetic tenant id the test deletes
  in its own `finally` block, or one of the studios the integration suite / Gate A create
  for real — those are swept via `sweepPgTenants` using the exact ids `REG.studios`
  names, the same invariant-17 shape as the key sweep, and it must run **before** the
  `delPrefix` that would otherwise erase that id list.
- Locally, `DATABASE_URL` lives in `.env.local`. If it is unset, `tests/pg-parity.mjs`'s
  assertions skip **loudly** (a banner, plus a per-test "skipped"
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

## Verification — CI does it, not you

**DO NOT RUN THE SUITE, THE TYPECHECKS OR THE BUILD LOCALLY.** Commit, push, and let CI
answer. This heading said "every change, no exceptions" and listed four commands to run by
hand; an agent reading it ran a ten-minute suite before handing over anything at all, and
did it once per task — hours of the owner's day spent re-deriving, on a laptop with a flaky
`cloud-sql-proxy`, an answer GitHub was already computing for free on every push. That is
what it cost, which is why the heading changed.

CI (`.github/workflows/ci.yml`) runs, on every push to `main` and every pull request:

```bash
npm test            # model tests, restructure assertions, integration suite, Gate A — real routes, real Postgres
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.strict.json   # every .ts/.tsx, with noImplicitAny
npx next build
```

plus four things `npm test` does not — `npm run lint:budget`, `npm run test:gateway`,
`npm run test:gateway:parity`, `npm run test:parity` (`NOMPANY_DB=parity`) — and
`scripts/bundle-budget.mjs` after the build. CI is also the more trustworthy verifier: it
runs on an ephemeral `postgres:18` as a non-superuser, so its RLS results hold for reasons
the local shared instance cannot reproduce.

**The one thing that IS run locally is `npm run dev:sandbox`**, because a screen has to be
opened to be verified and no pipeline can do that. Everything else — a suite, a build, a
migration, a script, `gcloud auth`, restarting the proxy — is ASKED FOR FIRST. Ask, get a
yes, then run it. The requirements below have not weakened; what changed is who checks them
and when.

- **`git add` a new file BEFORE you believe a green suite.** The architectural
  assertions in `tests/restructure.mjs` shell out to `git grep`, which searches TRACKED
  files only — so a brand-new screen or module is invisible to them, the suite passes
  locally, and the identical tree fails in CI the moment it is committed. This cost a red
  build on the pipeline board.
- **Golden responses are the contract.** If a response body changes, the change is
  wrong until deliberately re-recorded in its own commit with a stated reason.
  `NOMPANY_RECORD_GOLDENS` is never set in CI.
- **Hop counts are part of the contract.** A route regressing from 2 database round
  trips to 8 fails the build.
- **The bundle budget pins the regression, not the size.** Three gates now, and the
  first is the one that matters: **per-route FIRST LOAD, against a recorded baseline
  plus an 8 KB margin** (`scripts/bundle-baselines.json`, rewritten with
  `node scripts/bundle-budget.mjs --record`; an unlisted route is held to 300 KB, so a
  new route is gated from its first build). Then the largest chunk (250 KB gz) and
  total client JS (**1825 against 1833**, CI's measurement on 07/09/2026), which
  catch one enormous file and sprawl respectively. `scripts/bundle-budget.mjs` holds
  the numbers and explains why a whole-directory total would penalise code-splitting.

  **THIS BULLET SAID "1681 against 1684" AND WAS ALREADY TWO GENERATIONS STALE
  when it was corrected — then went stale twice more before this line was
  rewritten.** The ceiling has moved four times: 1684 → 1716 as the studio's
  screens picked up their planned weight, 1716 → 1792 for the hero-variant
  preview route, 1792 → 1716 again when that route was deleted, and
  1716 → 1833 for four marketing pages nobody had re-measured the total for.

  **THE THIRD OF THOSE FIRED BY ITSELF, AND THE CONDITIONAL THAT DID IT IS NOW
  GONE.** It read `baselines[PREVIEW_ROUTE] ? 1792 : 1716`, bound to the preview
  route's baseline row so the adopt-a-winner commit lowered the ceiling by deleting
  the route rather than by remembering to, and it worked exactly as designed. What
  was left afterwards is a branch whose 1792 arm can never be taken again —
  `tests/marketing-model.mjs` asserts that row stays absent — so it is a plain
  constant again. The mechanism is worth reusing; that instance is spent. Do not
  go looking for the conditional this bullet used to describe.

  **AND A CEILING THAT FIRES CORRECTLY CAN STILL BE WRONG.** 1716 went red at 1825
  on a tree where EVERY per-route number was at or under its baseline — the studio
  681 against 680, `/[locale]` and the questionnaire each a kilobyte UNDER. Nothing
  had regressed. Four real pages (`/[locale]/pricing`, `/about`, `/platform`,
  `/security`) had landed since 1716 was measured, and 117 KB for four of them is
  the shared-shell shape rather than sprawl — they render inside MarketingShell,
  which `/[locale]` had already paid for. A self-lowering ceiling ratchets against
  the tree it was measured on, not the one that exists.

  **THOSE FOUR ARE STILL UNBASELINED, recorded as a debt rather than paid.** They
  fall to the 300 KB default, so each may drift up to 38 KB before anything
  complains, which falsifies this bullet's own claim that a new route is gated from
  its first build. Paying it needs `--record`, which needs a build. The next commit
  that builds should record the four and lower 1833 to measured + 8 in the same
  change.

  **THIS BULLET SAID THE LARGEST CHUNK IS "WHAT EVERY ROUTE PAYS", AND IT IS NOT —
  it is six times under.** Next 16 publishes the real figure
  (`.next/diagnostics/route-bundle-stats.json`, the First Load JS its build table
  prints); on the same build the gate read 158 KB and green while
  **`/studio/[[...segments]]` — every tenant page — was 951 KB gz across 40 chunks**.
  The proxy was honest when nothing better existed and became a wrong number with a
  reassuring history the day something did.

  **AND THE STUDIO'S `nextDynamic()` SPLIT DEFERS NOTHING.** Every client module on
  that route carries the identical 32-chunk list in the client reference manifest, so
  referencing one screen loads all of them: TipTap/ProseMirror (158 KB, behind two
  dynamic boundaries), date-fns with the MUI pickers (98 KB) and the Gantt shell are
  all first load. `page.js` is a **Server Component**, where `next/dynamic` defers the
  SERVER render and creates no client lazy boundary; Turbopack then groups the route's
  client references into one chunk group. The 307 → 197 → 158 KB wins were real changes
  to the file layout and changed nothing about what is downloaded. Moving work to
  another chunk does not lower the route number; a real client-side lazy boundary does,
  which is the whole reason the gate is per-route now.

  **AND THAT IS THE FIX, MEASURED: the studio's first load is 679 KB, down from 962.**
  `src/components/studio2/HeavyScreens.jsx` is a **client** module, so its `import()`
  survives to runtime; `page.js` imports the four heaviest screens from it — the
  document editor (TipTap/ProseMirror, 158 KB) and the planner (which pulls
  `@mui/x-date-pickers` and date-fns, 98 KB) — and every one of those chunks is async
  now. **`ssr: false` was tried and reverted:** both variants build to byte-identical
  numbers, so the screens keep server-rendering. Being in the client module is what
  does the work, not being out of the SSR graph. The other twenty-odd screens are
  untouched, because their weight has not been measured yet.

  **A SPLIT IS NOT FREE: the total went 1692 → 1772.** About 57 of those 86 kilobytes
  were **date-fns arriving twice**, once in the planner's async group and once in
  `MuiDate`'s, where before there was one copy in the entry that every route paid for —
  two lazily-loaded groups reaching one library by different paths get a copy each.

  **THAT DUPLICATE WAS THEN PAID OFF: 1772 → 1725, and the ceiling came DOWN, 1780 →
  1733** — the first time this budget has ratcheted down rather than up. The planner's
  grid reaches the picker through the same `import()` `fields/StudioDate` uses
  (`GridDate`, exported from `fields/MuiDate`), so the two 57 KB copies and the
  planner's own 41 KB picker chunk are **one 64 KB chunk both groups share**. Counted,
  not assumed: `startOfWeek` is in exactly one chunk. The studio's first load did not
  move (679) — nothing left or entered the page, a copy stopped being made — and
  `/super` lost a kilobyte and a chunk each, the same duplicate it was carrying where
  nobody was looking.

  **`LocalizationProvider` LIVES WITH THE PICKER NOW,** not around the planner shell:
  the provider was why `StudioPlanner` imported the adapter, and the adapter is what
  dragged date-fns in. `MuiDate.jsx` claimed to be "the only place MUI's date code is
  imported" and had not been true since the planner landed; it is true again, and it is
  the rule — **importing `@mui/x-date-pickers` anywhere else puts the 57 KB back, and
  nothing in the build will complain.**

  **`/super` IS FIFTEEN ROUTES, NOT FIFTY-FIVE.** Forty were the reference admin
  template's demos — seven fake dashboards, eighteen inert auth screens, nine
  maintenance pages, `landing`, `docs`, `ecommerce/orders`, `application/invoices`,
  `application/task-board` — rendering hardcoded arrays. Deleted 07/09/2026, code and
  route. **There is no registration for the console:** a super admin is an existing
  user marked as one, `superAuth` has no create path, and `/super/v1/register` served
  a form for a door that does not exist. The build went 68 routes to 28 and the total
  moved **17 KB** — they shared the console shell with the real screens, so the size
  case was never the case.

  **A PAGE WITH NO `fetch` IS NOT A PAGE WITH NO DATA**, and this cost the deletion two
  wrong answers before it was right. Grepping `fetch(` in page files called
  `application/calendar` a demo — it is a Google Calendar OAuth screen that reads the
  store directly as a Server Component. Following the import tree but resolving only
  `@/` specifiers then called `settings/security` a demo, because its real content sits
  behind `./MfaCard`. Classify by the WHOLE import tree, relative imports included, or
  four real screens get deleted with the forty. `docs/w4-dashboards-and-motion.md` had
  the same misclassification for a fortnight.

  **MEASURE THE BRANCH YOU ARE ON, BOTH ENDS, before attributing a delta to
  anything.** This bullet used to carry a per-commit changelog of every kilobyte,
  and it was wrong more than once in ways that cost real work: it said 1593/1600
  when the script's constant was 1700, so the gate was a hundred kilobytes slacker
  than this file and the script's own comment; and it said 1638 when a build of the
  same tree measured 1643, so a change that looked like it had six kilobytes of
  headroom had one. A number nobody re-measures decays silently. The changelog is
  gone; the ceilings live in the script, which cannot drift from itself.

  Three things that log did establish, and they are the reasons rather than the
  numbers:

  - **A feature does not cost what it weighs; it costs what crosses the wire.**
    `platform/approval`, `tenderSource`, the twenty-five seeded org charts and the
    whole calendar OAuth subsystem are server-only and ship nothing. The bid review
    added one kilobyte.
  - **Some duplication is bought deliberately.** `modules/sales/pipeline`,
    `modules/tendering/documents`, `modules/projects/costing`, `shared/departments/tree`
    and `shared/calendar` all reach the browser on purpose, so a screen offers
    exactly what the server would accept. Two copies of "a closed deal cannot be
    reopened" are two copies free to disagree.
  - **Cost that lands in eleven route chunks is styling's problem, not
    JavaScript's.** `SelectMenu` is the biggest single rise this budget has seen
    (24 KB), and it is duplication rather than weight — ~2.2 KB in each of eleven
    chunks, because `Field` imports it and `Field` is on every screen with a form.
    Its look lives in `.menu-*` rules in `globals.css` rather than in `className`
    strings for exactly that reason: a utility string is paid for eleven times, a
    stylesheet rule once (measured at two kilobytes). The largest chunk did not
    move, which is the gate that matters.

  The studio's department screens are `nextDynamic()`, which is what took the
  largest chunk from 307 KB to 197 and then to 158. Lower that ceiling further as
  the screens are rewritten.
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

**Browser-pane traps**, four of them, all paid for:

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
- **The pane serves a cached document and drops the path from the request, so it
  never re-renders the ROOT layout.** Every `navigate` reports the bare origin in the
  logs regardless of the path given, which means it cannot verify anything the root
  layout resolves from a request header — theme, `dir`, `lang`, studio chrome. Measured
  this session: a theme fix that `curl` proved correct on three separate paths still
  rendered light in the pane, and clearing the cookie, setting it explicitly, and
  cache-busting the URL all failed to change what rendered. This cost a real fix being
  doubted as broken when the instrument, not the code, was wrong. `curl` is the
  instrument for that class of check — anything the ROOT layout reads from the request
  rather than the client.

**Verifying a screen needs a session, and `npm run dev:sandbox` is how.** It sets
`NOMPANY_KEY_PREFIX` before Next starts, seeds one account and one studio, and prints
the login — `sandbox@nompany.test` at `localhost:3010/sandbox`. `npm run dev` has no
prefix and therefore *is* production. Sweep with `npm run dev:sandbox:clean`.

**That sweep covered one store of three until 06/09/2026, and reported it as all
of them.** `delPrefix` reaches `documents` and `events` — everything with a key to
namespace — and reaches neither `collection_rows` (keyed by a real `tenant_id`, which
is exactly what the Postgres section above warns the prefix cannot protect) nor Vercel
Blob (no key space at all). So every sandbox session since the cutover left its rows in
the live shared table permanently while the script printed "swept": measured, a clean
run reported 299 rows and left 38 behind. It now calls `sweepPgTenants` and
`sweepBlobObjects` — the suites' own halves rather than a second copy — and **the order
is load-bearing**: the tenant sweep runs FIRST, because `REG.studios` is the only thing
naming which studios are the sandbox's and `delPrefix` deletes it. Same constraint
`test:parity` carries, same trap. It refuses outright if `REG.studios` does not resolve
under the prefix, which is what a too-late `NOMPANY_KEY_PREFIX` or a `NODE_ENV` of
`production` would silently produce — the live registry, handed to a DELETE.

**Stop the sandbox dev server before running `npm test`.** The local `cloud-sql-proxy`
fails on connection bursts, and a dev server holding pool connections is one: a suite run
alongside it died at connect entering the integration suite, and the identical tree
passed everything with the server stopped. Also note `preview_stop` can leave the
`next dev` child alive — check for one on 3010 before blaming the proxy.

---

## Current state

*(Refreshed 01/09/2026, when P0 and P1 merged to `main`. Before that this section said Wave 5
(SQL) was "not started", which stopped being true the day `collection_rows` took its first
row — a stale status is worse than none.)*

**P0 and P1 are on `main`.** P0 restructured the product into the blueprint's fifteen
sections. **P1 put Postgres behind the same seam Redis already sat behind**: three modes via
`NOMPANY_DB` — `postgres` (the DEFAULT, and what production runs), `redis`, and `parity`,
which runs both and compares them as `JSON.stringify` TEXT because `payload` is `json` not
`jsonb` and key order is part of the contract. A full parity run dual-writes real rows to
Cloud SQL and finds zero disagreements, with the disagreement detector itself asserted so a
silent pass cannot masquerade as agreement.

**THE MODE NAMED `redis` NO LONGER TALKS TO REDIS, and the name is the only thing left of
it.** `redisRows.ts` holds the key-based row primitives unchanged, but they read and write
through `store.ts`, which is a facade over the Postgres `documents` table now. So `parity`
compares two Postgres REPRESENTATIONS — JSON arrays under a key against `collection_rows` —
rather than two databases, and it still works precisely because of that. Do not read the
mode name as a live Redis path; nothing in the tree can open one.

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
still hold their base64, so the pre-Blob and post-Blob paths are both correct.

**THE `--reclaim` STEP IS NOT "WAITING" ON ANYTHING — ITS SCRIPT IS GONE.** This file said it
waited on the gateway, and the gateway went live 02/09/2026, so the stated blocker has not
applied for days. The real state is worse and quieter:
`scripts/migrate-media-to-blob.mjs` is **not in the tree** — `scripts/` holds no media
script at all — while `docs/functionality/media.md` still documents its three flags and
`docs/progress.md` still lists `--reclaim` as the outstanding half of W10. So the 1.41 MB of
base64 on those two records cannot be reclaimed by running anything; the script has to come
back first. Recorded as a finding rather than fixed here, because restoring a deletion tool
that writes to live data is its own change with its own authorisation.

**Waves 0–1 are complete; Gate A is green.** Wave 0 shipped (orphan-sweep guard,
credential rate limiting, console session expiry, traffic-ingest bounds, media tenancy,
security headers, bcrypt 12 with rehash-on-login, M-1 dead capabilities). Gate A shipped:
343 golden responses over every surface, the 177-key permission matrix, hop counting, six
architectural assertions, **per-route permission enforcement in every module**, **ESLint**
(flat config + shrink-only warning budget, 142 today), **observability** (request ids, per-request hop
counts), and CI enforcing all of it.

Both of those numbers keep moving — 139 goldens and 102 keys before the
fifteen-section restructure. They are stated here as MEASURED (`ls tests/goldens | wc -l`, and
the catalogue assertion in `tests/gate-a.mjs`), because a pass condition quoted from memory is
a pass condition nobody can check. **Re-measured 06/09/2026 and both were stale — this
said 189 and 143 against a real 257 and 159**, which is the paragraph failing its own rule
in the same breath as stating it. A number nobody re-measures decays silently, and these two
had drifted through the tender-pack, requisitions and departments slices without anybody
noticing, because nothing fails when prose disagrees with a test.

**AND THE CORRECTION WAS ITSELF OFF BY ONE, which is the sharper lesson.** It landed as 256,
measured accurately at `682eda7` and written down on top of `a2044ff` — one commit later, and
that commit added `procurement.requisitions.list.json`. So a number was measured, was true when
measured, and was stale by the time it was committed. `ls tests/goldens | wc -l` says 343,
measured 07/09/2026.
Re-measure at the commit you are writing, not at the one you were reading.

**Wave 2 (seams + performance) is mostly done; Gate B is 2 of 3.** Zero direct `readCol` in
service code ✅, goldens unchanged by the seam work ✅ (343 today), hops ≤2 for the studio route and 3 for sales
(the structural floor). Done: Seam A (route wrapper, every route), Seam B (repository
interface + the `readCol` migration across every module), Seam C (one context factory,
killed hop 7), request-scoped cache + batched prefetch (8→2 hops), targeted live updates,
audit log, security round 2 (session digests at rest, console MFA), notification producers.
**W7 speed refactors are done** (R2 `plantMissingSections` off the read path + a backfill CLI,
R6 `lastSeenAt`/`lastLoginAt` off `g:users` onto `u:<id>:activity` — the hottest CAS contention
gone, R9 `getProfile` N+1 → one `MGET`), all on `main`. The recurring Gate-A month-end
**date-drift** is fixed (vacation fixtures are clock-relative now). **Open Wave 2 remnants:** the
`sweepOrphans` rewrite (M-10); the gap items — soft-delete tombstones, the email/fan-out outbox,
`schemaVersion` on stored documents; and the media `--reclaim` step, whose script is missing
from the tree (see "Media has left Redis" above). (**media→Vercel Blob** was listed here as
"blocked on the Blob store being created" long after the store existed and the port had
shipped — the same paragraph's own "Media has left Redis" above contradicted it.)

**Wave 3 (TypeScript) is done server-side** — every `.ts`/`.tsx` under `noImplicitAny`, every
department in `src/modules/<name>/` with a Zod schema each, and every route file converted
(**153 today, all `route.ts`, none left in JavaScript**). What remains is `checkJs` over the
**272** browser `.js` files and the `app/` restructure, deferred into Wave 4. (Both counts
are measured — `find src/app/api -name 'route.*'` and `find src/components src/app -name
'*.js' -o -name '*.jsx'`. They said 99 and 212 for long enough to be quoted as facts;
`tsconfig.strict.json`'s own comment still says 212, which is the same drift one layer down.) **Wave 4 (UI/UX)** is not started — a proposal in
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

**A STUDIO'S DEPARTMENTS ARE ITS OWN AGAIN, and this is the third answer that
line has had.** HR once owned a `departments` collection; it was deleted for a
real reason — every studio wrote its structure down twice, once as the nav and
once as an HR list, and the two agreed only on the day somebody typed them —
and the replacement was "a department IS a top-level section". That
over-corrected: it deleted the org unit instead of giving each list its own
job. What a studio actually saw was **sixteen departments — the fifteen
sections plus Tasks, which is not a section — four of them (Manufacturing,
Assets, Quality & HSE, Reports) screens that render nothing.** A construction
company was being offered Manufacturing & Production as part of its org chart.
`docs/functionality/departments.md` is the file.

A section is a product surface and an access boundary; a department is an org
unit. Identity between them can express none of the three shapes a real company
has: two departments in one section, one department across several, and a
department with no section at all (Legal, a branch office). The link survives as
`sectionKeys` ON the department, many-to-one and optional — and it **grants
nothing**, because roles decide access and a second mechanism would be free to
disagree with the first.

**IT ADDS NO PERMISSION KEY — the catalogue is unchanged.** The register is a
second tab under Master data on `administration.master.*`, which already carried
full CRUD for locations. **And it is deliberately NOT HR's**, which is where a
person is placed: `parentId` drives the `department` access scope, so
re-parenting widens what a manager sees — an HR clerk holding `hr.employees.edit`
could otherwise enlarge a manager's reach over employee records and leave without
holding `administration.access` and without `escalates()` ever being asked.
Invariant 5 through a side door.

**THE SCOPE IS THE POINT.** `scope === "department"` compared two departmentId
strings, which on the derived model meant "the same SECTION" — an Operations
Manager with three teams under them saw none of the three. It resolves to the
department AND ITS DESCENDANTS now (`subtreeIds`, pure, shared with the screen
that draws the same tree so the two cannot disagree about anybody's reach). On a
flat register this is identical to before; the moment a studio nests, a scoped
manager sees more people and more leave. Live behaviour, so it is written down.

**Seeding is per trade and never overwrites.** A new studio gets the universal
back office at creation — Finance, HR, Administration, the three that were
identical in all twenty-five fields — because nothing sets a field of work at
creation and an empty register means an empty dropdown and nobody placeable at
all. Setting the field seeds that trade's chart. **Changing it later overwrites
nothing**: the screen offers what is missing and adds only that, by code, the
same courtesy `nextPool` extends to service actions.

**A GOLDEN CAUGHT THE ONE REAL DESIGN HOLE.** Projects reads the register
without ever seeding it (a list route must not write one as a side effect), so
whether the overtime filter had departments depended on whether somebody had
opened HR first — two Gate A goldens recorded `[]` and `[...]` in the SAME run,
a contract encoding fixture order. `createStudio` seeds the register now, the
way it seeds sections. Six goldens re-recorded (three HR, three Projects).
`scripts/migrate/departments.mjs` re-points existing people off section keys; it
is a faithful rename and maps nobody onto the starter chart, because guessing
that a studio's "projects" people belong in Site Execution is a guess they
cannot see happening and cannot undo.

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

**P4a's THIRD section is open: Projects, deepened** — and its first bullet, WBS/Gantt with
dependencies, was already built: the planner has `parentId`, `predecessorId`, durations,
milestones and a progress rollup.

**THE CRITICAL PATH WAS ALSO ALREADY BUILT, and this file said otherwise for a fortnight.**
The line here read "only the critical path is missing from it"; the engine has computed a
full backward pass — late finish, total float, `critical` per row — since it was written,
and four places render it (red bars, thickened dependency links, a rose WBS number, an
Inspector badge) behind a translated toolbar toggle. Nothing was missing. Corrected rather
than quietly deleted, because this is the third stale claim in this file found by checking
it against the code, and the pattern is worth seeing.

**WHAT WAS ACTUALLY WRONG IS THAT NOBODY COULD REACH IT ON A REAL PLAN.** `savePlan` writes
the plan document WHOLE — an object, that exists, under a byte cap, and nothing inside it is
validated — so `tasks` is whatever was PUT and the `Task[]` handed to the engine is an
assertion rather than a guarantee. A document holding `[{ id: "t1" }]` is accepted by the API
today, and it white-screened the entire planner: `t.dependencies is not iterable`, thrown on
the engine's first loop, before one row rendered. `tsc` believes the assertion and **no test
imported the engine at all**, so the only thing that could find it was opening the screen.

`normalizeTask` now runs at the store's boundary, inside `normalizeOrder`, which is the one
door every task passes through — hydrate, mutation, import and template alike. It fills the
contract and **guesses nothing**: the row that broke this stored `title` and no `name`, and
filling one from the other would be a migration nobody asked for and nobody could see
happening. An empty name is the truth about that row. The server half already read these
tasks defensively (`planProgress` coerces every field it touches, so the projects list cannot
fall over on one bad plan); this is the client half of the same posture.

`tests/planner-schedule.mjs` is the engine's FIRST coverage: the shape that crashed it, and
the CPM arithmetic that was written and never asserted — the longest path critical, the slack
branch not, float measured separately from the flag, a summary row excluded, and cycles and
dangling predecessors reported rather than thrown. **Slice 1 is the
cost breakdown** (`docs/functionality/cost-codes.md`), catalogue 145 → 149 (`projects.costs`).

**A project had exactly ONE number** — `value`, what the studio will be paid — and nothing said
what any of it was allowed to COST, so "are we over on this trade" could not be asked. The
handover sharpened that rather than fixing it: it carries a tender's bill total in as the value,
and the bill's own groups are precisely the breakdown there was nowhere to record. A
handed-over project is now OFFERED them, in the document's order, budgeted at what each section
was SOLD for — proposed and not imposed, an action rather than a seed at handover, because the
groups are how the work was sold and a studio budgets by how it expects to buy.

**`projects.costs` is its own area** by the test `tendering.rates` passed: a project's budget is
not its content the way a bill is a tender's, and a site engineer opening the job has no
business reading what amounts to the margin. Gate A pins it — somebody who may view and edit
every project is refused the breakdown by name.

**MONEY NOBODY FILED PROPERLY IS STILL THE PROJECT'S MONEY**, and that is what the roll-up turns
on. A bill naming no code, and a bill coded to a code somebody has since DELETED, both land in
`uncoded`, counted in the actual and shown in their own right. Deleting a code cascades nothing.
A total that quietly fell when somebody tidied a list would be a report that punishes
housekeeping. Spend counts from `Received`, not from `Approved`: approval authorises PAYMENT,
and a report that waited for it would call a job under budget for as long as its paperwork was
behind.

**SLICE 2 CODED THE PURCHASE ORDERS**, which is what turns a spend report into a cost report.
`committed` is what has been ordered and NOT yet invoiced — the half a spend report cannot see.
An order stops being a commitment when it is INVOICED rather than when it is delivered, so what
is left of every placed order is NETTED against what has been billed on it: counting a fully
invoiced order as still committed would double every cost the moment its goods turned up.

**A bill answering an order INHERITS the order's code** when it carries none of its own — code
the PO once and every invoice against it follows, which is what keeps `uncoded` to what genuinely
has not been filed. An uncoded ORDER is kept apart from an uncoded BILL (`uncommitted` beside
`uncoded`) because the two are fixed in different places.

**Forecast is `actual + committed`, or the budget, whichever is LARGER**, and the asymmetry is
the point: a code inside its allowance is still expected to spend it, because the work is not
done, and reporting money not yet promised as a saving would show every project under budget on
the day it opened. The PROJECT's forecast is the sum of its codes' rather than a maximum over
the totals — taking the maximum at the top would let a code running under cancel one running
over, which is the one thing a breakdown exists to prevent.

**SLICE 3 IS EARNED VALUE**, and it is a JOIN rather than new data: the budget came with the
breakdown, how far the work has got has been in the planner since it was built, and AC is the
same `actual` the codes roll up. `modules/projects/earnedValue.ts`, pure. **No permission key** —
it reads what `projects.costs.view` already opens.

**NULL RATHER THAN ZERO, EVERYWHERE**, because every figure has a state where it is genuinely
undefined and zero is a real answer to all of them: "0% complete" and "we do not know how
complete" look identical on a progress bar and mean opposite things. Three partial states, and
they are three SENTENCES because they send somebody to three different places — `no-budget` (add
cost codes), `no-plan` (draw one), `no-dates` (a cost story with no schedule story, where EV, CV,
CPI and EAC all still answer). **A plan nobody has started is a real 0 and earns nothing**, which
is why `percentComplete` is nullable rather than defaulted.

**Nothing divides by nought.** Nothing spent is not infinite efficiency — a project billed for
nothing is one whose invoices have not arrived — so CPI and EAC are null; before the start date
PV is nought and SPI over it is null rather than Infinity. One Gate A assertion guards every one.

**PLANNED VALUE IS A STRAIGHT LINE and the screen says so.** The real curve is the plan's own,
and the planner does not STORE task dates — it derives them in the browser from durations and
dependencies — so a truthful S-curve means running the scheduling engine server-side.

**THERE ARE TWO FORECASTS AND THEY ARE NOT THE SAME NUMBER.** `costing.forecast` is the LEDGER
one (spent plus ordered); `earned.eac` is the PERFORMANCE one (the budget at the cost rate so
far). In Gate A's own fixture they read 194,000 and 281,250. A screen showing one while calling
it the other is worse than showing neither, so the contract keeps them apart and the screen
labels both.

**SLICE 4 IS VARIATIONS** (`docs/functionality/variations.md`), and it adds **no permission
key** — a variation IS a contract's content, so it answers to `crmSales.contracts`, whose
`approve` verb was minted for exactly this when the register shipped.

**EVERYTHING EXCEPT A WAY IN ALREADY EXISTED.** The schema, the service, the route and the
approve/reject buttons were all written in P2, and nothing could RAISE a variation or SUBMIT
one — so none could ever reach `submitted`, and the answer path was unreachable code behind a
working-looking screen.

**THAT IS HOW A REAL DEFECT SURVIVED, and it is the lesson worth keeping.** The route passed its
whole request body where `answerChangeOrder` expects a boolean, so `{ action: "reject" }` — an
object, therefore truthy — **APPROVED the variation it was rejecting**, adding its value to the
contract. The compiler could not see it (a route handler's `body` is not statically typed) and
no test could reach it (the transition was unenterable). Gate A had **no change-order coverage
at all**; it does now, and the block that proves the fix is the coverage that was missing.

**Three acts, three verbs**, matching the service: raise/edit (POST/PUT), submit (draft →
submitted), answer (PATCH). Only the last carries invariant 7, asked of the OWNER in Gate A —
who holds every right in the product and is refused on identity alone. A draft is the only thing
that edits; both deltas are SIGNED because an omission is a variation too; and only APPROVED
variations move the contract value, which the register now says above the list.

**The deal id is the engagement's, not the ticket's** — a contract and a variation attach to the
engagement, whose dual-write mints its own id and leaves the derived one as an alias. Passing a
raw row id throws `no-engagement`, which is what the Gate A fixture hit first.

**A ROUTING BUG THE TESTS COULD NOT SEE, found by opening the screen.** The project board is a
FULL-SCREEN early return gated on a hand-typed list of third segments, so `/costs` rendered the
board instead of the cost breakdown — the branch further down was unreachable and nothing failed,
because both halves were individually valid. `tests/restructure.mjs` now reads both lists out of
the file and asserts every handled project segment is exempt.

**SLICE 5 IS BILLING MILESTONES AND RETENTION** (`docs/functionality/billing-milestones.md`),
and it is the MIRROR of slice 1 rather than more of it. Catalogue 149 → 153
(`projects.billing`).

**A PROJECT HAD A COST SIDE AND NO REVENUE SIDE.** Four slices built what a job is allowed to
cost, what has been ordered, what has been invoiced and how the work is performing against all
three. What it may BILL stayed a single number — `value`, copied at handover — with nothing
saying when any of it could be claimed. So a project could report itself twelve per cent over on
Plant and could not say what had been invoiced, which is the half that decides whether there is
money to be over WITH. **And retention existed nowhere at all:** a studio reading its invoiced
total as its expected cash was wrong by exactly what its clients were holding.

**ITS OWN AREA, and the axis is NOT the cost breakdown's.** `projects.costs` was split out
because "may run this job" and "may see what it is allowed to cost" are different powers.
Billing splits the same project the other way — a commercial manager raising applications for
payment needs none of the supplier costs, and a project manager watching spend needs none of the
client's payment schedule. Gate A pins it from the side that matters: somebody holding
`projects.costs.view` is refused the schedule by name.

**THE AMOUNT IS ABSOLUTE, never a percentage of the value.** A stored percentage would silently
re-price every line the moment `value` moved and give one number two sources; `unscheduled` is
surfaced instead, the exact counterpart of `unallocated`. The dialog offers "% of value" as an
ENTRY convenience that resolves to an amount and is then forgotten.

**THERE IS NO `Invoiced` STATUS.** A milestone is Pending or Ready; whether it has been billed is
DERIVED from the invoices naming it, because a stored flag and a real invoice part company the
first time one is cancelled. `InvoiceSchema` gained `milestoneId`, the exact mirror of
`costCodeId` on a bill — **deliberately unvalidated at the write**, because `projectBilling`
attributes only ids in THIS project's own milestone set, so a foreign or deleted id lands in
`unattributed` and is counted rather than believed. The containment is in the reader, where it
also covers deletion, which no write-time check could.

**NULL RATHER THAN ZERO ON RETENTION.** `releasable` is null when nobody has set a release date
and a real 0 when the date is in the future — "nothing is due yet" and "we do not know when
anything is due" are different answers. Releasing it is FINANCE'S act: retention becomes money
when somebody raises an invoice, and growing a second invoicing path out of a project screen
would be two ways to bill one client.

**A FIXTURE-ORDER BUG THE FEATURE DID NOT CAUSE, and it is the lesson worth keeping.** Sat inside
the projects block, this slice's Gate A section moved SIX goldens belonging to other modules:
`finance.invoice.raised` recorded INV-0003 because two invoices here had taken the first two
numbers, three `hr.list.*` goldens and `operations.board` named the newest collaborator it mints,
and `projects.direct.list.populated` grew a `retentionPercent`. No route changed in any of them.
The direct-projects block already documents the rule — this studio is SHARED and several goldens
are whole-studio snapshots — and the block sits immediately before "no golden is left behind"
now: after every section that records one, and before the check that counts them. **Seated after
that check instead, it failed by exactly its own nine names**, which is the check doing its job.
Two goldens change and both are the feature: `owner.roles` gains the area, and
`finance.invoice.raised` gains one line, `"milestoneId": ""`.

**P4a'S FOURTH SECTION IS OPEN: Procurement & Subcontracting**, and slice 1 is purchase
requisitions (`docs/functionality/requisitions.md`). Catalogue 153 → 159
(`procurement.requisitions`, with `approve`/`approveHigh` as EXTRAS on the same area).

**A PURCHASE ORDER APPEARS IN THIS PRODUCT WITH NOBODY HAVING ASKED FOR IT.** `materialOrders`
records a vendor, a project, lines and a cost code, and nothing about who needed the goods or
who authorised the money. So the only control a studio had over its spending was who held
`inventory.stock.create` — and a right cannot express a limit, so "the FD sees the big ones"
meant withholding ordering from everybody who handles the small ones. A requisition is the
first document that can be refused CHEAPLY: a bill asks "may I pay this" and a bid asks "may we
promise this", both after the commitment exists; this asks before there is one.

**IT IS P2'S ENGINE'S THIRD DOCUMENT TYPE, not a third engine.** Seeded chain: Procurement at 0,
a second step at **10000** — lower than a bill's 50000 because this is where the money is
stopped rather than where it is paid. Invariant 7 twice. **`Approved` and `Rejected` are not
moves**: `requisitionProblem` refuses them by name and `editRequisition` refuses a status
outright, because routing an answer through a generic edit is exactly the shape that let a
rejected change order approve itself. **No FX read at all** — a requisition carries neither the
supplier's currency nor the client's, so the amount is already in base and `rates` is null.

**CONVERSION REUSES INVENTORY'S `createOrder` RATHER THAN WRITING AN ORDER.** `openProject`'s
comment makes the argument: a second create path is a second place the engagement attach can be
forgotten. So `createOrder` gained a `requisitionId` — a fourth source beside quotation, direct
and tender — and **`Ordered` is DERIVED** from an order naming the request, so deleting the
order frees it again. Only an approved request, and only once. **A free-text requisition cannot
become an order at all** and refuses by name: `cleanLines` drops any line without a Registered
Item because an order moves stock, and an empty order would read as success and buy nothing.

**PURCHASE ORDERS STAY UNDER INVENTORY.** The programme spec assigns them here; moving the
collection would strand every existing order under the section it was written to — the tender
register's mistake at a larger scale — so it is a deliberate migration, not a side effect.

**AND THIS IS THE THIRD SECTION TO SHIP WITH NO STARTER GRANT AT ALL.** Procurement had none —
not even `procurement.suppliers`, on the nav since the restructure — after contracts and
tendering had the same defect: a section whose own Manager cannot open it, each found by
somebody tripping over it. Fixed here (Manager gets suppliers and requisitions; `approveHigh`
deliberately not seeded), and it moves three `hr.list.*` goldens by `permissionCount` 58 → 67.
**Nothing asserts this property**, which is why it has happened three times; the guard belongs
beside `testNoAreaExistsForASectionWithNoScreen` as its mirror — a section WITH a screen must be
reachable by some seeded role — and is best written as a SHRINK-ONLY count rather than an
exemption list, so the two deliberately owner-only Administration sections are absorbed without
being named.

**P4a's second section is complete: Tendering & Estimating.** The root was declared at the
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

**AND THE SHEETS FILL FROM THE BILL.** A sheet stores no lines — it composes a DOCUMENT's
tables with what Inventory added to them, keyed by row id — and that document could only ever
be a quotation, so a handed-over project had its pair of sheets and nothing in them. The bill is
offered in the same `{ tables }` shape now (`boqAsTables`, pure, in `modules/tendering/boq`), so
`composeSheet` reads ONE shape and there is no second composition path free to disagree with the
first. The bill's GROUPS become the tables, in the document's order — the one thing a bill is
never allowed to lose, now carried through to whoever is buying the work.

**Nothing is copied and no rate crosses.** The rows come off the bill on every read, so a line
corrected in Tendering shows on the sheet immediately; and `composeSheet` carries only the
fields it names while `boqAsTables` returns only the fields it names, so what the studio priced
the bid at stays in Tendering — the same rule that drops a quotation's prices at the point of
reading, asserted from both ends.

**`itemId` IS BLANK AND THAT IS THE TRUTH, not a gap.** A quotation row names a Registered Item,
which is what makes serial allocation and vendor grouping work; a bill line is a description, a
unit and a quantity priced against nothing anybody has bought yet. So Main reads exactly as it
should and **Bulk degrades honestly** — every line stands alone under "No vendor yet", which
`composeSheet` already does for any row with no item. There are three kinds of empty sheet now
and the viewer says which.

**AND THE BILL FREEZES ON HANDOVER.** All three writes — add, edit, remove — refuse with
`handed-over`, because the project's `value` was COPIED at handover while its sheets follow the
bill LIVE: a line edited afterwards moved what the buyers work from and left the headline figure
behind it. DERIVED from the projects, never a flag on the tender, so deleting the project thaws
the bill rather than locking it forever against work nobody is doing. The cost is one `where`-
narrowed read per write, paid deliberately on the section's busiest write (the grid saves a cell
at a time) because a wrong number carried into a project is not worth a saved round trip. The
grid goes read-only and SAYS why — a grid that has quietly stopped accepting edits reads as
broken.

**Three guards caught real mistakes in this slice, each named in the file that caught it.**
`next build` refused until `tenders` was in `COLLECTION_TABLE` (`platform/db/migrate/mapping.ts`)
— the same guard that once caught `contracts`. The permission matrix refused a
`tendering.dashboard` nothing enforces: `DASHBOARD_MODULES` is the list of modules that HAVE a
dashboard, not a list of group labels, and an area carries its own `group` string. And ESLint's
`no-undef` found a per-block Gate A helper (`personWith`) my block had borrowed without
declaring — it had thrown AFTER writing its earlier goldens, so **the run read as "0 failures"
while having crashed**. Exit code and "gate A: all passed" are the signals; a FAIL count alone
is not.

**DEPARTMENTS ARE REAL RECORDS, AND A ROLE BELONGS TO ONE.** Live behaviour on every
studio, and it adds NO permission key — the catalogue stays at 159.
`docs/functionality/departments.md` and `roles.md` are the files.

**The DEPARTMENT dropdown was listing the fifteen sections.** A section is what the product
does; a department is how a company is arranged, and a contractor has no "Reports & BI"
department. Departments are their own collection under Administration — Master data now,
seeded per field of work, with a parent and a manager. **A department's `sectionKeys` grants
NOTHING** — it decides where a role is listed and what it is for, never what it may reach.
That line is held on both screens deliberately: constraining the permission grid by a
department's sections would be a second mechanism deciding access, free to disagree with the
roles that already decide it.

**A studio no longer starts with five generic roles.** `STARTER_ROLES` is Admin alone. The
five existed for a good reason that has not gone away — an empty permission grid is where
over-granting begins, and faced with 177 unchecked boxes people tick everything. What changed
is who answers it: a seeded department brings up to ten roles from its own trade, so a new
studio meets Site Engineer under Site Execution rather than "Member".

**Eleven archetypes, not 2,900 permission lists.** The library is ~3,000 job titles across the
25 fields, generated from `docs/research/industry-roles.md`, **server-only** — a few hundred
kilobytes for a list a picker needs twenty rows of, and Gate A asserts no client component
imports it, because a client import would fail nothing and quietly spend a sixth of the
budget. Each entry names one of eleven access shapes. Eleven rather than 2,900 because the
catalogue has changed at least twelve times (102 — 177 keys) and each change would have
staled 2,900 hand-written lists SILENTLY, surfacing only as somebody holding the wrong access.
**A library role's permissions are COPIED on add** — the BOQ rate rule, for the BOQ rate's
reason. **`principal` is not a wildcard**: the model allows exactly one and it is Admin, so
principal is every area at full deliberately WITHOUT `administration.access`. Running the
company and deciding who may do what are different acts.

**Two bugs worth the space, both invisible to every gate.** `listRoles` seeds the starter role
only into an EMPTY list, so creating a department's roles first left a studio with a hundred
roles and no Admin at all — which surfaced as `cannot give yourself the Admin role: got 200`,
nothing like an ordering problem. Admin is read before any library role is written now. And the
picker, handed neither a field of work nor a department, had nothing to narrow by and offered
Farm Operations Manager to a sales department; both the read AND the write refuse without both
narrowings, or a stale screen could add what the picker would not offer.

**THE ROLLOUT CONSEQUENCE:** existing studios still hold Manager, Team Lead, Member and
Viewer. `scripts/migrate/departmental-roles.mjs` removes them — dry-run by default, by role
id rather than name, and it **refuses a studio where anybody still holds one**, whole rather
than partially: a studio left holding Manager alone is halfway between two role models. The
exit is a person re-roling those people, because the only way a script could clear the refusal
itself is by guessing which departmental role each person should hold, and that guess is
somebody's access. **It has not been run against live, not even in the sandbox.** Four goldens
were re-recorded for the department a role now carries.

**The department on a library entry is ~95% accurate and REPORTED, not certified** —
`node scripts/generate/role-library.mjs --report` prints the per-department spread and how many
assignments fell back to a default rather than matching a rule.

**P4b PHASE 1 IS ON `main`: A RECORD TYPE IS A ROW, and the engine supplies the rest.**
`docs/functionality/record-engine.md` is the file. `recordTypes` holds a type's label,
fields, list columns, statuses and transitions; `engineRecords` holds every instance of
every type in ONE collection, discriminated by `typeKey`, because `COLLECTION_TABLE` and
`keys.ts` are compile-time and a collection per type would need a deploy per type — the
exact thing runtime was chosen to avoid. One route
(`/api/studios/<slug>/records/<typeKey>`, the type read from the URL segment and never
the body), one generic screen, one built-in type (`transmittal`, under Engineering &
Documents), seven goldens, and the sub-section planted in the SAME write as the type row
— the tender register paid for the other order.

**IT ADDS NO PERMISSION KEY AND NEVER WILL — the catalogue still reads 177.**
`engine.<typeKey>.<verb>` is structural, minted from a row, so it cannot be in
`ALL_PERMISSIONS`; `isEnginePermission` is the one place the catalogue stops being a
closed set, and `cleanPermissions` used to drop such a grant SILENTLY. The wildcards had
to learn the shape too: `new Set(ALL_PERMISSIONS)` answered false for every engine key, so
the owner was refused a GET of their own transmittals AND `escalates()` refused the owner
GRANTING the right to anybody. `WildcardPermissions` answers rather than lists — **`has`
is the authority, `size` and `[...access]` are not**, and both report the declared
catalogue alone.

**THE ONE THING A FUTURE SESSION MUST NOT DO IS DECLARE A SECTION ROOT OR PERMISSION AREA
NAMED `engine`.** The whole namespace rests on `engine.` and `engine-` belonging to the
engine alone — `engineeringDocs.*` and `engineering-docs` are adjacent and distinct only
because the prefix carries the dot and the hyphen, which is why the inverse is a regex and
not a `startsWith("engine")`. Nothing in the build would complain; every engine right and
every engine section would start answering for something else.

**THE ROLLOUT CONSEQUENCE:** `seedBuiltinTypes` runs inside `createStudio` and NOWHERE
ELSE, which is the one way it differs from the seeds beside it — sections catch up on read
and departments seed on read, so a studio predating either repairs itself. **No existing
studio has the built-in type, and a read-path catch-up could not give it one:** the
catch-up would be gated on `engine.transmittal.view`, which no existing role holds, so the
seed would wait on a door only the seed can open.
`scripts/migrate/seed-builtin-types.mjs` is the way in — dry-run by default, additive,
idempotent, calling `seedBuiltinTypes` rather than copying it, and needing
`plant-sections.mjs` first on a studio short of `engineering-docs`. **It has not been run,
not against live and not in the sandbox.** And **no starter role holds an engine right**,
stated here rather than discovered: contracts, tendering and procurement each shipped a
section their own Manager could not open.

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
