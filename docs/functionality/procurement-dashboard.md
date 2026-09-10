# The Procurement dashboard — what is waiting, what is late, what does not add up

**Where:** `/<slug>/procurement`, the section root, behind `procurement.dashboard.view`.
**The service:** `src/modules/procurement/dashboard.ts`.
**The route:** `/api/studios/<slug>/procurement/dashboard` (GET only).
**The screen:** `StudioProcurement.js`.

## It has no arithmetic of its own

Every figure comes from the pure model that already owns it: `expediteOrders` for what is
late, `threeWayMatch` for what does not add up, `supplierQualification` for who may be bought
from, `subcontractPosition` for what is held back, `requisitionTotals` for what is being asked
for.

A dashboard that recomputed any of them would be a **second answer free to disagree with the
screen it summarises** — which is exactly what `salesAnalytics` did before the pipeline
registry took its copies away: three hand-written lists that agreed on the day they were
written and stopped counting a stage the moment one was added.

## The dashboard grants nothing

This is the design decision the whole slice turns on.

**Every block is gated by the right over its own records, and a block the reader may not see is
never read.** So it costs no round trip, and no figure derived from records somebody cannot
open can reach them by this door. The same shape as customer 360.

A reader holding the dashboard and one register gets **that register's tiles and nothing
else** — not an empty grid of six, and not somebody else's numbers.

**Holding the dashboard right and no register at all is a real state**, not an error: the page
opens and says nothing here is theirs to see, which sends them somewhere else. A refusal would
say the screen was broken.

### The invoice leg, twice gated

`over-billed` needs `finance.payables.view` on top of `procurement.receiving.view`, because
saying an order is over-billed *is* saying the invoice exceeds the delivery. Without it **no
bill is fetched at all** and the tile reads *withheld* rather than nought — nought would assert
a clean sheet the reader has not been shown and, with nothing fetched, the screen does not have.

### The on-time ranking needs both rights

It is a supplier's **name** against **delivery performance**, so it is drawn only for somebody
holding `procurement.suppliers.view` *and* `procurement.expediting.view`. Holding one must not
disclose the other half.

## What the tiles say

The free floor, always shown, one group per register the reader holds:

| Register | Tiles |
|---|---|
| Requisitions | Awaiting approval (with value), approved to order |
| Supplier quotes | Quotes requested |
| Expediting | Orders late, late and never chased |
| Receiving | Awaiting delivery, billed above delivery |
| Suppliers | Blocked, paperwork lapsed, expiring soon |
| Subcontracts | Live subcontracts, retention held |

**"At least" on the requisition value.** `requisitionTotals` carries `complete` for the reason
`boqTotals` does — the total of a part-estimated request is a number and is *not* what the
request is worth. A sum across requests **inherits that caveat rather than dropping it**: where
any line is unestimated the tile says the figure is a floor, because a headline that quietly
understates what is being asked for is worse than one that admits it does not know.

**Only suppliers with something to judge appear in the ranking.** A vendor whose orders have
not landed has a null percentage, and sorting nulls into a league table would rank them as
perfect or as worst depending on which way the comparator fell — neither of which anybody said.

## Paid and free

**The exception tiles are the free floor and are never gated.** A studio that cannot see its
own over-billed orders because it did not buy analytics is being sold its own problems back.

**Four paid widgets, four registry keys** — each registered because it is drawn, never ahead
of one: a key in the tier editor that a studio can switch on to be shown nothing is the same
defect as a permission nothing exercises, one layer up.

- `procurement.on-time-by-supplier` — the ranking.
- `procurement.supplier-health` (10/09/2026) — suppliers by standing, as a donut, because
  `supplierQualification` gives each supplier exactly one state; qualified is what is left over.
- `procurement.delivery-status` (10/09/2026) — late, due soon, never chased and undated, as
  **bars rather than a donut**: an order can be late and unchased at once, and slices would claim
  to add up to a whole they do not make.
- `procurement.receiving-exceptions` (10/09/2026) — the three-way match's exceptions as bars,
  with **over-billed left off entirely** when no bill was read, the same null-not-nought rule
  the tile follows.

Each draws only the block it belongs to, so a reader without a register's right sees no widget
for it — the block was never read.

## Who may do what

**`procurement.dashboard.view`**, minted by joining `DASHBOARD_MODULES` — which is the list of
modules that *have* a dashboard, not a list of group labels. A `tendering.dashboard` was
refused there once for being the second. Catalogue 173 → 174.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Spend by supplier, requisitions by status and retention by subcontract** are neither
  registered nor built. The service returns aggregate counts, not the per-supplier and
  per-status series they need; the three widgets added on 10/09/2026 draw only what the
  blocks already carry.
- **No date range.** Every figure is "now"; there is no last-quarter view and no trend, so the
  dashboard cannot say whether any of it is getting better.
- **Nothing is clickable.** A tile reports a count and does not take you to the rows behind it,
  which is the first thing anybody will try.
- **No drill-down or export**, though `components/dashboard` carries `drill.ts` and
  `exportTable.ts` that other dashboards use.
- **Orders are fetched whole** for the expediting and receiving blocks and filtered in memory.
  On a studio with years of orders that is the one figure here that will not scale.
