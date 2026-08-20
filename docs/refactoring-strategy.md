# Refactoring Strategy

**Goal:** maximise execution speed and minimise bugs while holding **exact functional parity** for every existing procedure.

**Non-goal:** changing what the product does. Every behaviour listed in `system_architecture.md` §14 is preserved, including the ones that look like quirks — the automated ticket status ladder, "not found" and "not a member" rendering identically, Sales reading Technical's records without a Technical grant, the owner short-circuit in `effectivePermissions`. If a refactor changes any of those, it is a defect in the refactor.

---

## 1. Parity is a mechanism, not an intention

Nothing below ships until parity can be *proved*, not asserted. Three mechanisms, in this order.

### 1.1 Freeze the behaviour first — the characterisation harness

The repository already has an integration suite (`tests/suite.mjs`, 90 KB) that drives the **real** route handlers against the **real** Redis inside a key prefix. That is the right foundation and it is already load-bearing. Extend it before touching a line of production code:

- **Golden-response tests** for all 97 routes: for each, a fixture studio, a request, and the exact JSON response and status recorded. These are the parity contract. A refactor that changes a field name, a null-vs-empty-string, or a status code fails.
- **Permission matrix tests**: for each of the 104 permission keys, one collaborator holding exactly it, asserting allow on the intended route and deny on its neighbours. This is what stops a refactor of `effectivePermissions` from quietly widening access.
- **Concurrency tests** on `editArr` — N parallel writers on one collection, asserting every write survives — kept, because the CAS is the thing most likely to be "optimised" wrongly.
- **A hop-count assertion** per route (see `performance-audit.md` §8): the Redis command tally is part of the contract, so a batching regression fails the build.

### 1.2 Wire CI

There is no `.github/` in the repository today. Nothing enforces that the suite stays green.

```
.github/workflows/ci.yml
  ├ typecheck   tsc --noEmit
  ├ lint        eslint (config to be added — M-12)
  ├ test        the characterisation suite against an ephemeral Redis service container
  └ budget      client bundle size ceiling
```

The suite currently needs a live Redis. Point CI at a `redis:8` service container rather than the shared production instance; the key-prefix isolation stays as the second line of defence, not the first.

### 1.3 Refactor in strangler slices

Never a big-bang rewrite. Each slice: introduce the new seam, route **one** caller through it, prove parity, then move the rest. The old path stays until the last caller leaves.

---

## 2. What actually needs refactoring

The codebase is not badly written. Its problems are **structural** — a handful of seams that do not exist, causing the same code to be written many times. Fixing the seams removes far more lines than reorganising the modules would.

### 2.1 Seam A — the route wrapper

**Problem.** 97 route files each repeat: parse params, `currentUser()`, null-check, resolve context, map error strings to status codes, parse the JSON body with a try/catch, map service errors to status codes. The mapping is *inconsistent* — `notfound` is 404 in some files and 403 in others, `ConflictError` is 500 everywhere (H-7), and `read-only` versus `forbidden` is decided differently by the coarse gate and the service.

**Refactor.**

```js
// src/server/route.js
export const route = (spec) => async (request, ctx) => {
  const rid = crypto.randomUUID();
  return withRequestCache(async () => {
    try {
      const params = await ctx.params;
      const auth = await spec.auth(request, params);        // user | super | cron | public
      if (auth.fail) return auth.fail;
      const body = spec.body ? await parseBody(request, spec.body) : undefined;
      const result = await spec.handle({ ...auth, params, body, request, rid });
      return Response.json(result);
    } catch (e) {
      return toResponse(e, rid);      // ConflictError → 409, ZodError → 400, else 500 + log
    }
  });
};
```

with **one** error table:

| Error | Status |
|---|---|
| `unauthorized` | 401 |
| `notfound`, `no-section` | 404 |
| `forbidden`, `read-only`, `escalation`, `role-forbidden` | 403 |
| `unknown-permission` | 500 (a programming error, not a user one) |
| `ConflictError` | **409** |
| validation failure | 400 |
| anything else | 500, logged with `rid` |

**Payoff.** Removes ~1,200 lines of duplicated boilerplate, fixes H-7 in one place, and gives every response a request id — the precondition for observability. It also becomes the natural home for the request-scoped cache (`performance-audit.md` stage 2), idempotency keys, and the audit-log write (H-11), each of which is otherwise 97 edits.

### 2.2 Seam B — the repository interface

**Problem.** `src/lib/data/*` is already a clean data layer, but the service modules reach past it: they call `readCol` and then filter, sort, join and paginate in JavaScript. Every query the product performs is therefore expressed as "fetch everything, then use `Array.prototype`". That is what makes the SQL migration look like a rewrite.

**Refactor.** Introduce an explicit query vocabulary that Redis can satisfy today and SQL can satisfy natively later:

```js
// src/lib/data/repo.js — the ONLY thing services call
export function repo(collection) {
  return {
    byId(ctx, id),
    find(ctx, { where, order, limit, cursor }),
    count(ctx, { where }),
    create(ctx, row),
    update(ctx, id, patch),      // patch may be a function — the CAS semantics are preserved
    remove(ctx, id),
  };
}
```

The Redis implementation reads the collection and applies `where`/`order`/`limit` in memory — **identical behaviour to today, byte for byte**. Nothing gets faster in this step, and that is the point: it is a pure lift, provable by the golden tests. The SQL implementation later translates the same calls into indexed queries. Services never change again.

`where` is a small declarative shape (`{ field: value }`, `{ field: { in: [...] } }`, `{ field: { gte: x } }`) — deliberately not a predicate function, because a JavaScript predicate cannot be translated to SQL.

**Payoff.** This is the single highest-leverage refactor in the plan. It is what turns the database migration from "rewrite the application" into "write a second adapter".

### 2.3 Seam C — the module context

**Problem.** Ten near-identical `*Context` functions (`salesContext`, `hrContext`, `financeContext`, …), each ~50 lines, each re-reading sections, each resolving the same six flags with slightly different names (`canManage`, `canManageTickets`, `canViewDashboard`, `manage`, `nav`).

**Refactor.** One factory:

```js
// src/lib/modules/context.js
export const moduleContext = (spec) => async (user, slug) => {
  const base = await studioContext(user, slug);           // sections come from HERE — no re-read
  if (base.error) return base;
  const byKey = indexBy(base.sections, "key");
  const root = byKey[spec.root];
  if (!root) return { error: "no-section" };
  if (!sectionViewable(base.access, root.key, base.sectionKeys)) return { error: "forbidden" };
  return { ...base, root, sub: spec.sub(byKey), ...deriveFlags(base.access, spec, base.sectionKeys) };
};
```

Each department then declares only what is specific to it:

```js
export const salesContext = moduleContext({
  root: "sales",
  sub: (k) => ({ tickets: k["sales-tickets"] ?? k.sales, clients: k["sales-clients"] ?? k.sales, … }),
  reads: ["technical", "tasks", "projects"],   // the cross-department reads, declared not improvised
});
```

**Payoff.** ~450 lines removed, hop 7 eliminated everywhere at once, and the cross-department reads become **declared** rather than rediscovered per module — which is the same argument `relations.js` already made for the record graph, applied to the context graph.

### 2.4 Seam D — validation at the boundary

**Problem.** Every service hand-writes coercion: `String(x || "").trim().slice(0, 120)`, repeated hundreds of times with varying limits. Some fields are clamped, some are not. There is no single place that says what a valid ticket is.

**Refactor.** One schema per collection (Zod or Valibot — Valibot if bundle size matters, since some schemas are shared with the client), used for **three** jobs: parse the request body, derive the TypeScript type (`typescript-modularization.md`), and generate the SQL column definition (`database-migration-mssql.md`). One declaration, three consumers, no drift.

Parity rule: each schema's limits must be transcribed from the existing code, not chosen fresh. Where two call sites currently disagree on a limit, the golden test records today's behaviour and the schema reproduces it — divergences get fixed deliberately, in their own commit, not as a side effect.

### 2.5 Seam E — split the monolithic modules

`StudioSales.js` is 69 KB, `StudioProjects.js` 68 KB, `StudioInventory.js` 63 KB — each a single `"use client"` file containing a dashboard, several tables, a dozen dialogs, filter state and fetch logic. They are the reason the client bundle is 1.06 MB gzipped.

Split per module into: a **server** shell that fetches, a **table** client island, **dialog** islands loaded on demand, and a **pure** logic file (filters, derivations, totals) that is unit-testable without React. Detailed in `ui-ux-overhaul.md` §6; listed here because the split is a refactor, not a redesign, and can land before any visual change.

---

## 3. Speed work that is pure refactor

These change no behaviour and need no schema change. Each is a `performance-audit.md` action expressed as a code change:

| # | Change | Where |
|---|---|---|
| R1 | Pass `sections` down from `studioContext`; delete every re-read | 10 `*Context` files + `api/studios/[slug]/route.js` |
| R2 | Move `plantMissingSections` to studio creation + one-off backfill | `data/sections.js` |
| R3 | Request-scoped read cache keyed by Redis key | `data/store.js` + the route wrapper |
| R4 | Batch the two prefetch waves (`MGET`) | new `server/prefetch.js` |
| R5 | Widen `ix:slug:<slug>` to carry the studio document; drop the `g:studios` hop | `data/studios.js` |
| R6 | Move `lastSeenAt`/`lastLoginAt` off `g:users` | `data/users.js` |
| R7 | Targeted row patch on live events instead of full refetch | `useLiveUpdates` + one route per module |
| R8 | `ConflictError` → 409 | the route wrapper (R0) |
| R9 | Hoist `getProfile` N+1 into one batched read | `hr.js`, `data/users.js` |

R1, R2, R6, R8 and R9 are each under an hour and independently shippable.

---

## 4. Bug-class elimination

Speed is one half; the other is making whole categories of defect unrepresentable.

| Bug class | Prevention |
|---|---|
| A route forgetting an auth check | The route wrapper requires an `auth` spec — there is no way to define a route without one. |
| A service forgetting `requirePermission` | The repository's `create`/`update`/`remove` take a `ctx` carrying `access` and the area key, and refuse without one. |
| Inconsistent status codes | One error table. |
| Silent lost updates | Already prevented by CAS. **Preserve it** — the repository's `update` must keep accepting a function patch. |
| Cross-tenant leakage | `ctx` carries `studioId`; the repository builds every key from it. A repository call cannot name another tenant's key. |
| Unvalidated input | Schema at the boundary; the handler receives a parsed value or never runs. |
| Prefix-unaware key handling (**C-1**) | All key construction moves behind `keys.js`; `scanPrefix`/`delPrefix` refuse a prefix that does not start with `KEY_PREFIX`. |
| Dead capabilities (**M-1**) | A CI check asserting every key in `ALL_PERMISSIONS` appears in at least one `requirePermission`/`can` call, and every key builder in `keys.js` has a reader. Fails on `quality.documents.share`, `activityLog` and `ix:stoken` today — which is the point. |
| Regressed hop counts | The hop-count assertion in the golden tests. |

---

## 5. Order of work

Each phase ends green, deployable, and behaviour-identical.

**Phase 0 — Make parity provable.** Golden responses for all 97 routes; permission matrix; hop-count assertions; CI with an ephemeral Redis; ESLint config. *Nothing else starts until this is green.* Also ship the C-1 prefix guard here — it is 10 lines and must not wait behind a refactor.

**Phase 1 — Seam A (the route wrapper).** Convert routes in dependency order: identity → studios → one department at a time. Golden tests must not move.

**Phase 2 — Seams C and D (context factory, schemas).** One department at a time, Sales first because it has the most cross-department reads and therefore exercises the factory hardest.

**Phase 3 — Speed refactors R1-R9.** Now cheap, because they land in the wrapper and the factory rather than in 97 files. Hop-count assertions prove each one.

**Phase 4 — Seam B (the repository).** Redis adapter only, behaviour identical. This is the biggest single diff and the one the golden tests exist for.

**Phase 5 — Seam E (component split).** Runs in parallel with 1-4 since it touches no server code.

**Phase 6 — TypeScript.** `typescript-modularization.md`. Deliberately after the seams: typing a stable interface once is far less work than typing a moving one twice.

**Phase 7 — SQL adapter.** `database-migration-mssql.md`. Only the repository changes.

---

## 6. What must not be refactored away

Some of this code looks redundant and is not. Each of these was written to fix a real failure, and a "cleanup" that removes one reintroduces it:

- **The CAS in `editArr`/`editJSON`.** Including the flat, small backoff — exponential backoff is actively wrong for a draining queue with one winner per round.
- **`bumpCounter`'s floor argument.** It is what makes the counter self-seeding for studios created before it existed, with no migration to run.
- **The `emit` ordering:** `XADD` strictly before `publish`. The id is the client's cursor.
- **One Redis subscriber connection per process.** Connection count is the deployment's hard ceiling.
- **One `EventSource` per tab, not per hook.** Browsers cap 6 connections per domain on HTTP/1.1 and `useLiveUpdates` has 21 call sites.
- **`Last-Event-ID` replay.** Remove it and every reconnect silently drops events.
- **The `escalates()` check at *both* doors.** The join-approval door is the one that was missing.
- **The reviewer ≠ approver rule in `signables.js`.** It cannot move into the permission model: holding both rights is legitimate, using both on one record is not.
- **`cronDenied` failing closed.** `if (secret && …)` deletes the check when the variable is unset.
- **Rendering "not found" and "not a member" identically.**
- **Deletion order: children first, registry last.** It is what makes a crashed cascade idempotent.
- **`KEY_PREFIX` on every key builder** — and it must be extended to `sweepOrphans`, not removed from the others.
