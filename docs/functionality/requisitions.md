# Purchase requisitions — the request that stands before an order

**Where:** `/<slug>/procurement-requisitions`, behind `procurement.requisitions`.
**The record:** `RequisitionSchema` (`src/modules/procurement/schema.ts`).
**The rules:** `src/modules/procurement/model.ts` — pure, no imports.
**The service:** `requisitions.ts`. **The approval:** `approval.ts`.
**The route:** `/api/studios/<slug>/procurement/requisitions`.

## What it is

A **requisition** is somebody asking to buy something: what is needed, why, when, and what
it is expected to cost. It binds the studio to nobody. The purchase order is what binds, and
it is created **from** an approved requisition rather than instead of one.

## The gap it closes

A purchase order appears in this product with nobody having asked for it. `materialOrders`
records a vendor, a project, lines and a cost code, and nothing about who needed the goods or
who authorised the money. So "why did we buy this" had no answer in the system, and the
control that answers it — a second signature above a limit — had nowhere to attach, because
there was no document standing before the commitment.

The only control a studio had over its spending was **who held `inventory.stock.create`**, and
a right cannot express a limit. "The FD sees the big ones" therefore meant withholding
ordering from everybody who handles the small ones: a bottleneck, not a control.

## Who may do what

**One area, `procurement.requisitions`**, with `approve` and `approveHigh` as **extras**
rather than a second area. Asking to buy something and authorising the spend are different
powers over the *same* record, which is exactly what an extra verb is for; a second area
would be a second answer to "who works on requisitions". Catalogue 153 → 159.

**Procurement had no starter grant at all** before this — not even `procurement.suppliers`,
which has been on the nav since the restructure. That is the same defect the contracts
register shipped with, and it is fixed here: the Manager role now holds requisitions (full,
plus `approve`) and suppliers. **`approveHigh` is deliberately not seeded** — the second step
exists to reach past whoever runs the department, and seeding both would make a two-step
chain a one-step chain on every new studio.

## What it does

**Born a draft, always.** The create path takes no status and the screen sends none.

**A draft is the only thing that edits, and the only thing that deletes.** Once somebody has
been asked, the thing they were asked about must not change underneath them. A submitted
request is a question somebody was asked and a decided one is the answer — deleting either
erases a decision rather than a mistake. **Withdrawing is the honest exit** and stays
available even after approval, because the alternative is an order nobody wanted.

**`Approved` and `Rejected` are not moves.** `requisitionProblem` refuses them by name, and
`editRequisition` refuses a status outright. They are reached through the approval walk, and
routing them through a generic edit would skip invariant 7 entirely — which is precisely the
shape that let a rejected change order approve itself for a fortnight.

**It is P2's engine's third document type, not a third engine.** A bill asks "we owe this, may
I pay it" and a bid asks "may we promise this" — both *after* the commitment exists. This asks
before there is one, which is the only point at which "no" costs nothing but a conversation
inside the company. The seeded chain is Procurement at 0 and a second step at **10,000**,
lower than a bill's 50,000 because this is where the money is stopped rather than where it is
paid. Invariant 7 is enforced twice: the raiser never answers, and nobody signs two steps.

**A refusal ends it at any step** and needs no chain completed — one "no" is the answer,
whoever is left. It is stamped like an approval, because "nobody answered" and "this person
said no" are different states.

**No FX read at all.** A bill carries the supplier's currency because they invoiced in it, and
a tender carries the client's; a requisition carries neither — its estimates are what somebody
*inside* this studio expects to spend. The amount is already in base, so `resolveApprovalPlan`
takes `rates: null` rather than a table it would not consult.

**A part-estimated request cannot be signed off.** `requisitionTotals` returns `complete`, and
it travels with every total. A line nobody has priced makes the total provisional; a blank is
not nought, and nought is a real price. The screen shows a dash rather than `0.00`.

### Becoming an order

**Through Inventory's own `createOrder`, not a second write path.** `openProject`'s comment
makes the argument this follows: a second create path is a second place the engagement attach
can be forgotten, which is how a record ends up on no deal at all. So `createOrder` gained a
`requisitionId` — a fourth source beside quotation, direct and tender — and Procurement asks
*it* for the order.

**Ordered is derived, never written back.** Whether a requisition has become an order comes
from an order naming it, so deleting the order frees the request again. The same rule, for the
same reason, as one-project-per-tender.

**Only an approved request, and only once.** Ordering against a draft would route the money
around the signature the record exists to collect; a second order against one requisition is
one approval spent twice.

**The request's cost code follows** where the order carries none, so coding once follows the
money all the way to the bill — the same inheritance a bill takes from an order.

**The estimate becomes the order's price.** A requisition line prices itself as `estUnitCost`
and an order line as `unitPrice`; copied across unrenamed, every converted line was priced 0
until 11/09/2026, and with it the order's total, the project's committed cost and the value of
every receipt against it. A buyer who has been quoted a better price sends lines of their own,
which win.

**The form picks, it does not ask for ids.** The expected supplier comes from the register, the
project and its cost code from that project's own breakdown, and each line's Registered Item
from the catalogue (picking one fills a blank description and unit). Until 11/09/2026 the
supplier and the item were 60-character boxes wanting internal ids, and the project and code
had no field at all — so conversion refused anything typed by name, and a converted order
committed its money against no budget line.

**The order is placed from the request's own row.** Conversion writes a `Draft` — a price may
still be corrected — and a Draft is invisible to Receiving and Expediting and refused at
booking-in. "Place order" moves it to `Ordered` through Inventory's `editOrder`, for somebody
holding `inventory.stock.edit`; until 11/09/2026 no screen could, so every converted order
stopped there.

**A requisition of free text cannot become an order, and the refusal says so.** `cleanLines`
drops any line without a known Registered Item, because an order moves stock and stock is
Registered Items. Returning an empty order would read as success and buy nothing.

## THE ROLLOUT CONSEQUENCE

Approving a requisition needs the studio's own currency, and `createStudio` has never set one —
the same consequence bills and bids carry. The refusal names the fix and the screen says it in
place of the button.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **A services requisition cannot become an order at all.** Only lines naming a Registered Item
  convert, because that is what a purchase order is in this product. Buying a service, or
  anything nobody has registered, has no path to an order today — Inventory's own order
  buttons were removed on purpose. That is the boundary of the existing order model.
- **Nothing is notified.** A requisition waiting for a signature tells nobody; the register has
  to be looked at. No inbox, no delegation, no reminder.
- **No supplier RFQ and no quote comparison.** `vendorId` records who the requester *expects* to
  buy from and binds nothing. Comparing quotes and awarding one is the section's next bullet.
- **No budget check.** A requisition can be raised and approved for a cost code with no
  allowance left; `projects.costs` knows, and this does not ask it.
- **The estimate is never reconciled.** Nothing compares what was estimated against what the
  order was actually placed at, so a studio cannot say whether its requesters estimate well.
- **No currency of its own.** Estimates are typed in the studio's currency. `fxFor` in
  `modules/tendering/bid.ts` is the shape to copy when that changes.
- **Purchase orders still live under Inventory.** The programme spec assigns them to this
  section; moving the collection would strand every existing order under the section it was
  written to, so it stays a deliberate migration rather than a side effect of this slice.
