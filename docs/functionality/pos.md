# Point of sale — a general retail till (16/09/2026)

**Where:** `/<slug>/crm-sales-pos`, a full-screen page under CRM & Sales, behind
`crmSales.pos`. `modules/sales/pos.ts` (service), `modules/sales/posModel.ts` (pure arithmetic),
`components/studio2/StudioPos.js` (screen), routes under `/api/studios/<slug>/pos`.

## What it is

A till for a shop's **walk-in customers**: scan, basket, pay, print. **General retail, designed
around no single trade** (the owner, 16/09/2026) — what a pharmacy or a supermarket needs beyond
it is an add-on. **Online only**: a till with no connection stops selling. There is **no
customer list**; a business customer who needs a full tax invoice gets one through Documents, as
today.

## What it stores

Three collections, all filed under `crm-sales-pos`:

- **`posTerminals`** — a till: a name and whether it is active. **Never deleted**: its receipts
  name it. A till is retired instead, and not while it has a shift open.
- **`posShifts`** — a drawer's session on a till: number (series `SHF`), the opening float, who
  opened and closed it and when, the counted cash, and **the end-of-day report as it stood at
  close**, stored once so it cannot move under the person who signed it off. One open shift per
  till.
- **`posReceipts`** — a sale: number (series `RCT`), till, shift, cashier, time, and **everything
  that decided the money, frozen**: currency, VAT rate, tax method, whether prices included tax,
  the lines (item, pack, count, price, tax category, units taken and **which batch each came
  from**), the payments, what was paid, the change, and the totals with their per-rate
  breakdown. A receipt is never edited or deleted.

The till's settings live on the `crm-sales-pos` section: **whether shelf prices include tax**
(default from the studio's country — `shared/taxProfile`) and **a footer** printed on every
receipt.

Every sale also writes **stock movements** in Inventory (`kind: "out"`, `sourceType: "pos"`,
`sourceId` the receipt), one per batch taken plus one for units from no batch, each carrying the
item's cost that day.

## What it does

**Rights.** `view` opens the till; `create` opens a shift and sells; `edit` manages tills and
settings; the extras **`discount`** (change a price at the till) and **`closeShift`** (count and
close a drawer) are separate powers. Each is asked for in the service function that does the act.
The Sales Manager shape holds all of it; the shift-leader shape sells and closes drawers but does
not change prices.

**Selling.**
- A scan goes through `findByBarcode` (`barcodes.md`): the item's own code is one unit, a pack's
  code is the pack. Anything that is not a code is searched by name and SKU; a single match is
  added.
- **The server prices the basket from the items**, never from the screen. A typed price is used
  only when the seller holds `discount`; an item with no price is refused unless they do.
- **Stock is checked and taken by expiry** (`pickBatches`, `batches.md`): soonest to expire
  first, never an expired lot, then unbatched stock. A basket the stock cannot cover is refused
  by name, saying how much is available and how much more is expired.
- **Tax** follows the studio's rate, each item's tax category and the country's method.
  **When shelf prices include tax, the tax is taken out of the price, not added to it** — 11.50 at
  15% is 10.00 plus 1.50 — so the customer pays exactly the prices on the shelf. When they do not
  (a US sales tax), the tax is added through the documents' own function.
- **Payment**: cash, card or transfer, split as needed. **Only cash gives change**: a card or
  transfer for more than is due is refused. A sale the payments do not cover is refused.
- The receipt is written first and the movements after, each naming it — so a sale whose
  movements failed is a receipt with none, findable, rather than stock gone with no receipt.

**The receipt** prints on an 80 mm printer from the browser: the studio's name and its legal rows
(its VAT number among them), number, time, till, the lines, subtotal, tax by rate, total,
payments, change and the footer. It prints what the server stored, so a reprint reads as the
first. The print style is mounted only while a receipt is on screen, so no other page's printing
is affected.

**Closing a shift** takes the counted cash and stores the report: sales and takings, tax by rate,
takings by method, change given, the opening float, **expected cash (float + cash taken − change)**,
the counted cash and the difference. **A short or over drawer is reported, never corrected.**

**The screen** remembers which till this device uses, keeps the scan box focused, recomputes the
basket with the server's own function, and refreshes when anybody else sells on the studio's tills.

`tests/pos-model.mjs` covers the arithmetic; `tests/barcode-model.mjs` the scan and the batch
picking.

## Not built yet

- **Returns and refunds**, and **voiding** a sale. A receipt cannot be reversed from the till; a
  stock correction goes through Inventory.
- **The ledger**: a shift posts nothing to the books yet — no revenue, VAT, cash or cost of sales
  entry. (Planned as one entry per shift.)
- **Sending the receipt by WhatsApp** as a PDF from the till's share menu; the server does not
  render a PDF. **The WhatsApp Business API is on hold.**
- **Any country's fiscal layer**: no QR code, signature, counter chain or reporting to a tax
  authority (`docs/progress.md`, "Country document rules"). **In Saudi Arabia, Jordan and Egypt a
  receipt from this till is not a compliant tax receipt until that layer is built.** Numbering is
  one studio-wide series, not one per device as ZATCA requires.
- **Card terminals**: a card payment is recorded with a typed reference; nothing talks to a
  payment device. **No cash drawer kick**, no customer display.
- **Offline selling.**
- **Weighed items, promotions, loyalty**, and trade add-ons (drug tracking, prescriptions, age
  checks).
- **Stock is not locked between the check and the write**: two tills selling the last unit at
  once can both succeed, and the ledger then reads below nought.
- **A shift report lists no cashier names and no per-item sales.**
- **The item's sell price is read as the shelf price** when prices include tax; a studio that
  also quotes those items net to businesses uses one field for both.
