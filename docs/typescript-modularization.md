# TypeScript Modularization

**Target:** the whole application in TypeScript, structured by **departmental module**, with cross-references that are explicit, typed, and enforced by tooling rather than convention.

---

## 1. Where the repository is today

| | Count |
|---|---|
| `.js` / `.jsx` | 396 |
| `.ts` / `.tsx` | **35** |
| Total LOC | 61,890 |

TypeScript already exists as **one island**: the Quality document application (`components/quality/**`, `lib/docs/*`, `hooks/use-font-catalog.ts`) plus the shadcn primitives in `components/ui/*` and `api/fonts/route.ts`.

`tsconfig.json` says so explicitly:

```jsonc
"//": "TypeScript covers the document application only. The rest of the repo is plain JavaScript and stays that way",
"allowJs": true,
"checkJs": false,
"strict": true,
"noImplicitAny": false
```

**Three things to fix before anything else:**
1. `jsconfig.json` is dead — Next ignores it when `tsconfig.json` exists (M-13). Delete it.
2. `components.json` declares `"tsx": false` while every file in `components/ui/` is `.tsx` (M-6). Set it to `true` and `"cssVariables": true`, so `npx shadcn add` stops emitting the wrong thing.
3. `noImplicitAny: false` is the compromise that made the island possible. It comes back on per-module, at the end of each module's migration — never repo-wide in one step.

---

## 2. The target structure — departments, not layers

Today the tree is organised by **kind** (`lib/`, `components/`, `app/api/`), so one department is scattered across three trees: `lib/sales.js`, `components/studio2/StudioSales.js`, `app/api/studios/[slug]/sales/`. A change to Sales touches all three and nothing declares that they belong together.

The target inverts it: **the module is the unit, the layers live inside it.**

```
src/
├─ modules/
│  ├─ sales/
│  │  ├─ index.ts              ← THE PUBLIC SURFACE. Nothing else is importable.
│  │  ├─ schema.ts             Zod/Valibot: SalesTicket, SalesClient, SalesService
│  │  ├─ types.ts              inferred from schema + the module's own view models
│  │  ├─ context.ts            salesContext, built on the shared moduleContext factory
│  │  ├─ service.ts            listTickets, createTicket, requestRfq, sendForApproval…
│  │  ├─ repo.ts               thin: repo("salesTickets") bindings
│  │  ├─ permissions.ts        the module's slice of the catalogue
│  │  ├─ routes/               the route handlers, using the shared wrapper
│  │  └─ ui/
│  │     ├─ SalesScreen.tsx        server component — fetches, renders shell
│  │     ├─ TicketTable.tsx        client island
│  │     ├─ TicketDialog.tsx       client island, lazily imported
│  │     ├─ TicketTable.skeleton.tsx
│  │     └─ derive.ts              pure: filters, totals, summaries — unit-testable, no React
│  ├─ technical/  projects/  inventory/  hr/  finance/  operations/  tasks/  quality/  main/
│  └─ people/                     collaborators, roles, join requests, access
│
├─ platform/                   ← what every module may depend on
│  ├─ db/                      store, keys, cascade, repo interface  (was lib/data/*)
│  ├─ auth/                    identity, sessions, superAuth
│  ├─ access/                  permissions catalogue + resolver
│  ├─ realtime/                bus, events, sse
│  ├─ notify/                  notifications
│  ├─ http/                    the route wrapper, error table, idempotency
│  └─ relations/               NODES, EDGES, pathBetween  (was lib/relations.js)
│
├─ ui/                         ← design system: tokens, primitives, patterns (see ui-ux-overhaul.md)
├─ app/                        ← routing ONLY. Every page/route re-exports from a module.
└─ shared/                     currencies, countries, i18n, format — pure, no I/O
```

**`src/app` becomes routing and nothing else.** A route file is one line:

```ts
// src/app/api/studios/[slug]/sales/route.ts
export { GET, PUT } from "@/modules/sales/routes/index";
```

This keeps Next's file-system router (which cannot move) from dictating the code's organisation (which can).

---

## 3. The cross-reference rules

The hard part of departmental modularisation is not the folders. It is that Sales legitimately reads Technical's RFQs, Tasks' approvals and Projects' rows — and that must stay possible without letting every module reach into every other.

**Four rules, all machine-checkable.**

### Rule 1 — Modules talk only through `index.ts`

`modules/sales/service.ts` may import `@/modules/technical` but never `@/modules/technical/service`. Enforced by `eslint-plugin-boundaries` (or `import/no-restricted-paths`):

```js
// eslint.config.js
{
  zones: [
    { target: "src/modules/*/!(index.ts)", from: "src/modules/*/!(index.ts)", except: ["./**"] },
    { target: "src/platform/**",           from: "src/modules/**" },   // platform NEVER imports a module
    { target: "src/shared/**",             from: ["src/modules/**", "src/platform/**"] },
    { target: "src/ui/**",                 from: "src/modules/**" },   // the design system knows no domain
  ]
}
```

### Rule 2 — Cross-department reads are **declared**, not improvised

`relations.js` already established this for the record graph: nodes and edges are data, so a missing edge is visible and a business rule lives in one place. The same idea, applied to modules:

```ts
// modules/sales/index.ts
export const SALES = {
  key: "sales",
  reads: ["technical", "tasks", "projects"] as const,   // ← the declaration
  writes: [] as const,                                   // Sales writes nobody else's records
} satisfies ModuleManifest;
```

A lint rule cross-checks the manifest against actual imports: importing `@/modules/finance` from Sales fails the build unless `"finance"` is in `reads`. This makes the dependency graph a reviewable artifact instead of something you discover by grepping.

It also encodes the invariant `sales.js` already states in prose — *"Sales never WRITES them"* — as something a compiler can hold.

### Rule 3 — Shared *types* never travel through a module

When Sales needs to render an RFQ badge it imports the **type** from `@/modules/technical`, not a duplicate shape. When two modules genuinely share a concept that belongs to neither (`Money`, `CurrencyCode`, `IsoDate`, `StudioId`), it lives in `shared/` — and branded primitives are worth it here:

```ts
export type StudioId       = string & { readonly __brand: "StudioId" };
export type CollaboratorId = string & { readonly __brand: "CollaboratorId" };
export type UserId         = string & { readonly __brand: "UserId" };
```

This is not ceremony. **The most consequential id confusion in this system is `CollaboratorID` vs `UserID`** — notifications are addressed to CollaboratorIDs, `ix:collab` is keyed by UserID, and `notifyCollaborators`' doc comment has to say *"CollaboratorIDs (never UserIDs)"* because nothing else prevents it. A branded type makes that comment unnecessary and the mistake uncompilable.

### Rule 4 — One schema, three consumers

Each collection has exactly one runtime schema. It produces the TypeScript type, validates the request body, and (later) generates the SQL column definitions:

```ts
export const SalesTicket = v.object({
  id: v.pipe(v.string(), v.brand("TicketId")),
  studioId: StudioIdSchema,
  sectionId: SectionIdSchema,
  ref: v.pipe(v.string(), v.maxLength(40)),
  title: v.pipe(v.string(), v.trim(), v.maxLength(200)),
  clientId: v.optional(ClientIdSchema),
  status: v.picklist(TICKET_STATUSES),
  urgency: v.picklist(TICKET_URGENCIES),
  value: v.pipe(v.number(), v.minValue(0)),
  createdAt: IsoDateTime,
});
export type SalesTicket = v.InferOutput<typeof SalesTicket>;
```

The type and the validator cannot drift, because there is only one of them.

---

## 4. Typing the seams that matter

Three signatures carry most of the value. Get these right and the rest is mechanical.

**The permission key** — a union, not `string`. 104 literals, generated from the catalogue:

```ts
type Verb = "view" | "create" | "edit" | "delete";
export type PermissionKey =
  | `${AreaKey}.${Verb}`
  | "technical.rfq.convert" | "technical.quotations.lock" | "technical.quotations.unlock"
  | "hr.employees.salary"   | "hr.vacations.approve"
  | `quality.documents.${"setup"|"review"|"approve"|"publish"|"obsolete"|"share"}`;
```

A typo in `requirePermission(access, "sales.ticket.edit")` — singular — becomes a compile error. Today it returns `{ error: "unknown-permission" }` at runtime, on a path nobody may ever exercise.

**The module context** — generic over its sub-sections, so `ctx.sub.tickets` is typed and `ctx.sub.invoices` does not exist inside Sales.

**The repository** — generic over the collection, so `repo("salesTickets").byId(ctx, id)` returns `SalesTicket | null` and `where` only accepts fields the schema declares. This is what makes `database-migration-mssql.md` a type-checked swap rather than a hopeful one.

---

## 5. Migration order

**Bottom-up, leaves first, because a typed module importing an untyped one gains nothing.** Each step ends compiling, green and deployed.

| Step | Scope | Why here | Rough size |
|---|---|---|---|
| **0** | Delete `jsconfig.json`; fix `components.json`; add ESLint + boundary rules; add `tsc --noEmit` to CI | Guardrails before any move | 1 day |
| **1** | `shared/` — `currencies`, `countries`, `continents`, `cities`, `format`, `slug`, `i18n`, `planColors` | Pure, no I/O, no dependents to break | ~4k LOC |
| **2** | `platform/access` — `permissions.ts` + `access.ts` | Small, total, and yields `PermissionKey` which everything else wants | ~700 LOC |
| **3** | `platform/db` — `keys`, `store`, `cascade`, and the new `repo` interface | The typed seam every module will sit on. **Do this with the golden tests already green** (`refactoring-strategy.md` Phase 0). | ~2.5k LOC |
| **4** | `platform/auth`, `platform/realtime`, `platform/notify`, `platform/http` | Now that db and access are typed | ~3k LOC |
| **5** | `platform/relations` | Already almost typed by its own shape | ~400 LOC |
| **6-15** | One department per step: **tasks → main → people → finance → operations → hr → inventory → projects → technical → sales** | Ascending order of cross-department reads, so each module's dependencies are already typed when it arrives. Sales last — it reads four other modules. | ~2-6k LOC each |
| **16** | `ui/` design system | Runs in parallel with 6-15 (`ui-ux-overhaul.md`) | — |
| **17** | `app/` reduced to re-exports | Mechanical once modules exist | — |
| **18** | Turn on `noImplicitAny`, `checkJs`, `exactOptionalPropertyTypes` repo-wide; delete `allowJs` | The gate closes | — |

**Quality is already TypeScript** and slots in as-is at step 6 — it only needs its folder moved and its imports re-pointed.

### Per-department recipe

For each of steps 6-15, in this order:

1. `git mv` the three scattered files into `modules/<name>/`, still `.js`. Commit. *Nothing else.* A pure move is reviewable; a move plus a rewrite is not.
2. Rename to `.ts`/`.tsx`. Fix only what the compiler complains about at the current (lenient) settings.
3. Write `schema.ts` from the existing coercion code — **transcribed, not redesigned**. Where two call sites disagree on a limit, the golden test records today's behaviour and the schema reproduces it.
4. Replace hand-rolled coercion with schema parsing at the boundary.
5. Add `index.ts` with the manifest; make every cross-module import go through it.
6. Turn on `noImplicitAny` **for this folder only** via an override; fix.
7. Golden tests must be unchanged. If a response differs, the migration is wrong — not the test.

---

## 6. Compiler settings, staged

```jsonc
// step 0 — where we are, plus the checks that cost nothing
{ "strict": true, "noImplicitAny": false, "checkJs": false,
  "noUncheckedIndexedAccess": true, "noFallthroughCasesInSwitch": true }

// steps 1-15 — per-folder tightening via overrides as each module lands

// step 18 — the gate closes
{ "strict": true, "noImplicitAny": true, "checkJs": true, "allowJs": false,
  "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true,
  "noUnusedLocals": true, "noUnusedParameters": true, "verbatimModuleSyntax": true }
```

`noUncheckedIndexedAccess` is worth turning on **first**, before anything else. This codebase indexes into maps constantly — `byKey["sales-tickets"]`, `nameById[t.clientId]`, `depName[c.departmentId]` — and every one of those is `T | undefined` in reality. The existing code mostly handles it (`byKey["sales-tickets"] || section`), which means the flag will produce far fewer errors than expected and will catch the places that don't.

---

## 7. What this buys, concretely

| Today | After |
|---|---|
| `requirePermission(access, "sales.ticket.edit")` fails at runtime, possibly never | compile error |
| A notification sent to a UserID instead of a CollaboratorID delivers to nobody, silently | compile error |
| A route reading another tenant's key because `studioId` was threaded wrong | compile error (branded ids + ctx-bound repo) |
| Finance importing `sales/service.js` internals | lint error |
| A collection's shape lives in the coercion code, the reader, and the UI | one schema, three consumers |
| Sales' cross-department reads discoverable only by grep | declared in the manifest, lint-enforced |
| A change to Sales touches three unrelated trees | one folder |

---

## 8. Risks and how each is handled

| Risk | Handling |
|---|---|
| A big-bang rename breaks the build for days | Never rename more than one module per step; each step ships. |
| Types drift from runtime shapes | The schema *is* the type. There is no second declaration to drift. |
| Migration silently changes behaviour | Golden responses for all 97 routes, recorded before step 0 (`refactoring-strategy.md` Phase 0). This is the whole safety net. |
| `strict` produces thousands of errors at once | Per-folder overrides. The repo never has more than one module's worth of errors open. |
| Next's router fights the module layout | `app/` keeps the router; modules keep the code; route files are one-line re-exports. |
| MUI/shadcn/Tailwind type friction | Already solved in the Quality island — reuse its patterns rather than re-deriving them. |
| Reviewer fatigue on large diffs | Step 1 of each recipe is a *pure move*, reviewable at a glance. The rewrite comes in separate commits. |
