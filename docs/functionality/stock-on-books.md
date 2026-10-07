# Stock on the books

**Where:** Finance → Ledger → Trial balance (the **Stock on the books** panel), and automatically
when a month is closed (Finance → Ledger → Periods). **Code:** `postStockValuation` and
`stockOnBooks` in `src/modules/finance/ledger.ts`; the source kind `stock-valuation`; the hook in
`closePeriod` (`periodService.ts`); the as-of valuation in `modules/inventory/stockValue.ts`.
Built 07/10/2026.

## The gap it closes

A supplier's bill posts the goods it charges for to **Cost of Sales** (5000), and nothing ever
debited the **Inventory** account (1200). So the balance sheet never showed the stock a studio
holds, a month with a big purchase showed a loss, and the months its goods were sold showed
inflated margins.

## How it works — the periodic method

Purchases keep going to Cost of Sales. At the end of a day — normally a month end — the stock still
on the shelves is valued and the Inventory account is **moved to match it**, against Cost of Sales:

- stock worth more than the account says → **Dr Inventory, Cr Cost of Sales**;
- worth less → the reverse.

So a period's Cost of Sales becomes opening stock + purchases − closing stock, which is what was
actually sold (till sales included), and the balance sheet shows what is held.

- **The value** is Inventory's own valuation — the studio's method (FIFO or weighted average) and
  landed costs where recorded — **as it stood at the end of that day**: only movements on or before
  it, by the studio's own time zone.
- **The panel** shows the stock's value, what the Inventory account says, and the difference, for
  any day picked (today by default); **Put stock on the books** posts it (`finance.ledger.post`).
- **Closing a month does it for you**, valued at the month's last day (or today, closing the
  current month), *before* the lock — a closed month refuses every posting. It never stops a close:
  a studio with no Inventory, a figure already in step or a chart missing an account closes exactly
  as before.
- **One live figure per day.** Run again for the same day, the earlier entry is reversed — dated
  that day — and the difference posted afresh. Nothing to move is refused as `in-step` rather than
  posting an entry of nought.
- **The first time is large, and correct**: everything on the shelf was expensed when it was
  bought, and all of it moves back off Cost of Sales. The panel warns before it is posted.

## Why not an entry per receipt

Posting each goods receipt to Inventory as well would count every purchase twice, because the bill
already expenses it — unless every bill for stock were re-pointed at a clearing account (goods
received not invoiced), with price-variance accounting between the receipt and the bill. That is
the perpetual method and a larger change; the periodic method gets the statements right at each
month end with neither.

## Not built yet

- **Perpetual costing.** Between month ends the Inventory account is as of the last true-up, and
  no sale or issue carries its own cost-of-sales entry; a shift report shows no margin.
- **A bill categorised to another expense account** (not Cost of Sales) for goods that went into
  stock still credits Cost of Sales at the true-up, so that account and the other are both off by
  it. Stock purchases should be billed uncategorised or as Cost of Sales.
- **Re-running an earlier day after a later one** changes the earlier balance only; the later
  day's entry is not recomputed until it is run again.
- **No per-location or per-category inventory accounts** — one Inventory account for all stock.
