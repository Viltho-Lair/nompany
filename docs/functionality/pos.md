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
| Returns | `pos-returns` | `pos.returns.view` / `.create`; `.approve` signs |

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
customer list** to pick from; a business customer who needs a full tax invoice gets one through
Documents, as today.

**A customer who gives a phone number is recognised next time** (the owner, 18/09/2026). The
number is optional, on the payment side of the till. Every spelling of one number is reduced to
one international form first (`shared/phone`: "055 123 4567", "0551234567" and "00966 55 123
4567" are one customer in a Saudi studio; Arabic-Indic digits count), and the till says who it is
("Huda — 2 earlier purchases") or that a new customer will be registered. **The sale registers
the customer**, not the lookup, so a number typed and abandoned leaves nothing: an ordinary CRM
client with a **placeholder name** ("Customer ···4567", in the studio's language, `autoNamed`)
until somebody types a real one in CRM, the number as its only contact, `source: "pos"`, and the
receipt names it (`clientId`). **The till's own right registers one** — a cashier holds
`crmSales.pos.create`, not `crmSales.clients.create`, and what the till can make is only a
nameless client with one number. **Found by a keyed hash** (`phoneKey`,
`platform/db/lookupKeys`: HMAC of the studio and the number under a purpose subkey of
`NOMPANY_DATA_KEY`), because every client field is sealed; every key in the keyring is tried, so
a rotation does not turn regulars into new customers. A studio without CRM's client register
does not offer the field.

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
  the lines (item, count, price, tax category, units taken and **which batch each came
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

## Returns (18/09/2026)

**Where:** Point of Sale → Returns (`pos-returns`), `modules/sales/posReturns.ts` (service),
`modules/sales/posReturnModel.ts` (the arithmetic, pure, run by the screen and the server),
`components/studio2/StudioPosReturns.js`, `/api/studios/<slug>/pos/returns`. Numbered `RTN`.
**Filed under `pos-returns` itself** (`posReturns`), unlike the till's records.

- **Find the sale by its receipt**: the box takes a scanned barcode (the receipt prints its
  number as one) or a typed number, in any case. Each line shows what was sold, what has already
  come back, and what is left.
- **Ask**: how many of each line, **why** (required — a return with no reason is the one a fraud
  report cannot read), how the money goes back — **cash, card or transfer, the cashier's choice**
  (the sale's own method is the default) — and which till's drawer pays a cash refund.
  **Nothing moves when it is asked.** A waiting return **reserves** its units, so two cashiers
  cannot each take back the same last one; a turned-down return frees them.
- **Every return waits for a manager** (the owner): `pos.returns.approve`. **Whoever asked does
  not sign** (invariant 7); **the Admin is the exception**, as for bills and stock adjustments —
  a one-person shop could otherwise take nothing back. Signing is **once**: two managers signing
  at the same moment get one refund and one "already decided". What is left is checked again at
  the signature.
- **The refund is what was paid**: each line's stored net (its discount and its share of the
  basket's already off), pro rata by units, and **the last unit takes the remainder** — a line
  returned in pieces refunds exactly what it was charged. The tax is the SALE's (its rate, method
  and whether its prices included tax), so returning everything refunds the sale's total and its
  tax to the minor unit.
- **Signed, the units go back into stock**, into the batches the sale took them from, the last
  taken first (`restockPlan`), each movement naming the return (`sourceType: "pos-return"`).
- **A cash refund comes out of a drawer**: signing needs a shift open on the return's till
  (`no-shift` otherwise), and the shift's report takes the cash out of what it expects and lists
  refunds by method. A card or transfer refund is recorded against the open shift when there is
  one.
- **Who reaches it**: roles that could open the till see Returns and may ask for one; roles that
  managed the till (`crmSales.pos.edit`) may sign — both by catch-up, with nothing run per studio.

**Against a Documents invoice** (18/09/2026, the owner's second answer). The same box takes an
invoice's reference — a printed invoice carries it as a barcode too — and only an issued invoice
(not a draft, not a cancelled one). **An invoice line may name a registered item**: the invoice
form offers the studio's items (name and selling price, never cost) and picking one fills what
is blank. On a return, a line naming an item goes back on the shelf; a free-text line — a service,
a fee — is refunded only and says so. The refund is priced as the invoice was: net lines, the
invoice's own rate and method, tax on top. **It can be a credit on the client's account** (no
money, no till); **money goes back only up to what the client paid** (`over-paid` otherwise).
**Signing it raises a DRAFT credit note** in Finance for the refund
(`finance/creditNoteService.draftCreditNote`, the same function Finance's own door uses), after
checking the invoice still has that much to credit — **Finance issues it** (Finance → Cash →
Credit notes), because issuing posts to the ledger and a Point of Sale manager does not hold the
books. The return records the note (`creditNoteId`).

`tests/pos-return-model.mjs` covers the arithmetic and the restocking.

## What the till does

**Rights.** `view` opens the till; `create` opens a shift and sells; `edit` manages tills and
settings; the extras **`discount`** (change a price, or give a discount, at the till) and **`closeShift`** (count and
close a drawer) are separate powers. Each is asked for in the service function that does the act.
The Sales Manager shape holds all of it; the shift-leader shape sells and closes drawers but does
not change prices.

**Selling.**
- A scan goes through `findByBarcode` (`barcodes.md`): an item's code is one of its unit (packs were
  removed 17/09/2026 — the item's unit says how it is sold). Anything that is not a code is searched by name and SKU; a single match is
  added.
- **The server prices the basket from the items**, never from the screen. A typed price is used
  only when the seller holds `discount`; an item with no price is refused unless they do.
- **Discounts** (the owner, 18/09/2026): a % or an amount on any line, and one more on the whole
  basket, behind `discount`. `priceBasket` (`posModel`) is the one place a discount becomes money,
  run by the screen and the server alike: the line's own discount first, then the basket's, which
  is **spread back onto the lines** in proportion to what each came to, the last line taking the
  rounding remainder so the shares add up exactly. **Every receipt line stores its list price,
  gross, own discount, basket share and net** — the tax is taken on the net per rate, and a return
  refunds a line's net, so returning one of two discounted items can neither pay the whole
  discount back nor keep it. **A studio can cap the discount** (Point of Sale settings, "largest
  discount a cashier may give"), measured per line against the item's own price with a typed
  price, the line's discount and its basket share together, so a lower typed price cannot walk
  round it; whoever holds `pos.settings.edit` is not held to it. The receipt prints each discount
  and what the customer saved; the shift report prints what was given away.
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

**The receipt** prints on an 80 mm printer from the browser: the studio's name, the official
values its country prints on a receipt (`official-values.md` — a Saudi receipt carries the VAT
number once the studio has a VAT rate), its legal rows less any repeating one of those, number, time, till, the lines, subtotal, tax by rate, total,
payments, change and the footer. It prints what the server stored, so a reprint reads as the
first. The print style is mounted only while a receipt is on screen, so no other page's printing
is affected.

**Closing a shift** takes the counted cash and stores the report: sales and takings, tax by rate,
takings by method, change given, the opening float, **expected cash (float + cash taken − change)**,
the counted cash, the difference, and the discounts given. **A short or over drawer is reported, never corrected.**

**The screen** remembers which till this device uses, keeps the scan box focused, recomputes the
basket with the server's own function, and refreshes when anybody else sells on the studio's tills.

`tests/pos-model.mjs` covers the arithmetic; `tests/barcode-model.mjs` the scan and the batch
picking.

## Not built yet

- **An invoice does not take stock out**: its item lines are what a return puts back, but raising
  or issuing the invoice moves nothing — a Documents client's goods leave through a sales order
  or a delivery, which the invoice does not name. So returning against an invoice ADDS stock
  whatever path it left by.
- **A cash or card refund against an invoice posts nothing** to the books beyond the credit note;
  the money out of the drawer is in the shift report only (the till has no ledger entry yet).
- **Voiding** a sale, and exchanges (a return and a sale as one act).
- **A printed return slip**, and a notice to the managers who can sign; the Returns screen is live
  and shows what is waiting.
- **A credit note for a returned sale**: a return is not a tax document yet — in Saudi Arabia a
  simplified credit note referencing the receipt is required (`docs/progress.md`).
- **Returns without a receipt**, return windows, restocking fees, and a condition per line
  (everything signed goes back on the shelf, on the owner's decision; damaged goods are written
  off in Inventory).
- **Two returns asked at the same moment for the same last unit** can both be recorded as
  waiting; the signature re-checks, so only one can be signed.
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
- **Customer consent**: a number taken at the till is used only to recognise the customer. No
  consent is recorded, so nothing may message them — marketing needs per-channel, opt-in consent
  in Saudi Arabia and the UAE (`docs/progress.md`, "Point of Sale pricing").
- **Two first sales to one new number at the same moment make two clients**: registration is a
  lookup and then a create, not one atomic step. Merging clients is not built either.
- **No customer's purchase history on their CRM page yet** — the receipts name the client, and
  nothing reads that from CRM's side.
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
