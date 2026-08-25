# Service Actions from a Field of Work — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a studio pick one Type of Industry that seeds its service-action pool from a fixed field→action matrix, editable by remove/add-from-standard, with soft-retire on removal so existing references are never broken.

**Architecture:** A pure constants module (`src/shared/fieldsOfWork.ts`) holds the 25 fields, 20 actions and the matrix. A logic seam (`src/modules/studioServiceActions.ts`) computes usage and the pure pool transition. A dedicated route (`.../settings/service-actions`) owns the field-of-work write and the pool edit, so the existing settings route's golden and hop budget stay untouched. Inventory's `cleanScope` widens its "known" set to active ∪ retired, which is what makes soft-retire *carry* references rather than filter them.

**Tech Stack:** Next.js 16 route handlers, TypeScript (shared + modules), the integration suite in `tests/suite.mjs` (real routes, real Redis, `NOMPANY_KEY_PREFIX`), goldens under `tests/goldens/`.

**Spec:** `docs/superpowers/specs/2026-08-26-service-actions-industry-matrix-design.md`

> **Refinement vs. spec §5.5:** the spec proposed folding usage into the settings GET. The settings route reads only the studio (not inventory/projects), so folding would add Redis waves and risk the hop contract. This plan instead gives the editor its own endpoint. Usage counts **inventory items only** (`scope`), matching the user's exact requirement ("number of items affected"); project weights stay valid automatically because retired actions remain "known".

## Global Constraints

- **Keys only in `src/platform/db/keys.ts`.** No new key is needed — `fieldOfWork`, `fieldOfWorkOther`, `retiredServiceActions` ride on the existing studio record, exactly as `serviceActions` does.
- **Writes go through `updateStudio` (compare-and-set).** No blind whole-collection write; no bulk rewrite of inventory items.
- **Non-destructive.** Removal is soft-retire (a move between two lists on one record). No DEL, FLUSH, or broad scan. Verification stays read-only.
- **Golden responses are the contract.** Re-record only with a stated reason, in the same commit. `NOMPANY_RECORD_GOLDENS` is never set in CI.
- **Hop counts are the contract.** The existing settings route must not gain a wave; the new endpoint's reads are isolated to it.
- **Siblings import relatively** (`./keys`), cross-folder imports use the `@/` alias. `src/shared/**` must not import anything that opens Redis.
- **House style:** declarative commit subjects (state after the change), comments explain *why*. Service-action names are the 20 standard values verbatim; the tenant-facing label for `fieldOfWork` is "Type of industry".
- **Verify every change:** `npm test` · `npx tsc --noEmit` · `npx tsc --noEmit -p tsconfig.strict.json` · `npx next build`.

---

### Task 1: The field-of-work constants

**Files:**
- Create: `src/shared/fieldsOfWork.ts`
- Test: `tests/suite.mjs` (new block near the other pure-value blocks)

**Interfaces:**
- Produces:
  - `SERVICE_ACTIONS: readonly string[]` — the 20 standard actions, in sheet order.
  - `FIELDS_OF_WORK: readonly string[]` — the 25 field names.
  - `FIELD_ACTION_MATRIX: Record<string, readonly string[]>` — field name → its ticked actions (each a member of `SERVICE_ACTIONS`).
  - `OTHER_FIELD = "Other"`.
  - `actionsForField(field: string): string[]` — the matrix row for `field`, or `[]` for `"Other"`/unknown.

- [ ] **Step 1: Write the failing test**

Add to `tests/suite.mjs` (after the imports, anywhere among the top-level blocks):

```js
import { SERVICE_ACTIONS, FIELDS_OF_WORK, FIELD_ACTION_MATRIX, actionsForField, OTHER_FIELD } from "@/shared/fieldsOfWork";

// ============================================================================
console.log("== fields of work: the matrix cannot drift from its actions");
{
  ok("there are 20 standard service actions", SERVICE_ACTIONS.length === 20, String(SERVICE_ACTIONS.length));
  ok("there are 25 fields of work", FIELDS_OF_WORK.length === 25, String(FIELDS_OF_WORK.length));

  const actionSet = new Set(SERVICE_ACTIONS);
  const strayValues = Object.entries(FIELD_ACTION_MATRIX)
    .flatMap(([f, acts]) => acts.filter((a) => !actionSet.has(a)).map((a) => `${f}:${a}`));
  ok("every matrix value is one of the 20 actions", strayValues.length === 0, strayValues.join(", "));

  const missingRows = FIELDS_OF_WORK.filter((f) => !Array.isArray(FIELD_ACTION_MATRIX[f]));
  ok("every field has a matrix row", missingRows.length === 0, missingRows.join(", "));

  ok("actionsForField returns a field's row", actionsForField("Manufacturing").includes("Fabrication / Manufacturing"));
  ok("actionsForField('Other') seeds nothing", actionsForField(OTHER_FIELD).length === 0);
  ok("actionsForField(unknown) seeds nothing", actionsForField("Nope").length === 0);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test 2>&1 | grep -i "fields of work" -A6`
Expected: FAIL / module-not-found for `@/shared/fieldsOfWork`.

- [ ] **Step 3: Write the constants**

Create `src/shared/fieldsOfWork.ts`. Copy the 20 actions and the full matrix verbatim from the spec's Appendix A. Skeleton (fill EVERY field's row from Appendix A — all 25):

```ts
// THE MARKET REFERENCE (UN ISIC Rev. 4, grouped): 25 fields of work and the 20
// core service actions each typically performs. A fixed platform standard, not
// studio-editable — a studio stores only which field it chose and the pool that
// seeds. Pure values, no Redis, so a client Settings component and a server
// route may both import it. Source: Company_Fields_and_Project_Actions.xlsx.

export const SERVICE_ACTIONS = [
  "Consulting & Advisory", "Survey & Assessment", "Design & Engineering",
  "Procurement & Sourcing", "Fabrication / Manufacturing", "Assembly",
  "Programming & Configuration", "Construction & Civil Works",
  "Demolition & Dismantling", "Installation", "Integration",
  "Delivery & Transportation", "Warehousing & Storage", "Testing & Inspection",
  "Commissioning", "Training", "Operation", "Maintenance & Repair",
  "Upgrading & Retrofit", "Decommissioning & Disposal",
] as const;

export const OTHER_FIELD = "Other";

// field → ticked actions. Fill all 25 rows from spec Appendix A.
export const FIELD_ACTION_MATRIX: Record<string, readonly string[]> = {
  "Agriculture, Forestry & Fishing": ["Survey & Assessment", "Procurement & Sourcing", "Assembly", "Installation", "Delivery & Transportation", "Warehousing & Storage", "Testing & Inspection", "Operation", "Maintenance & Repair"],
  "Mining & Quarrying": ["Consulting & Advisory", "Survey & Assessment", "Design & Engineering", "Procurement & Sourcing", "Construction & Civil Works", "Demolition & Dismantling", "Installation", "Delivery & Transportation", "Testing & Inspection", "Operation", "Maintenance & Repair", "Decommissioning & Disposal"],
  // … the remaining 23 rows, verbatim from Appendix A …
};

export const FIELDS_OF_WORK = Object.keys(FIELD_ACTION_MATRIX);

export function actionsForField(field: string): string[] {
  return [...(FIELD_ACTION_MATRIX[field] ?? [])];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test 2>&1 | grep -i "fields of work" -A6`
Expected: all `ok`. If "there are 25 fields" fails, a matrix row is missing or misspelled.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
git add src/shared/fieldsOfWork.ts tests/suite.mjs
git commit -m "The market's 25 fields of work, each with its service actions"
```

---

### Task 2: The pool-transition logic and usage helper

**Files:**
- Create: `src/modules/studioServiceActions.ts`
- Test: `tests/suite.mjs` (new block)

**Interfaces:**
- Consumes: `SERVICE_ACTIONS`, `actionsForField` from `@/shared/fieldsOfWork`; `inventoryContext`, `listItems` from `@/modules/inventory/inventory`.
- Produces:
  - `nextPool(input: { prevActive: string[]; prevRetired: string[]; nextActive: string[]; referenced: Set<string> }): { serviceActions: string[]; retiredServiceActions: string[] }` — pure.
  - `cleanNextActive(raw: unknown, prevActive: string[]): string[]` — an edited pool is limited to the 20 standard actions plus any legacy entry already in `prevActive` (so back-compat custom names survive until a field is chosen). De-duped case-insensitively, capped at 40.
  - `serviceActionUsage(user: User, slug: string): Promise<Record<string, number>>` — action name → count of inventory items whose `scope` contains it.

- [ ] **Step 1: Write the failing test** (pure `nextPool`, no Redis)

Add to `tests/suite.mjs`:

```js
import { nextPool, cleanNextActive } from "@/modules/studioServiceActions";

// ============================================================================
console.log("== service-action pool: remove is retire, not delete");
{
  // Removing a referenced action carries it into retired, not out of existence.
  const a = nextPool({
    prevActive: ["Installation", "Training"], prevRetired: [],
    nextActive: ["Installation"], referenced: new Set(["Training"]),
  });
  ok("a referenced removed action is retired", a.retiredServiceActions.includes("Training"));
  ok("...and leaves the active pool", !a.serviceActions.includes("Training"));

  // Removing an UNreferenced action just drops it — nothing carries it.
  const b = nextPool({
    prevActive: ["Installation", "Training"], prevRetired: [],
    nextActive: ["Installation"], referenced: new Set(),
  });
  ok("an unreferenced removed action is dropped", !b.retiredServiceActions.includes("Training"));

  // Re-adding a retired action un-retires it.
  const c = nextPool({
    prevActive: ["Installation"], prevRetired: ["Training"],
    nextActive: ["Installation", "Training"], referenced: new Set(["Training"]),
  });
  ok("re-adding un-retires", c.serviceActions.includes("Training") && !c.retiredServiceActions.includes("Training"));

  // A retired action whose last item is gone is pruned on the next write.
  const d = nextPool({
    prevActive: ["Installation"], prevRetired: ["Training"],
    nextActive: ["Installation"], referenced: new Set(),
  });
  ok("a retired action nothing references is pruned", d.retiredServiceActions.length === 0);

  // Edited pool is limited to the standard 20 plus surviving legacy names.
  ok("a non-standard new action is rejected", !cleanNextActive(["Made Up"], ["Installation"]).includes("Made Up"));
  ok("a legacy name in prevActive survives", cleanNextActive(["Legacy Thing"], ["Legacy Thing"]).includes("Legacy Thing"));
  ok("a standard action is accepted", cleanNextActive(["Commissioning"], []).includes("Commissioning"));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test 2>&1 | grep -i "pool: remove is retire" -A10`
Expected: FAIL / module-not-found for `@/modules/studioServiceActions`.

- [ ] **Step 3: Write the module**

Create `src/modules/studioServiceActions.ts`:

```ts
// THE POOL TRANSITION, and what an action is still used by. Kept apart from the
// settings route so the route that owns the studio write stays a thin boundary,
// and so this logic is unit-testable without a request.

import { SERVICE_ACTIONS } from "@/shared/fieldsOfWork";
import { inventoryContext, listItems } from "@/modules/inventory/inventory";
import type { User } from "@/platform/auth/types"; // match the app's User import; see currentUser's type

const STANDARD = new Set<string>(SERVICE_ACTIONS);

function dedupe(list: string[], cap = 40): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const raw of list) {
    const name = String(raw ?? "").trim().slice(0, 80);
    const key = name.toLowerCase();
    if (name && !seen.has(key)) { seen.add(key); out.push(name); }
    if (out.length >= cap) break;
  }
  return out;
}

// An edited pool may hold any of the 20 standard actions, plus any legacy custom
// name a studio already had (so a pre-existing free-text list is not wiped the
// moment the editor opens). New non-standard names are refused — the manual
// "Other" service action is deferred (see the spec's north star).
export function cleanNextActive(raw: unknown, prevActive: string[]): string[] {
  const legacy = new Set(prevActive.map((s) => s.toLowerCase()));
  const list = (Array.isArray(raw) ? raw : []).map((s) => String(s ?? "").trim().slice(0, 80));
  return dedupe(list.filter((name) => STANDARD.has(name) || legacy.has(name.toLowerCase())));
}

// Pure. Removing a referenced action retires it (carry); removing an unreferenced
// one drops it; re-adding un-retires. Retired is always pruned to what is still
// referenced, so it never grows unbounded.
export function nextPool(input: {
  prevActive: string[]; prevRetired: string[]; nextActive: string[]; referenced: Set<string>;
}): { serviceActions: string[]; retiredServiceActions: string[] } {
  const active = dedupe(input.nextActive);
  const activeSet = new Set(active.map((s) => s.toLowerCase()));
  const removed = [...input.prevActive, ...input.prevRetired]
    .filter((a) => !activeSet.has(a.toLowerCase()));
  const retired = dedupe(removed.filter((a) => input.referenced.has(a)));
  return { serviceActions: active, retiredServiceActions: retired };
}

// How many registered items list each action in their scope. One inventory read;
// lives on the dedicated endpoint, never on the settings route's wave.
export async function serviceActionUsage(user: User, slug: string): Promise<Record<string, number>> {
  const ctx = await inventoryContext(user, slug);
  if ((ctx as { error?: string }).error) return {};
  const items = await listItems(ctx as Parameters<typeof listItems>[0]);
  const counts: Record<string, number> = {};
  for (const item of items) for (const a of ((item as { scope?: string[] }).scope ?? [])) {
    counts[a] = (counts[a] ?? 0) + 1;
  }
  return counts;
}
```

Note for the implementer: confirm the `User` type import path against how `currentUser()` types its result (grep `export.*currentUser`); use that exact type rather than inventing one.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test 2>&1 | grep -i "pool: remove is retire" -A10`
Expected: all `ok`.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
git add src/modules/studioServiceActions.ts tests/suite.mjs
git commit -m "Removing a service action retires it, keeping what still uses it"
```

---

### Task 3: Inventory scope carries retired actions

**Files:**
- Modify: `src/modules/inventory/inventory.ts` (`cleanScope`, ~line 125)
- Test: `tests/suite.mjs` (new block)

**Interfaces:**
- Consumes: `studio.serviceActions`, `studio.retiredServiceActions` on the studio record.
- Produces: no new export — behaviour change only.

- [ ] **Step 1: Write the failing test**

Add to `tests/suite.mjs` (uses the fixture `studio`, `owner`, `slug`, `signInAs`, and `updateStudio` already imported):

```js
// ============================================================================
console.log("== inventory scope carries a retired action, it does not drop it");
{
  await updateStudio(studio.id, { serviceActions: ["Installation", "Training"], retiredServiceActions: [] });
  const ic = await inventoryContext(owner, slug);
  const item = await createItem(ic, { name: `Scoped ${rand()}`, unit: "pc", scope: ["Installation", "Training"] });
  ok("an item scopes to two live actions", (item.scope || []).length === 2, JSON.stringify(item.scope));

  // Training is removed from the pool but retired because this item still uses it.
  await updateStudio(studio.id, { serviceActions: ["Installation"], retiredServiceActions: ["Training"] });
  const ic2 = await inventoryContext(owner, slug);
  const again = await editItem(ic2, item.id, { name: item.name, unit: "pc", scope: ["Installation", "Training"] });
  ok("re-saving keeps the retired action in scope", (again.scope || []).includes("Training"), JSON.stringify(again.scope));

  // A truly unknown action (neither active nor retired) is still filtered out.
  const ic3 = await inventoryContext(owner, slug);
  const filtered = await editItem(ic3, item.id, { name: item.name, unit: "pc", scope: ["Installation", "Nonsense"] });
  ok("an unknown action is still dropped", !(filtered.scope || []).includes("Nonsense"));
}
```

Add `createItem`, `editItem`, `inventoryContext` to the existing inventory import in `tests/suite.mjs` if not already imported.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test 2>&1 | grep -i "scope carries a retired" -A5`
Expected: FAIL — re-saving drops "Training" (current `known` = active only).

- [ ] **Step 3: Widen the known set**

In `src/modules/inventory/inventory.ts`, `cleanScope`:

```ts
function cleanScope(raw: unknown, studio: Record<string, unknown>) {
  // Active AND retired: a retired action is one removed from the pool but still
  // in use here, so a stored scope that names it is carried, never filtered away.
  // Only an action that is neither — truly unknown — is dropped.
  const known = new Set([
    ...(Array.isArray(studio?.serviceActions) ? studio.serviceActions as unknown[] : []),
    ...(Array.isArray(studio?.retiredServiceActions) ? studio.retiredServiceActions as unknown[] : []),
  ].map((a) => str(a, 80)));
  // … rest unchanged …
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test 2>&1 | grep -i "scope carries a retired" -A5`
Expected: all `ok`.

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit -p tsconfig.strict.json
git add src/modules/inventory/inventory.ts tests/suite.mjs
git commit -m "A retired service action stays valid in an item's scope"
```

---

### Task 4: The service-actions endpoint

**Files:**
- Create: `src/app/api/studios/[slug]/settings/service-actions/route.ts`
- Test: `tests/suite.mjs` (new block)

**Interfaces:**
- Consumes: `studioContext`, `requirePermission` (see how the settings route imports them); `actionsForField`, `SERVICE_ACTIONS`, `FIELDS_OF_WORK`, `OTHER_FIELD` from `@/shared/fieldsOfWork`; `nextPool`, `cleanNextActive`, `serviceActionUsage` from `@/modules/studioServiceActions`; `updateStudio` from `@/modules/main/studios`.
- Produces:
  - `GET` → `{ fieldOfWork, fieldOfWorkOther, serviceActions, retiredServiceActions, usage, options: { fields, actions }, canManage }`.
  - `PUT` — two shapes:
    - `{ fieldOfWork: string, fieldOfWorkOther?: string }` → re-seeds the pool from the matrix row and stores the field.
    - `{ serviceActions: string[] }` → an explicit pool edit.
    Both recompute `retiredServiceActions` via `nextPool` against live usage.

- [ ] **Step 1: Write the failing test**

Add to `tests/suite.mjs`:

```js
const SVC_ACTIONS = await import("@/app/api/studios/[slug]/settings/service-actions/route.ts");

// ============================================================================
console.log("== service-actions endpoint: a field seeds the pool, removal retires");
{
  await signInAs(owner.id);

  // Choosing a field seeds serviceActions from the matrix row.
  const seed = await SVC_ACTIONS.PUT(jsonReq({ fieldOfWork: "Manufacturing" }), { params: params(slug) });
  ok("setting a field of work is accepted", seed.status === 200, String(seed.status));
  const afterSeed = await (await SVC_ACTIONS.GET(new Request("http://localhost/test"), { params: params(slug) })).json();
  ok("the pool is the field's matrix row", afterSeed.serviceActions.includes("Fabrication / Manufacturing"));
  ok("the chosen field is echoed back", afterSeed.fieldOfWork === "Manufacturing");
  ok("the endpoint offers all 25 fields", afterSeed.options.fields.length === 25);

  // An item scoped to one action; removing that action retires it (carry).
  const ic = await inventoryContext(owner, slug);
  await createItem(ic, { name: `Ep ${rand()}`, unit: "pc", scope: ["Installation"] });
  const withoutInstall = afterSeed.serviceActions.filter((a) => a !== "Installation");
  const edit = await SVC_ACTIONS.PUT(jsonReq({ serviceActions: withoutInstall }), { params: params(slug) });
  ok("editing the pool is accepted", edit.status === 200, String(edit.status));
  const afterEdit = await (await SVC_ACTIONS.GET(new Request("http://localhost/test"), { params: params(slug) })).json();
  ok("the removed-but-used action is retired", afterEdit.retiredServiceActions.includes("Installation"));
  ok("...and usage reports the item count", afterEdit.usage["Installation"] >= 1, JSON.stringify(afterEdit.usage));

  // "Other" seeds nothing.
  await SVC_ACTIONS.PUT(jsonReq({ fieldOfWork: "Other", fieldOfWorkOther: "Bespoke" }), { params: params(slug) });
  const other = await (await SVC_ACTIONS.GET(new Request("http://localhost/test"), { params: params(slug) })).json();
  ok("Other seeds an empty pool", other.serviceActions.length === 0, JSON.stringify(other.serviceActions));
  ok("Other keeps its typed label", other.fieldOfWorkOther === "Bespoke");

  // A non-member cannot edit.
  await signInAs(nobody.user.id);
  const denied = await SVC_ACTIONS.PUT(jsonReq({ serviceActions: [] }), { params: params(slug) });
  ok("someone without settings.edit is refused", denied.status === 403, String(denied.status));
  await signInAs(owner.id);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test 2>&1 | grep -i "service-actions endpoint" -A12`
Expected: FAIL / module-not-found.

- [ ] **Step 3: Write the route**

Create `src/app/api/studios/[slug]/settings/service-actions/route.ts`. Mirror the auth/permission pattern of the sibling `settings/route.ts` exactly (same `currentUser`, `studioContext`, `requirePermission("studio.settings.edit")`, 401/403/404 shapes):

```ts
import { currentUser } from "@/platform/auth/identity"; // match settings/route.ts's import
import { studioContext } from "@/lib/studios";
import { requirePermission } from "@/platform/access";
import { updateStudio } from "@/modules/main/studios";
import { FIELDS_OF_WORK, SERVICE_ACTIONS, OTHER_FIELD, actionsForField } from "@/shared/fieldsOfWork";
import { nextPool, cleanNextActive, serviceActionUsage } from "@/modules/studioServiceActions";

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map((s) => String(s ?? "")) : []);
const isField = (v: unknown) => FIELDS_OF_WORK.includes(String(v)) || String(v) === OTHER_FIELD;

async function payload(user, slug) {
  const context = await studioContext(user, slug);
  if (context.error) return { context };
  const { studio } = context;
  return {
    context,
    body: {
      fieldOfWork: String(studio.fieldOfWork ?? ""),
      fieldOfWorkOther: String(studio.fieldOfWorkOther ?? ""),
      serviceActions: arr(studio.serviceActions),
      retiredServiceActions: arr(studio.retiredServiceActions),
      usage: await serviceActionUsage(user, slug),
      options: { fields: [...FIELDS_OF_WORK], actions: [...SERVICE_ACTIONS] },
      canManage: !requirePermission(context.access, "studio.settings.edit"),
    },
  };
}

export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;
  const { context, body } = await payload(user, slug);
  if (context.error) return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  return Response.json(body);
}

export async function PUT(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  if (requirePermission(context.access, "studio.settings.edit")) return Response.json({ error: "forbidden" }, { status: 403 });

  const { studio } = context;
  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch { raw = {}; }

  const prevActive = arr(studio.serviceActions);
  const prevRetired = arr(studio.retiredServiceActions);
  const usage = await serviceActionUsage(user, slug);
  const referenced = new Set(Object.keys(usage).filter((a) => usage[a] > 0));

  const patch: Record<string, unknown> = {};

  if ("fieldOfWork" in raw) {
    // Setting or changing the field RE-SEEDS the standard pool from its matrix row
    // (empty for "Other"); referenced leavers are retired, not deleted.
    if (!isField(raw.fieldOfWork)) return Response.json({ error: "field" }, { status: 400 });
    patch.fieldOfWork = String(raw.fieldOfWork);
    patch.fieldOfWorkOther = String(raw.fieldOfWork) === OTHER_FIELD ? String(raw.fieldOfWorkOther ?? "").slice(0, 80) : "";
    const seeded = nextPool({ prevActive, prevRetired, nextActive: actionsForField(String(raw.fieldOfWork)), referenced });
    patch.serviceActions = seeded.serviceActions;
    patch.retiredServiceActions = seeded.retiredServiceActions;
  } else if ("serviceActions" in raw) {
    // An explicit pool edit — add from the standard 20, or remove (→ retire).
    const cleaned = cleanNextActive(raw.serviceActions, prevActive);
    const out = nextPool({ prevActive, prevRetired, nextActive: cleaned, referenced });
    patch.serviceActions = out.serviceActions;
    patch.retiredServiceActions = out.retiredServiceActions;
  } else {
    return Response.json({ error: "nothing" }, { status: 400 });
  }

  const updated = await updateStudio(studio.id, patch);
  if (!updated) return Response.json({ error: "notfound" }, { status: 404 });
  const { body } = await payload(user, slug);
  return Response.json({ ok: true, ...body });
}
```

Implementer notes: match `currentUser`, `studioContext`, `requirePermission` import paths to the sibling `settings/route.ts` (they may differ from the guesses above). Add `fieldOfWork`, `fieldOfWorkOther`, `retiredServiceActions` to `updateStudio`'s allowed keys if `updateStudio` has its own allowlist — check `src/modules/main/studios.ts`; it rejects only `id`/`ownerUserId`/`slug`, so a plain patch passes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test 2>&1 | grep -i "service-actions endpoint" -A12`
Expected: all `ok`.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
git add "src/app/api/studios/[slug]/settings/service-actions/route.ts" tests/suite.mjs
git commit -m "A studio's field of work seeds and manages its service actions"
```

---

### Task 5: The settings payload shows the field of work

**Files:**
- Modify: `src/app/api/studios/[slug]/settings/route.ts` (`FIELDS` allowlist ~line 24; `clean()` ~line 108)
- Modify: `tests/goldens/owner.settings.json` (re-recorded)
- Test: `tests/suite.mjs` (extend the existing settings block near line 2638)

**Interfaces:**
- Produces: the settings GET `studio` object gains `fieldOfWork`, `fieldOfWorkOther`, `retiredServiceActions`.

- [ ] **Step 1: Write the failing test**

Add to the existing settings block in `tests/suite.mjs` (where `SETTINGS.GET` is already exercised):

```js
{
  await signInAs(owner.id);
  const s = await (await SETTINGS.GET(new Request("http://localhost/test"), { params: params(slug) })).json();
  ok("settings carries the field of work", "fieldOfWork" in s.studio, JSON.stringify(Object.keys(s.studio)));
  ok("settings carries the retired actions", Array.isArray(s.studio.retiredServiceActions));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test 2>&1 | grep -i "settings carries the field of work" -A2`
Expected: FAIL — `fieldOfWork` absent from the payload.

- [ ] **Step 3: Add the fields to the allowlist and the clean shape**

In `settings/route.ts`, extend `FIELDS` (so a direct settings write of these still validates, e.g. the deletion/rename paths aside):

```ts
const FIELDS = [
  "logo", "country", "city", "location", "currency", "language",
  "workingHours", "legalInfo", "favoriteCurrencies", "serviceActions",
  // The studio's field of work (one of the 25, or "Other" + a typed label) and
  // the actions retired from its pool but still in use. The service-actions
  // ENDPOINT owns the seeding/retire logic; these live here so the settings
  // screen can display them and so a direct write is still bounded.
  "fieldOfWork", "fieldOfWorkOther", "retiredServiceActions",
];
```

In `clean()`:

```ts
  serviceActions: Array.isArray(studio.serviceActions) ? studio.serviceActions : [],
  fieldOfWork: String(studio.fieldOfWork || ""),
  fieldOfWorkOther: String(studio.fieldOfWorkOther || ""),
  retiredServiceActions: Array.isArray(studio.retiredServiceActions) ? studio.retiredServiceActions : [],
```

If the `FIELDS` loop needs a cleaner for the new keys: `fieldOfWork`/`fieldOfWorkOther` fall through to the default `String(...).slice(0, 500)`, which is fine; add `retiredServiceActions` to the `cleanServiceActions` branch: `key === "serviceActions" || key === "retiredServiceActions" ? cleanServiceActions(body[key])`.

- [ ] **Step 4: Re-record the golden and verify**

```bash
NOMPANY_RECORD_GOLDENS=1 npm test >/dev/null 2>&1
git --no-pager diff -- tests/goldens/owner.settings.json
```
Expected diff: `owner.settings.json` gains `fieldOfWork: ""`, `fieldOfWorkOther: ""`, `retiredServiceActions: []` under `studio`. Confirm ONLY those keys changed.

Run: `npm test 2>&1 | grep -i "settings carries the field of work" -A2`
Expected: `ok`.

- [ ] **Step 5: Commit (golden reason stated)**

```bash
npx tsc --noEmit
git add "src/app/api/studios/[slug]/settings/route.ts" tests/suite.mjs tests/goldens/owner.settings.json
git commit -m "The settings payload carries the studio's field of work

Golden re-recorded deliberately: the settings studio object gains fieldOfWork,
fieldOfWorkOther and retiredServiceActions so the screen can render them."
```

---

### Task 6: The Studio Settings editor

**Files:**
- Modify: `src/components/studio2/StudioSettings.js` (`ServiceActions` component ~line 454, and its render site ~line 237)
- Verify: build + user check on live (sandbox login needs an OTP, so no browser-pane verify — see below)

**Interfaces:**
- Consumes: the `service-actions` endpoint (GET/PUT). Load `FIELDS_OF_WORK`, `SERVICE_ACTIONS`, `actionsForField`, `OTHER_FIELD` from `@/shared/fieldsOfWork` for the preview alert.

- [ ] **Step 1: Replace the free-text editor with a field-of-work panel**

Rewrite the `ServiceActions` component so it:
1. Fetches `GET .../settings/service-actions` on mount for `{ fieldOfWork, fieldOfWorkOther, serviceActions, retiredServiceActions, usage, options }`.
2. Renders a **Type of industry** select (`options.fields` + `OTHER_FIELD`) through the floating-label `Field` (`as="select"`). Choosing "Other" reveals a text `Field` for the label.
3. On changing the field, shows a confirm alert BEFORE saving: the actions `actionsForField(next)` that will be added, and — using `usage` — any currently-active action that will leave and how many items reference it. On confirm, `PUT { fieldOfWork, fieldOfWorkOther }` and refresh.
4. Renders the 20 standard actions (`options.actions`) as checkboxes: ticked = in `serviceActions`. Unticking an action with `usage[action] > 0` opens the soft-retire confirm ("used by N items — keep them, stop offering it for new work?"). Ticking adds it. Saving `PUT { serviceActions }` and refresh.
5. Uses the studio's alignment rules — every control through `Field`; no bare inputs (see the alignment memory).

Keep the section heading "Service actions" and add a one-line description that it is seeded from the field of work. Match the existing `panel`/`h2`/`sub`/`btn` tokens used elsewhere in the file.

- [ ] **Step 2: Typecheck and build**

```bash
npx tsc --noEmit && npx next build
```
Expected: clean build; the studio chunk still under its ceiling (`scripts/bundle-budget.mjs` runs in CI, but check the build output for the chunk size).

- [ ] **Step 3: Full verification**

```bash
npm test && npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build && node scripts/bundle-budget.mjs
```
Expected: all pass. The dev:sandbox login needs an undeliverable OTP, so the screen itself is verified by the endpoint tests (Task 4) plus a user check on live — do not attempt a browser-pane login.

- [ ] **Step 4: Commit**

```bash
git add src/components/studio2/StudioSettings.js
git commit -m "Studio Settings seeds service actions from a field of work"
```

- [ ] **Step 5: Push for the user's live check**

```bash
git push origin main
```

---

## Self-Review

**Spec coverage:**
- Constants (§5.1) → Task 1. Data model `fieldOfWork`/`retiredServiceActions` (§5.2) → Tasks 4–5. Known-set carry (§5.3) → Task 3. Settings editor (§5.4) → Task 6. Impact alert / usage (§5.5, refined to a dedicated endpoint) → Tasks 2, 4, 6. Back-compat (§5.6) → `cleanNextActive` legacy handling (Task 2), absent-fields defaults (Tasks 3–5). Invariants (§5.7) → Global Constraints + no-bulk-write in Task 3. Testing (§7) → each task's test block; goldens re-recorded in Task 5.
- Not in this plan (correctly — future phases per spec §2–3): Sales/quotation record layer, the planner spine, `/super` services-per-studio stats, manual "Other" service action.

**Placeholder scan:** the only intentional "fill from Appendix A" is Task 1 Step 3, where the source rows are in the spec verbatim — not a placeholder, a copy instruction. No TODO/TBD elsewhere.

**Type consistency:** `nextPool` / `cleanNextActive` / `serviceActionUsage` signatures match between Task 2 (definition) and Task 4 (use). `serviceActions` / `retiredServiceActions` field names are consistent across Tasks 3–5. `fieldOfWork` / `fieldOfWorkOther` consistent across Tasks 4–6.

**Known implementer checks flagged inline:** the `User` type import (Task 2), the `currentUser`/`studioContext`/`requirePermission` import paths (Task 4), and whether `updateStudio` needs the new keys allow-listed (Task 4) — each says to confirm against the real sibling code rather than trust the guess.
