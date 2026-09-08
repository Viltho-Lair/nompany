# The shop floor

An operator at a station: what they clock on to, and what they pass or fail. A tab on
Production planning (`/<slug>/manufacturing`), and two collections — `shopfloorRuns` and
`qcChecks` — under the Manufacturing root.

## What it is

**A work order could be moved through its statuses and nothing recorded how long it took.**
The engine register carries a status ladder, so an order went from open to done with a
click and the run left no trace: nothing could say how many hours went into a batch, which
station they were spent at, or who was standing there. A factory that cannot answer that
cannot cost a product.

**And a production batch had no verdict.** The register records what was made and when;
nothing said whether it PASSED. A studio could trace a batch to a job and could not say
whether the batch was any good — which is the one thing traceability exists to let somebody
act on.

**Two records, one screen**, because they are one person's job: the operator who ran the
machine is the one who signs off what came out of it.

### The rights

**No key of its own.** Reading is `manufacturing.planning.view` — the same registers. The
two WRITES answer to different engine rights on purpose: logging a run is working ON a work
order (`engine.workorder.edit`); passing a batch is a judgement about that batch
(`engine.batch.edit`). An operator who may run a machine and a person who may release its
output are frequently not the same person, and one right over both would make them so.

### Time

**One open run per person, across every order.** An operator standing at one machine cannot
also be at another, and two open runs is how a day ends with sixteen hours logged against
eight worked. It refuses by name (`other-run`) so the terminal can say which job to close.

**Only your own run can be closed.** Not a convenience: a run is a claim about who was
standing at a machine and for how long, so somebody else closing it would be signing a
timesheet in another person's name.

**An open run's hours are NULL, not zero.** A run in progress has taken some time and we do
not yet know how much; reporting nought would make a half-finished batch look free and
understate every job on the floor right now. An order's effort is its CLOSED runs, with the
open ones counted separately — folding a guess into the total would produce a number that
moves when nobody has done anything.

**Somebody else's open run is shown, not hidden.** An operator arriving at a busy station
should see who is on it rather than an empty list; it does not block them, because two
people on one job is real.

### Quality

Three results and no more: `pass`, `fail`, `concession`.

**A fail without a reason is refused**, and so is a concession. "This batch failed" that
does not say why cannot be acted on, cannot be argued with and cannot be counted into
anything — the rule a losing deal already follows with `lostReason`. A concession needs one
more: accepting material that did not meet the spec is a decision somebody has to be able
to defend later.

**The verdict is the LATEST check, not a tally.** A batch that failed, was reworked and
passed is a passing batch, and a screen showing both verdicts equally would leave the
reader to guess which is current. Checks are appended and never replaced — overwriting the
first would destroy the record of the rework, which is the half traceability exists for.

**An unchecked batch is NULL, not a pass.** "Not checked" and "checked and fine" are
opposite facts about a batch about to be shipped, and defaulting to the safe-sounding one is
how an uninspected batch leaves the building looking approved. `awaitingCheck` lists them
oldest first — the counterpart of the field view's `awaitingSignature`: material that was
made and cannot be released.

## Not built yet

- **A run logs no quantity.** It says who was at a machine and for how long, not how many
  units came off it, so nothing reconciles a run against a batch's `quantity`.
- **It does not reach timesheets.** The section list calls this "shop-floor terminal to
  timesheets"; a run is its own record and `modules/projects/timesheets` never sees it, so
  the hours do not reach payroll or a project's cost.
- **No operation-level routing.** A run is against the whole work order; there are no
  steps, so "which operation is it on" has no answer and capacity is still measured in
  units rather than hours.
- **No scrap or rework quantity on a fail.** A failed batch is failed whole.
- **No link from a QC check to the batch register's own fields.** The verdict lives beside
  the batch rather than on it, so the engine register still shows a batch with no result.
- **Nothing blocks shipping a failed or unchecked batch.** The check is a record, not a
  gate; Inventory does not consult it.
