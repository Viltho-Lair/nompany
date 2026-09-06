# Departmental Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A studio's roles belong to its departments, seeded per industry from a role library, with access still granted per role by an administrator.

**Architecture:** `Role` gains `departmentId` and `source`. A server-only library of ~2,900 role names maps each to a department and one of eleven access *archetypes*; adding a library role copies that archetype's permissions rather than referencing them. Both role screens become per-department accordions. Access resolution, `escalates()` and the `department` scope are untouched.

**Tech Stack:** Next.js 16 · TypeScript (`noImplicitAny`, plus `tsconfig.strict.json`) · Zod schemas per module · Postgres via `platform/db` · plain `.mjs` test runners

**Spec:** `docs/superpowers/specs/2026-09-06-departmental-roles-design.md`

## Global Constraints

- **Worktree:** all work happens in `C:/Users/fb_sa/nompany-roles`, branch `departmental-roles`. The main checkout is shared with two other sessions — never `cd` into it, never `git add -A`, stage by explicit path only.
- **Postgres is shared and rationed.** Two other sessions use the same pool. Before running anything that touches the database (`npm test`, `tests/integration.test.mjs`, `tests/gate-a.test.mjs`, any script), **ask both sessions and wait for an explicit yes.** Offline steps (`tsc`, `next build`, pure `.mjs` model tests, lint) need no permission.
- **Test namespace:** always `NOMPANY_TEST_SESSION=roles<n> npm test`. Never the bare default.
- **Verification signals:** the **exit code** of the command you actually ran, and the literal string `gate A: all passed`. Never a `grep -c FAIL` taken downstream of a pipe — a crashed run prints no failures, and a truncating filter discards the evidence.
- **Keys are built only in `src/platform/db/keys.ts`.** Never a literal.
- **Writes go through `editArr`/`editJSON`.** `updateRow` takes a function patch.
- **`git add` a new file BEFORE believing a green suite** — `tests/restructure.mjs` shells out to `git grep`, which sees tracked files only.
- **Goldens are the contract.** `owner.roles` and the whole-studio snapshots WILL move (roles gain two fields). Re-record deliberately, in their own commit, with the reason stated. A third session shares the fixture studio and owns `tendering.*` — if that moves, ask them first.
- **Catalogue size is 159 keys today** and is asserted in `tests/gate-a.mjs`. This plan adds **no permission keys**; if that assertion needs changing, something is wrong.
- **No new client bundle weight.** The library must never reach the browser; the budget is 1634 KB total / 250 KB largest chunk.
- **Comments explain why.** House style: declarative commit subjects, no conventional-commit prefixes.

---

## File Structure

**Created**

| Path | Responsibility |
|---|---|
| `src/modules/people/archetypes.ts` | The eleven access shapes → permission key lists. Server-side. |
| `src/modules/people/roleLibrary.ts` | Library type, lookup and search over the generated data. Server-side. |
| `src/modules/people/roleLibrary.data.ts` | ~2,900 generated entries. Server-side, never imported by a client file. |
| `scripts/generate/role-library.mjs` | Turns `docs/research/industry-roles.md` into `roleLibrary.data.ts`. |
| `src/app/api/studios/[slug]/roles/library/route.ts` | Search endpoint. Returns matches, never the catalogue. |
| `scripts/migrate/departmental-roles.mjs` | Removes the four starter roles from existing studios, guarded per studio. |
| `tests/roles-model.mjs` | Pure tests: archetypes, library shape, search. |
| `docs/functionality/roles.md` | The functionality file for this behaviour. |

**Modified**

| Path | Change |
|---|---|
| `src/modules/people/schema.ts` | `RoleSchema` gains `departmentId`, `source` |
| `src/modules/people/roles.ts` | `STARTER_ROLES` → Admin only; `cleanRole` carries the new fields; `addLibraryRole` |
| `src/modules/hr/hr.ts` | `createHrRole` takes a department; `listHrRoles` returns it |
| `src/modules/administration/departments.ts` | seeds roles after departments |
| `src/app/api/studios/[slug]/hr/roles/route.ts` | accepts `departmentId`, and a library add |
| `src/components/studio2/StudioHr.js` | roles tab becomes a per-department accordion |
| `src/components/studio2/StudioRoles.js` | access screen becomes a per-department accordion |
| `src/shared/studio/hr.ts`, `src/shared/studio/access.ts` | new strings, EN + AR |
| `tests/gate-a.mjs` | library-not-in-bundle assertion |
| `tests/suite.mjs` | store-backed role assertions |

**Why `src/modules/people/` and not `src/shared/`:** `src/shared/**` is client-safe by definition and is imported by browser code. A 250 KB library placed there would ship. `modules/**` is server-side, which is the property being relied on.

---

## Task 1: The Role record gains a department

**Files:**
- Modify: `src/modules/people/schema.ts`
- Modify: `src/modules/people/roles.ts` (`cleanRole`)
- Test: `tests/roles-model.mjs` (create)

**Interfaces:**
- Consumes: nothing
- Produces: `Role` with `departmentId: string` and `source: "library" | "custom"`; `cleanRole(body)` preserving both

- [ ] **Step 1: Write the failing test**

Create `tests/roles-model.mjs`:

```javascript
// THE ROLE MODEL, PURELY. No store, no routes.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const R = await import("@/modules/people/roles");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== a role remembers its department");

const cleaned = R.cleanRole({ name: "Site Engineer", departmentId: "dep_x", source: "library" });
ok("a role keeps the department it was created in", cleaned.departmentId === "dep_x", JSON.stringify(cleaned));
ok("...and where it came from", cleaned.source === "library", JSON.stringify(cleaned.source));

// A ROLE WITH NO DEPARTMENT IS STUDIO-WIDE, not invalid. Admin is one.
const wide = R.cleanRole({ name: "Admin" });
ok("a role with no department is studio-wide", wide.departmentId === "", JSON.stringify(wide.departmentId));
ok("...and defaults to custom rather than claiming a library origin",
  wide.source === "custom", JSON.stringify(wide.source));

// An invented source must not be stored: it decides whether the screen offers
// "re-sync from library" later, and a third value would silently mean neither.
const bogus = R.cleanRole({ name: "X", source: "imported" });
ok("an unknown source falls back to custom", bogus.source === "custom", JSON.stringify(bogus.source));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd C:/Users/fb_sa/nompany-roles && node tests/roles-model.mjs`
Expected: FAIL on the first assertion — `cleanRole` drops unknown fields today.

- [ ] **Step 3: Add the fields to the schema**

In `src/modules/people/schema.ts`, inside `RoleSchema`, after `wildcard`:

```typescript
  // THE DEPARTMENT THIS ROLE BELONGS TO, "" for studio-wide. Admin is the only
  // seeded studio-wide role: a per-department wildcard is a contradiction.
  //
  // A role's department decides where it is LISTED and what it is FOR. It does
  // NOT decide what the role may reach — that is `permissions`, granted by an
  // administrator — and it does not decide who may hold it.
  departmentId: z.string().default(""),
  // Where the row came from. "library" was copied from the role catalogue and
  // arrived with an archetype's permissions; "custom" was typed and started
  // empty. Stored because the two are edited with different expectations.
  source: z.enum(["library", "custom"]).default("custom"),
```

- [ ] **Step 4: Carry them through `cleanRole`**

In `src/modules/people/roles.ts`, replace the body of `cleanRole`:

```typescript
export function cleanRole(body: Record<string, unknown>) {
  return {
    name: str(body?.name, 60) || "New role",
    description: str(body?.description, 200),
    permissions: cleanPermissions(body?.permissions),
    // Only where the area declares itself scoped; anywhere else a scope would
    // be a stored value nothing reads.
    scopes: cleanScopes(body?.scopes),
    // "" IS A REAL ANSWER — the studio-wide role — so this is not validated
    // against the register here. The caller that has a department context
    // checks it; a blank one needs no checking.
    departmentId: str(body?.departmentId, 60),
    // Anything but the two known values is "custom": the field decides how the
    // screen treats the row, and a third value would mean neither.
    source: body?.source === "library" ? "library" : "custom",
    wildcard: false,
  };
}
```

- [ ] **Step 5: Run the test and the type checks**

Run: `node tests/roles-model.mjs` → Expected: `all passed`
Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json` → Expected: clean

- [ ] **Step 6: Commit**

```bash
git add tests/roles-model.mjs src/modules/people/schema.ts src/modules/people/roles.ts
git commit -m "A role belongs to a department, and remembers where it came from"
```

---

## Task 2: The eleven archetypes

**Files:**
- Create: `src/modules/people/archetypes.ts`
- Test: `tests/roles-model.mjs` (extend)

**Interfaces:**
- Consumes: `keysForLevel(area, level)` and `AREAS` from `@/platform/access`
- Produces: `ARCHETYPES: readonly Archetype[]`, `type ArchetypeId`, `permissionsFor(id): string[]`, `archetypeProblems(): string[]`

- [ ] **Step 1: Write the failing test**

Append to `tests/roles-model.mjs`, before the final two lines:

```javascript
console.log("\n== the eleven archetypes");

const A = await import("@/modules/people/archetypes");
const { ALL_PERMISSIONS } = await import("@/platform/access");

ok("there are eleven", A.ARCHETYPES.length === 11, String(A.ARCHETYPES.length));

// EVERY KEY MUST BE REAL. This is the whole argument for eleven sets rather
// than 2,900: the catalogue has moved twelve times, and this assertion is what
// makes a move visible instead of silent.
const known = new Set(ALL_PERMISSIONS);
const strays = A.ARCHETYPES.flatMap((a) => A.permissionsFor(a.id).filter((k) => !known.has(k)));
ok("every archetype names only real permission keys", strays.length === 0, strays.join(", "));

ok("archetypeProblems agrees", A.archetypeProblems().length === 0, A.archetypeProblems().join(" | "));

// A SECOND WILDCARD IS FORBIDDEN by the role model — exactly one exists and it
// is Admin — so `principal` is an explicit list, not a wildcard.
ok("principal is an explicit list, not a wildcard",
  A.permissionsFor("principal").length > 0 && !A.ARCHETYPES.find((a) => a.id === "principal")?.wildcard);

// Deciding who may do what stays with Admin. A Managing Director runs the
// company; handing out permissions is a different act.
ok("...and does not carry administration.access.edit",
  !A.permissionsFor("principal").includes("administration.access.edit"),
  A.permissionsFor("principal").filter((k) => k.startsWith("administration.access")).join(", "));

// The shapes must actually differ, or eleven names describe one thing.
const shapes = new Set(A.ARCHETYPES.map((a) => A.permissionsFor(a.id).slice().sort().join("|")));
ok("all eleven differ from one another", shapes.size === 11, `${shapes.size} distinct`);

// A doer must not be able to delete: "raises and edits records, deletes
// nothing" is the line the Member starter role drew and it still holds.
ok("a doer deletes nothing",
  !A.permissionsFor("doer").some((k) => k.endsWith(".delete")),
  A.permissionsFor("doer").filter((k) => k.endsWith(".delete")).join(", "));

// The checker is the archetype no starter role ever covered — it reads widely
// and signs, and changes nothing else.
ok("a checker reads and signs but does not create",
  A.permissionsFor("checker").includes("engineeringDocs.register.review")
  && !A.permissionsFor("checker").some((k) => k.endsWith(".create")),
  A.permissionsFor("checker").filter((k) => k.endsWith(".create")).join(", "));
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node tests/roles-model.mjs`
Expected: FAIL — `Cannot find module '@/modules/people/archetypes'`

- [ ] **Step 3: Write the archetypes**

Create `src/modules/people/archetypes.ts`:

```typescript
// THE ELEVEN ACCESS SHAPES a job can have, and the permissions each implies.
//
// WHY ELEVEN AND NOT 2,900. The role library names roughly 2,900 jobs across 25
// fields of work. Writing a permission list per job would be a body of data
// nobody can review, and the catalogue has changed at least twelve times in
// this repo's life — 102, 123, 124, 126, 130, 134, 135, 139, 143, 145, 149,
// 153, 159 keys. Every one of those renames or adds, and every one would have
// staled 2,900 lists silently, surfacing only as somebody quietly holding the
// wrong access. Eleven sets are eleven places to fix, and the test below can
// check all of them.
//
// The eleven come from the role research (docs/research/industry-roles.md §5.1),
// which walked every tier of all 25 fields and found that this many access
// shapes cover the operating line everywhere. The job TITLES number in the
// thousands; the shapes do not.
//
// THE ARCHETYPE IS NEVER SHOWN. A role is called "Managing Director"; that it
// resolves to `principal` is metadata, like a template id.
//
// KEYS COME FROM keysForLevel, NOT FROM HAND-WRITTEN STRINGS — the same helper
// STARTER_ROLES uses. A hand-written list here would be a second copy of the
// catalogue's verb ladder, free to disagree with it.

import { AREAS, keysForLevel, type Level } from "@/platform/access";

export type ArchetypeId =
  | "principal" | "department-head" | "winner-of-work" | "bidder" | "deliverer"
  | "front-line" | "doer" | "custodian" | "buyer" | "money" | "checker";

export type Archetype = {
  id: ArchetypeId;
  /** What this shape is, for whoever maintains the list. Never shown to a user. */
  note: string;
  /** Areas at a level, expanded through keysForLevel. */
  grants: ReadonlyArray<readonly [string, Level]>;
  /** Extras — a verb outside the view/edit/full ladder, named in full. */
  extras?: readonly string[];
};

// THE AREA A GRANT NAMES MUST EXIST, so a typo is a throw at import rather than
// a role that silently grants nothing — the same rule STARTER_ROLES follows.
const level = (areaKey: string, lvl: Level): string[] => {
  const area = AREAS.find((a) => a.key === areaKey);
  if (!area) throw new Error(`archetypes: names an area that does not exist: ${areaKey}`);
  return keysForLevel(area, lvl);
};

export const ARCHETYPES: readonly Archetype[] = Object.freeze([
  {
    id: "principal",
    note: "Chairman, CEO, Managing Director, Owner. Runs the company.",
    // NOT A WILDCARD, and this is the one place it matters. The role model
    // allows exactly one wildcard and it is Admin: "Admin has to keep meaning
    // everything as the product grows". A second one would make that sentence
    // false. So principal is an explicit list of every area at full — and
    // deliberately WITHOUT administration.access, because running the company
    // and deciding who may do what are different acts, and the second is the
    // one that can hand somebody else everything.
    grants: AREAS.filter((a) => a.key !== "administration.access").map((a) => [a.key, "full"] as const),
  },
  {
    id: "department-head",
    note: "Operations Director, Head of Production, Executive Chef. Runs one department.",
    grants: [
      ["crmSales.dashboard", "view"], ["projects.dashboard", "view"], ["hr.dashboard", "view"],
      ["engineeringDocs.dashboard", "view"], ["inventory.dashboard", "view"],
      ["projects.list", "full"], ["projects.planner", "edit"], ["projects.sla", "edit"],
      ["tasks.board", "full"], ["hr.employees", "view"], ["hr.vacations", "edit"],
      ["administration.members", "view"], ["crmSales.tickets", "view"],
    ],
    extras: ["hr.vacations.approve"],
  },
  {
    id: "winner-of-work",
    note: "Sales Manager, BD Manager, Key Account Manager. Brings work in.",
    grants: [
      ["crmSales.tickets", "full"], ["crmSales.clients", "full"], ["crmSales.quotations", "edit"],
      ["crmSales.pipeline", "view"], ["crmSales.dashboard", "view"], ["crmSales.live", "view"],
    ],
  },
  {
    id: "bidder",
    note: "Estimator, Tendering Engineer, Bid Manager. Prices the work.",
    grants: [
      ["tendering.tenders", "full"], ["tendering.rates", "full"],
      ["crmSales.quotations", "edit"], ["inventory.items", "view"], ["engineeringDocs.rfq", "view"],
    ],
  },
  {
    id: "deliverer",
    note: "Project Manager, Production Manager, Engagement Manager. Delivers it.",
    grants: [
      ["projects.list", "full"], ["projects.planner", "edit"], ["projects.sla", "edit"],
      ["projects.overtimes", "edit"], ["tasks.board", "full"], ["inventory.sheets", "edit"],
      ["crmSales.contracts", "view"], ["projects.dashboard", "view"],
    ],
  },
  {
    id: "front-line",
    note: "Foreman, Supervisor, Charge Nurse, Crew Chief. Assigns work by name.",
    grants: [
      ["tasks.board", "full"], ["fieldService.schedule", "edit"], ["fieldService.tracking", "edit"],
      ["projects.list", "view"], ["hr.vacations", "view"], ["administration.members", "view"],
    ],
  },
  {
    id: "doer",
    note: "Engineer, Technician, Consultant, Operator. Does the work.",
    // DELETES NOTHING — the line the Member starter role drew, kept.
    grants: [
      ["crmSales.tickets", "edit"], ["projects.list", "view"], ["tasks.board", "edit"],
      ["inventory.items", "view"], ["hr.vacations", "edit"], ["engineeringDocs.rfq", "view"],
    ],
  },
  {
    id: "custodian",
    note: "Store Keeper, Warehouse Manager, Materials Controller. Holds the things.",
    grants: [
      ["inventory.stock", "full"], ["inventory.items", "full"], ["inventory.sheets", "edit"],
      ["logistics.shipments", "edit"], ["inventory.dashboard", "view"],
    ],
  },
  {
    id: "buyer",
    note: "Procurement Manager, Buyer, Subcontracts Administrator. Buys.",
    grants: [
      ["procurement.suppliers", "full"], ["procurement.requisitions", "edit"],
      ["finance.payables", "edit"], ["inventory.items", "view"],
    ],
  },
  {
    id: "money",
    note: "Financial Controller, Chief Accountant, Bursar. Owns the ledger.",
    grants: [
      ["finance.cash", "full"], ["finance.payables", "full"], ["finance.assets", "full"],
      ["finance.ledger", "view"], ["finance.dashboard", "view"], ["projects.costs", "view"],
    ],
    extras: ["finance.ledger.post", "finance.payables.approve", "finance.payables.pay"],
  },
  {
    id: "checker",
    note: "QA/QC Inspector, Safety Officer, Auditor, statutory signatory. Reads and signs.",
    // THE ARCHETYPE NO STARTER ROLE EVER COVERED. It reads widely, signs, and
    // changes nothing else — which is why building one by hand meant assembling
    // view rights plus a review extra and getting it wrong.
    grants: [
      ["engineeringDocs.register", "view"], ["projects.list", "view"],
      ["fieldService.tracking", "view"], ["inventory.sheets", "view"], ["crmSales.contracts", "view"],
    ],
    extras: ["engineeringDocs.register.review"],
  },
]);

const byId = new Map(ARCHETYPES.map((a) => [a.id, a]));

/** The permission keys this archetype implies. A fresh array every call. */
export function permissionsFor(id: ArchetypeId): string[] {
  const archetype = byId.get(id);
  if (!archetype) return [];
  const out = new Set<string>();
  for (const [areaKey, lvl] of archetype.grants) for (const k of level(areaKey, lvl)) out.add(k);
  for (const k of archetype.extras || []) out.add(k);
  return [...out];
}

export const isArchetypeId = (v: unknown): v is ArchetypeId => byId.has(v as ArchetypeId);

/**
 * WELL-FORMEDNESS, asserted rather than assumed — the same shape as
 * industryProblems and departmentSeedProblems.
 *
 * Takes the known keys so this stays checkable without importing the resolver's
 * whole surface, and so a test can ask it about a hypothetical catalogue.
 */
export function archetypeProblems(knownKeys?: readonly string[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const a of ARCHETYPES) {
    if (seen.has(a.id)) problems.push(`archetype "${a.id}" is listed twice`);
    seen.add(a.id);
    if (!permissionsFor(a.id).length) problems.push(`archetype "${a.id}" grants nothing`);
  }
  if (knownKeys) {
    const known = new Set(knownKeys);
    for (const a of ARCHETYPES) {
      for (const k of permissionsFor(a.id)) {
        if (!known.has(k)) problems.push(`archetype "${a.id}": "${k}" is not a permission key`);
      }
    }
  }
  return problems;
}
```

- [ ] **Step 4: Run the test**

Run: `node tests/roles-model.mjs`
Expected: `all passed`. If "all eleven differ" fails, two archetypes have collapsed to the same set — widen the narrower one rather than deleting the assertion.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add src/modules/people/archetypes.ts tests/roles-model.mjs
git commit -m "Eleven access shapes cover every job the research found"
```

---

## Task 3: Admin is the only seeded studio-wide role

**Files:**
- Modify: `src/modules/people/roles.ts` (`STARTER_ROLES`)
- Test: `tests/roles-model.mjs` (extend)

**Interfaces:**
- Consumes: Task 1's `Role` fields
- Produces: `STARTER_ROLES` of length 1

- [ ] **Step 1: Write the failing test**

Append to `tests/roles-model.mjs`:

```javascript
console.log("\n== what a new studio starts with");

ok("exactly one starter role", R.STARTER_ROLES.length === 1, String(R.STARTER_ROLES.length));
ok("...and it is Admin", R.STARTER_ROLES[0].id === R.ADMIN_ROLE_ID);
ok("...the wildcard", R.STARTER_ROLES[0].wildcard === true);
ok("...studio-wide, not in a department", (R.STARTER_ROLES[0].departmentId || "") === "");

// THE FOUR THAT LEFT. Manager, Team Lead, Member and Viewer were the same five
// roles whatever the studio did; departments define their own now.
const names = R.STARTER_ROLES.map((r) => r.name);
for (const gone of ["Manager", "Team Lead", "Member", "Viewer"]) {
  ok(`${gone} is no longer seeded`, !names.includes(gone), names.join(", "));
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node tests/roles-model.mjs`
Expected: FAIL — `STARTER_ROLES.length` is 5.

- [ ] **Step 3: Reduce `STARTER_ROLES` to Admin**

In `src/modules/people/roles.ts`, replace the whole `STARTER_ROLES` array with:

```typescript
// A STUDIO STARTS WITH ADMIN AND ITS DEPARTMENTS' ROLES.
//
// It used to start with five — Admin, Manager, Team Lead, Member, Viewer — and
// they were the same five whatever the studio did. That was the right answer
// while there were no departments: an empty permission grid is where
// over-granting begins, and faced with 159 unchecked boxes people tick
// everything to make the product work and never come back.
//
// Departments are real records now, seeded per industry, and each seeds its own
// roles from the library. So the generic four have somewhere better to be:
// "Site Engineer" under Site Execution says what "Member" never could, and the
// two of them in different departments can hold different access.
//
// ADMIN STAYS, and stays studio-wide. It is the one wildcard, and a
// per-department wildcard is a contradiction — "everything, within one
// department" is not everything. It is also the role that must keep meaning
// everything as the product grows, which is why it holds no explicit list.
export const STARTER_ROLES = [
  {
    id: ADMIN_ROLE_ID, name: "Admin", wildcard: true,
    description: "Everything, including capabilities added in future releases.",
    permissions: [], scopes: {}, departmentId: "", source: "custom" as const,
  },
];
```

- [ ] **Step 4: Run the test**

Run: `node tests/roles-model.mjs` → Expected: `all passed`

- [ ] **Step 5: Type check and build**

Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build`
Expected: clean, compiled

- [ ] **Step 6: Commit**

```bash
git add src/modules/people/roles.ts tests/roles-model.mjs
git commit -m "A studio starts with Admin, and its departments bring their own roles"
```

---

## Task 4: HR creates a role inside a department

**Files:**
- Modify: `src/modules/hr/hr.ts` (`createHrRole`, `listHrRoles`)
- Modify: `src/app/api/studios/[slug]/hr/roles/route.ts`
- Test: `tests/suite.mjs`

**Interfaces:**
- Consumes: Task 1's fields, `listDepartments(ctx)` from `@/modules/hr/hr`
- Produces: `createHrRole(ctx, { name, description, departmentId })` validating the department; `listHrRoles(ctx)` rows carrying `departmentId` and `source`

- [ ] **Step 1: Write the failing test**

In `tests/suite.mjs`, inside the existing HR block (after the `createHrRole` assertions), add:

```javascript
  // A ROLE IS CREATED INSIDE A DEPARTMENT. The id is checked against the
  // studio's own register, so a role cannot be filed under a department that
  // was deleted between the screen loading and the save.
  const deptForRole = (await listDepartments(hr))[0];
  const placed = await createHrRole(hr, { name: `Site Engineer ${rand()}`, departmentId: deptForRole.id });
  ok("HR can name a job inside a department", placed.role?.departmentId === deptForRole.id,
    JSON.stringify(placed.error || placed.role?.departmentId));
  ok("...and it still starts with no access at all", (placed.role?.permissions || []).length === 0,
    JSON.stringify(placed.role?.permissions));
  ok("...and is marked custom, not library", placed.role?.source === "custom", JSON.stringify(placed.role?.source));

  const nowhere = await createHrRole(hr, { name: `Ghost ${rand()}`, departmentId: "dep_not_real" });
  ok("a role cannot be filed under a department that does not exist",
    nowhere.error === "department", JSON.stringify(nowhere));
```

- [ ] **Step 2: Run it and watch it fail**

Ask both sessions for the pool first. Then:
Run: `NOMPANY_TEST_SESSION=roles1 node tests/integration.test.mjs`
Expected: FAIL — `departmentId` is undefined on the created role.

- [ ] **Step 3: Validate and carry the department**

In `src/modules/hr/hr.ts`, in `createHrRole`, after the name is read:

```typescript
  // PLACED IN A DEPARTMENT, and checked against the studio's own register.
  // Blank is legal and means studio-wide, which is what Admin is; anything else
  // must name a department that exists right now.
  const departmentId = str(body?.departmentId, 60);
  if (departmentId) {
    const departments = await listDepartments(ctx);
    if (!departments.some((d) => d.id === departmentId)) return { error: "department" };
  }
```

and pass `departmentId` (plus `source: "custom"`) into the `createRole` call below it.

In `listHrRoles`, add to the mapped row:

```typescript
      departmentId: String(r.departmentId || ""),
      source: r.source === "library" ? "library" : "custom",
```

- [ ] **Step 4: Accept it at the route**

`src/app/api/studios/[slug]/hr/roles/route.ts` passes `hr.body` straight through, so no change is needed — confirm by reading the POST handler and leave it alone if so.

- [ ] **Step 5: Run the test**

Run: `NOMPANY_TEST_SESSION=roles1 node tests/integration.test.mjs`
Expected: exit 0, `all passed`

- [ ] **Step 6: Commit**

```bash
git add src/modules/hr/hr.ts tests/suite.mjs
git commit -m "HR names a job inside a department"
```

---

## Task 5: Adding a library role copies its archetype

**Files:**
- Create: `src/modules/people/roleLibrary.ts`
- Modify: `src/modules/hr/hr.ts` (`addLibraryRoles`)
- Test: `tests/roles-model.mjs`, `tests/suite.mjs`

**Interfaces:**
- Consumes: `permissionsFor(id)` from Task 2
- Produces: `type LibraryRole = { name, industry, department, archetype, tier }`, `searchLibrary(q, { industry, department, limit })`, `libraryProblems(...)`, and `addLibraryRoles(ctx, { departmentId, names })`

- [ ] **Step 1: Write the failing test**

Append to `tests/roles-model.mjs`:

```javascript
console.log("\n== the role library");

const L = await import("@/modules/people/roleLibrary");

ok("the library has entries", L.LIBRARY.length > 0, String(L.LIBRARY.length));

// Search is what the screen uses; it must find by substring, case-insensitively.
const hits = L.searchLibrary("engineer", { limit: 5 });
ok("search finds by substring", hits.length > 0 && hits.length <= 5, String(hits.length));
ok("...case-insensitively", L.searchLibrary("ENGINEER", { limit: 1 }).length === 1);

// THE SAME NAME IN TWO DEPARTMENTS IS TWO ENTRIES, and they may carry different
// archetypes. This is the property the whole design turns on: a Manager in
// Finance and a Manager in Site Execution are not the same access.
const managers = L.LIBRARY.filter((e) => e.name === "Manager");
const archetypesUsed = new Set(managers.map((e) => e.archetype));
ok("a repeated name can carry different archetypes in different departments",
  managers.length === 0 || archetypesUsed.size >= 1, `${managers.length} entries, ${archetypesUsed.size} shapes`);
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node tests/roles-model.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the library module**

Create `src/modules/people/roleLibrary.ts`:

```typescript
// THE ROLE CATALOGUE — every job title the research found, per field of work.
//
// SERVER-ONLY, AND THAT IS A SIZE DECISION RATHER THAN A SECURITY ONE. The data
// is roughly 250 KB; the client budget is 1634 KB total with a 250 KB
// largest-chunk ceiling, so shipping it would spend a sixth of the whole budget
// on a list the browser only ever needs a handful of rows from. Search is a
// route that returns matches. Gate A asserts no client file imports this.
//
// It lives under modules/ rather than shared/ for the same reason: shared/ is
// client-safe by definition and is imported by browser code, so a file placed
// there ships whether or not anybody meant it to.
//
// THE DEPARTMENT IS THE ACCURACY-CRITICAL FIELD. Getting `archetype` wrong
// costs an administrator one correction when the roles are delivered; getting
// `department` wrong hides a role where nobody will look for it.

import { isArchetypeId, permissionsFor, type ArchetypeId } from "./archetypes";
import { LIBRARY_DATA } from "./roleLibrary.data";

export type LibraryRole = {
  name: string;
  /** Field of work, verbatim from FIELDS_OF_WORK. */
  industry: string;
  /** Department CODE from the industry's starter chart — "EST", "OPS", "FIN". */
  department: string;
  archetype: ArchetypeId;
  /** Which tier of the research this came from, for ordering the seed. */
  tier: number;
};

export const LIBRARY: readonly LibraryRole[] = LIBRARY_DATA;

/** Matches by substring, narrowed to an industry and department when given. */
export function searchLibrary(
  q: string,
  { industry = "", department = "", limit = 20 }: { industry?: string; department?: string; limit?: number } = {},
): LibraryRole[] {
  const needle = String(q || "").trim().toLowerCase();
  const out: LibraryRole[] = [];
  for (const entry of LIBRARY) {
    if (industry && entry.industry !== industry) continue;
    if (department && entry.department !== department) continue;
    if (needle && !entry.name.toLowerCase().includes(needle)) continue;
    out.push(entry);
    if (out.length >= limit) break;
  }
  return out;
}

/** The seed for one department: the highest tiers first, capped. */
export function starterRolesFor(industry: string, department: string, cap = 10): LibraryRole[] {
  return LIBRARY
    .filter((e) => e.industry === industry && e.department === department)
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
    .slice(0, cap);
}

/** The permissions a library role arrives with — a COPY of its archetype's. */
export const permissionsForLibraryRole = (entry: LibraryRole): string[] => permissionsFor(entry.archetype);

/**
 * WELL-FORMEDNESS. Takes the known industries and each industry's department
 * codes, so this file stays data-only and the test can state what it expects.
 */
export function libraryProblems(
  knownIndustries: readonly string[],
  departmentCodesByIndustry: Readonly<Record<string, readonly string[]>>,
): string[] {
  const problems: string[] = [];
  const industries = new Set(knownIndustries);
  for (const e of LIBRARY) {
    if (!e.name) problems.push(`an entry in "${e.industry}" has no name`);
    if (!industries.has(e.industry)) problems.push(`"${e.name}": unknown field of work "${e.industry}"`);
    if (!isArchetypeId(e.archetype)) problems.push(`"${e.name}": unknown archetype "${e.archetype}"`);
    const codes = departmentCodesByIndustry[e.industry] || [];
    if (!codes.includes(e.department)) {
      problems.push(`"${e.name}": department "${e.department}" is not in ${e.industry}'s chart`);
    }
  }
  return problems;
}
```

- [ ] **Step 4: Add the service that copies**

In `src/modules/hr/hr.ts`:

```typescript
/**
 * Add roles to a department from the library.
 *
 * THE PERMISSIONS ARE COPIED, NOT REFERENCED — the same rule a BOQ rate
 * follows, and for the same reason: editing the library afterwards must
 * reprice nothing already created. A role added today keeps what it was given
 * today, and an administrator adjusting it is adjusting the studio's row.
 *
 * Adding the same name twice into one department is a no-op rather than a
 * refusal: the screen offers a multi-select, and re-selecting something already
 * there should be quiet rather than an error.
 */
export async function addLibraryRoles(
  ctx: HrContext,
  { departmentId, names }: { departmentId: string; names: string[] },
) {
  const denied = requirePermission(ctx.access, "hr.employees.create");
  if (denied) return denied;

  const departments = await listDepartments(ctx);
  const department = departments.find((d) => d.id === departmentId);
  if (!department) return { error: "department" };

  const industry = str(ctx.studio.fieldOfWork, 200);
  const existing = await listRoles(ctx.studio.id);
  const held = new Set(existing
    .filter((r) => String(r.departmentId || "") === departmentId)
    .map((r) => (r.name || "").toLowerCase()));

  const added = [];
  for (const raw of Array.isArray(names) ? names : []) {
    const name = str(raw, 60);
    if (!name || held.has(name.toLowerCase())) continue;
    const entry = LIBRARY.find((e) => e.name === name
      && (!industry || e.industry === industry)
      && e.department === String(department.code || ""));
    // A name the library does not hold for this department is refused rather
    // than created empty: the screen only ever offers names it was given.
    if (!entry) continue;
    added.push(await createRole(ctx.studio.id, {
      name: entry.name,
      description: "",
      departmentId,
      source: "library",
      permissions: permissionsForLibraryRole(entry),
      scopes: {},
    }));
    held.add(name.toLowerCase());
  }
  return { added: added.length, roles: added };
}
```

- [ ] **Step 5: Assert the copy is a copy**

Append to `tests/roles-model.mjs`:

```javascript
// A COPY, NOT A REFERENCE. Mutating what permissionsFor returns must not reach
// the archetype, or one studio's edit changes every future role.
const first = A.permissionsFor("doer");
first.push("crmSales.tickets.delete");
ok("permissionsFor hands out a fresh array",
  !A.permissionsFor("doer").includes("crmSales.tickets.delete"));
```

- [ ] **Step 6: Run the tests**

Run: `node tests/roles-model.mjs` → Expected: `all passed`
Ask for the pool, then: `NOMPANY_TEST_SESSION=roles2 node tests/integration.test.mjs` → Expected: exit 0

- [ ] **Step 7: Commit**

```bash
git add src/modules/people/roleLibrary.ts src/modules/hr/hr.ts tests/roles-model.mjs
git commit -m "A library role arrives with its archetype's access, copied"
```

---

## Task 6: Generate the library data

**Files:**
- Create: `scripts/generate/role-library.mjs`
- Create: `src/modules/people/roleLibrary.data.ts` (generated)
- Test: `tests/roles-model.mjs`

**Interfaces:**
- Consumes: `docs/research/industry-roles.md`, `DEPARTMENT_STARTERS` from `@/shared/departments/starters`, `FIELDS_OF_WORK`
- Produces: `LIBRARY_DATA: readonly LibraryRole[]`

- [ ] **Step 1: Write the shape assertion first**

Append to `tests/roles-model.mjs`:

```javascript
const { FIELDS_OF_WORK } = await import("@/shared/fieldsOfWork");
const S = await import("@/shared/departments/starters");

const codesByIndustry = Object.fromEntries(
  FIELDS_OF_WORK.map((f) => [f, S.departmentsForField(f).map((d) => d.code)]),
);
const libProblems = L.libraryProblems(FIELDS_OF_WORK, codesByIndustry);
ok("every library entry is well formed", libProblems.length === 0, libProblems.slice(0, 5).join(" | "));

// EVERY INDUSTRY MUST HAVE ROLES, or a studio in that trade seeds departments
// with nothing in them — the blank-grid problem, one level down.
const empty = FIELDS_OF_WORK.filter((f) => !L.LIBRARY.some((e) => e.industry === f));
ok("every field of work has library roles", empty.length === 0, empty.join(", "));

// AND EVERY DEPARTMENT MUST, for the same reason.
const emptyDepts = [];
for (const f of FIELDS_OF_WORK) {
  for (const code of codesByIndustry[f]) {
    if (!L.starterRolesFor(f, code).length) emptyDepts.push(`${f}/${code}`);
  }
}
ok("every seeded department has at least one role", emptyDepts.length === 0, emptyDepts.slice(0, 5).join(", "));

ok("no department seeds more than ten",
  FIELDS_OF_WORK.every((f) => codesByIndustry[f].every((c) => L.starterRolesFor(f, c).length <= 10)));
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node tests/roles-model.mjs`
Expected: FAIL — `roleLibrary.data` does not exist.

- [ ] **Step 3: Write the generator**

Create `scripts/generate/role-library.mjs`. It reads the research document, walks each `### N. <Field>` section and its `**Tier**` sub-headings, and emits one entry per `- ` bullet.

Two mappings it must make, and both are stated as data in the script so a reviewer can diff them:

```javascript
// TIER → ARCHETYPE. The research's eight tiers map onto the eleven access
// shapes; this is the coarse pass, and DEPARTMENT_HINTS below corrects it.
const TIER_ARCHETYPE = {
  "Top administration": "principal",
  "Second line": "department-head",
  "Middle management": "deliverer",
  "Supervisory / front line": "front-line",
  "Professional & technical": "doer",
  "Skilled & operational": "doer",
  "Regulated / certified": "checker",
  "Industry-specific support": "doer",
};

// NAME KEYWORD → ARCHETYPE, applied after the tier and beating it. A "Chief
// Accountant" is Money whatever tier it sits in, and a "QA Inspector" is a
// Checker even in the professional tier.
const NAME_ARCHETYPE = [
  [/\b(accountant|finance|treasur|payroll|bursar|controller)\b/i, "money"],
  [/\b(procurement|buyer|purchas|sourcing|subcontract)\b/i, "buyer"],
  [/\b(store|warehouse|inventory|material|stock)\b/i, "custodian"],
  [/\b(qa|qc|quality|inspector|auditor|hse|safety|compliance)\b/i, "checker"],
  [/\b(estimat|tender|bid|proposal|quantity surveyor)\b/i, "bidder"],
  [/\b(sales|business development|account manager|client|customer)\b/i, "winner-of-work"],
];

// NAME KEYWORD → DEPARTMENT CODE, per industry, resolved against that
// industry's own chart. THIS IS THE 95% FIELD — see the spec — so it is a
// list somebody reads rather than a clever inference.
const DEPARTMENT_HINTS = [
  [/\b(accountant|finance|payroll|treasur|bursar)\b/i, "FIN"],
  [/\b(hr|human resources|recruit|personnel|training)\b/i, "HR"],
  [/\b(procurement|buyer|purchas)\b/i, "PRC"],
  [/\b(store|warehouse|stock)\b/i, "STR"],
  [/\b(admin|secretar|reception|office)\b/i, "ADM"],
];
```

Everything the hints do not resolve falls to the industry's first non-back-office department, and the script **prints a count of those** so the reviewer knows how much was guessed.

Run: `node scripts/generate/role-library.mjs --out src/modules/people/roleLibrary.data.ts`

- [ ] **Step 4: Review the fallout before trusting it**

Run: `node scripts/generate/role-library.mjs --report`
Expected: a per-industry table of how many roles landed in each department, and the count that fell through to the default.

**Stop and read it.** The spec asks for ~95% on department. If the fallback count is more than ~5% of any industry, add hints rather than accepting it — this is the step the accuracy requirement lives in, and it is a judgement, not a test.

- [ ] **Step 5: Run the tests**

Run: `node tests/roles-model.mjs` → Expected: `all passed`
Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json` → Expected: clean

- [ ] **Step 6: Commit — data separately from code**

```bash
git add scripts/generate/role-library.mjs
git commit -m "The role library is generated from the research rather than typed"
git add src/modules/people/roleLibrary.data.ts tests/roles-model.mjs
git commit -m "Every field of work brings its own roles"
```

---

## Task 7: Departments seed their roles

**Files:**
- Modify: `src/modules/administration/departments.ts`
- Test: `tests/suite.mjs`

**Interfaces:**
- Consumes: `starterRolesFor(industry, code)`, `permissionsForLibraryRole(entry)`
- Produces: role rows created alongside department rows

- [ ] **Step 1: Write the failing test**

In `tests/suite.mjs`, in the departments block:

```javascript
  // A DEPARTMENT ARRIVES WITH ROLES. An empty department is the blank-grid
  // problem one level down: faced with no roles, a studio invents "Member".
  const rolesAfterSeed = await listRoles(master.studio.id);
  const seededInDept = rolesAfterSeed.filter((r) => String(r.departmentId || "") === parent.id);
  ok("a seeded department brings roles with it", seededInDept.length > 0,
    seededInDept.map((r) => r.name).join(", "));
  ok("...no more than ten", seededInDept.length <= 10, String(seededInDept.length));
  ok("...marked as library rows", seededInDept.every((r) => r.source === "library"));
  ok("...carrying access, unlike a custom role",
    seededInDept.some((r) => (r.permissions || []).length > 0));
```

- [ ] **Step 2: Run it and watch it fail**

Ask for the pool. Run: `NOMPANY_TEST_SESSION=roles3 node tests/integration.test.mjs`
Expected: FAIL — no roles carry a `departmentId`.

- [ ] **Step 3: Seed roles inside `seedDepartments`**

In `src/modules/administration/departments.ts`, after `Departments.createMany(scope, rows)` returns:

```typescript
  // THE DEPARTMENT BRINGS ITS ROLES. Seeded here rather than lazily on the
  // roles screen for the same reason the register itself is seeded at creation:
  // a list that fills only when somebody happens to open the right screen is a
  // list whose contents depend on who visited first.
  //
  // ONE WRITE PER DEPARTMENT, not one per role, and only for departments that
  // were actually created — a top-up that adds one department seeds one
  // department's roles, not the whole chart's again.
  const created = await Departments.createMany(scope, rows);
  for (const department of created) {
    const entries = starterRolesFor(field, String(department.code || ""));
    if (!entries.length) continue;
    await createRoles(scope.studio.id, entries.map((e) => ({
      name: e.name,
      description: "",
      departmentId: department.id,
      source: "library" as const,
      permissions: permissionsForLibraryRole(e),
      scopes: {},
    })));
  }
  return created;
```

and add a `createRoles` (plural) to `modules/people/roles.ts` that appends many in one `editArr`, mirroring `createMany`'s reasoning: one contended round rather than N.

- [ ] **Step 4: Run the tests**

Run: `NOMPANY_TEST_SESSION=roles3 node tests/integration.test.mjs`
Expected: exit 0, `all passed`

- [ ] **Step 5: Commit**

```bash
git add src/modules/administration/departments.ts src/modules/people/roles.ts tests/suite.mjs
git commit -m "A department arrives with the roles its trade usually has"
```

---

## Task 8: The library search route

**Files:**
- Create: `src/app/api/studios/[slug]/roles/library/route.ts`
- Modify: `tests/gate-a.mjs`

**Interfaces:**
- Consumes: `searchLibrary`, `hrContext`
- Produces: `GET …/roles/library?q=&department=` → `{ results: LibraryRole[] }`

- [ ] **Step 1: Write the route**

```typescript
// THE ROLE CATALOGUE, ONE SEARCH AT A TIME.
//
// The library is ~2,900 entries and roughly 250 KB. It is NOT served whole and
// never reaches the browser: this returns matches, capped, for the department
// the screen is looking at. Shipping the catalogue would spend a sixth of the
// entire client budget on a list a screen needs twenty rows from.
//
// GATED ON hr.employees.create, the same right that names a job by hand —
// searching for a role to add and typing one are the same act with different
// ergonomics, so they answer to the same permission.
import { route } from "@/platform/http/route";
import { hrContext } from "@/modules/hr/hr";
import { requirePermission } from "@/platform/access";
import { searchLibrary } from "@/modules/people/roleLibrary";
import { listDepartments } from "@/modules/hr/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "studio", context: hrContext, name: "roles/library" }, async (hr) => {
  const denied = requirePermission(hr.access, "hr.employees.create");
  if (denied) return denied;

  const url = new URL(hr.request.url);
  const departmentId = String(url.searchParams.get("department") || "");
  const department = departmentId
    ? (await listDepartments(hr)).find((d) => d.id === departmentId)
    : null;

  return {
    results: searchLibrary(String(url.searchParams.get("q") || ""), {
      industry: String(hr.studio.fieldOfWork || ""),
      department: String(department?.code || ""),
      limit: 20,
    }),
  };
});
```

- [ ] **Step 2: Assert the library never reaches the browser**

In `tests/gate-a.mjs`, in the architectural section:

```javascript
  // THE LIBRARY MUST NOT SHIP. ~250 KB against a 1634 KB total budget, for a
  // list the browser needs twenty rows of. A client component importing it
  // would not fail anything — it would just quietly spend the budget.
  //
  // COMMENTS ARE STRIPPED BEFORE MATCHING. An assertion that greps for a banned
  // identifier trips over the comment explaining why it is banned; this one
  // greps a path, which is safe by luck rather than design, so it strips anyway
  // — the day it becomes an identifier nobody will remember why it mattered.
  const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const clientImportingLibrary = sources
    .filter((f) => /^src\/components\//.test(f.path) || /"use client"/.test(f.text))
    .filter((f) => /roleLibrary(\.data)?["']/.test(stripComments(f.text)))
    .map((f) => f.path);
  ok("the role library never reaches a client component",
    clientImportingLibrary.length === 0, clientImportingLibrary.join(", "));
```

- [ ] **Step 3: Run the checks**

Run: `npx tsc --noEmit && npx next build`
Ask for the pool, then: `NOMPANY_TEST_SESSION=roles4 node tests/gate-a.test.mjs`
Expected: `gate A: all passed`

Run: `node scripts/bundle-budget.mjs` → Expected: `within budget`, largest chunk unchanged at 158 KB

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/studios/[slug]/roles/library/route.ts" tests/gate-a.mjs
git commit -m "The role catalogue is searched, never shipped"
```

---

## Task 9: The HR roles tab becomes a department accordion

**Files:**
- Modify: `src/components/studio2/StudioHr.js`
- Modify: `src/shared/studio/hr.ts`

**Interfaces:**
- Consumes: `departments` and `roles` (now carrying `departmentId`) from the HR payload
- Produces: no new server interface

- [ ] **Step 1: Add the strings, EN and AR**

In `src/shared/studio/hr.ts`, add to the type and both dictionaries:

```
rolesInDepartment / addFromLibrary / createCustomRole / searchRoles
noRolesInDepartment / studioWideRoles / librarySearchEmpty
```

- [ ] **Step 2: Group the roles by department**

In `StudioHr.js`'s roles tab, replace the flat list with one `<details>` per department plus a studio-wide group, each listing `roles.filter((r) => r.departmentId === d.id)`.

**`nav` IS NOT AN ARRAY** — if this screen needs a section name, take it from the section rows, never from `nav`. That mistake crashed the departments screen and was invisible to every gate.

- [ ] **Step 3: Verify in a browser — this is not optional**

Ask both sessions for the pool. Then:

```bash
cd C:/Users/fb_sa/nompany-roles && npm run dev:sandbox
```

Open `/sandbox/hr-employees?tab=roles`. Confirm: departments expand, roles sit under the right one, the library search returns results, adding one creates a role with permissions, creating a custom one creates it empty. Check the console for errors.

`tsc`, `next build`, the goldens and the suite will all pass over a screen that does not load. Two of tonight's four bugs were exactly that.

- [ ] **Step 4: Commit**

```bash
git add src/components/studio2/StudioHr.js src/shared/studio/hr.ts
git commit -m "HR sees its roles the way the company is organised"
```

---

## Task 10: The access screen becomes a department accordion

**Files:**
- Modify: `src/components/studio2/StudioRoles.js`
- Modify: `src/shared/studio/access.ts`

- [ ] **Step 1: Add the strings, EN and AR**

- [ ] **Step 2: Group by department, keep the grid**

Each department expands to its roles; each role expands to the permission grid it has today. **Every key stays grantable** — grouping is presentation, and constraining what a role may hold would be a second access mechanism disagreeing with the first.

- [ ] **Step 3: Verify in a browser**

Open `/sandbox/administration-access`. Confirm the grid still saves, `escalates()` still refuses a grant the actor does not hold, and the Admin row is still un-editable.

- [ ] **Step 4: Commit**

```bash
git add src/components/studio2/StudioRoles.js src/shared/studio/access.ts
git commit -m "Access is granted where the work is organised"
```

---

## Task 11: Retire the four starter roles on existing studios

**Files:**
- Create: `scripts/migrate/departmental-roles.mjs`

- [ ] **Step 1: Write the script**

Dry-run by default; `--allow-live` for the live namespace; **refuses per studio** where anybody holds one of the four, naming the studio and the roles:

```javascript
// A studio where somebody still holds Manager is LEFT WORKING. That is the
// resting state, not a failure: those people are doing their jobs under a role
// that still grants what it granted yesterday. The exit is a person re-roling
// them and re-running — deliberately not automatic, because the only way a
// script could clear the refusal itself is by guessing which departmental role
// each person should hold instead, and that guess is somebody's access.
```

- [ ] **Step 2: Dry run against the sandbox, then read it**

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate/departmental-roles.mjs
git commit -m "The four generic roles leave a studio once nobody depends on them"
```

---

## Task 12: Re-record the goldens, and write the functionality file

**Files:**
- Modify: `tests/goldens/owner.roles.json` and the whole-studio snapshots
- Create: `docs/functionality/roles.md`

- [ ] **Step 1: Write `docs/functionality/roles.md`**

Cover: what a role is now, the department it belongs to, library versus custom, the eleven archetypes and why not 2,900, the copy rule, who may do what on each screen, seeding, the migration — and a **"Not built yet"** section stating that access is not constrained by department, roles have no hierarchy, and a person still has one department.

- [ ] **Step 2: Re-record, deliberately**

Ask for the pool. Then:

```bash
NOMPANY_RECORD_GOLDENS=1 NOMPANY_TEST_SESSION=roles5 node tests/gate-a.test.mjs
git diff --stat tests/goldens/
```

**Read the diff before believing it.** Expect `owner.roles` and the whole-studio snapshots. **`tendering.*` belongs to another session — if it moves, ask them before re-recording it.**

- [ ] **Step 3: Verify and commit separately**

```bash
NOMPANY_TEST_SESSION=roles6 npm test   # exit code and "gate A: all passed"
git add docs/functionality/roles.md
git commit -m "What a role is, and which department it belongs to"
git add tests/goldens
git commit -m "Roles carry a department, and the goldens say so"
```

---

## Self-Review

**Spec coverage.** §1 → Task 1. §2 → Tasks 1, 3, 11. §3 → Tasks 5, 6, 8. §4 → Tasks 2, 5. §5 → Task 9. §6 → Task 10. §7 → Task 7. §8 → Task 11. §9 → spread across all tasks' tests. §10 slices → Tasks 1–5 and 9–10 are slice one; 6, 7, 8 are slice two. §11 "not built yet" → Task 12's functionality file.

**Placeholders.** Tasks 9, 10 and 11 give the shape of the screens and the script rather than their full source: the two screens are 527 and 834 lines of existing JSX whose structure the implementer must read, and reproducing them here would be a worse guide than the file. Every server-side task carries real code. The dictionary keys are named exactly.

**Type consistency.** `departmentId: string` and `source: "library" | "custom"` throughout. `ArchetypeId` is the union in Task 2 and is what `LibraryRole.archetype` holds in Task 5. `permissionsFor(id)` and `permissionsForLibraryRole(entry)` are distinct and used consistently. `starterRolesFor(industry, code, cap)` matches its Task 7 call. `createRoles` (plural) is introduced in Task 7 and used only there.

**One gap found and closed:** Task 7 needed a plural `createRoles`, which no earlier task produced. It is now named in Task 7's steps rather than assumed.
