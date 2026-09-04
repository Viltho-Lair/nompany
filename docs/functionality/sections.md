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
| Field Operations & Service | schedule, tracking, settings, shifts, permits | Working |
| Logistics & Fleet | shipments (AWB) | Partial — waybills only |
| Assets & Equipment | — | **Not built yet** |
| Quality & HSE | — | **Not built yet** |
| Human Resources | employees, certifications, vacations | Working |
| Finance & Accounting | cash, ledger, payables, assets, settings | Working |
| Reports & BI | — | **Not built yet** |
| Administration & Settings | **People**, **Access**, **Master data**, studio settings | Partial — master data holds locations only |

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

**`NO_SCREEN_YET` now holds only whole sections again.** `administration-master` left it when
Master data got a screen and a permission area — which is the condition a collection has to meet
before anything is re-homed into it (`restructure.ts`'s `COLLECTION_MOVES`): a section that
renders nothing would leave rows alive, correct, and reachable by nobody.

`testEveryKeyWithNothingToShowIsDeclared` refuses any section that has neither a right behind it
(directly or via a descendant) nor an entry in that list, so adding a section without a screen is
a decision somebody records rather than an accident that hides it.

## Administration & Settings is a real section now, and that changed who sees what

Until 03/09/2026 the fifteen-section restructure had landed for fourteen sections. Administration
was declared with children and rendered as three loose nav rows: People at the pre-restructure
key `/people` shown to **everyone**, Access at `/access` gated on `canAdminister`, and Studio
settings pinned in the footer. All three were reached by routes that bypassed the section
mechanism on purpose, which is why they worked and why nobody noticed that `SECTION_AREAS` had no
entry for any of them.

They are ordinary sections now, each gated on its own area, and the parent follows its children
through the same rule every other parent uses. **Access gained a right of its own**
(`administration.access`) — it was admin-only via `canAdminister`, which is not something anybody
can be granted, so a studio could not delegate role management without handing over everything
else being an admin carries. `escalates()` is untouched, so widening who may OPEN the roles screen
does not widen what any of them may hand out.

**Three consequences, all live:**

1. **People is a granted screen.** Managers and Team Leads hold it by default; **Members and
   Viewers do not, and lost it.** Who else is in the studio, and with what roles, is a management
   view. A studio that disagrees grants `administration.members.view` — which it could not do
   before, because the right decided nothing.
2. **Reading Studio settings needs `administration.settings.view`.** That right existed
   throughout the restructure and enforced *nothing*: the GET checked membership and stopped.
   Gating the nav on a right the endpoint ignored would have hidden the screen while its data
   stayed readable by any member.
3. **`/people` and `/access` still resolve.** They alias to the new keys in `requestedKey`
   (`shared/studioRoute.ts`) rather than 404, because notifications already delivered link to
   `/people` and a delivered notification cannot be rewritten. The alias sits in `requestedKey`
   rather than `resolveActiveKey` deliberately — the page reads the first and the shell reads the
   second, so putting it in the wrong one renders the screen while the nav highlights nothing.

Existing studios were backfilled by `scripts/migrate/grant-administration.mjs`: additive,
idempotent, dry-run by default, granting by role id rather than name because a studio can rename
a starter role. It never removes a permission.

## Locations belong to Master data, and Field Operations reads them

A place the studio works from outlives any one rota. Field Operations drew the list because it
was the first screen to need one, but a permit to work names a place too, and Quality's
inspections and Projects' sites will want the same list — reference data three departments read
belongs to none of them. So the `locations` collection is **Administration's** now
(`SECTION_COLLECTIONS`, and `COLLECTION_MOVES` performs the move), and Field Operations reads it
through a foreign section, the same mechanism Finance uses for Projects.

**Both screens still edit places**, through one service and one route
(`administration/locations`) — a dispatcher adding a site should not have to leave the rota. Two
screens rendering one panel is not two doors; two routes would be.

**The right moved with the collection.** Creating a place asked for
`fieldService.tracking.create` and asks `administration.master.create` now, so somebody who runs
the rota needs Master data's right to add one and sees the list read-only without it.
`administration.master` takes the full create/edit/delete ladder where its three siblings take
view/edit, because master data is records rather than a settings form.

**Two couplings worth knowing.** Deleting a location has to ask *another* section whether a shift
or a permit still names it — they live under Field Operations and hold `locationId` — and the
refusal carries the counts so the screen can say which rota to fix. And `cascadeDeleteSection` on
Master data would take locations out from under a rota that still points at them; nothing routes
there today, but the fold made Administration a real section, which is when such a thing stops
being hypothetical.

## What opening one looks like

**The shell is a layout and the screen is a page**, and that split is what a section click costs.
`src/app/studio/layout.js` resolves the studio, the person and their sections and renders
`StudioFrame`; `[[...segments]]/page.js` renders only the screen inside it. A layout persists
across the navigations below it, so clicking a section re-renders the screen alone — the sidebar
is not rebuilt, not re-sent in the RSC payload, and not remounted.

Measured in the sandbox, warm, against the real database:

| | document reads |
|---|---|
| A section click (page only) | **10** |
| A full load (layout, page shares it) | 14 |

Before the split the page did all fourteen on every click. The four it sheds — the plan
catalogues, the profile, the chat allowance — exist to draw sidebar furniture, so a screen that
does not draw the sidebar should not pay for them. The remaining ten are the irreducible core:
who you are, which studio, what you may open. `src/app/studio/_shell.js` holds both halves as
React `cache()`d functions, which is what lets the layout and the page share one resolution on a
full load; the repo's own `withRequestCache` cannot, because a layout and a page are two separate
`withRequest` scopes.

`loading.js` is what stands in the content box while the server answers. Without it the App
Router had nothing to show and **blocked the navigation**: measured, not one node in the page
changed during a transition and the address bar itself did not move for 767ms, so the click read
as broken rather than slow. With it the first paint lands at ~64ms.

**Opening a section waits three times, and all three look the same.** The route's loading
boundary while the server answers; the chunk, because every screen is `nextDynamic()`; and
then the screen's own fetch, because a department screen is a client component that asks its
API after it mounts. The third was a bare line of text — `Loading Sales…` — in every screen, so a
click went skeleton, skeleton, then a sentence in the corner of an empty box. It was the
longest of the three waits and the only one that said nothing about what was coming. All
three draw a skeleton now; the sentence survives as its `loadingLabel`, `sr-only`, so a screen
reader still hears which screen is loading.

**Which skeleton depends on what is coming.** `ScreenSkeleton` reserves a department
dashboard — title, figures, chart, table — and that is what the section screens and Main use.
The record and viewer screens would be a lie in that shape, so `RecordSkeleton.jsx` holds the
three they need: a record profile (the ticket screen — a details card beside a reserved 320px
column), a document of lines (the quotation viewer and the project sheet), and a bare table for
the two Live views, which draw their own header. The project board's is the odd one and worth
knowing: its wait happens inside the 380px information sidebar, not on the page, so a
page-shaped skeleton there would have been drawn inside a 380px column.

**Seven screens take the whole window** — the manual, the two live views, Engagements, the
document register, a project's board and the planner. They used to return out of the page before
the shell was built, which only worked while the page *was* the shell. The shell now recognises
those addresses itself, through the one shared derivation in `src/shared/studioRoute.ts`, and
draws no chrome around them. Four of the seven are **grant-gated**: without the grant the page
falls through to an ordinary framed refusal, so the same function consults the visible section
list rather than the path alone. Gate A holds the two halves level.

That module is also where the active nav row comes from. A layout is never handed the route's
segments, so the shell reads `usePathname()` — the same address the page reads from `params` —
rather than being told by a prop.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Tendering & Estimating, Manufacturing & Production, Assets & Equipment, Reports & BI and
  Quality & HSE have no screens.** They are names and nav ordering.
- **Procurement holds only the supplier master.** Requisitions, supplier RFQs and comparison,
  purchase orders, subcontracts, GRN and three-way matching are not built.
- **Logistics holds only waybill tracking.** Trips, fleet register, customs files and landed cost
  are not built.
- **Master data is locations and nothing else.** Currencies, units of measure, numbering series,
  cost codes, the industry taxonomy and the flow templates all belong there on the blueprint.
  Four of those already exist and live in Studio settings — relocating a working screen is a
  visibility decision each time, so they move in their own change. Two (UoM, cost codes) have no
  records at all yet, and a tab promising an empty registry reads as a finished feature.
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
