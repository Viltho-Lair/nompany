# Service actions, seeded from a field of work

**Status:** design, approved to write · **Date:** 2026-08-26
**Author:** brainstormed with the user
**Source artifact:** `Company_Fields_and_Project_Actions.xlsx` — sheet *Field x Action
Matrix* (25 fields × 20 core actions, ticks = which actions a field typically does).

---

## 1. The problem

Today a studio's **service actions** (`studio.serviceActions`) are a free-text
list, **empty by default**, typed by hand in Studio Settings. Two screens already
consume that list:

- **Inventory** — an item's `scope` (`ItemSchema.scope`) is "which service actions
  this item needs once it lands", chosen from `studio.serviceActions`
  (`cleanScope` in `inventory.ts`).
- **Projects** — `requirementWeights` is a completion-% split keyed by service
  action, which must total 100 (`projects.ts`, `StudioProjects.js`).

An empty free-text list means every studio starts from nothing and invents its own
vocabulary, and a separate **Sales services catalogue** (`ServiceSchema` /
`serviceIds` on a ticket) covers overlapping ground — "hardcoded services per
items", in the user's words, which does not fit companies that lack those exact
services.

The user commissioned market research (the spreadsheet) that classifies companies
into **25 fields of work** (UN ISIC Rev. 4, grouped) and **20 core service
actions**, with a **matrix** of which actions each field typically performs. This
spec makes that matrix seed the service-action list from a chosen field of work,
so a studio starts from a sensible, standardized set instead of a blank box.

---

## 2. North star (documented, NOT built here)

Service actions are the spine of a relational flow the user described. This spec
builds only the head of it; the rest is recorded so later phases stay aligned:

```
Studio field of work  →  seeds studio.serviceActions (the pool)
   Sales ticket picks services  →  Quotation assigns items, each item scoped to actions
      → Quotation feeds Project + Project sheets
         → item scopes become the project's scope of work
            → planner renders quotation tables as phased tasks
               (pre-implementation = Delivery; implementation = table headers as
                sub-tasks, Installation/Programming as sub-sub-tasks with a per-item
                ETA; post-implementation = UAT)
                  → task completion % feeds back from the installation/programming sheets
```

**Explicitly future, not core until the service model is proven by use:**

- Per-item implementation ETA — learned mean of past projects (preferred) vs. a
  fixed number on the registered item (viable but a worse practice).
- Planner template methodology that renders quotation tables as phased tasks.
- Sheet-fed completion percentages flowing up to project progress.
- **`/super` statistics: services-per-studio** (keep the data shaped so this is
  cheap to add).
- A **manual "Other" additive service action** beyond the standard 20 — deferred
  until analysis shows it is needed.

---

## 3. Scope

- **Phase 1 (this spec):** a single **field of work** on the studio, seeding
  `serviceActions` from the matrix; a select-not-type Settings editor; **soft-retire**
  on removal; impact alerts. Inventory scope and project weights light up for free.
- **Phase 2 (later):** the record layer — Sales ticket + Technical quotation gain
  the 25-field industry and per-record action auto-tick from the matrix; migrate and
  retire the old Sales services catalogue (`serviceIds` / `ServiceSchema`).
- **Phase 3+ (north star):** the planner spine above.

Phase 1 does **not** touch the Sales services catalogue, the ticket, or the
quotation. The per-ticket `industry` string stays exactly as it is.

---

## 4. Locked decisions

| Decision | Choice |
|---|---|
| Industry list | 25 ISIC fields, **fixed platform constant**, + "Other" (free text) |
| Fields per studio | **Single** field of work + Other |
| Seeding | Selecting a field seeds `serviceActions` = the field's matrix row |
| Editing the pool | **Remove** seeded actions, and **add from the remaining standard 20** (select, not type). Manual "Other" service action **deferred**. |
| On field change | **Re-seed** the standard set from the new field; customizations dropped; retired set recomputed |
| Removal model | **Soft-retire** — carry existing references, break nothing, reactivate on re-add |
| Cascade to items | Item survives; nothing rewritten or deleted |

---

## 5. Phase 1 design

### 5.1 Constants — `src/shared/fieldsOfWork.ts` (new, TypeScript)

`src/shared/**` is "pure values with no dependants", already TypeScript — the right
home. A client Settings component and a server route both import it, so it must not
touch Redis (it does not).

```ts
export const SERVICE_ACTIONS = [
  "Consulting & Advisory", "Survey & Assessment", "Design & Engineering",
  "Procurement & Sourcing", "Fabrication / Manufacturing", "Assembly",
  "Programming & Configuration", "Construction & Civil Works",
  "Demolition & Dismantling", "Installation", "Integration",
  "Delivery & Transportation", "Warehousing & Storage", "Testing & Inspection",
  "Commissioning", "Training", "Operation", "Maintenance & Repair",
  "Upgrading & Retrofit", "Decommissioning & Disposal",
] as const;

export const FIELDS_OF_WORK = [ /* the 25 field names, see Appendix A */ ] as const;

// field name → the actions ticked for it. Values are members of SERVICE_ACTIONS.
export const FIELD_ACTION_MATRIX: Record<string, readonly string[]> = { /* Appendix A */ };

export const OTHER_FIELD = "Other";
```

The matrix is a **fixed platform constant**, not studio-editable and not stored
per studio — a studio stores only *which field it chose* and *its resulting pool*.

A test asserts every value in `FIELD_ACTION_MATRIX` is a member of
`SERVICE_ACTIONS`, and that every one of the 25 fields has a row — so the constant
cannot drift internally.

### 5.2 Studio record — two new fields

`studio.fieldOfWork: string` — one of `FIELDS_OF_WORK`, or `"Other"`, or `""` when
never set. (When "Other", the free-typed label lives in `fieldOfWorkOther: string`;
"Other" seeds nothing.)

`studio.serviceActions: string[]` — **unchanged shape**, still the *active* pool of
action names. Inventory scope and project weights keep keying off it verbatim.

`studio.retiredServiceActions: string[]` — **new** — actions that were removed but
are still referenced somewhere. This is what makes soft-retire *carry* rather than
*copy*: the "known" set that validates an item's stored scope becomes
**active ∪ retired**, so a stored reference to a retired action stays valid and is
never silently filtered away. Only the **active** list is offered for new
selections.

All three are added to the settings route allowlist (`FIELDS`) and each gets a
`clean*` on the write boundary. `fieldOfWork` is validated against the constant (or
"Other"); the two arrays are cleaned to known strings, de-duplicated, capped.

> **Naming open question:** the per-ticket field is already `industry`. The
> studio-level one is named `fieldOfWork` here to avoid two meanings for one word.
> The tenant-facing **label** is still "Type of industry". Flagged for review.

### 5.3 The "known" set — the one line that carries references

`inventory.ts::cleanScope` currently builds `known` from `studio.serviceActions`
alone. It changes to `active ∪ retired`:

```ts
const known = new Set([
  ...(studio.serviceActions ?? []),
  ...(studio.retiredServiceActions ?? []),
].map((a) => str(a, 80)));
```

Nothing else in inventory or projects changes. A retired action referenced by an
item or a project weight remains a first-class, valid value — it simply is not
offered when scoping a *new* item. This is the whole mechanism the user asked for:
retire, don't rewrite; carry, don't copy; break nothing.

### 5.4 Studio Settings — the editor, rewritten

The current free-text `ServiceActions` component (`StudioSettings.js`) is replaced
by a **field-of-work-driven** panel:

1. **Type of industry** — a `Field as="select"` over `FIELDS_OF_WORK` + "Other".
   Choosing "Other" reveals a free-text label and seeds nothing.
2. **Before it takes effect**, a **preview alert**: "Selecting *Manufacturing* will
   add these 12 service actions: …". (User requirement: alert with what will be
   added *before* selecting.) Confirming applies the seed.
3. **The pool** — the 20 standard actions as checkboxes. Seeded ones are ticked.
   The admin may **untick** (remove) or **tick** more (add from the standard 20).
   Ticked = active.
4. **Removing an action that is referenced** → the soft-retire alert (5.5). Removing
   an unreferenced action just drops it.
5. **Changing the field** later → re-seed alert (5.5), then the standard set is
   replaced by the new field's row; anything leaving that is referenced is retired.

Manual "Other" *service actions* are **not** offered (deferred). "Other" exists
only for the **field of work**.

### 5.5 The impact alert — usage counts

The Settings GET payload gains `serviceActionUsage: Record<string, { items: number;
projects: number }>` — for each action currently in the pool, how many inventory
items list it in `scope` and how many projects key a weight to it. Computed
server-side from the already-loaded inventory items and project settings; no new
round trip beyond reads the settings screen can fold into its existing wave (hop
count is part of the contract — this must not add a wave).

The UI uses those counts in two alerts:

- **Remove one action** that has `items+projects > 0`:
  *"Maintenance & Repair is used by 7 items and 2 projects. Remove it from your
  scope of work? Those items and projects keep it, but it will no longer be
  offered for new work. Re-add it any time."* → on confirm, the action moves from
  `serviceActions` to `retiredServiceActions`.
- **Change the field of work**: *"Switching to Manufacturing removes 3 actions from
  your scope (Operation, Commissioning, Training), affecting 5 items and 1
  project…"* → on confirm, re-seed; referenced leavers are retired, unreferenced
  leavers are dropped, and the new field's actions become active.

Re-adding a retired action (ticking it, or a re-seed that includes it) moves it back
to `serviceActions` and out of `retiredServiceActions`.

### 5.6 Back-compat / migration (non-destructive)

- **Existing free-text `serviceActions`** stay exactly as they are — they remain the
  active pool. They are not from the matrix, but they are valid active actions until
  the admin picks a field of work and re-seeds. No migration writes; nothing is lost.
- **`fieldOfWork` absent** reads as `""` — the panel shows "not set yet", the pool
  is whatever the studio already had. Choosing a field is always an explicit,
  alerted action.
- **`retiredServiceActions` absent** reads as `[]`. Existing stored item scopes
  already only ever contained active actions, so `active ∪ retired` = active on day
  one — identical behaviour until the first retire.

### 5.7 Invariants honoured

- **Keys** — no new key builder; `fieldOfWork`, `retiredServiceActions` ride on the
  studio record, exactly as `serviceActions` does (Invariant 1, and the settings
  route's "no new collection, nothing extra to cascade" note).
- **Writes** — Settings save goes through the existing `updateStudio` compare-and-set
  path (Invariant 8). No bulk rewrite of items (soft-retire is why).
- **Non-destructive** — nothing is deleted or flushed; retire is a move between two
  lists on one record (Invariants 11, 17 untouched — no delete path added).
- **Golden + hop contracts** — the settings payload grows two fields and a usage
  map; goldens for the settings route are re-recorded deliberately in this commit,
  and the usage map must be computed inside the existing read wave (Invariant: hop
  counts are the contract).

---

## 6. Error handling & edge cases

- **Field = "Other"** seeds nothing; the pool stays whatever it was; no matrix row
  exists to apply.
- **Re-seed that would empty a pool the studio relies on** — allowed, but the alert
  names every referenced action leaving, so it is never silent.
- **An action both seeded by the new field and previously retired** — reactivates
  (leaves the retired list).
- **Concurrent edits** — last compare-and-set wins as everywhere; the usage counts
  are advisory (a number can be one stale between load and save, same class as the
  quotation "next number" hint).
- **A referenced action removed, then the referencing item deleted later** — the
  action lingers in `retiredServiceActions` harmlessly; a future `/super`-stats or a
  small sweep can prune retired actions no item or project references. Not Phase 1.

---

## 7. Testing plan

Every test names the defect it guards (house rule):

- **Constant integrity** — every matrix value is a known action; all 25 fields have
  a row. (Guards the constant drifting.)
- **Seeding** — choosing a field sets `serviceActions` to its matrix row.
- **Carry, don't copy** — an item scoped to an action, that action retired, then the
  item re-read/re-saved: the scope still contains it (because `known` = active ∪
  retired). (Guards the exact "copy vs carry" the user rejected lazy filtering for.)
- **Soft-retire** — removing a referenced action moves it active→retired, leaves the
  item untouched; re-adding moves it back.
- **Re-seed on change** — switching fields replaces the active standard set and
  retires referenced leavers.
- **Usage counts** — the settings payload reports the right item/project counts, and
  the settings route stays under its hop ceiling.
- **Goldens** — settings route goldens re-recorded for the two new fields + usage
  map, in the same commit, with the reason stated.

---

## 8. Files touched (Phase 1)

| File | Change |
|---|---|
| `src/shared/fieldsOfWork.ts` | **new** — the 25 fields, 20 actions, matrix, "Other" |
| `src/app/api/studios/[slug]/settings/route.ts` | allowlist `fieldOfWork`, `fieldOfWorkOther`, `retiredServiceActions`; `clean*`; usage map in GET |
| `src/components/studio2/StudioSettings.js` | replace `ServiceActions` with the field-of-work-driven panel + alerts |
| `src/modules/inventory/inventory.ts` | `cleanScope` known set = active ∪ retired |
| `tests/suite.mjs` + `tests/goldens/*settings*` | the tests above; re-recorded goldens |

Projects (`projects.ts`) needs **no** change — its weights already key by action
name and tolerate an empty set.

---

## Appendix A — the matrix (source of truth for the constant)

25 fields → their ticked actions:

- **Agriculture, Forestry & Fishing** — Survey & Assessment, Procurement & Sourcing, Assembly, Installation, Delivery & Transportation, Warehousing & Storage, Testing & Inspection, Operation, Maintenance & Repair
- **Mining & Quarrying** — Consulting & Advisory, Survey & Assessment, Design & Engineering, Procurement & Sourcing, Construction & Civil Works, Demolition & Dismantling, Installation, Delivery & Transportation, Testing & Inspection, Operation, Maintenance & Repair, Decommissioning & Disposal
- **Manufacturing** — Design & Engineering, Procurement & Sourcing, Fabrication / Manufacturing, Assembly, Programming & Configuration, Installation, Delivery & Transportation, Warehousing & Storage, Testing & Inspection, Commissioning, Maintenance & Repair, Upgrading & Retrofit
- **Industrial Automation & Robotics** — Consulting & Advisory, Design & Engineering, Procurement & Sourcing, Fabrication / Manufacturing, Assembly, Programming & Configuration, Installation, Integration, Testing & Inspection, Commissioning, Training, Maintenance & Repair, Upgrading & Retrofit
- **Automotive & Aerospace Manufacturing** — Design & Engineering, Procurement & Sourcing, Fabrication / Manufacturing, Assembly, Programming & Configuration, Delivery & Transportation, Warehousing & Storage, Testing & Inspection, Maintenance & Repair
- **Energy & Utilities (Electricity, Gas)** — Consulting & Advisory, Survey & Assessment, Design & Engineering, Procurement & Sourcing, Construction & Civil Works, Installation, Integration, Testing & Inspection, Commissioning, Training, Operation, Maintenance & Repair, Upgrading & Retrofit, Decommissioning & Disposal
- **Oil, Gas & Petrochemicals (EPC)** — Consulting & Advisory, Survey & Assessment, Design & Engineering, Procurement & Sourcing, Fabrication / Manufacturing, Construction & Civil Works, Installation, Integration, Testing & Inspection, Commissioning, Training, Maintenance & Repair, Decommissioning & Disposal
- **Water Supply, Sewerage & Waste Management** — Survey & Assessment, Design & Engineering, Procurement & Sourcing, Construction & Civil Works, Installation, Delivery & Transportation, Testing & Inspection, Commissioning, Operation, Maintenance & Repair, Decommissioning & Disposal
- **Construction & Contracting** — Survey & Assessment, Design & Engineering, Procurement & Sourcing, Assembly, Construction & Civil Works, Demolition & Dismantling, Installation, Delivery & Transportation, Testing & Inspection, Commissioning, Maintenance & Repair, Upgrading & Retrofit
- **Wholesale & Retail Trade** — Procurement & Sourcing, Assembly, Installation, Delivery & Transportation, Warehousing & Storage, Maintenance & Repair
- **Transportation, Logistics & Storage** — Survey & Assessment, Assembly, Demolition & Dismantling, Installation, Delivery & Transportation, Warehousing & Storage
- **Hospitality & Food Services** — Procurement & Sourcing, Assembly, Installation, Delivery & Transportation, Operation
- **Information Technology & Software** — Consulting & Advisory, Survey & Assessment, Design & Engineering, Procurement & Sourcing, Programming & Configuration, Installation, Integration, Testing & Inspection, Commissioning, Training, Maintenance & Repair, Upgrading & Retrofit
- **Telecommunications** — Survey & Assessment, Design & Engineering, Procurement & Sourcing, Programming & Configuration, Construction & Civil Works, Installation, Integration, Testing & Inspection, Commissioning, Training, Maintenance & Repair, Upgrading & Retrofit
- **Media, Publishing & Creative Production** — Consulting & Advisory, Design & Engineering, Procurement & Sourcing, Delivery & Transportation, Testing & Inspection
- **Financial Services & Insurance** — Consulting & Advisory, Survey & Assessment, Testing & Inspection, Operation
- **Real Estate & Property Development** — Consulting & Advisory, Survey & Assessment, Design & Engineering, Procurement & Sourcing, Operation, Maintenance & Repair, Upgrading & Retrofit
- **Professional, Scientific & Technical Services** — Consulting & Advisory, Survey & Assessment, Design & Engineering, Testing & Inspection
- **Management Consulting** — Consulting & Advisory, Survey & Assessment, Training
- **Administrative & Support Services** — Survey & Assessment, Installation, Delivery & Transportation, Operation, Maintenance & Repair
- **Public Administration & Defense** — Consulting & Advisory, Survey & Assessment, Testing & Inspection, Operation
- **Education & Training** — Consulting & Advisory, Survey & Assessment, Design & Engineering, Training
- **Healthcare & Social Services** — Consulting & Advisory, Survey & Assessment, Installation, Delivery & Transportation, Testing & Inspection, Training, Operation, Maintenance & Repair
- **Arts, Entertainment & Events** — Design & Engineering, Procurement & Sourcing, Fabrication / Manufacturing, Assembly, Demolition & Dismantling, Installation, Delivery & Transportation, Testing & Inspection, Operation
- **Personal & Other Services** — Survey & Assessment, Installation, Delivery & Transportation, Maintenance & Repair

The 20 actions across the top: Consulting & Advisory · Survey & Assessment ·
Design & Engineering · Procurement & Sourcing · Fabrication / Manufacturing ·
Assembly · Programming & Configuration · Construction & Civil Works ·
Demolition & Dismantling · Installation · Integration · Delivery & Transportation ·
Warehousing & Storage · Testing & Inspection · Commissioning · Training · Operation ·
Maintenance & Repair · Upgrading & Retrofit · Decommissioning & Disposal.
