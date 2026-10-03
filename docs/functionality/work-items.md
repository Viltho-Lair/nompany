# Kinds of work: one work item, four types

The owner's decision C, 03/10/2026: **one kind of work item, with types.** A contractor's work
is a deal; a workshop's is a field job or a work order; a shop's is a counter sale. Each is read
the same way: which step it is at, how far along, whether it is overdue. So the front door now,
and the KPIs later, ask one question of all of them.

## A work item is a reading, never a record

Every type already exists as its own record, with its own screen, rights and rules. A "work
items" collection beside them would be a second copy of each, so **nothing new is stored**.
`src/modules/main/workTypes.ts` (pure) declares, per type, how that record's own status reads as
a step:

| Type | The record | Steps | Done from | Ends without finishing |
|---|---|---|---|---|
| **Deal** | the engagement | its FLOW's stages, the ones this studio runs | holding every stage of the flow | — |
| **Field job** | Field Service's job | Scheduled → In progress → Completed | Completed | Cancelled |
| **Work order** | Maintenance's work order | Open → In progress → Completed → Closed (On hold = paused at In progress) | Completed | Cancelled |
| **Counter sale** | the till receipt | Paid | Paid (written paid) | — |

- **Progress counts steps reached.** A scheduled job is 1 of 3, an open work order 1 of 4.
  Done reads 100%.
- **A deal is AT the furthest stage it holds**, so skipping a stage is not penalised twice. Its
  progress counts only the stages it holds, so a skipped stage still shows as not done.
- **Null, never 0%.** A cancelled item, a status the registry does not know, or a deal on no
  flow has no progress, and the screen draws no bar rather than an empty one.
- **The status names are the modules' own, copied** and held against `JOB_STATUSES` and
  Maintenance's `ORDER_STATUSES` by `tests/work-types-model.mjs`, so a status a module adds
  cannot silently stop being counted.

## Which kinds of work a studio runs

**Derived from the departments it has switched on**, never stored: deals with Sales, Quotations,
Tendering or Projects; field jobs with Field Operations; work orders with Maintenance; counter
sales with Point of Sale. The ready industries (`progress.md`, decision B) come out as:
construction and trading run deals; retail runs counter sales and deals; technology and facility
services run deals, field jobs and work orders.

## Where it shows: "Work in hand" on the front door

`GET /api/studios/<slug>/main/work` (`modules/main/work.ts`), opened by `main.view`. One lane per
kind of work:

- **open**, **overdue** (a job past its window; a work order by Maintenance's own `orderOverdue`,
  on hold included), **finished in the last 30 days**;
- **the six open items most in need of a look**: overdue first, then the soonest due, each with
  its step, due date and progress bar, linked to its record or screen;
- **counter sales** show today's count and value instead. Today is the STUDIO's day
  (`shared/timezone`), and receipts in another currency are not added to the total.

**Each lane answers to its own department's right and switch** (`readIfVisible`). A lane the
reader may not see, or the studio does not run, is absent rather than empty. **Deals are a
sample**: the newest 25, read in parallel, and the lane says "of the newest 25" when it was
capped, rather than presenting a page as the studio's total. The board is its own request, so
the front door paints its figures without waiting for it.

Measured in the sandbox, 03/10/2026: about 3.3 seconds for thirteen deals over the local database
proxy (8.9 before the deals were read in parallel). The front door's own request took 0.8.

## Not built yet

- **KPIs** are built on these types (`kpis.md`): a lane shows its period KPIs and each listed job or
  work order its own mark; the deal lane shows none yet.
- **Sales orders and other types.** Trading's sales orders, cases, enrolments and recurring
  commitments are not types yet. Each joins when its industry's front office is built.
- **A deal's progress counts every stage its flow lists.** On a long flow a new deal reads 7%.
  That is honest about the flow, but a flow with optional stages has no way to say so.
- **No due date on a deal**, so a deal is never overdue on this board.
- **Deals beyond the newest 25 are not counted.** A studio with more sees "of the newest 25".
- **The job and work-order links open the department's screen**, not the single record.
