# Maintenance

The fifteenth department, 11/09/2026. `/<slug>/maintenance`, with two screens:
**Work requests** (`maintenance-requests`) and **Work orders** (`maintenance-orders`).
Module `src/modules/maintenance/`, rules in `model.ts` (pure, `tests/maintenance-model.mjs`),
routes `api/studios/<slug>/maintenance/{requests,orders}`.

Decided with the owner (the ledger's Maintenance row in `docs/progress.md`): its own
department rather than more of Assets; work orders a hand-built module rather than engine
records or Operations jobs; Google Maps for the map; location check-in deferred.

## What it is

**Two records, and the split is the point.** A *work request* is anybody's report that
something is wrong. A *work order* is work somebody authorised, planned and assigned.
Keeping them apart is what lets a studio take faults from everybody without letting
everybody dispatch technicians.

**Two rights, one per record** — `maintenance.requests.*` and `maintenance.orders.*`,
catalogue 206 → 214 (measured 11/09/2026). **Triage** (accepting or declining a request) answers to
`maintenance.orders.create`, because accepting a request IS raising a work order. There is
no extra verb: a second right over the same act would be free to disagree with the first.

### Requests

Title, details, priority (low · normal · high · urgent), a machine, a place, photos.
Reference `WR-0001` (numbering series `workRequest`). Raising one notifies everybody who
holds `maintenance.orders.create`, except the reporter.

**Only Declined is stored.** Accepted is DERIVED from a work order naming the request —
the requisition's `Ordered` rule, for its reason: deleting the order puts the request back
in the queue instead of leaving it reading as handled. Accepting copies the report onto a
corrective work order and takes a priority, a due date and who does it. Declining takes a
reason (kept blank if none — "duplicate of WR-0012" is sometimes the whole story). Only an
unanswered request edits or deletes.

### Work orders

Title, type (corrective · preventive · inspection — EN 13306's three), priority, machine,
place, assignees (CollaboratorIDs, each checked against the studio), due date, estimated
hours, details, photos. Reference `WO-0001` (series `workOrder`). Assignees are notified —
only the newly added, never the person assigning.

**The ladder** (`ORDER_MOVES`), condensed from IBM Maximo's reference flow — approval
happens on the request, so an order is born Open:

- Open → In progress · On hold · Cancelled
- In progress → On hold · Completed
- On hold → In progress · Cancelled
- Completed → Closed · In progress (reopen)
- Closed and Cancelled are final.

**Completed only through In progress**, because a repair nobody started has no start time
and so no repair time. **In progress cannot be cancelled**: somebody spent time on it.
**A hold names its reason** (parts · access · vendor · other) — the backlog is sorted by
it. **Completion says what was done** — the machine's next failure starts from it; a
reopened order's resolution still counts. **Completed reopens until Closed**: Completed is
the technician's word, Closed the reviewer's.

The move is judged against the row being written, inside the function patch (invariant 8),
so two people pressing Start and Cancel at once cannot both succeed. `startedAt` is the
FIRST start — resuming after a hold does not move it, or every order that waited on a part
would read as a quick fix. Every move is appended to `history`.

Only open, never-started work deletes; Closed and Cancelled work does not edit.
**Overdue** is open work past its due date by the server's clock (`asOf`); On hold counts.

### The map, and what is mine (slice 2)

Work orders have two views of one list. **Map** draws open work at every place that carries a
pin, one pin per place with its orders listed in the popup and directions beside them, through
the same map and loader Master data's locations use. It loads only when somebody switches to
it. Open work with no pinned place is counted under the map rather than silently missing from
it. **Assigned to me** filters to open work naming the reader (`me`, a CollaboratorID, comes
back with the list, so it is a filter rather than a second route).

The map now redraws when what its pins SHOW changes, not whenever the screen around it renders —
keyed on a signature of ids, positions, names and lines. Before, typing in a dialog beside the
Master-data map re-fitted it on every keystroke and threw away wherever the reader had panned.

### Time booked (slice 2)

`workOrderLabour`, its own collection under Work orders (the migration design refuses nested
arrays that grow without bound). An entry is who, which day, how many hours, and whether it was
time on the job, travel or waiting — the split planned-maintenance percentage and wrench time are
made of. Rules in `model.ts`: quarters of an hour, more than nought and at most 24 in one entry;
**not in the future**, because a forecast among the actuals is how a job reads as costing what
somebody expected; **blank is not nought**. Booking answers to `maintenance.orders.edit`; by
default the time is the caller's own, and booking it for somebody else names a member of the
studio. **Closed work takes no more time** and gives none back — Closed is the reviewer's word
that the figures are final; Completed still takes it. An entry is removed by whoever booked it or
by somebody holding `maintenance.orders.delete`. **Work with time booked is not deleted** — travel
to a site before anybody pressed Start is still time somebody is owed for — and the honest exit is
Cancelled. Entries come back with the orders; `/maintenance/labour` only writes. **Hours only:**
what an hour costs is Phase 3's, with parts.

### In the field view (slice 2)

The technician's round (`field-view.md`) lists their open Maintenance work orders beside their
jobs, gated on their own `maintenance.orders.view` — holding the rota does not open Maintenance.
Read there, worked here: moving a work order asks why it is on hold and what was done, and those
questions belong to this screen, so the field view links to it rather than growing a second copy.

### What a record points at

**The machine is the Assets register's** — an engine `equipment` record, which stays filed
under Assets & Equipment. Its name shows only to a reader holding `engine.equipment.view`;
anybody else is told a machine is named without being told which. Three states — found,
hidden, deleted — because a blank would read as "no machine" for all three.

**The place is Master data's**, and it carries its pin: where a location has coordinates
(`master-data.md`), Navigate sits beside it and opens Google Maps, Waze or Apple Maps.

Photos go to the studio's private media first; the record keeps only `/api/media/<id>`
paths, and nothing else is accepted.

## Who gets it

- **Trades.** "Maintenance & Repair" switches Maintenance on (it used to switch on Assets,
  which held the register). `SECTION_NEEDS` brings Assets along wherever Maintenance is on,
  because a work order names a machine in the Assets register — so no trade lost Assets.
- **Roles.** Custodian: full on both. Doer (technician): edit on both. Checker: view on
  orders. A department whose `sectionKeys` include `maintenance` gives its roles their home
  level there; the ten maintenance-like starter departments now list it.
- **New studios** get the section at creation. **Existing studios** need, in this order,
  `scripts/migrate/plant-sections.mjs` (plants the three keys) and
  `scripts/migrate/grant-maintenance.mjs` (gives roles holding `engine.maintenance.V` the
  same verb on both areas). Both are dry-run by default. **Neither has been run.**

## Not built yet

- **What labour costs.** Hours are booked; no rate turns them into money, and nothing posts
  to Finance.
- **Downtime.** Nothing records when a machine went down and came back — so no MTTR, MTBF or
  availability yet.
- **Working a work order from the field view.** It is listed there and moved here.
- **Clustering on the map.** One pin per place, which is legible at a studio's scale.
- **Preventive plans.** No schedule raises work orders; Field Service's PM plans cover
  customer-installed units only.
- **Parts.** Stock cannot be issued to a work order.
- **Failure codes, meters, QR tags, supplier work orders, permit gating, check-in, offline.**
- **Moving the machine's status.** Starting work does not set the equipment record to
  "Under repair".
- **The engine `maintenance` register** under Assets still exists beside this section. It
  is retired into work orders by a migration that has not been written.
- **Reporting a fault from any department.** A role is confined to its department's
  sections (the owner's rule, 11/09/2026), so only departments listing Maintenance can raise
  a request by default. Whether everybody should, the way everybody has Tasks, is an open
  question for the owner.
- **A Maintenance dashboard.** The root shows its two sub-sections as cards.
