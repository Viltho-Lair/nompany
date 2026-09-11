# Maintenance

The fifteenth department, 11/09/2026. `/<slug>/maintenance`, with five screens:
**Work requests** (`maintenance-requests`), **Work orders** (`maintenance-orders`),
**Preventive plans** (`maintenance-plans`), **Service contracts (SLA)**
(`maintenance-contracts`) and **Machines** (`maintenance-assets`).
Module `src/modules/maintenance/`, rules in `model.ts`, `schedule.ts`, `contracts.ts` and
`legacy.ts` (all pure, `tests/maintenance-model.mjs`), routes
`api/studios/<slug>/maintenance/{requests,orders,plans,contracts,labour,readings,assets}`.

**All maintenance lives here — the owner's word, 11/09/2026: an SLA is a preventive
maintenance contract.** Before that day maintenance was in four places that knew nothing of
each other: Projects' SLA screen, Field Service's maintenance contracts and PM plans, Assets'
maintenance list, and this section. Field Service keeps the crews (Schedule, Tracking) and the
installed base; Assets keeps what the studio owns (equipment, calibration, plant allocation).

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

### Preventive plans (Phase 2, slice 1)

`maintenance-plans`, collection `pmPlans`, right `maintenance.plans.*` (catalogue 214 → 218),
references `PM-0001`. Planning the calendar is not doing the work: whoever decides the
compressors are serviced monthly decides what the team is sent to do for a year, so a
technician working the orders needs `maintenance.orders`, not this. Custodian holds it in full,
checker may read it.

A plan is what (title, details, preventive or inspection, priority, checklist), where (machine,
place), who (assignees), how often (Field Service's `PLAN_FREQUENCIES` — one list, so a plan can
never carry a frequency nothing turns into a date), when it is next due, and how many days early
to raise it (0–60). Active ⇄ Paused → Retired; a retired plan is not edited, and only a plan
that has raised nothing deletes.

**The daily run** (`modules/maintenance/pmRun`, on `cron/daily-notices` beside Field Service's
own run and in its own `try`) raises a work order from every Active plan whose due date, less
its lead days, has arrived. Every decision is `raiseDecision`'s, pure in `schedule.ts`:

- **One open work order per plan.** A plan three quarters behind is not three identical orders
  against one machine; the next occurrence waits and arrives already overdue, which is the honest
  state and what compliance reports.
- **Idempotent by the occurrence.** The order carries `pmDueOn`, the due date it answers, so a
  second run the same day — or a crash between raising and moving the date — raises nothing twice.
- **Fixed or floating.** A fixed plan's next due date follows the calendar and moves the moment an
  occurrence is raised (statutory inspections). A floating plan's is the completion day plus the
  interval and moves when the work is completed (wear items); cancelling its order skips that
  occurrence. Only the order answering the plan's CURRENT occurrence moves it, under a function
  patch, so a stale order finishing late never drags a plan back.
- **The studio acts** (`system`), and assignees are told through the same notice a person sends.
- The occurrence arithmetic is Field Service's `nextOccurrence`, imported — calendar months
  clamped to the month's end.

**The checklist is the plan.** Each order raised gets its own copy of the steps with a tick each;
editing the plan re-words nothing already issued. Steps tick while the work is open, under a
function patch so two technicians ticking two steps both land, and **completion is refused with a
step unticked** (`checklist`) — a service that skipped a step nobody can now name.

**PM compliance** per plan and for the studio: finished within a tenth of the interval (at least a
day) of the date it answered, over everything that fell due. Open work past its window counts as
late — or a plan could score 100% by never finishing anything — and cancelled work is left out.
No history is "no history", not 0%.

### Reminders (Phase 2, slice 2)

On the same daily run as every other time-driven notice (`cron/daily-notices`), from pure
producers in `modules/main/timeNotices`, and **stateless like the rest of them**: a record
announces itself only on fixed day-milestones, so nothing is stored to remember it by and a
record between milestones says nothing that day.

- **Work orders falling due and overdue** (`dueWorkOrderNotices`): the day an open order falls
  due, then 1, 7, 14, 30, 60 and 90 days late (`WORK_ORDER_MILESTONES`). Open means Open, In
  progress or On hold — a machine on hold is still broken. **Told to whoever is doing the work**,
  one entry per person for their own orders (count and the most urgent example), and only while
  they may still open work orders; an order with nobody on it goes to whoever may edit work
  orders, because somebody has to put a name on it.
- **Calibration certificates coming due** (`dueCalibrationNotices`), from the engine's
  `calibration` register: 30, 14, 7, 3 and 1 days before `dueOn`, and on the day — only a
  certificate still Valid or already Due. Told to the holders of `engine.calibration.edit`, who
  can record the new certificate.

### Reliability (Phase 3, slice 1)

**Failure codes** are three lists under Master data → Categories — `failureProblems`,
`failureCauses`, `failureRemedies` — generic ones shipped, a studio's own added beside them (the
tender-sources pattern, so no new right and no settings sub-section). ISO 14224 keeps what went
wrong, why, and what put it right apart because they are different questions; a single free-text
box can count none of them. **Corrective work cannot be completed without a problem** (`failure`);
cause and remedy stay optional because often nobody knows yet. Codes are stored in the list's own
spelling, and a code the lists do not hold is dropped.

**Downtime** is two instants on the work order: `downSince` and `upAt` (ISO, entered in the
reader's local time and stored as UTC, so "down for 12 h" is the same twelve hours everywhere).
A reporter can say the machine **has stopped**; accepting that report starts the order's downtime
at the moment of the report. Completing the work stamps `upAt` if nobody gave one, and
**reopening clears it** — a reopened repair is one that did not hold. Refused: back in service with
no down time, back before it went down, and either end in the future.

**Machines** (`maintenance-assets`, a destination owning no collection, answering to
`maintenance.orders`) lists every machine in the equipment register with its last twelve months
from `reliabilityByAsset` (`reliability.ts`, pure): failures (corrective, not cancelled, dated by
when it went down), MTBF (operating hours over failures), MTTR (mean of down-to-back, from
DOWNTIME rather than labour — an hour's work after three days waiting for a part kept the machine
out three days), availability, open work and the commonest problems. **Each is a dash when it has
no honest value**: no failure has no MTBF rather than an infinite one, and a machine with nothing
recorded has no availability rather than 100%. Downtime on two orders that overlap is counted twice
— rare, and itself worth seeing. Machines are listed only to a reader who may open the equipment
register.

### Parts and cost (Phase 3, slice 2)

**Parts are issued from Inventory to a work order, and returned.** The stock ledger has one
writer (`record`), so this is **Inventory's** function and route — `moveForWorkOrder`,
`POST /inventory/workorder-parts` — answering to `inventory.stock.edit`, the right that already
issues a delivery note. The work-order screen posts there, the way the requisition screen posts
its conversion to Inventory's order route; Inventory reads the work order through a foreign
section to check it exists and is still editable (a closed order's costs are final).

**The ledger is the record.** A part used is an `out` movement naming the order
(`sourceType: "workorder"`), a part brought back an `in` movement naming it — nothing is copied
into a second collection. An issue cannot take an item below nought; a return cannot give back
more than the order kept (`returnProblem`, pure in `parts.ts`). No approval chain, as with a
delivery note: parts going to authorised work is consumption, not a write-off.

**The cost travels on the movement.** `MovementSchema` gained an optional `unitCost`, written
only where a movement is charged to something: an issue snapshots the item's RECORDED unit cost
that day, and a return is costed at what the order was charged for it, so it takes off exactly
what the issue put on. Repricing an item later re-prices nothing already used. **It is the price
list's figure, not FIFO's or average's** — valuation still values the shelf from receipts.

Each work order shows what it kept, item by item, and its **parts cost**. **Machines** gains
**parts cost and hours booked** over the same twelve months (`costByAsset`). Hours stay hours:
nothing yet says what an hour costs, and multiplying by a guessed rate would be a figure nobody
chose. **Work with parts on it cannot be deleted** (`has-parts`) — a movement naming an order
that no longer exists is stock that left for nowhere.

### Meters, and plans that run on them (Phase 4, slice 1)

**Readings** (`meterReadings`, filed under Machines — the machine's own record) say how far a
machine has run: running hours, kilometres or cycles, the three families preventive maintenance
runs on everywhere. Recorded on the Machines screen by anybody holding
`maintenance.orders.edit`, the right that moves the work. A meter is **cumulative**, so a reading
below the last is refused — unless the reading says the meter was replaced or reset (`reset`),
which is said, not assumed. Refused too: a reading dated before the last one (a back-dated reading
would read as the meter going backwards) and one in the future. **Only the latest reading on a
meter can be taken back**, by whoever recorded it or somebody holding `maintenance.orders.delete` —
a reading typed as 12,000 instead of 1,200 would otherwise refuse every true reading after it.
Rules in `meters.ts`, pure.

**A plan runs on the calendar or on a meter** (`trigger`). A meter plan names its machine, its
meter, an interval (every 250 h) and the reading it is next due at, and falls due when the
machine's **latest reading reaches it** (`meterRaiseDecision`) — because a generator idle all
summer has not worn a quarter's worth, and one run flat out through a shutdown has worn three.
The same rules as the calendar: one open order per plan; idempotent by the reading the order
answers (`pmDueReading`, as `pmDueOn` is for a date); fixed moves the trigger on by the interval at
raising, floating moves it from the reading at completion (`nextDueReadingOnClose`), and cancelling
skips that trigger. A plan written before meters existed has no `trigger` and reads as calendar.

**A reading raises the work straight away.** The readings route asks the plan run after recording,
so a reading that crosses 250 hours raises the service now rather than at tomorrow's cron (which
still runs every plan, and raises nothing twice). The run is called from the route, not the
service, because the run writes orders through the service — the other way round is an import loop.
The reading stands whatever the run does. PM compliance counts calendar plans only.

### Service contracts (SLA) (11/09/2026)

**The maintenance a studio sells**: a term, a number of planned visits spread evenly across it,
and an allowance of call-outs. `maintenance-contracts` is the screen; the contracts are the
`slas` rows **still filed under `projects-sla`**, where Projects wrote them, read as a foreign
section. `projects-sla` is a **filed-only section** (`FILED_ONLY_SECTION_KEYS`, keys.ts): its
rows stay, the sidebar and the Sections panel leave it out, and its old address shows a pointer
here. Nothing moved and no script ran — **every existing contract is on this screen as it was.**

**The right is still `projects.sla`**, filed under Maintenance on the Access screen. Renaming the
key would have stranded every role that holds it; kept, every existing holder reaches the new
screen by themselves.

A contract is a name, a customer (typed), the project it follows (optional; its title only for a
reader of the project list), what it covers (parts and labour · labour only · inspection only ·
full cover), its value over the term (blank is "not stated", not nought), signing and start
dates, a length in days, planned visits, call-outs allowed, days early to raise a visit (0–60),
a place, the customer's units it covers (Field Service's installed base), who does the visits,
and a checklist. Rules in `contracts.ts`, pure — the screen refuses exactly what the server does.

**The visit dates are arithmetic**: visit k falls on start + k × (length ÷ visits), rounded to
the day, so the last lands on the end — the same sum the Projects screen used, so every contract
kept its dates. Editing the start, length or count reschedules every visit.

**Each visit becomes a work order by itself.** The daily run (`raiseDueContractOrders` in
`pmRun.ts`, on `cron/daily-notices` in its own `try`) raises a preventive order for a contract's
next visit when it falls due, less the lead days — one a day per contract, earliest first,
naming the contract and the visit (`slaId` + `slaVisit`), which is what makes it idempotent. The
order carries the contract's place, its one unit when it covers one, its people and its
checklist. **Nothing is written back onto the contract**: what a visit came to is read off its
order — done (completed or closed), open, cancelled, due, upcoming, or **missed**.

**Missed, not raised, beyond a week back** (`RAISE_GRACE_DAYS`). Without it, the first run after
this shipped would have raised a year of overdue orders for every contract a studio already had.
A visit kept outside the system — or before 11/09, when a visit was a checkbox — is **ticked by
hand**; only a visit with no order can be, because an order already says what it came to.

**A contract a preventive plan runs under raises no visits of its own** — the plan is its
schedule (a monthly service on one unit and a quarterly one on another cannot be one even
spread, and raising both would send the customer two sets of visits). Derived from the plans,
not stored; the screen says which plans keep it. Paused counts; retired does not.

**A call-out** is a corrective work order raised from the contract (default priority high),
counted against the allowance with any call-outs dated on the contract before 11/09. Refused
past the allowance (`emergency-cap`), outside the term (`outside-term` — raise an ordinary
order), or on a cancelled contract. It answers to `maintenance.orders.create`, because it is a
work order. Two call-outs at the same instant can both take the last one; the register then
shows it.

**Cancelled is the one stored state**; active, not started and ended are read off the dates, so a
renewal is new dates on the same contract. A cancelled contract raises nothing and takes no
call-outs, and is reinstated from the same screen. **Only a contract that has raised nothing
deletes** — once a visit, a call-out or a plan names it, cancel it instead.

### Customers' units (11/09/2026)

A work order and a preventive plan can name **a customer's unit** — an engine `installed`
record from Field Service's installed base — as well as, or instead of, the studio's own machine.
What the studio owns and what it looks after for a customer are two registers because they are
two things. The name shows only to a reader holding `engine.installed.view`; otherwise the same
three states as a machine. A plan can also name the contract it fulfils, and every order it
raises carries both.

### The old registers, folded (11/09/2026)

**New studios no longer get** Assets' `maintenance` register or Field Service's maintenance
contracts (`contract`) and PM plans (`planned`). An existing studio keeps its three registers and
every record until `scripts/migrate/fold-maintenance-registers.mjs` runs — dry-run by default,
`--apply` to write, `--allow-live` for the live store. It copies (`legacy.ts`, pure, tested;
`fold.ts` writes):

- a Field Service contract → a service contract: term kept, visits per year become visits over
  the term, the annual value becomes the value over the term, the units its plans serviced become
  the units it covers. **A draft arrives cancelled**, so nothing is raised until somebody
  reinstates it.
- a Field Service plan → a preventive plan with the same frequency and next date, its tasks as
  the checklist, its unit, and its contract. **A frequency nothing reads arrives paused.** The old
  plan is then set Retired, so it stops raising dispatch jobs the morning its copy starts raising
  work orders.
- an Assets maintenance record → a work order: Due is open, In progress in progress, Done
  completed (its notes are what was done), Skipped cancelled; its recorded cost is kept as
  `legacyCost` and shown on the order.

Then the three registers are **switched off** (`enabled: false`) — undone from Studio settings →
Sections. **Nothing is deleted.** Idempotent: every row written carries `legacyRecordId`.

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
- **Every studio gets the section** — new ones at creation, existing ones the first time they
  are opened after the deploy (`listSections` plants what is missing, 11/09/2026). The owner and
  Admins see it at once. **Other roles need `scripts/migrate/grant-maintenance.mjs`** (gives
  roles holding `engine.maintenance.V` the same verb on the Maintenance areas; dry-run by
  default), because a role's rights are never widened without somebody choosing to. **Not run.**
- **Service contracts need nothing run**: they answer to `projects.sla`, which every role that
  had the Projects SLA screen already holds.

## Not built yet

- **What labour costs.** Hours are booked; no rate turns them into money, and nothing posts
  to Finance.
- **Downtime without a work order.** A machine is down only on an order; there is no
  separate downtime log for an outage nobody raised work for.
- **The acquisition date.** A machine bought in March is judged over the full twelve months.
- **Working a work order from the field view.** It is listed there and moved here.
- **Clustering on the map.** One pin per place, which is legible at a studio's scale.
- **Moving a calibration record's status by date.** A certificate past its due date is warned
  about but stays Valid until somebody marks it; the register has no time-driven rule.
- **Reminders for a plan that cannot raise** (a paused plan, or one held back by its open order).
- **Condition-based plans** (a reading OUT OF RANGE — a temperature, a vibration — raising
  work), gauges as opposed to cumulative meters, and readings from telematics.
- **Compliance for meter plans.** A meter plan's orders are not scored on time or late.
- **Readings taken on a work order or its checklist.** A reading is recorded on the machine.
- **The fold has been run against live, 12/09/2026**: dry run, apply, and a second dry run
  finding nothing left. All five studios held the three registers and every one was EMPTY, so it
  copied nothing and retired no plan; it switched the fifteen registers off and planted
  Maintenance in the four studios nobody had opened since it shipped. A studio created before
  11/09 that gains records in an old register later would need it run again.
- **Response and resolution targets.** A service contract promises visits and call-outs; it
  says nothing yet about how fast a call-out is answered or put right, and nothing is measured
  against one.
- **Billing a contract.** Its value is recorded; nothing raises an invoice from it, and a
  call-out past the allowance is refused rather than charged.
- **Renewal as an act.** A contract is renewed by moving its dates; nothing reminds anybody that
  one is ending.
- **The customer is typed**, not a CRM client, as the installed base types it.
- **The dispatch board's job form** still offers Field Service's old contract register, which
  new studios do not have, rather than service contracts.
- **Reserving parts before the work starts.** A part is issued or it is not; nothing holds
  stock against a planned order, and a preventive plan names no parts.
- **Posting to Finance.** No journal entry is written for parts or time; the cost is visible
  on the order and the machine and nowhere in the ledger. There is no maintenance expense
  account.
- **What labour costs, and cost per machine in money beyond parts.**
- **Bins, batches and serials on an issue.** A part leaves "unbinned" like a delivery note's.
- **QR tags, supplier work orders, permit gating, check-in, offline.**
- **Moving the machine's status.** Starting work does not set the equipment record to
  "Under repair".
- **Reporting a fault from any department.** A role is confined to its department's
  sections (the owner's rule, 11/09/2026), so only departments listing Maintenance can raise
  a request by default. Whether everybody should, the way everybody has Tasks, is an open
  question for the owner.
- **A Maintenance dashboard.** The root shows its two sub-sections as cards.
