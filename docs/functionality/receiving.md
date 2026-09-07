# Receiving — ordered, received, billed

**Where:** `/<slug>/procurement-receiving`, behind `procurement.receiving.view`.
**The record:** `GoodsReceiptSchema` (`src/modules/procurement/receivingSchema.ts`).
**The arithmetic:** `src/modules/procurement/receivingModel.ts`.
**The read:** `receiving.ts`. **The write:** `receiveOrder` in
`src/modules/inventory/inventory.ts`.
**The route:** `/api/studios/<slug>/procurement/receiving` (GET only).

## The gap

Two of the three legs already existed. A purchase order has carried `lines[].qty` since it
was built; a bill has carried `orderId` since Payables shipped. **The middle one did not.**

Receiving incremented `line.received` and wrote a stock movement, so a studio knew a *running
total* and nothing about the events that produced it. "What arrived on Tuesday, who signed for
it, and was any of it damaged" had no answer. And nothing compared the three: a supplier could
invoice for twelve when ten turned up and the product would not notice.

**A mistake was also permanent.** `receiveOrder` only ever added, so a mistyped ten could not
be walked back — the warehouse and the record disagreed for ever, and the only fix was a stock
adjustment that said nothing about which delivery had been wrong.

## What a goods received note holds

Its own reference (GRN-0001, forward only), the order, the supplier's own delivery-note
number, **the day the goods arrived**, who booked them in, the lines, and free notes.

**The arrival date is not the typing date.** A note entered on Monday for a Friday delivery is
ordinary, and dating it Monday would misreport every supplier's punctuality — which
`supplierOnTime` then reads. The route forwards it explicitly; it used to pass `lines` alone
and drop the rest silently, because every one of those fields is optional.

**Rejected goods are recorded and never reach stock.** Something turned away at the gate was
never accepted, so it is excluded from the received value and reported separately. An invoice
covering it is over-billing, and a receipt that booked it in would report the paperwork as
fine.

## Where it lives

**Under `inventory-sheets`, beside the orders it answers** — not under the Procurement section
whose screen reads it. A sub-section falls back to its root, so rows written before a move stay
under the section they were written to, where nothing reads them: not deleted, not corrupted,
invisible. That is the tender register's mistake, and this slice does not repeat it. Receiving
is Inventory's write, so the receipt is written where Inventory already writes.

## The received leg is summed from the receipts

**Never read off `line.received`.** The order carries a running total and the receipts are the
events that produced it; reading the total in the match would make it blind to exactly the drift
it exists to catch — two records of one quantity parting company. A test asserts the two agree,
which is the only thing that makes such a check mean anything.

## Corrections

A correction is another receipt with negative quantities, and **it must name the receipt it
corrects**. A bare negative line is indistinguishable from a typo, and the register has to stay
readable as a history of what turned up.

- It moves stock back **out**. The movement ledger is what every on-hand figure is summed from,
  so a receipt walked back on the order and left in the ledger would be a quantity that exists
  in one place only.
- It may not take a line below nought — un-receiving more than was received corrects nothing.
- **It can take an order back off `Received`**, which is the point: the status is derived from
  the numbers, so walking the numbers back walks the status back with them. Otherwise the order
  would vanish from the expediting board while goods were still owed.

## Over-receipt is refused at the write and reported by the match

`receiveOrder` still refuses eleven of ten outright, unchanged — its own comment says a
mismatch with the delivery note is something a human needs to look at, and that is right.

The match still **reports** the state, because the store can reach it anyway: a correction on
one line and a fresh receipt on another get there without any single write exceeding what was
outstanding. A report that could not describe a state the store can hold would be the blind
spot, not the guard.

## The match

Nothing about it is stored. The three legs are read and compared on every request, because a
stored verdict goes stale the moment a credit note lands.

| Flag | Means |
|---|---|
| `over-billed` | Charged for more than turned up — **the one the control exists for** |
| `billed-not-received` | Invoiced with nothing received at all |
| `over-received` | More arrived than was ordered |
| `received-not-billed` | Delivered, invoice not yet in |
| `part-delivered` | Some of it is still coming |
| `no-bill` | Not a fault. Goods arrive before the invoice does, every time |

**Billed is null, not nought, when no bill names the order.** "Nothing has been invoiced" and
"invoiced for nought" are different facts and only the second is a mistake.

**Cancelled and draft bills are not billed money.** **Matched** means all three legs agree to
the cent *and* the order is fully received *and* nothing was rejected — an order with no bill is
**unfinished**, not agreed, and reads differently on screen.

**A bill's value is summed from its lines, never from `total`** — which is not a stored field
at all (`InvoiceLineSchema` says so: derived on the way out). Reading it gives `undefined`,
which sums as nought, which makes every order look under-billed and the over-billed flag
unreachable. Gate A caught exactly that; the unit test, handed a `total` directly, could not.

Summing the lines is also the **right** comparison rather than merely the available one: it is
net of VAT, and the received leg is quantity times the order's unit price, which is also net.
Comparing a tax-inclusive total against a tax-exclusive delivery would flag every order in a
VAT-charging studio as over-billed by exactly the tax.

**A bill for less than arrived is not flagged.** The rest of the invoice is still coming; only
the excess direction is a fault.

## Who may do what

**`procurement.receiving`, view alone** — the same shape as `crmSales.pipeline`. Catalogue
172 → 173. Booking goods in *moves stock*, so it answers to `inventory.stock.edit` at the one
door that does; a `create` verb here would be a right nothing exercises, which is invariant 16.

**The invoice leg is gated again inside, on `finance.payables.view`.** A storekeeper booking in
a pallet has no business seeing what the supplier charged for it. Where the reader may not see
it the bills are **never read**, so the block costs no round trip — the same shape as customer
360 — and `billedValue`, the variance and **the flags derived from them** are all withheld.
Telling somebody an order is over-billed *is* telling them the invoice exceeds the delivery.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **No tolerance.** A real three-way match allows a small price or quantity variance before it
  complains; this is exact and reports the delta, leaving the judgement to the studio. A
  tolerance needs a setting, and no studio has been asked for one.
- **The match is at order level, not line level.** `billedValue` is the sum of bill totals, so
  a bill whose lines do not correspond to the order's is compared only in the aggregate. Bills
  carry lines; nothing joins them to order lines yet.
- **Nothing blocks paying an over-billed order.** The flag is a report; approval does not read
  it, so a bill can still be approved and paid straight through the mismatch.
- **No photographs and no attachments.** A rejected pallet cannot be evidenced beyond a note,
  though the private-media route the tender pack uses would serve.
- **A correction has no reason field.** It names the receipt it corrects and not why, which is
  the same objection this codebase makes about back-charges without descriptions.
- **No put-away location.** A receipt says what arrived, not where it went.
