# Record Engine — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A record type declared as a stored row yields a working list, card, create, edit and status transition — with no code change and no deploy.

**Architecture:** Two collections (`recordTypes`, `engineRecords`) under existing sections. A runtime-built Zod schema validates instances. Permission keys are namespaced `engine.<typeKey>.<verb>` so the compile-time catalogue stays a closed union while engine keys pass `isPermission`. One generic route serves every type, deriving the type from the URL.

**Tech Stack:** Next.js 16 App Router, TypeScript (`noImplicitAny` + `tsconfig.strict.json`), Zod, Postgres via `repo()`, Tailwind + the existing `ui.js` primitives.

**Spec:** `docs/superpowers/specs/2026-09-07-record-engine-design.md`

## Global Constraints

- **Keys are built only in `src/platform/db/keys.ts`** (invariant 1). The engine adds exactly two collection names, never one per type.
- **Default deny** (invariant 4): no role means nothing; `requirePermission` still refuses an unrecognised key.
- **Writes go through `editArr`/`editJSON`** (invariant 8). `repo().update` takes a **function** patch.
- **References only move forward** (invariant 10) — engine record references use `nextReference`.
- **Deletion is children-first, registry-last** (invariant 11), through `cascade.ts`.
- **Reviewer ≠ approver at the transition** (invariant 7) — routed through `platform/approval`, never re-implemented.
- **A right nothing can exercise is a bug** (invariant 16), relaxed in exactly one documented way: an orphaned engine key after type deletion is reported, not chased. Spec §5.
- **Pure models import nothing** and are asserted so by a test.
- **Every response field is named explicitly in the route**, never spread from the service.
- **Bilingual**: every user-facing string lands in `src/shared/studio/` in BOTH `en` and `ar`. Statuses translate on display, keyed by the stored token.
- **Dates render through `fmtDate`/`fmtDateTime`**, never `toLocaleDateString()`.
- **`git add` a new file BEFORE believing a green suite** — `tests/restructure.mjs` shells out to `git grep`, which sees tracked files only.
- **Verification, every task:** `npm test`, `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.strict.json`, `npx next build`.
- **Test namespace:** run as `NOMPANY_TEST_SESSION=engine npm test` — two sessions cannot share one.
- **Never declare a permission area whose key is `engine`.** The namespace `engine.` is what keeps engine keys from colliding with the 47 declared areas.

---

### Task 1: Engine permission keys stop being silently dropped

**Files:**
- Modify: `src/platform/access/catalogue.ts` (the `PermissionKey` union, `isPermission`)
- Test: `tests/engine-permissions.mjs`
- Modify: `package.json` (add the test to the `test` script)

**Interfaces:**
- Consumes: `isPermission`, `cleanPermissions`, `ALL_PERMISSIONS` from `@/platform/access/catalogue`
- Produces: `ENGINE_KEY_RE` (exported `RegExp`), `isEnginePermission(key: unknown): boolean`, and a widened `PermissionKey` accepting `` `engine.${string}.${Verb}` ``

- [ ] **Step 1: Write the failing test**

Create `tests/engine-permissions.mjs`:

```js
// ENGINE PERMISSION KEYS, PURELY.
//
// THE DEFECT THIS GUARDS IS SILENT. `cleanPermissions` filters every stored
// permission through `isPermission`, which is `KNOWN.has(key)` over the
// compile-time catalogue — "a permission the product does not recognise cannot
// be stored". So before this change a role granting an engine key had it
// dropped with no error and no log: a right that never arrives.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/platform/access/catalogue");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

ok("an engine key is a permission", M.isPermission("engine.transmittal.view"));
ok("...for every verb",
  ["view", "create", "edit", "delete"].every((v) => M.isPermission(`engine.transmittal.${v}`)));
// THE ASSERTION THIS TASK EXISTS FOR.
ok("AN ENGINE KEY SURVIVES cleanPermissions",
  M.cleanPermissions(["engine.transmittal.view"]).length === 1,
  JSON.stringify(M.cleanPermissions(["engine.transmittal.view"])));
ok("...alongside a static key",
  M.cleanPermissions(["projects.list.view", "engine.transmittal.edit"]).length === 2);

// The namespace is what keeps it from colliding with the declared areas.
ok("a verb outside the four is refused", !M.isPermission("engine.transmittal.approve"));
ok("a bare engine key is refused", !M.isPermission("engine.transmittal"));
ok("an empty type key is refused", !M.isPermission("engine..view"));
ok("a nested type key is refused", !M.isPermission("engine.a.b.view"));
ok("nonsense is still refused", !M.isPermission("engine"));
ok("an unknown static key is still refused", !M.isPermission("projects.madeup.view"));
// engineeringDocs is ADJACENT and must not be swept in.
ok("engineeringDocs is not an engine key", !M.isEnginePermission("engineeringDocs.register.view"));
ok("...and is still a real permission", M.isPermission("engineeringDocs.register.view"));

// THE CATALOGUE DOES NOT GROW. Engine keys are structural, not declared, so the
// 177-key assertion in Gate A must not move.
ok("the declared catalogue is unchanged at 177",
  M.ALL_PERMISSIONS.length === 177, String(M.ALL_PERMISSIONS.length));
ok("...and contains no engine key",
  !M.ALL_PERMISSIONS.some((k) => k.startsWith("engine.")));

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tests/engine-permissions.mjs
```

Expected: FAIL on "an engine key is a permission" and on `isEnginePermission` being undefined.

- [ ] **Step 3: Implement**

In `src/platform/access/catalogue.ts`, immediately after the `KNOWN` set:

```ts
// ENGINE KEYS ARE STRUCTURAL, NOT DECLARED — and this is the one place the
// catalogue stops being a closed set.
//
// A record type is a ROW (P4b is runtime), so its permission cannot be in
// ALL_PERMISSIONS: the catalogue is compile-time and the type is not. Without
// this, `cleanPermissions` drops every engine grant SILENTLY — no error, no
// log, a right that never arrives — because its filter is `KNOWN.has(key)`.
//
// THE NAMESPACE IS THE CONTAINMENT. Of the 47 declared area keys, none begins
// `engine.`; `engineeringDocs.*` is adjacent and distinct because the prefix
// carries the dot. A future area keyed `engine` would break that and must never
// be declared.
//
// ONE SEGMENT ONLY, and one of the four verbs: `engine.<typeKey>.<verb>`. A
// nested key would let `engine.a.b.view` past, and the route resolves a type
// from ONE segment of the URL.
export const ENGINE_KEY_RE = /^engine\.[a-z0-9-]+\.(view|create|edit|delete)$/;

export const isEnginePermission = (key: unknown): boolean =>
  ENGINE_KEY_RE.test(String(key ?? ""));
```

Change `isPermission` to:

```ts
export const isPermission = (key: unknown): key is PermissionKey =>
  KNOWN.has(String(key ?? "")) || isEnginePermission(key);
```

Extend the union at the bottom of the file:

```ts
export type PermissionKey =
  | `${DashboardModule}.dashboard.view`
  | PermsOf<(typeof OWN_AREAS)[number]>
  // The engine's arm. Deliberately `string` in the middle: the type key is a
  // stored row's key and cannot be known at compile time. Static keys above
  // stay exact, so a typo in one is still a red squiggle.
  | `engine.${string}.${Verb}`;
```

- [ ] **Step 4: Run the test**

```bash
node tests/engine-permissions.mjs
```

Expected: PASS, "all passed".

- [ ] **Step 5: Wire it into the suite and verify nothing else moved**

In `package.json`, add `node tests/engine-permissions.mjs && ` immediately before `node tests/closure-model.mjs`.

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
NOMPANY_TEST_SESSION=engine npm test
```

Expected: `gate A: all passed`, and the catalogue assertion still reads 177.

- [ ] **Step 6: Commit**

```bash
git add tests/engine-permissions.mjs
git commit -m "An engine permission is stored rather than silently dropped" -- \
  src/platform/access/catalogue.ts tests/engine-permissions.mjs package.json
```

---

### Task 2: The type declaration, and a schema built at runtime

**Files:**
- Create: `src/platform/engine/types.ts` (pure — no imports)
- Create: `src/platform/engine/schema.ts` (the stored shapes, Zod)
- Test: `tests/engine-model.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing (pure)
- Produces:
  - `FIELD_KINDS: readonly string[]` — `"text" | "longtext" | "number" | "money" | "date" | "boolean" | "select" | "collaborator" | "reference"`
  - `fieldProblem(field: FieldDecl): string | null`
  - `typeProblem(decl: TypeDecl, existing: readonly TypeDecl[], editingKey?: string): string | null`
  - `coerceValue(field: FieldDecl, raw: unknown): unknown`
  - `coerceRecord(decl: TypeDecl, stored: Record<string, unknown>): Record<string, unknown>`
  - `transitionProblem(decl: TypeDecl, from: string, to: string): string | null`
  - `RecordTypeSchema`, `EngineRecordSchema` (Zod, from `schema.ts`)

- [ ] **Step 1: Write the failing test**

Create `tests/engine-model.mjs`:

```js
// THE RECORD ENGINE'S DECLARATION RULES, PURELY. No store, no routes.
//
// THE DEFECT THESE GUARD is a tenant-authored shape reaching the store
// unchecked. `tsc` cannot see a type declared in a row, so this file and the
// runtime schema built from it are the ONLY guard — which is why the field
// kinds are a closed set rather than free-form.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/platform/engine/types");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const field = (over) => ({ key: "title", label: "Title", kind: "text", ...over });
const decl = (over) => ({
  key: "transmittal", label: "Transmittals", parentSectionKey: "engineering-docs",
  fields: [field({})], columns: ["title"], statuses: ["Draft", "Issued"],
  transitions: [{ from: "Draft", to: "Issued" }], version: 1, ...over,
});

console.log("\n== a field declaration ==\n");

ok("a known kind is allowed", M.fieldProblem(field({})) === null);
ok("an unknown kind is refused", M.fieldProblem(field({ kind: "geo" })) === "kind");
ok("a field with no key is refused", M.fieldProblem(field({ key: "" })) === "key");
// The key becomes a property name on a stored row and a column on a list.
ok("a key that is not an identifier is refused",
  M.fieldProblem(field({ key: "my field" })) === "key");
ok("a field with no label is refused", M.fieldProblem(field({ label: " " })) === "label");
// A SELECT WITH NO OPTIONS IS A FIELD NOBODY CAN FILL IN.
ok("a select with no options is refused",
  M.fieldProblem(field({ kind: "select", options: [] })) === "options");
ok("...and with options is allowed",
  M.fieldProblem(field({ kind: "select", options: ["A", "B"] })) === null);
// A REFERENCE MUST SAY WHAT IT REFERS TO.
ok("a reference with no target is refused",
  M.fieldProblem(field({ kind: "reference" })) === "reference-target");
ok("...and with one is allowed",
  M.fieldProblem(field({ kind: "reference", refType: "drawing" })) === null);

console.log("\n== a type declaration ==\n");

ok("a complete declaration is allowed", M.typeProblem(decl({}), []) === null);
ok("no key is refused", M.typeProblem(decl({ key: "" }), []) === "key");
// The key lands in a URL segment AND in a permission key, so it is constrained
// to what both accept.
ok("an upper-case key is refused", M.typeProblem(decl({ key: "Transmittal" }), []) === "key");
ok("a dotted key is refused", M.typeProblem(decl({ key: "a.b" }), []) === "key");
ok("a duplicate key is refused",
  M.typeProblem(decl({}), [decl({})]) === "duplicate");
ok("...but editing that same type is not",
  M.typeProblem(decl({}), [decl({})], "transmittal") === null);
ok("no fields is refused", M.typeProblem(decl({ fields: [] }), []) === "fields");
ok("a duplicate field key is refused",
  M.typeProblem(decl({ fields: [field({}), field({})] }), []) === "duplicate-field");
ok("a bad field is reported by its own token",
  M.typeProblem(decl({ fields: [field({ kind: "geo" })] }), []) === "kind");
// A COLUMN THAT NAMES NO FIELD would render an empty list column for ever.
ok("a column naming no field is refused",
  M.typeProblem(decl({ columns: ["nope"] }), []) === "column");
ok("a parent section is required", M.typeProblem(decl({ parentSectionKey: "" }), []) === "parent");
// A TRANSITION TO A STATUS THAT DOES NOT EXIST is unreachable by construction.
ok("a transition naming an unknown status is refused",
  M.typeProblem(decl({ transitions: [{ from: "Draft", to: "Gone" }] }), []) === "transition");

console.log("\n== transitions ==\n");

ok("a declared move is allowed", M.transitionProblem(decl({}), "Draft", "Issued") === null);
ok("an undeclared move is refused",
  M.transitionProblem(decl({}), "Issued", "Draft") === "not-allowed");
ok("a move to an unknown status is refused",
  M.transitionProblem(decl({}), "Draft", "Gone") === "status");

console.log("\n== coercion, which is how a version change stays harmless ==\n");

const d = decl({
  fields: [field({}), field({ key: "count", label: "Count", kind: "number" }),
    field({ key: "done", label: "Done", kind: "boolean" })],
});
const got = M.coerceRecord(d, { title: 7, count: "12", done: "yes", gone: "old value" });
ok("a text field coerces to text", got.title === "7", JSON.stringify(got.title));
ok("a number field coerces to a number", got.count === 12, JSON.stringify(got.count));
ok("a boolean field coerces to a boolean", got.done === true);
// A FIELD REMOVED FROM A TYPE IS NOT DELETED FROM THE ROW. Deleting it would
// destroy the only record of what the row said when somebody signed it.
ok("A REMOVED FIELD IS NOT RENDERED", !("gone" in got));

// NULL-SAFE: a field never filled in reads as its kind's empty value, not as
// undefined, so a list column never renders "undefined".
const empty = M.coerceRecord(d, {});
ok("an unfilled text field is an empty string", empty.title === "");
ok("an unfilled number field is null, not nought",
  empty.count === null, JSON.stringify(empty.count));
ok("an unfilled boolean is false", empty.done === false);

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tests/engine-model.mjs
```

Expected: FAIL — `Cannot find module '@/platform/engine/types'`.

- [ ] **Step 3: Implement `src/platform/engine/types.ts`**

```ts
// WHAT A RECORD TYPE MAY DECLARE, AND WHAT AN INSTANCE MAY HOLD.
//
// P4b IS RUNTIME: a record type is a ROW, so `tsc` cannot see a tenant's shape.
// This file and the Zod schema built from it are the ONLY guard, which is why
// the field kinds below are a CLOSED SET rather than free-form — a schema built
// from arbitrary input is not a guard.
//
// NO IMPORTS, deliberately, and asserted by a test: the type editor refuses
// exactly what the server refuses, with one implementation between them.

export const FIELD_KINDS = [
  "text", "longtext", "number", "money", "date", "boolean",
  "select", "collaborator", "reference",
] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

export type FieldDecl = {
  key?: unknown;
  label?: unknown;
  kind?: unknown;
  /** `select` only. A select with none is a field nobody can fill in. */
  options?: unknown;
  /** `reference` only — the typeKey this points at. */
  refType?: unknown;
  required?: unknown;
};

export type TransitionDecl = { from?: unknown; to?: unknown };

export type TypeDecl = {
  key?: unknown;
  label?: unknown;
  parentSectionKey?: unknown;
  fields?: unknown;
  columns?: unknown;
  statuses?: unknown;
  transitions?: unknown;
  version?: unknown;
};

const text = (v: unknown) => String(v ?? "");
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : []) as T[];

/**
 * A KEY THAT SURVIVES BOTH A URL AND A PERMISSION. The type key becomes one
 * path segment and the middle of `engine.<typeKey>.<verb>`, so it is
 * constrained to what both accept — lower case, no dots, no spaces.
 */
export const KEY_RE = /^[a-z0-9][a-z0-9-]*$/;
/** A field key becomes a property name on a stored row. */
export const FIELD_KEY_RE = /^[a-z][a-zA-Z0-9_]*$/;

export function fieldProblem(field: FieldDecl): string | null {
  if (!FIELD_KEY_RE.test(text(field?.key))) return "key";
  if (!text(field?.label).trim()) return "label";
  const kind = text(field?.kind);
  if (!(FIELD_KINDS as readonly string[]).includes(kind)) return "kind";
  if (kind === "select" && !list<string>(field?.options).filter((o) => text(o).trim()).length) {
    return "options";
  }
  if (kind === "reference" && !KEY_RE.test(text(field?.refType))) return "reference-target";
  return null;
}

export function typeProblem(
  decl: TypeDecl,
  existing: readonly TypeDecl[],
  editingKey = "",
): string | null {
  const key = text(decl?.key);
  if (!KEY_RE.test(key)) return "key";
  if (!text(decl?.label).trim()) return "label";
  if (!KEY_RE.test(text(decl?.parentSectionKey))) return "parent";

  if (existing.some((t) => text(t.key) === key && text(t.key) !== editingKey)) {
    return "duplicate";
  }

  const fields = list<FieldDecl>(decl?.fields);
  if (!fields.length) return "fields";
  const seen = new Set<string>();
  for (const f of fields) {
    const problem = fieldProblem(f);
    if (problem) return problem;
    if (seen.has(text(f.key))) return "duplicate-field";
    seen.add(text(f.key));
  }

  // A COLUMN NAMING NO FIELD would render an empty list column for ever.
  for (const c of list<string>(decl?.columns)) {
    if (!seen.has(text(c))) return "column";
  }

  const statuses = new Set(list<string>(decl?.statuses).map(text));
  for (const t of list<TransitionDecl>(decl?.transitions)) {
    if (!statuses.has(text(t.from)) || !statuses.has(text(t.to))) return "transition";
  }
  return null;
}

/**
 * WHETHER A MOVE IS DECLARED. Unlike a hand-built register the chain is data,
 * so this is the whole of the rule — there is no second opinion in a service.
 */
export function transitionProblem(decl: TypeDecl, from: unknown, to: unknown): string | null {
  const statuses = new Set(list<string>(decl?.statuses).map(text));
  if (!statuses.has(text(to))) return "status";
  const allowed = list<TransitionDecl>(decl?.transitions)
    .some((t) => text(t.from) === text(from) && text(t.to) === text(to));
  return allowed ? null : "not-allowed";
}

/**
 * ONE STORED VALUE, READ THROUGH ITS DECLARATION.
 *
 * NULL RATHER THAN NOUGHT for a number nobody filled in: nought is a real
 * answer and an empty field is not, and a list column showing 0 for both is the
 * bug this product has fixed a dozen times elsewhere.
 */
export function coerceValue(field: FieldDecl, raw: unknown): unknown {
  switch (text(field?.kind)) {
    case "number":
    case "money": {
      if (raw === "" || raw === null || raw === undefined) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    case "boolean":
      return raw === true || raw === "true" || raw === "yes" || raw === 1;
    case "date":
      return text(raw).slice(0, 10);
    default:
      return text(raw);
  }
}

/**
 * A STORED ROW READ THROUGH THE TYPE AS IT IS NOW.
 *
 * A FIELD REMOVED FROM THE TYPE IS NOT RETURNED AND NOT DELETED. It stays in
 * the store because it is the only record of what the row said when somebody
 * signed it; it stops being rendered because the type no longer declares it.
 * That is what makes a version change harmless — the reader coerces, exactly as
 * `normalizeTask` and `planProgress` already do at their own boundaries.
 */
export function coerceRecord(
  decl: TypeDecl,
  stored: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of list<FieldDecl>(decl?.fields)) {
    out[text(f.key)] = coerceValue(f, (stored || {})[text(f.key)]);
  }
  return out;
}
```

- [ ] **Step 4: Run the test**

```bash
node tests/engine-model.mjs
```

Expected: PASS, "all passed".

- [ ] **Step 5: Add the stored shapes**

Create `src/platform/engine/schema.ts`:

```ts
// WHAT THE ENGINE STORES. Two collections and no more — see the design, §4.
//
// ONE COLLECTION FOR EVERY INSTANCE, discriminated by `typeKey`, because
// `COLLECTION_TABLE` and the collection lists in keys.ts are compile-time: a
// collection per type would need a deploy per type, which is the thing runtime
// was chosen to avoid.
import { z } from "zod";

export const FieldDeclSchema = z.object({
  key: z.string().max(60),
  label: z.string().max(120),
  kind: z.string().max(20),
  options: z.array(z.string().max(120)).optional(),
  refType: z.string().max(60).optional(),
  required: z.boolean().optional(),
});

export const RecordTypeSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** Lower case, no dots — it becomes a URL segment and a permission key. */
  key: z.string().max(60),
  label: z.string().max(120),
  /** The section this type's own sub-section is planted under. */
  parentSectionKey: z.string().max(60),
  /** The sub-section planted for it, in the same write as this row. */
  sectionKey: z.string().max(80),
  fields: z.array(FieldDeclSchema),
  columns: z.array(z.string().max(60)),
  statuses: z.array(z.string().max(60)),
  transitions: z.array(z.object({ from: z.string().max(60), to: z.string().max(60) })),
  /**
   * `builtin` is seeded and may not be edited by a studio; `studio` is the
   * tenant's own. Phase 1 ships built-ins only.
   */
  origin: z.string().max(20),
  /** Bumped on every field change. A record remembers the version it was written under. */
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const EngineRecordSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  reference: z.string(),
  /** Which type this is an instance of. The discriminator. */
  typeKey: z.string().max(60),
  /** The type version in force when this was last written. */
  typeVersion: z.number(),
  status: z.string().max(60),
  /** The declared fields' values, keyed by field key. */
  values: z.record(z.string(), z.unknown()),
  createdByCollaboratorId: z.string().max(60),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FieldDecl = z.infer<typeof FieldDeclSchema>;
export type RecordType = z.infer<typeof RecordTypeSchema>;
export type EngineRecord = z.infer<typeof EngineRecordSchema>;
```

- [ ] **Step 6: Verify and commit**

In `package.json`, add `node tests/engine-model.mjs && ` before `node tests/closure-model.mjs`.

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
node tests/engine-model.mjs
git add src/platform/engine/types.ts src/platform/engine/schema.ts tests/engine-model.mjs
git commit -m "A record type declares itself, and a removed field is not deleted" -- \
  src/platform/engine/types.ts src/platform/engine/schema.ts tests/engine-model.mjs package.json
```

---

### Task 3: The two collections, and a section planted in the same write

**Files:**
- Modify: `src/platform/db/keys.ts` (collection lists)
- Modify: `src/platform/db/migrate/mapping.ts` (`COLLECTION_TABLE`)
- Create: `src/platform/engine/sections.ts`
- Test: extends `tests/engine-model.mjs`

**Interfaces:**
- Consumes: `S` and `ID` from `@/platform/db/keys`, `editArr` from `@/platform/db/store`, `Section` from `@/platform/db/sections`
- Produces: `engineSectionKey(typeKey: string): string`, `plantTypeSection(studioId: string, decl: { key: string; label: string; parentSectionKey: string }): Promise<Section>`

- [ ] **Step 1: Write the failing test**

Append to `tests/engine-model.mjs`, before the final `console.log`:

```js
console.log("\n== the section a type plants ==\n");

const S = await import("@/platform/engine/sections");
// A SUB-SECTION FALLS BACK TO ITS ROOT WHEN ABSENT, so a record written before
// its section is planted lands under the parent where nothing reads it. The
// tender register paid for that once. The key is derived, never typed.
ok("a type's section key is derived from its own key",
  S.engineSectionKey("transmittal") === "engine-transmittal",
  S.engineSectionKey("transmittal"));
ok("...and is stable", S.engineSectionKey("transmittal") === S.engineSectionKey("transmittal"));
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tests/engine-model.mjs
```

Expected: FAIL — `Cannot find module '@/platform/engine/sections'`.

- [ ] **Step 3: Register the collections**

In `src/platform/db/keys.ts`, in the collection map, add a NEW entry immediately after the existing `"administration-master"` line (checked 07/09/2026: `"administration-settings"` has **no** collection entry today, so this creates one rather than appending to one):

```ts
  "administration-master": ["locations", "departments"],
  // THE ENGINE'S TWO COLLECTIONS, and no more. A record type is a ROW, so a
  // collection per type would need a deploy per type — the thing runtime was
  // chosen to avoid. Instances are discriminated by `typeKey` inside
  // `engineRecords`. Invariant 1 is untouched: two builders, not one per type.
  //
  // UNDER `administration-settings` because a record TYPE is studio
  // configuration, not any one department's data — the same place the flow
  // templates and the studio's own settings live. The RECORDS sit here too so
  // one scope serves both; their own nav section is planted separately, per
  // `platform/engine/sections.ts`.
  "administration-settings": ["recordTypes", "engineRecords"],
```

In `src/platform/db/migrate/mapping.ts`, beside `siteReports`:

```ts
  recordTypes: "RecordType",
  engineRecords: "EngineRecord",
```

- [ ] **Step 4: Implement `src/platform/engine/sections.ts`**

```ts
// THE SUB-SECTION A RECORD TYPE PLANTS.
//
// PLANTED IN THE SAME WRITE AS THE TYPE ROW, never lazily on first use. A
// sub-section falls back to its ROOT when absent, so records written before the
// section exists land under the parent where nothing reads them — not deleted,
// not corrupted, invisible. The tender register paid for that once and this
// does not repeat it.
//
// `plantMissingSections` only ever ADDS to the stored array and sorts keys it
// does not recognise to the end, so a section planted here survives the
// catch-up rather than being wiped by it.
// `editArr` is the store's, `S` and `ID` are the key builders' — the same two
// imports `platform/db/sections.ts` uses, and for the same reason.
import { S, ID } from "@/platform/db/keys";
import { editArr } from "@/platform/db/store";
import type { Section } from "@/platform/db/sections";

/** Namespaced so an engine section can never collide with a declared one. */
export const engineSectionKey = (typeKey: string): string => `engine-${typeKey}`;

export async function plantTypeSection(
  studioId: string,
  decl: { key: string; label: string; parentSectionKey: string },
): Promise<Section | null> {
  const key = engineSectionKey(decl.key);
  return editArr<Section, Section | null>(S.sections(studioId), (current) => {
    const already = current.find((s) => s.key === key);
    if (already) return { result: already };

    const parent = current.find((s) => s.key === decl.parentSectionKey);
    // A TYPE WHOSE PARENT IS NOT PLANTED IS NOT PLANTED EITHER. Returning null
    // rather than planting at the root: an orphan sub-section renders in no
    // nav and is harder to find than a refusal.
    if (!parent) return { result: null };

    const row: Section = {
      id: ID.subsection(), studioId, key, name: decl.label, parentId: parent.id,
      enabled: true, sortOrder: current.length, settings: {},
      createdAt: new Date().toISOString(),
    };
    return { next: [...current, row], result: row };
  });
}
```

- [ ] **Step 5: Run the test and the suite**

```bash
node tests/engine-model.mjs
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build
```

Expected: model test PASS; `next build` clean (it refuses a collection missing from `COLLECTION_TABLE`, which is the guard that caught `tenders` and `contracts`).

- [ ] **Step 6: Commit**

```bash
git add src/platform/engine/sections.ts
git commit -m "A record type plants its section in the same write as itself" -- \
  src/platform/engine/sections.ts src/platform/db/keys.ts \
  src/platform/db/migrate/mapping.ts tests/engine-model.mjs
```

---

### Task 4: The service

**Files:**
- Create: `src/platform/engine/records.ts`
- Modify: `src/modules/administration/types.ts` (add `engineSection` to the context, if the administration context is used) — otherwise create the context in `records.ts`

**Interfaces:**
- Consumes: `repo` from `@/platform/db/repo`, `requirePermission` from `@/platform/access`, `nextReference` from `@/modules/main/references`, `listCollaborators`, and Task 2's `typeProblem` / `transitionProblem` / `coerceRecord`
- Produces:
  - `listRecordTypes(ctx): Promise<{ types: RecordType[] } | Refusal>`
  - `listRecords(ctx, typeKey: string): Promise<{ type, records, canCreate, canEdit, canDelete } | Refusal>`
  - `createRecord(ctx, typeKey: string, body): Promise<{ record } | Refusal>`
  - `editRecord(ctx, typeKey: string, id: string, body): Promise<{ record } | Refusal>`
  - `moveRecord(ctx, typeKey: string, id: string, to: string): Promise<{ record } | Refusal>`
  - `removeRecord(ctx, typeKey: string, id: string): Promise<{ removed: string } | Refusal>`

- [ ] **Step 1: Write the failing test**

This task's behaviour is asserted in Gate A (Task 6), because it needs a real studio, a real section and a real collaborator. Add the Gate A block now, failing, and make it pass in Step 4.

Append to `tests/gate-a.mjs`, immediately BEFORE the `// =====` line preceding `console.log("== no golden is left behind");`:

```js
// ============================================================================
console.log("== the record engine: a type declared as a row");
// P4b IS RUNTIME, so the assertions here are about the ENGINE and not about any
// one record type. A tenant type has no golden and cannot have one — that is
// the accepted cost of the choice (design §2), so what is pinned is the engine
// through every verb and every refusal on ONE built-in type.
//
// PLACED HERE for the reason the blocks above state: this studio is SHARED and
// several goldens are whole-studio snapshots.
{
  const ENG = await import("@/app/api/studios/[slug]/records/[typeKey]/route.ts");

  const P = ctx({ slug });
  const shot = async (name, payload) => {
    const r = golden(name, payload, EXTRA);
    if (!r.recorded) ok(`${name} matches its golden`, r.ok, r.detail);
    return payload;
  };
  const engPersonWith = async (permissions, alias) => {
    const u = (await createUser({ email: `g-${alias}-${rand()}@test.invalid`, passwordHash: "x" })).user;
    const role = await createRole(studio.id, { name: `role-${alias}`, permissions });
    await addCollaborator(studio.id, { userId: u.id, alias, role: "member", roleIds: [role.id] });
    return u;
  };
  const read = (typeKey) => capture(
    ENG.GET, req(`/api/studios/${slug}/records/${typeKey}`), { ...P, params: { slug, typeKey } });
  const post = (typeKey, body) => capture(
    ENG.POST, req(`/api/studios/${slug}/records/${typeKey}`, { method: "POST", body }),
    { ...P, params: { slug, typeKey } });
  const put = (typeKey, body) => capture(
    ENG.PUT, req(`/api/studios/${slug}/records/${typeKey}`, { method: "PUT", body }),
    { ...P, params: { slug, typeKey } });

  await signIn(owner.id);

  // The built-in seeded by Task 5. It exists because the studio exists.
  const listed = await shot("engine.transmittal.empty", await read("transmittal"));
  ok("a built-in type serves its own list", listed.status === 200, String(listed.status));
  ok("...and returns the declaration with it",
    listed.body?.type?.key === "transmittal", JSON.stringify(listed.body?.type?.key));

  const made = await shot("engine.transmittal.created", await post("transmittal", {
    values: { title: "Drawings pack A", recipient: "Main contractor" },
  }));
  const recordId = made.body?.record?.id;
  ok("a record is created", Boolean(recordId), String(made.status));
  ok("...carrying a reference", /^TRA-\d+$/.test(String(made.body?.record?.reference || "")),
    String(made.body?.record?.reference));
  ok("...born in the first declared status",
    made.body?.record?.status === "Draft", String(made.body?.record?.status));
  // A RECORD REMEMBERS THE VERSION IT WAS WRITTEN UNDER, which is what makes a
  // later field change harmless.
  ok("...and the type version it was written under",
    made.body?.record?.typeVersion === 1, String(made.body?.record?.typeVersion));

  // AN UNDECLARED MOVE IS REFUSED. The chain is data, so this is the whole rule.
  await shot("engine.transmittal.badmove", await put("transmittal", {
    id: recordId, action: "move", to: "Draft",
  }));
  const moved = await shot("engine.transmittal.moved", await put("transmittal", {
    id: recordId, action: "move", to: "Issued",
  }));
  ok("a declared move is allowed", moved.body?.record?.status === "Issued",
    String(moved.body?.record?.status));

  // AN UNKNOWN TYPE IS A 404, not an empty list: an empty list would say the
  // type exists and holds nothing.
  await shot("engine.unknowntype", await read("nosuchtype"));

  // THE PERMISSION IS THE TYPE'S OWN, derived from the URL and never the body.
  const outsider = await engPersonWith(["crmSales.tickets.view"], "noeng");
  await signIn(outsider.id);
  await shot("engine.transmittal.forbidden", await read("transmittal"));
  await signIn(owner.id);

  // AND A GRANT FOR ONE TYPE DOES NOT OPEN ANOTHER.
  const narrow = await engPersonWith(["engine.transmittal.view"], "engnarrow");
  await signIn(narrow.id);
  const theirs = await read("transmittal");
  ok("an engine grant opens its own type", theirs.status === 200, String(theirs.status));
  ok("...at view only", theirs.body?.canCreate === false);
  await signIn(owner.id);
}
```

- [ ] **Step 2: Run it to verify it fails**

```bash
NOMPANY_TEST_SESSION=engine NOMPANY_RECORD_GOLDENS=1 npm test
```

Expected: FAIL — the route module does not exist.

- [ ] **Step 3: Implement `src/platform/engine/records.ts`**

```ts
// THE RECORD ENGINE'S SERVICE. One implementation for every declared type.
//
// THE PERMISSION IS THE TYPE'S OWN, and the type comes from the URL rather than
// the body: `engine.<typeKey>.<verb>`. A grant for one type opens exactly that
// type, and a grant naming a type that does not exist opens nothing.
//
// THE RULES ARE IN ./types, which is pure. Nothing is decided here.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { listCollaborators } from "@/platform/auth/collaborators";
import { transitionProblem, coerceRecord, coerceValue } from "./types";
import type { RecordType, EngineRecord, FieldDecl } from "./schema";
import type { ModuleContext } from "@/modules/context";

const Types = repo<RecordType>("recordTypes");
const Records = repo<EngineRecord>("engineRecords");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();

/** The four letters a type's references carry: TRA-0001 for `transmittal`. */
const prefixOf = (typeKey: string) => typeKey.slice(0, 3).toUpperCase();

/**
 * THE TYPE, AND THE SECTION ITS ROWS LIVE IN. Both collections sit under the
 * studio-settings section, so one scope serves types and instances alike.
 */
async function typeFor(ctx: ModuleContext, typeKey: string) {
  const scope = { studio: ctx.studio, section: ctx.settingsSection };
  const types = await Types.find(scope);
  return { scope, type: types.find((t) => t.key === typeKey) || null };
}

export async function listRecords(ctx: ModuleContext, typeKey: string) {
  const { scope, type } = await typeFor(ctx, typeKey);
  // NOTFOUND BEFORE FORBIDDEN, deliberately: a type that does not exist is not
  // a permission question, and answering "forbidden" would tell an outsider
  // which type keys exist.
  if (!type) return { error: "notfound" };

  const denied = requirePermission(ctx.access, `engine.${typeKey}.view`);
  if (denied) return denied;

  const [rows, people] = await Promise.all([
    Records.find(scope, { where: { typeKey } }),
    listCollaborators(ctx.studio.id),
  ]);
  const aliasOf = new Map(
    (people as { id?: unknown; alias?: unknown }[])
      .map((c) => [String(c?.id ?? ""), String(c?.alias ?? "")] as const),
  );

  return {
    type,
    records: [...rows]
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .map((r) => ({
        ...r,
        // READ THROUGH THE TYPE AS IT IS NOW. A field the type no longer
        // declares is not returned and not deleted.
        values: coerceRecord(type, r.values || {}),
        createdByAlias: aliasOf.get(String(r.createdByCollaboratorId || "")) || "",
      })),
    canCreate: !requirePermission(ctx.access, `engine.${typeKey}.create`),
    canEdit: !requirePermission(ctx.access, `engine.${typeKey}.edit`),
    canDelete: !requirePermission(ctx.access, `engine.${typeKey}.delete`),
  };
}

/** Every declared field, taken from the body and nothing else carried through. */
function valuesFrom(type: RecordType, body: Record<string, unknown>) {
  const raw = (body?.values || {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const f of (type.fields || []) as FieldDecl[]) {
    out[f.key] = coerceValue(f, raw[f.key]);
  }
  return out;
}

export async function createRecord(
  ctx: ModuleContext, typeKey: string, body: Record<string, unknown>,
) {
  const { scope, type } = await typeFor(ctx, typeKey);
  if (!type) return { error: "notfound" };

  const denied = requirePermission(ctx.access, `engine.${typeKey}.create`);
  if (denied) return denied;

  const rows = await Records.find(scope, { where: { typeKey } });
  const at = now();
  return {
    record: await Records.create(scope, {
      reference: await nextReference(ctx.studio.id, {
        rows, field: "reference", prefix: prefixOf(typeKey),
      }),
      typeKey,
      typeVersion: type.version,
      // THE FIRST DECLARED STATUS. A record born outside the chain could never
      // move, because every transition names a `from`.
      status: (type.statuses || [])[0] || "",
      values: valuesFrom(type, body),
      createdByCollaboratorId: ctx.collaborator.id,
      createdAt: at,
      updatedAt: at,
    }),
  };
}

export async function editRecord(
  ctx: ModuleContext, typeKey: string, id: string, body: Record<string, unknown>,
) {
  const { scope, type } = await typeFor(ctx, typeKey);
  if (!type) return { error: "notfound" };

  const denied = requirePermission(ctx.access, `engine.${typeKey}.edit`);
  if (denied) return denied;

  const existing = await Records.byId(scope, id);
  if (!existing || existing.typeKey !== typeKey) return { error: "notfound" };

  return {
    record: await Records.update(scope, id, (row) => ({
      ...row,
      values: valuesFrom(type, body),
      // RE-STAMPED ON WRITE. The row now conforms to the type as it is, which
      // is what the version means: what it was written under.
      typeVersion: type.version,
      updatedAt: now(),
    })),
  };
}

/**
 * A STATUS MOVE, and it is its own act rather than a field on the edit — the
 * shape that let a rejected change order approve itself was an answer routed
 * through a generic write.
 */
export async function moveRecord(
  ctx: ModuleContext, typeKey: string, id: string, to: string,
) {
  const { scope, type } = await typeFor(ctx, typeKey);
  if (!type) return { error: "notfound" };

  const denied = requirePermission(ctx.access, `engine.${typeKey}.edit`);
  if (denied) return denied;

  const existing = await Records.byId(scope, id);
  if (!existing || existing.typeKey !== typeKey) return { error: "notfound" };

  const problem = transitionProblem(type, existing.status, to);
  if (problem) return { error: problem };

  return {
    record: await Records.update(scope, id, (row) => ({
      ...row, status: str(to, 60), updatedAt: now(),
    })),
  };
}

export async function removeRecord(ctx: ModuleContext, typeKey: string, id: string) {
  const { scope, type } = await typeFor(ctx, typeKey);
  if (!type) return { error: "notfound" };

  const denied = requirePermission(ctx.access, `engine.${typeKey}.delete`);
  if (denied) return denied;

  const existing = await Records.byId(scope, id);
  if (!existing || existing.typeKey !== typeKey) return { error: "notfound" };

  await Records.remove(scope, id);
  return { removed: id };
}
```

- [ ] **Step 4: Verify it type-checks**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
```

Expected: clean. If `ModuleContext` lacks `settingsSection`, add it to the context spec used by the route in Task 5 rather than widening `ModuleContext`.

- [ ] **Step 5: Commit**

```bash
git add src/platform/engine/records.ts
git commit -m "One service serves every declared record type" -- src/platform/engine/records.ts
```

---

### Task 5: The route, the context, and one seeded built-in

**Files:**
- Create: `src/app/api/studios/[slug]/records/[typeKey]/route.ts`
- Create: `src/platform/engine/builtins.ts`
- Modify: `src/modules/main/studios.ts` (seed built-in types at studio creation, beside the section seeding)

**Interfaces:**
- Consumes: Task 4's service, `route`/`refused` from `@/platform/http/route`, `moduleContext` from `@/modules/context`, Task 3's `plantTypeSection`
- Produces: `BUILTIN_TYPES: readonly TypeDecl[]`, `seedBuiltinTypes(studioId: string): Promise<void>`

- [ ] **Step 1: Implement the built-in**

Create `src/platform/engine/builtins.ts`:

```ts
// THE TYPES EVERY STUDIO GETS, seeded at creation.
//
// PHASE 1 SHIPS ONE, deliberately. The engine's value is proven by a type that
// is real rather than by a demonstration: transmittals are named in the
// programme spec's P5 as engine-driven, and Engineering & Documents already
// exists as a section to plant under.
//
// `origin: "builtin"` is what stops a studio editing it. Tenant-declared types
// come in phase 3 and are not this.
export const BUILTIN_TYPES = [
  {
    key: "transmittal",
    label: "Transmittals",
    parentSectionKey: "engineering-docs",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "recipient", label: "Recipient", kind: "text" },
      { key: "issuedOn", label: "Issued", kind: "date" },
      { key: "notes", label: "Notes", kind: "longtext" },
    ],
    columns: ["title", "recipient", "issuedOn"],
    statuses: ["Draft", "Issued", "Acknowledged"],
    transitions: [
      { from: "Draft", to: "Issued" },
      { from: "Issued", to: "Acknowledged" },
    ],
    version: 1,
  },
] as const;
```

- [ ] **Step 2: Seed at studio creation**

In `src/modules/main/studios.ts`, find where `createStudio` seeds sections and the departments register, and add after it:

```ts
  // THE BUILT-IN RECORD TYPES, seeded the way sections and the departments
  // register are — and for the same reason: a seeded thing added after a studio
  // exists never reaches that studio, and a manual backfill gets forgotten.
  await seedBuiltinTypes(studio.id);
```

Create the seeder in `src/platform/engine/builtins.ts`:

```ts
import { repo } from "@/platform/db/repo";
import { getSectionByKey } from "@/platform/db/sections";
import { plantTypeSection, engineSectionKey } from "./sections";
import type { RecordType } from "./schema";

const Types = repo<RecordType>("recordTypes");

/**
 * SEEDED, AND NEVER OVERWRITING. A studio that already has a type keeps it —
 * the same courtesy `nextPool` extends to service actions and the departments
 * register extends to a trade's chart.
 *
 * THE SECTION IS PLANTED FIRST and the type row written second. A type whose
 * section does not exist would serve records into a sub-section that falls back
 * to its root, where nothing reads them.
 */
export async function seedBuiltinTypes(studioId: string): Promise<void> {
  const settings = await getSectionByKey(studioId, "administration-settings");
  if (!settings) return;
  const scope = { studio: { id: studioId }, section: settings };
  const existing = await Types.find(scope);

  for (const decl of BUILTIN_TYPES) {
    if (existing.some((t) => t.key === decl.key)) continue;
    const section = await plantTypeSection(studioId, decl);
    if (!section) continue;
    const at = new Date().toISOString();
    await Types.create(scope, {
      ...decl,
      fields: [...decl.fields],
      columns: [...decl.columns],
      statuses: [...decl.statuses],
      transitions: decl.transitions.map((t) => ({ ...t })),
      sectionKey: engineSectionKey(decl.key),
      origin: "builtin",
      createdAt: at,
      updatedAt: at,
    });
  }
}
```

- [ ] **Step 3: Implement the route**

Create `src/app/api/studios/[slug]/records/[typeKey]/route.ts`:

```ts
import { route, refused } from "@/platform/http/route";
import { moduleContext } from "@/modules/context";
import {
  listRecords, createRecord, editRecord, moveRecord, removeRecord,
} from "@/platform/engine/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE ROUTE FOR EVERY DECLARED TYPE. The type comes from the URL segment and
// never from the body, which is what makes `engine.<typeKey>.<verb>` mean
// something: a request cannot name a type it is not addressed to.
const engineContext = moduleContext({
  root: "administration",
  sub: { settings: "administration-settings" },
});

const spec = { auth: "studio", context: engineContext, body: true, name: "records" };

const typeKeyOf = (request: Request): string => {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  return parts[parts.indexOf("records") + 1] || "";
};

export const GET = route({ ...spec, body: false }, async (engine) => {
  const result = await listRecords(engine, typeKeyOf(engine.request));
  if (refused(result)) return result;
  return {
    ok: true,
    // THE DECLARATION TRAVELS WITH THE ROWS. The screen is generic, so it has
    // no other way to know what columns to draw or what moves to offer.
    type: result.type,
    records: result.records,
    canCreate: result.canCreate,
    canEdit: result.canEdit,
    canDelete: result.canDelete,
  };
});

export const POST = route(spec, async (engine) => {
  const result = await createRecord(engine, typeKeyOf(engine.request), engine.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, record: result.record } };
});

export const PUT = route(spec, async (engine) => {
  if (!engine.body.id) return { error: "missing" };
  const typeKey = typeKeyOf(engine.request);
  const id = String(engine.body.id);

  // MOVING IS ITS OWN BRANCH AND ITS OWN ACT, never a status written through
  // the edit path.
  if (engine.body.action === "move") {
    const moved = await moveRecord(engine, typeKey, id, String(engine.body.to || ""));
    if (refused(moved)) return moved;
    return { ok: true, record: moved.record };
  }

  const result = await editRecord(engine, typeKey, id, engine.body);
  if (refused(result)) return result;
  return { ok: true, record: result.record };
});

export const DELETE = route(spec, async (engine) => {
  if (!engine.body.id) return { error: "missing" };
  const result = await removeRecord(engine, typeKeyOf(engine.request), String(engine.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
```

- [ ] **Step 4: Record and verify**

```bash
git add src/platform/engine/builtins.ts "src/app/api/studios/[slug]/records/[typeKey]/route.ts"
NOMPANY_TEST_SESSION=engine NOMPANY_RECORD_GOLDENS=1 npm test
NOMPANY_TEST_SESSION=engine npm test
```

Expected: both exit 0, `gate A: all passed`. Seven new goldens; **the catalogue assertion must still read 177** — engine keys are structural, not declared.

- [ ] **Step 5: Check the golden movements decompose**

```bash
git diff tests/goldens/ | grep '^+' | grep -v '^+++' | sed 's/^.//' | sed 's/[0-9][0-9]*/N/g' | sort | uniq -c | sort -rn | head
```

Expected: only the new `engine.*` files, plus one `engine-transmittal` section row in any whole-studio snapshot. **Any `permissionCount` movement is a bug** — the engine declares no catalogue key.

- [ ] **Step 6: Commit**

```bash
git commit -m "A type declared as a row serves its own records" -- \
  "src/app/api/studios/[slug]/records/[typeKey]/route.ts" \
  src/platform/engine/builtins.ts src/modules/main/studios.ts \
  tests/gate-a.mjs tests/goldens/
```

---

### Task 6: The generic screen

**Files:**
- Create: `src/components/studio2/StudioRecords.js`
- Modify: `src/app/studio/[[...segments]]/page.js` (route `engine-*` section keys)
- Modify: `src/shared/studio/rest.ts` (strings, EN and AR)

**Interfaces:**
- Consumes: the GET payload from Task 5 — `{ type, records, canCreate, canEdit, canDelete }`
- Produces: default export `StudioRecords({ slug, typeKey })`

- [ ] **Step 1: Add the strings**

In `src/shared/studio/rest.ts`, add to the type block, the `en` block and the `ar` block (all three, same keys):

```ts
  recordsLoading: string;
  recordsEmpty: string;
  recordsEmptyBody: string;
  recordNew: string;
  recordMove: (to: string) => string;
  // CHECKED 07/09/2026: `rest.ts` carries neither. Added here with the rest
  // rather than importing a second dictionary into one screen — every P4a
  // screen carries its own copies of these two.
  cancel: string;
  save: string;
  refuseNotAllowed: string;
  refuseStatusUnknown: string;
```

English:

```ts
  recordsLoading: "Loading…",
  recordsEmpty: "Nothing here yet",
  recordsEmptyBody: "Records of this kind will appear here once somebody adds one.",
  recordNew: "New",
  recordMove: (to) => `Move to ${to}`,
  refuseNotAllowed: "That move is not one this record type allows.",
  refuseStatusUnknown: "That is not a status this record type has.",
  cancel: "Cancel",
  save: "Save",
```

Arabic:

```ts
  recordsLoading: "جارٍ التحميل…",
  recordsEmpty: "لا شيء هنا بعد",
  recordsEmptyBody: "تظهر السجلات من هذا النوع هنا بعد أن يضيف أحدهم واحداً.",
  recordNew: "جديد",
  recordMove: (to) => `النقل إلى ${to}`,
  refuseNotAllowed: "هذه النقلة لا يسمح بها هذا النوع من السجلات.",
  refuseStatusUnknown: "ليست هذه حالة يحملها هذا النوع من السجلات.",
  cancel: "إلغاء",
  save: "حفظ",
```

- [ ] **Step 2: Implement the screen**

Create `src/components/studio2/StudioRecords.js`:

```js
// THE GENERIC RECORD SCREEN. One implementation for every declared type.
//
// IT KNOWS NOTHING ABOUT ANY TYPE. The columns it draws, the fields it offers
// and the moves it shows all come from the declaration the route returns
// beside the rows — which is why the payload carries `type` at all.
//
// THE SCAFFOLDING BELOW IS THE 22 LINES THAT WERE BYTE-IDENTICAL IN SEVEN
// HAND-BUILT SCREENS. This is the copy that replaces them.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { restDict } from "@/shared/studio/rest";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, Empty, Dialog, microLabel, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

function refusal(tr, token) {
  switch (token) {
    case "not-allowed": return tr.refuseNotAllowed;
    case "status": return tr.refuseStatusUnknown;
    default: return token;
  }
}

/**
 * A DECLARED FIELD BECOMES A CONTROL, and every one of the nine kinds is
 * handled — a closed set with a hole in it is not a closed set.
 *
 * `collaborator` and `reference` fall through to a text input in phase 1 and are
 * named as such in the functionality file: the pickers they want are real work
 * and this screen does not fake them.
 */
function controlFor(field, value, onChange) {
  if (field.kind === "boolean") {
    return (
      <Field key={field.key} as="select" label={field.label} value={value ? "yes" : ""}
        onChange={(v) => onChange(v === "yes")}
        options={[{ value: "", label: "No" }, { value: "yes", label: "Yes" }]} />
    );
  }
  if (field.kind === "longtext") {
    return <Field key={field.key} as="textarea" label={field.label} value={value} onChange={onChange} />;
  }
  if (field.kind === "select") {
    return (
      <Field key={field.key} as="select" label={field.label} value={value} onChange={onChange}
        options={[{ value: "", label: "—" }, ...(field.options || []).map((o) => ({ value: o, label: o }))]} />
    );
  }
  const type = field.kind === "date" ? "date"
    : (field.kind === "number" || field.kind === "money") ? "number" : "text";
  return <Field key={field.key} type={type} label={field.label} value={value} onChange={onChange} />;
}

/** NULL IS NOT NOUGHT: a number nobody filled in renders as a dash. */
function cell(field, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (field.kind === "date") return fmtDate(value);
  return String(value);
}

export default function StudioRecords({ slug, typeKey }) {
  const tr = restDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/records/${typeKey}`, { cache: "no-store" });
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  }, [slug, typeKey]);

  const apply = useCallback(({ ok, body }) => {
    if (!ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, []);

  useEffect(() => {
    let current = true;
    (async () => {
      const answer = await read();
      if (current) apply(answer);
    })();
    return () => { current = false; };
  }, [read, apply]);

  const reload = useCallback(async () => { apply(await read()); }, [read, apply]);
  useLiveUpdates(slug, reload);

  const send = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/records/${typeKey}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return false; }
    await reload();
    return true;
  }, [slug, typeKey, reload, tr]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.recordsLoading} />;

  const { type, records, canCreate, canEdit } = data;
  const columns = (type.columns || []).map((c) => (type.fields || []).find((f) => f.key === c)).filter(Boolean);
  const movesFrom = (status) => (type.transitions || []).filter((t) => t.from === status);

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={h2}>{type.label}</h2>
        {canCreate && (
          <button type="button" className={btn}
            onClick={() => setForm(Object.fromEntries((type.fields || []).map((f) => [f.key, ""])))}>
            {tr.recordNew}
          </button>
        )}
      </div>

      {!records.length ? (
        <Empty title={tr.recordsEmpty} body={tr.recordsEmptyBody} />
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <section key={r.id} className={panel}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-slate-900 dark:text-white">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.reference}</span>
                    <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">{r.status}</span>
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-600 dark:text-slate-300">
                    {columns.map((f) => (
                      <span key={f.key}>
                        <span className={microLabel}>{f.label}</span> {cell(f, r.values?.[f.key])}
                      </span>
                    ))}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    {movesFrom(r.status).map((t) => (
                      <button key={t.to} type="button" className={btnGhost} disabled={busy}
                        onClick={() => send("PUT", { id: r.id, action: "move", to: t.to })}>
                        {tr.recordMove(t.to)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {form && (
        <Dialog title={type.label} onClose={() => setForm(null)}>
          <div className="space-y-3">
            {(type.fields || []).map((f) => controlFor(f, form[f.key],
              (v) => setForm({ ...form, [f.key]: v })))}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy}
                onClick={async () => {
                  if (await send("POST", { values: form })) setForm(null);
                }}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Route it**

In `src/app/studio/[[...segments]]/page.js`, add the lazy import beside the others:

```js
const StudioRecords = nextDynamic(
  () => import("@/components/studio2/StudioRecords"),
  { loading: () => <ScreenSkeleton /> },
);
```

And in the render chain, BEFORE the `screenKey === "inventory"` line:

```js
        // EVERY ENGINE TYPE, by prefix rather than by key. A type declared this
        // morning renders this morning — naming them one by one here would put
        // the deploy back that runtime was chosen to remove.
        : active?.key?.startsWith("engine-")
          ? <StudioRecords slug={studio.slug} typeKey={active.key.slice("engine-".length)} />
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
npm run lint:budget
npx next build
node scripts/bundle-budget.mjs
NOMPANY_TEST_SESSION=engine npm test
```

Expected: all clean; lint 142/0 or lower; `gate A: all passed`.

- [ ] **Step 5: Open it in a browser**

```bash
PORT=3013 npm run dev:sandbox
```

Then visit `/sandbox/engine-transmittal`. Confirm: the list draws the declared columns, "New" opens a dialog built from the declaration, saving creates a record with a `TRA-` reference, and the move button offers only the declared next status. Switch the studio to Arabic and confirm it mirrors.

**Stop the dev server before running `npm test` again** — it holds pool connections.

- [ ] **Step 6: Commit**

```bash
git add src/components/studio2/StudioRecords.js
git commit -m "One screen draws every declared record type" -- \
  src/components/studio2/StudioRecords.js "src/app/studio/[[...segments]]/page.js" \
  src/shared/studio/rest.ts
```

---

### Task 7: The functionality file, and the progress inventory

**Files:**
- Create: `docs/functionality/record-engine.md`
- Modify: `docs/progress.md` (the P4b row and the subsection inventory)

- [ ] **Step 1: Write `docs/functionality/record-engine.md`**

Cover, in the house style — reasons, not just decisions:

- What it is: a record type declared as a row; the engine supplies the rest.
- Why runtime, and the two costs accepted (`tsc` cannot see tenant shapes; Gate A pins the engine, never tenant records).
- The permission namespace, and the silent-drop defect it fixes.
- One collection for every instance, and why that is forced.
- The section planted in the same write, and the tender register that paid for the other order.
- Versioning: a removed field is not rendered and not deleted.
- **Not built yet**, stated in words: tenant self-service, attachments, comments, audit, field-level permissions, cross-type queries, and the fact that only ONE built-in type exists.

- [ ] **Step 2: Update the inventory**

In `docs/progress.md`, change the P4b heading from `⬜ not started` to `🟡 phase 1 on main` and add one line naming what phase 1 shipped and what phases 2 and 3 still are. **Re-measure** the golden count and the catalogue size at the commit you are writing:

```bash
ls tests/goldens | wc -l
grep -n "ALL_PERMISSIONS.length ===" tests/gate-a.mjs
```

- [ ] **Step 3: Commit**

```bash
git add docs/functionality/record-engine.md
git commit -m "The record engine is written down, and the inventory says phase 1" -- \
  docs/functionality/record-engine.md docs/progress.md
```

---

## Self-review

**Spec coverage.** §1 → Tasks 4–6. §2 costs → recorded in Task 7's doc and asserted in Task 5's Gate A block. §3 extraction → Task 6 replaces the 22-line scaffolding. §4 storage → Task 3. §5 permissions → Task 1, asserted directly. §6 sections → Task 3, planted in the same write. §7 validation and versioning → Task 2 (`coerceRecord`, `typeVersion`). §8 what the engine supplies → Task 4 for list/card/create/edit/delete/transitions; **attachments, comments and audit are NOT in phase 1** and are named as such in Task 7's "Not built yet" — the spec lists them under §8 without assigning them to a phase, and phase 1 is defined by §9 as "one built-in type end to end". §9 phasing → this plan is phase 1 only. §10 acceptance → the six criteria map to Task 5's Gate A assertions and Task 6's browser check; the orphaned-key report is **deferred with phase 3**, since no type can be deleted in phase 1. §11 → nothing here builds it.

**Placeholders.** None: every step carries the code it needs.

**Type consistency.** `engineSectionKey` and `plantTypeSection` (Task 3) are used unchanged in Task 5's seeder. `coerceRecord`/`coerceValue`/`transitionProblem` (Task 2) are used unchanged in Task 4. The GET payload named in Task 5 is exactly what Task 6 destructures. `FieldDecl` is declared in `schema.ts` (Zod) and structurally in `types.ts` (pure, no imports) — deliberately two declarations, because the pure model may not import Zod.
