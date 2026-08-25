# nompany — working notes

Multi-tenant ERP. Next.js 16 · React 19 · Redis · Tailwind v3 + shadcn/ui + MUI v9 · Vercel.
Three surfaces in one app: the tenant ERP at `nompany.com/<slug>/…` (rewritten by
`src/proxy.js` → `src/app/studio`), account pages at `/{en,ar}/…`, and nompany's own
console at `/super`. Twelve departments: Main, Sales, Technical, Projects, Inventory,
HR, Finance, Operations, Quality, Tasks, People, Access.

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
    shared — Redis now, SQL Server next — so a delete, flush, drop or mass-overwrite
    is unrecoverable and hits every tenant at once. A broad-scan delete
    (`delPrefix("")` / `scanPrefix("")`) once wiped the whole instance. So any such
    action waits on the user confirming it **twice in the same exchange**: the first
    answer authorises the plan, the second — asked back with the exact scope spelled
    out — authorises the run. `FLUSHDB`/`FLUSHALL`/`SCRIPT FLUSH`/`CONFIG SET`, an
    empty-or-unbounded prefix, and `sweepOrphans()` from a test or script are never
    run at all. When a twice-confirmed deletion does proceed: export first, delete by
    an explicit key list, re-scan to prove it. Verification stays read-only by
    default. (Directive 7 in every `.claude/agents/*.md` says the same.)

---

## The agent team

Eight agents in `.claude/agents/`. Each file carries the same **Global Directives**
section — byte-identical in all eight, so edit it in all eight or not at all — and
then its own **Domain Workflow** and **Constraint log**.

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

**`operations-integration` and `devops` were one agent, and it was two-headed by
accident.** The record departments stayed whole; the pipeline moved out. The seam:
`devops` provisions the credential, the schedule, the timeout and the retry;
`operations-integration` decides what the response does to a shipment, an invoice or
a cost. A carrier integration runs `researcher` → `devops` → `operations-integration`,
in that order, never concurrently on one file.

The directives that bind everyone: teach yourself from the codebase; consult
`researcher` before adopting anything new; never duplicate, and trace every dependant
before removing; summarise accepted work against the user's acceptance criteria; log
constraints — major ones to `orchestrator`'s global list, minor ones to your own
file; and end every message with real questions.

---

## Where the code lives

Wave 3 is moving `src/lib` apart, one folder per step, and each folder becomes
TypeScript as it lands. What has moved has moved for good:

| Folder | Holds | State |
|---|---|---|
| `src/shared/**` | Pure values with no dependants — currencies, countries, i18n, slug | TypeScript |
| `src/platform/access/**` | The permission catalogue and the resolver | TypeScript |
| `src/platform/db/**` | Everything that knows Redis exists — keys, store, cascade, repo, sections | TypeScript |
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
  first is the one that matters: the LARGEST CHUNK is 197 KB gz against a 250 KB
  ceiling, because that is what every route pays. Total client JS is 1529 KB gz
  against 1600 KB, which catches sprawl rather than splitting. The studio's
  department screens are `nextDynamic()` now — the chunk fell from 307 to 197 and
  the total rose 12 KB in the same commit, which is the two ceilings doing their
  job. Lower the chunk ceiling further as the screens are rewritten. (This line
  said 1091/1200, then 305/400, as the script moved on — a stale number in the
  invariants file is worse than none.)
- Tests connect things — real repositories, real route handlers, **one assertion per
  bug that actually happened**. Each block names the defect it guards, so nobody
  deletes it later wondering what it was for.

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
**MUI mirrors now.** A studio's language is a field on the tenant's record
(`studioLocale`), the SHELL declares `lang`/`dir` rather than `<html>` — the root
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

Dates render through `fmtDate`/`fmtDateTime` in `src/lib/format.js`, which resolves the
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

**Browser-pane traps**, two of them, both paid for:

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

Wave 0 of `docs/execution-plan.md` is complete — the orphan-sweep guard, credential
rate limiting, console session expiry, traffic-ingest bounds, media tenancy, security
headers, bcrypt 12 with rehash-on-login, and the dead capabilities in M-1 deleted.

**Gate A is in progress.** Done: the golden harness, the permission matrix over 102
keys, hop counting, six architectural assertions, CI, the bundle budget. Remaining:
goldens for Finance, Operations, Tasks, Quality and `/super` (88 recorded so far),
per-route permission enforcement beyond Sales, an ESLint config, and observability.
Nothing in Wave 2+ starts until Gate A is green.

Two decisions still open: whether `login()` should check `suspended` before or after
verifying the password (it is an enumeration oracle today), and whether the dead
share-link capability is built or deleted.

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
