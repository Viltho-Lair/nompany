# Bins

Where the stock physically is. A tab on Stock (`/<slug>/inventory-stock`), and one
collection, `stockBins`, under `inventory-stock` beside the movements it splits.

## What it is

Inventory has always known HOW MANY of a thing a studio holds — a balance is the sum of
its movements, appended and never edited — and never WHERE. A warehouse keeper asking
"which shelf" got the same answer as somebody asking "how many in the company": one
number, no place. A studio with two sites could not tell whether the eleven pumps were
eleven here, or six here and five three hundred kilometres away, which is the difference
between having stock and having to move it.

**A bin sits inside a LOCATION, and the location is Administration's record** — the same
row a shift and a permit point at. Inventory keeps no list of places of its own: a second
one would be free to disagree with the first about where the company works, which is what
the departments register exists to stop happening to the org chart. The section is foreign
and nullable, so a studio with no Master data is told to add a location rather than handed
an empty dropdown.

**No permission key.** A bin is how the warehouse is arranged, so it answers to
`inventory.stock` — the right somebody already holds to move what sits in it. A separate
right over the shelving could not be exercised without the first one anyway.

### The property that matters

**The split always sums to the company total.** `binBalances` runs the same arithmetic as
`balances`, grouped by bin; it is deliberately not a second answer to "how many do we
hold". If the two could disagree, one would be wrong and nothing would say which. The
model test asserts it directly, and the sandbox proved it end to end: 4 in A-01, 2 in
A-02, 5 in no bin, company total 11.

**A movement naming no bin is the normal case.** Everything written before bins existed
names none, so on the day a studio turns them on ALL of its stock is `unbinned` — a
first-class total rather than a leftover, and the number a studio watches fall as it puts
things away. A screen that listed only bins would show a warehouse of empty shelves and no
sign of the stock.

### Putting stock away is moving it

**One operation, not two.** Saying "five of these are on A-01" is moving five from no bin
to A-01. A separate put-away would be a second way to change a bin balance, free to
disagree with the first about what a move is.

**Two movements, netting to nought.** Nothing entered or left the company, so the item's
own total must not move: `-qty` where the stock was, `+qty` where it went, both `adjust`,
both carrying `sourceType: "bin-move"` and the other end's id — without that the ledger
would show two unexplained adjustments of opposite sign and nobody could tell they were
one act. The alternative — a `binId` field somebody edits — would mean rewriting history,
and the ledger is append-only precisely so a balance can be re-derived from what happened.

**Refused when the source does not hold it**, which is the opposite of how a NEGATIVE bin
balance is treated, and the two are not in tension. A negative arises when stock genuinely
left the building and the paperwork lagged: the company total is right and only the split
is behind, so refusing would stop a warehouse whose shelves are correct. A move is
somebody standing at a shelf saying they are carrying five units off it — if the records
say three, one of the two is wrong and moving five would bury it.

### Deleting

**A bin still holding something is refused** (`not-empty`): it would strand real units
where nobody can pick them, and the fix — issue or move them first — is one somebody can
do. **A bin that has been emptied deletes and cascades nothing.** Movements that named it
keep naming it and are counted as `unbinned`; the stock is still in the building, and a
total that fell because somebody tidied a list would be a report that punishes
housekeeping. That is the rule a deleted cost code already follows.

### What is refused, and why

- **A code with a space.** A bin code is scanned and typed, and a trailing space is a
  different bin that looks identical.
- **A code over sixteen characters — refused, not truncated.** Validation reads the raw
  value while `cleanBin` caps it, so judging the capped one would store
  "A-01-SHELF-THREE" where somebody typed "A-01-SHELF-THREE-B". That is the silent
  coercion that filed cement under "pcs".
- **A code already used in the same location**, case-insensitively. Two rows for one shelf
  is a split nobody can reconcile.
- **The same code in a DIFFERENT location is fine.** Every warehouse has an A-01, and
  studio-wide uniqueness would make the second site invent codes nobody uses on the floor.
- **A bin with no location, or a location that does not exist.** The whole question this
  answers is "where".
- **A move with both ends the same** (`same-bin`): the balances would be unchanged and the
  ledger would carry a pair of entries recording nothing.

## Not built yet

- **Receipts and issues do not name a bin.** Only a move does, so everything arriving from
  a purchase order or leaving on a delivery note lands in `unbinned` and is put away as a
  second step. Threading `binId` through `record` is the next slice.
- **No bin on a serial.** Serial-tracked items know which units are held, not which shelf.
- **No capacity, no picking order, no zones.** A bin is a code, a description and a place.
- **No stocktake by bin.** The stocktake register counts an item, not a shelf, so a count
  cannot correct a bin split on its own.
- **`negative` is reported and never actioned.** There is no reconciliation workflow —
  somebody reads the list and moves stock until it clears.
