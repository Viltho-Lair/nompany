# Point of Sale — a department, and a general retail till (16/09/2026, a department 17/09/2026)

**Where:** its own department, `/<slug>/pos` — the seventeenth, the owner's decision of
17/09/2026 — with a dashboard and four screens:

| Screen | Key | Right |
|---|---|---|
| Dashboard | `pos` | `pos.dashboard.view` |
| Till (full-screen) | `pos-till` | `crmSales.pos` (kept its name) |
| Sales | `pos-sales` | `pos.sales.view`; `pos.sales.export` downloads |
| Shift history | `pos-shifts` | `pos.shifts.view` |
| Settings | `pos-settings` | `pos.settings.view` / `.edit` |

`modules/sales/pos.ts` (service), `modules/sales/posModel.ts` (the till's arithmetic),
`modules/sales/posReports.ts` (periods, filters, totals, what sold, the CSV — pure),
`components/studio2/StudioPos.js` (the till), `PosDashboard.jsx`, `StudioPosSales.js`,
`StudioPosShifts.js`, `StudioPosSettings.js`, `posParts.js` (the printed slip, the shift report
and the period picker, shared), routes under `/api/studios/<slug>/pos`.

## Nothing moved, and nobody lost access

- **The records stay where they were filed**, under `crm-sales-pos`, which is a filed-only row
  now (`FILED_ONLY_SECTION_KEYS`): still seeded, left out of the sidebar and the Sections panel.
  **Do not delete it** — every receipt would vanish. The till's settings stay on that row too.
- **The old address `/<slug>/crm-sales-pos` opens the till** (a retired address,
  `shared/studioRoute.ts`).
- **Existing roles catch up by themselves** (`modules/people/catchUps.ts`): a role that could open
  the till gains the dashboard, Sales and Shift history; one that could manage the till
  (`crmSales.pos.edit`) gains Settings, view and edit. Catch-ups can now name the one source verb
  that decides (`fromVerb`), which is how "managers only" is said.
- **On for every trade**, as the till was (`UNIVERSAL_SECTION_KEYS`); the owner switches it off at
  creation. Starter departments that run a counter — Retail Operations, Front Office, Food &
  Beverage — list `pos`, so their pre-built roles keep the till.
- The till's number series (RCT, SHF) are listed under Point of Sale on the Numbering screen.

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

## The department's screens (17/09/2026)

**Who sold it.** A receipt stores the CollaboratorID of the person signed in at the till
(`cashierCollaboratorId`, from the session — the screen cannot set it); every list shows the name
that person carries today.

**The period** is Day (the default: today), Week, Month, Quarter, Half-year or Year, stepped back
with Previous. It is worked out in the READER's own time — "today" is the shop's today — and the
server is handed two instants, `[from, to)`. Weeks start on Sunday.

**Dashboard.** Takings, number of sales, the average sale, units sold, tax and the drawers open
now — never gated. **Best sellers** (the ten items with the most units, `pos.top-products`) and
**takings by day** (`pos.takings-by-day`, any period longer than a day) are plan-gated widgets.
**Everything sold** lists every item sold in the period, most units first, with value and how
many receipts it was on — not gated.
**Stock to reorder** — for whoever holds the stock alert (`inventory.stock.alerts`), every item
at or near its reorder level (`docs/functionality/stock-alerts.md`). A sale that takes an item to
its level alerts them.

**Sales.** Every sale in the period, newest first: receipt, date and time, till, cashier, units,
how it was paid, total. Filters: search (receipt number or item), till, cashier, payment method;
totals follow the filter. Opening a sale shows the slip exactly as stored, with the cashier and
the shift, and reprints it. Opened from a shift ("Sales" on the shift history), the list is that
shift's, whatever the period. Capped at the newest 2,000 on screen, said so, with the download
uncapped.

**Downloads** (`pos.sales.export`), CSV with the byte-order mark Excel needs for Arabic, filtered
exactly as the list is, or only the receipts ticked:
- **Sales** — one row per receipt: number, local date and time, till, cashier, units, subtotal,
  tax, total, cash, card, transfer, change.
- **Items sold (totals)** — one row per item: units, value, receipts; most units first.
- **Items sold (every line)** — when, receipt, cashier, till, item, units, price, value.
Times are written in the reader's clock (the screen sends its offset). A cell that looks like a
formula is prefixed with an apostrophe so a typed item name cannot run in the spreadsheet.

**Shift history.** Every drawer opened in the period, newest first: number, till, opened (when,
by whom), closed (when, by whom), sales, takings, expected cash and the difference, with over or
short. A closed shift shows the report stored at close; an open one shows its figures so far and
says so. Each opens its report (printable) and its sales.

**Settings.** The tills — add, retire, use again (never delete) — whether shelf prices include
tax, and the receipt footer. Moved here from a dialog on the till; the till's Settings button
links here.

## What the till does

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
- **A shift report lists no per-item sales** on the printed slip (the Sales screen, filtered to
  the shift, does). A shift's receipts can have several cashiers; the report names who opened and
  closed it.
- **The Sales list and the dashboard read every receipt the studio has** and filter in memory —
  fine for a shop's volume today, and the first thing to move into SQL when a studio has tens of
  thousands.
- **POS sales are not in Reports & BI's datasets**; the department's own downloads cover them.
- **No comparison with the previous period** on the dashboard.
- **The item's sell price is read as the shelf price** when prices include tax; a studio that
  also quotes those items net to businesses uses one field for both.
