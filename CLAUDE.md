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

1. **Keys are built only in `src/lib/data/keys.js`.** Never a literal, never a
   template at a call site. Two incidents came from this: `sweepOrphans` reaped
   `"u:"`/`"s:"` and would have prefix-deleted production, and `lib/media.js` wrote
   `g:media:<id>` so the test suite put real blobs in the live key space. The suite
   asserts every builder is namespaced — a new builder is covered automatically, a
   new literal is the third incident.
2. **Membership authorises; the URL never does.** A slug names a tenant. A non-member
   learns nothing — "not found" and "not a member" render identically, on purpose.
3. **Access is resolved once**, in `effectivePermissions` (`src/lib/access.js`), and
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
16. **A right nothing can exercise is a bug.** Three violate this today (M-1).

---

## Working against the live Redis

`REDIS_URL` is a **live, shared** Redis Cloud instance. There is no dev database.

- Tests run under `NOMPANY_KEY_PREFIX` and sweep that namespace at the end.
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
npm test            # integration suite: real routes, real Redis, prefixed namespace
npx tsc --noEmit
npx next build
```

- **Golden responses are the contract.** If a response body changes, the change is
  wrong until deliberately re-recorded in its own commit with a stated reason.
- **Hop counts are part of the contract.** A route regressing from 2 Redis round trips
  to 8 fails the build.
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
`stylis-plugin-rtl` is **not** installed, so MUI still renders LTR inside Arabic pages —
known gap.

**Browser-pane trap:** the pane does not composite unless displayed, which freezes CSS
transitions, so `getComputedStyle` returns stale mid-transition colours. Inject
`*{transition:none!important}` before measuring anything with `transition-colors`.

---

## Current state

Wave 0 of `docs/execution-plan.md` is complete — the orphan-sweep guard, credential
rate limiting, console session expiry, traffic-ingest bounds, media tenancy, security
headers. **Gate A is next**: golden responses for all 97 routes, a permission matrix
over all 104 keys, hop-count assertions, CI. Nothing in Wave 2+ starts until it is
green.

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
