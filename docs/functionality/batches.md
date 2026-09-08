# Batches and serials

Which units, and when they stop being usable. A tab on Stock
(`/<slug>/inventory-stock`), one collection — `stockBatches`, under `inventory-stock` —
and a read that joins two things Inventory already held.

## What it is

**Two ways of saying which units, and the product had one and a half.** A SERIAL names one
unit; a BATCH names a run of them sharing a lot number and, usually, a date they stop
being usable. Serials have been half-supported since Inventory was written —
`item.serials` is a list of strings and a project sheet can allocate one — while batches
did not exist at all. So a studio holding sealant, adhesive, calibration gas, filters,
food or anything certified could record how many it held and nothing about when it
expires.

**The cost of that is not an absent column; it is that expiry cannot be found by
looking.** A studio discovers a drum went out of date when somebody picks it up, which is
after it has been counted as stock, valued on a balance sheet and promised to a job.

**No permission key.** A batch is how the stock is labelled, so it answers to
`inventory.stock` — the right somebody already holds to move what carries the label.

### A batch is a label, not a quantity

What is left of a batch is the sum of the movements naming it. **`splitBy` is shared with
bins rather than copied**, because two answers to "how much is in each X" would be free to
disagree about what a movement means. A stored quantity would be a second source of truth
that drifts the first time a movement is corrected. The split always sums to the company
total, asserted in the model test and proven in the sandbox: 12 in LOT-A, 8 in LOT-B, 10
in no batch, total 30.

**Assigning stock to a batch is the bin register's move, keyed on `batchId`** — two
movements netting to nought, one writer. Two functions writing net-zero movement pairs
would be two chances to get the sign wrong, and one of them would be the one nobody
exercised.

### The states, and the one that is not a warning

`expired` · `expiring` (within 30 days) · `ok` · `no-date` · `empty`.

**`no-date` says so rather than looking fine.** Both dates are optional: plenty of stock
is batch-tracked for traceability — which drum went to which job — and never expires.
Requiring a date would make a studio invent one, and an invented expiry is worse than none
because everything downstream believes it.

**A batch with nothing left is `empty`, not `expired`.** A drum that went out of date after
it had all been used is not a problem anybody has, and colouring it red buries the ones
still on a shelf. It stays on the register because "what did we use on that job" has to be
answerable afterwards.

**`asOf` is read once, on the server, and travels in the response.** A screen reading its
own clock would disagree with the server across midnight and after a tab had been open all
day — the rule the tender register already follows. `batchView` takes the date as an
argument, which is what makes it assertable.

### FEFO suggests and never enforces

First expired, first out: for anything with a shelf life the oldest usable stock is the one
about to stop being usable, and picking by arrival date is what leaves a drum on a shelf
until the week after it went off.

**It is a suggestion.** A picker at a rack has reasons — the FEFO batch is behind three
others, or reserved — and a system that refused every other batch is a system people work
around by not recording the batch at all, which loses the traceability the feature is for.
**An expired batch is never suggested**: it keeps its quantity and its row, and loses only
its claim to being picked next.

### Serials

**A join of what already existed, not new data.** `item.serials` records which units are
held; a project sheet allocates one. Nothing put the two together, so "is this unit spoken
for" meant opening every sheet in the studio.

**Three states and no more** — `held`, `allocated`, `gone`. There is deliberately no
`scrapped` or `returned`: nothing writes those, and a state the product cannot reach is a
state that lies about being supported, the same defect as `closedAt` being declared and
written by nothing.

**The gap is reported.** On-hand is summed from movements and the serial list is typed, so
an item holding thirty by the ledger and two serials has twenty-eight units nobody can
trace. Reported rather than refused: the ledger is right about the count, and the fix is
somebody typing the serials in.

### What is refused, and why

- **A lot number with a space**, or over 24 characters — **refused, not truncated**, the
  rule bin codes carry for the same reason.
- **A lot already used on the SAME item**, case-insensitively. The same lot number on a
  DIFFERENT item is fine: two suppliers' lot numbers collide routinely, and studio-wide
  uniqueness would make a studio rename somebody's printed label.
- **A batch with no item.** A lot number is meaningless without the thing it is a lot of.
- **A batch expiring before it was received.** That is a typo somebody wants to hear about,
  not a state: it would sort first under FEFO and send a picker to a drum that was never
  usable.
- **An assignment the source cannot cover**, and **both ends the same**.
- **Deleting a batch that still holds something.** An emptied one deletes and cascades
  nothing; its movements count as untracked.

## Not built yet

- **Receipts do not create a batch.** A goods receipt records no lot number, so every batch
  is typed and then assigned as a second step. That is the next slice and it is the one
  that makes the feature routine rather than deliberate.
- **A movement carries one batch, and picking does not consume by FEFO.** Issuing stock
  names no batch at all, so a batch's quantity only falls when somebody reassigns it.
- **No expiry notification.** The alerts are on the screen; nothing emails anybody, and
  nothing blocks issuing an expired batch.
- **No serial history.** A serial's state is derived from today's list and today's sheets,
  so `gone` is only reachable when a caller supplies its own history — nothing stores one.
  There is no "when did this unit arrive, where has it been".
- **No batch on a serial.** The two live side by side and nothing links a serial to the lot
  it came in.
- **The 30-day expiring window is fixed** and not a studio setting.
