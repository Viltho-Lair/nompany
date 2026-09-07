# P4b — the record engine

**Status:** design agreed 07/09/2026. Implementation not started.
**Programme:** P4b of `2026-08-30-erp-multi-industry-program-design.md`, ≈4 weeks.
**Decision taken by the user:** the engine is **runtime**, not build-time.

---

## 1 — What this is

A record type is **declared as data, in a row**. The engine supplies the list, the card,
create and edit, the workflow, attachments, comments, audit, live updates and permission
filtering. Adding a subsection stops being a pull request.

The programme spec sizes the payoff: **roughly 50 of the remaining subsections ride it**,
against **46 declared today**. It is the reason P4b precedes P5 rather than following it.

## 2 — Why runtime, and what that costs

Two options were put. **Build-time** — a record type is a TypeScript declaration that
generates route, service and screen; everything stays compiled, type-checked and
golden-pinned. **Runtime** — a record type is a row, so it can be defined without a deploy.

**Runtime was chosen.** The costs are real and are accepted rather than argued away:

- **`tsc` cannot see a tenant's record shape.** The runtime-built Zod schema is the only
  guard. Field types are therefore a CLOSED SET the engine owns — not free-form — because a
  schema built from arbitrary input is not a guard.
- **Gate A cannot pin tenant records.** It pins the ENGINE: one built-in type through every
  verb and every refusal. A tenant type has no golden and cannot have one. Stated here so
  it is a known consequence rather than a discovery.
- **The permission catalogue stops being a closed union.** §5 is how that is contained.

## 3 — What it is extracted from

Measured on 07/09/2026, across the seven registers built in P4a:

- The screen scaffolding — `read` / `apply` / `reload` / `useLiveUpdates` — is **22 lines
  byte-identical** in all seven once the endpoint is normalised. The `send` callback is
  another ~12, near-identical.
- Every register route is the same four handlers branching on body shape, then naming
  response fields one at a time.
- Every list service is: guard → `repo().find` → resolve collaborator aliases → sort →
  attach a computed position → return with `can*` flags.

**The bespoke screens the spec names stay bespoke**, and the engine is never stretched to
cover them: BOQ grid, Gantt, cost sheet, dispatch board, shop-floor terminal, MRP and
capacity planner, mobile field view, payroll run, financial statements, report builder. Two
— the BOQ grid and the Gantt — are already built by hand, so the line holds where the spec
drew it.

## 4 — Storage

**`recordTypes`** — one row per type: `key`, label, fields, list columns, card layout,
status transitions, `onDelete` class, deal stage type, parent section, and an `origin` of
`builtin` or `studio`. Built-ins are seeded and version-stamped.

**`engineRecords`** — ONE collection for every instance, discriminated by `typeKey`.

**Not a collection per type**, and this is forced rather than preferred: `COLLECTION_TABLE`
in `platform/db/migrate/mapping.ts` and the collection lists in `keys.ts` are compile-time
constants. A collection per type would need a deploy per type, which is the thing runtime
was chosen to avoid. Invariant 1 is unaffected — keys are still built only in `keys.ts`;
the engine adds two builders, not a builder per type.

## 5 — Permissions

**This is the integration point that fails most quietly, so it is specified first.**

`cleanPermissions` filters every stored permission through `isPermission`, which is
`KNOWN.has(key)` over the compile-time catalogue, under the comment *"a permission the
product does not recognise cannot be stored"*. **Today a role granting an engine key would
have it silently dropped** — no error, no log, just a right that never arrives.

The design:

- Engine keys are namespaced **`engine.<typeKey>.<verb>`**.
- `PermissionKey` gains a template-literal arm. Static keys stay strictly checked; engine
  keys are structurally valid and **cannot collide with a real area** — verified, not
  assumed: of 47 declared area keys, none begins `engine.`. **`engineeringDocs.*` is
  adjacent and is not a collision**, because the namespace is `engine.` with the dot; a
  future area called `engine` is the one thing that would break this and must not be
  declared.
- `isPermission` accepts that shape, so `cleanPermissions` stops dropping them.
- **The route checks the key for the type it is SERVING, derived from the URL** — never from
  the request body. Granting `engine.madeup.view` therefore grants access to nothing rather
  than to something.
- Invariant 4 is untouched: no role means nothing, and the runtime check in
  `requirePermission` still refuses an unrecognised key.

**Invariant 16 is relaxed in one narrow way and it is deliberate.** A studio may hold an
engine key for a type it later deletes — a right nothing can exercise. That is a lint
condition, not a security one, and the alternative (cascading permission edits across every
role on type deletion) is worse. The engine reports orphaned keys rather than chasing them.

## 6 — Sections and navigation

Each type plants a **sub-section under a declared parent**, reusing `SECTION_AREAS` so
`listSections` and the sidebar need no special case.

This works today without a backfill because `listSections` already checks the rows it has
fetched against the expected set and plants what is short. A type added this morning appears
this morning.

**Order matters, and the tender register already paid for getting it wrong:** a sub-section
falls back to its root when absent, so records written before the section is planted land
under the parent, where nothing reads them. The engine therefore plants the section **in the
same write** as the type row, not lazily on first use.

## 7 — Validation and versioning

A **Zod schema is built at runtime** from the field declarations and cached per type
version. Field types are a closed set: text, long text, number, money, date, boolean,
select (from a declared option list), collaborator, and reference-to-record-type.

A type row carries a **version**; a stored record carries the version it was written under.
Changing a field **never rewrites history** — the reader coerces, exactly as
`normalizeTask` and `planProgress` already do at their own boundaries. A field removed from
a type stays in the stored rows and stops being rendered; it is not deleted, because
deleting it would destroy the only record of what a row said when somebody signed it.

## 8 — What the engine supplies

List, card, create, edit, delete (subject to `onDelete`), status transitions from the
declared chain, attachments through the existing private-media route, comments, audit, live
updates through the existing SSE bus, and permission filtering per field.

**Transitions are declared, and the reviewer ≠ approver rule is NOT re-implemented.** Where
a declared transition is an approval, it routes through `platform/approval` — the engine
gains a fourth document type rather than a second approval engine.

## 9 — Phasing

1. **Built-in types only, seeded by `/super`.** The engine, the two collections, the
   permission arm, the section planting, one built-in type end to end with Gate A coverage.
2. **P5's sections ride it** — the five engine-driven sections the programme spec names.
3. **Tenant self-service**, gated by plan the way analytics already is.

**Phase 1 is identical under every answer to "who may declare a type"**, which is why it
starts before that question is settled: built-ins must exist before anything can clone or
extend them, and `flow_templates` already sets the precedent of built-ins a tenant may
clone.

## 10 — Acceptance

- A built-in type declared as a row yields a working list, card, create, edit and
  transition with no code change and no deploy.
- A reader without `engine.<type>.view` gets no trace of the type: not a row, not a count,
  not a nav entry.
- A permission granted for an engine type is STORED rather than silently dropped — the
  defect §5 exists to prevent, asserted directly.
- A record written under version 1 still reads after the type moves to version 2, with the
  removed field absent from the render and present in the store.
- Deleting a type does not delete its records, and the orphaned rights are reported.
- Gate A pins the engine through every verb and every refusal on one built-in type.

## 11 — Not in this design

- **Tenant self-service UI** — phase 3, and it needs its own design.
- **Bespoke screens** — listed in §3; the engine must never be stretched to them.
- **Report builder** — P7, and it reads engine records rather than being one.
- **Cross-type queries and joins.** The engine serves one type at a time; anything that
  joins two is bespoke or a report. The `reference-to-record-type` FIELD in §7 is not an
  exception: it stores an id and renders that row's label, which is a lookup, not a join —
  it cannot filter, aggregate or sort across the referenced type.
- **Field-level permissions beyond view/hide.** Declared per field, not per role expression.
