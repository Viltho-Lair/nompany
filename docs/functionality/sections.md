# Sections

The studio's navigation tree, and the thing every operational record hangs off.

## What a section is

A per-studio row: `{ id, studioId, key, name, parentId, enabled, sortOrder, settings }`. The
tree is exactly one level deep — a sub-section cannot own sub-sections, and `appendSection`
refuses it.

**Records carry `sectionId`, never the key.** This is worth knowing before touching anything
here: renaming a section is a one-field edit on the section row and touches no record at all.
Only a section's *identity* changing — a collection genuinely moving to a different owner —
rewrites records.

`SECTION_DEFS` in `platform/db/keys.ts` is the source of truth for which sections exist.
`createStudio` seeds the whole list; nothing in the product renames one (`updateSection` is only
ever called with `settings`). Because they are code rather than tenant data, section names
**translate on display**, keyed by section key, with the stored name as fallback — see
`shared/studio/sections.ts`, whose header records that this was got wrong once and produced an
Arabic studio wearing an English sidebar.

An existing studio does **not** gain a new section by itself. `plantMissingSections` is the
backfill, run from `scripts/migrate/plant-sections.mjs`; it is idempotent, forward-only, never
deletes, and re-derives `sortOrder` from `SECTION_DEFS` so a planted section lands where it
belongs in the nav rather than at the end.

## The fifteen, and the two that are not sections

Main and Tasks survive alongside the blueprint's fifteen: Main is the home surface, Tasks is a
cross-cutting control (the `task` type wraps every stage). Neither is a blueprint section.

| Section | Owns | State |
|---|---|---|
| CRM & Sales | tickets, clients, **quotations**, live view, settings | Working |
| Tendering & Estimating | — | **Not built yet** |
| Projects | project list, SLA, overtimes, **planner**, settings | Working |
| Engineering & Documents | **document register**, RFQ, live view, settings | Working |
| Procurement & Subcontracting | suppliers | Partial — suppliers only |
| Inventory & Warehouse | stock, items, project sheets, deliveries | Working |
| Manufacturing & Production | — | **Not built yet** |
| Field Operations & Service | schedule, tracking, settings, shifts, permits, locations | Working |
| Logistics & Fleet | shipments (AWB) | Partial — waybills only |
| Assets & Equipment | — | **Not built yet** |
| Quality & HSE | — | **Not built yet** |
| Human Resources | employees, certifications, vacations | Working |
| Finance & Accounting | cash, ledger, payables, assets, settings | Working |
| Reports & BI | — | **Not built yet** |
| Administration & Settings | People, studio settings | Partial — no master-data screen |

Quotations moved to CRM & Sales because the offer is a sales act, while the RFQ it is raised
from stayed with Engineering & Documents. The controlled document register moved the other way:
it is the technical truth, not the quality evidence.

## Sections that render nothing

Tendering, Manufacturing, Assets, Reports and Quality & HSE are declared for ordering and have
**no screen, no children and no permission areas**. They are listed in `NO_SCREEN_YET`
(`platform/access/resolve.ts`) and are **absent from the sidebar**, not shown empty — a nav row
that opens nothing is worse than no row. Reaching one by URL says it is not built yet, which is
deliberately different from the access-denied message a real section gives someone who lacks the
right.

`testEveryKeyWithNothingToShowIsDeclared` refuses any section that has neither a right behind it
(directly or via a descendant) nor an entry in that list, so adding a section without a screen is
a decision somebody records rather than an accident that hides it.

## What opening one looks like

The studio page is `force-dynamic`, so a section click is a server round trip before anything can
render. `src/app/studio/loading.js` is what stands there while it happens: the shell's own
geometry — the same fixed `w-64` sidebar panel, the same header, the same content column — drawn
as skeletons. The studio greys out in place; it does not blink out and come back.

That file **reproduces the whole shell, sidebar included, on purpose.** There is no `layout.js`
under `src/app/studio/`, so the page IS the layout and a loading boundary replaces everything.
Until that changes, the boundary also has to guess the reader's direction from the `lang` cookie
alone, because the tenant's default language is a database read and a loading boundary runs
before any read — right for every English studio and for anyone who has ever used the language
menu, wrong only for a member of an Arabic-default studio who never set a preference. The plan
that removes both the duplication and the guess is
`docs/superpowers/plans/2026-09-03-studio-shell-layout.md`.

Without it the App Router had nothing to show and **blocked the navigation**: measured in the
sandbox, not one node in the page changed during a transition and the address bar itself did not
move for 767ms, so the click read as broken rather than slow.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Tendering & Estimating, Manufacturing & Production, Assets & Equipment, Reports & BI and
  Quality & HSE have no screens.** They are names and nav ordering.
- **Procurement holds only the supplier master.** Requisitions, supplier RFQs and comparison,
  purchase orders, subcontracts, GRN and three-way matching are not built.
- **Logistics holds only waybill tracking.** Trips, fleet register, customs files and landed cost
  are not built.
- **Administration has no master-data screen.** `administration-master` exists as a key with no
  screen and no right; the studio's locations still live on the Field Operations screen that
  draws them, and move when that screen is built.
- **`finance-ledger` and `finance-settings` have no screens of their own** and currently fall
  through to the Cash view. Pre-existing, and not caused by the restructure.
- **The dead-capability audit in `tests/access.test.mjs` is largely blind.** It walks `src/lib`
  and `src/app/api`, `.js` only, and every department's permission-guarded write moved to
  `src/modules/<name>/**.ts` in Wave 3. It currently reports that no write permission reaches a
  guard, and its companion assertion passes vacuously. Widening it is outstanding work.
- **The architectural greps read `src/` and not `tests/`.** Test fixtures naming a retired
  section key are caught by nothing; two such lookups returned `null` into the next line's
  dereference during this restructure.
- **The contextual key assertion is shape-based, not an AST.** `nav?.["x"]` and `nav?.x` are both
  covered; a computed access like `nav[someVar]` where the variable is statically a retired
  literal is not.
