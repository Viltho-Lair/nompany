# Money — every amount rounds to its currency's own decimals (16/09/2026)

**Where:** everywhere an amount is calculated, stored, posted or shown.
`src/shared/money.ts` holds the rule; `src/shared/documentTotals.ts` holds the one total every
priced document uses.

## What it is

A currency has a fixed number of decimals (ISO 4217): the Saudi riyal, the dirham and the
Egyptian pound have **two**; the **Jordanian dinar, Kuwaiti dinar, Bahraini dinar and Omani
rial have three**; the yen and the won have none.

**The product rounded everything to two.** Some sixty private copies of
`Math.round(n * 100) / 100` sat across the modules, so a Jordanian studio's quotations,
invoices, bills, payments and ledger dropped the third decimal of every dinar — 1.235 JOD
was stored as 1.24, and a price in fils could not be written down at all. The screens then
formatted every figure to two places as well, which would have hidden the third decimal even
where the server kept it.

## What it stores

Nothing new. Amounts are stored exactly as before, just rounded correctly for the document's
currency. **Nothing already stored needed rewriting**: an amount written at two places is still
exact at three, and the ledger's balance check compares whole minor units of the studio's
currency, so every entry already posted still balances.

## What it does

**Which currency decides.** A document's own currency, frozen on it when it was raised
(quotations, sales orders, invoices, bills, tenders); for a record raised before it carried
one, and for the ledger — which is kept in one currency — the studio's (`studio.currency`). A
studio that has set no currency rounds to two, as it always did.

**Three kinds of number, three rules** (`shared/money`):

- **An amount being created** — a price times a quantity, a tax, a withholding, a retention,
  a share of a landed-cost charge, a conversion, a depreciation charge — is rounded to the
  currency's decimals: `roundMoney(n, currency)`.
- **A sum of amounts that were each already rounded**, and **a unit price or cost as typed**,
  are cleaned to four places: `roundSum(n)`. Adding rounded amounts cannot create a new
  decimal, so only floating-point noise is removed, and four places is finer than every
  currency a studio can hold. A unit price may legitimately be finer than its currency (a
  screw at 0.0125); what is OWED is rounded where it is totalled.
- **Percentages, ratios, indices, quantities and hours** keep the places they always had.
  They are not money.

**One total for every priced document.** Quotations and sales orders (`computeTotals`) and
invoices and bills (`invoiceTotals`) now both call `documentTotals`: the subtotal is rounded
once in the document's currency, the VAT is taken on it and rounded once, and the total is
their sum — so the three always add up, and a quotation and the invoice raised from it cannot
disagree about what the same lines come to. `invoiceTotals` and `cash` now **require** a
currency argument, so no caller can forget one and silently round a dinar to two places.

**The ledger counts in minor units of the studio's currency** — fils for a Jordanian studio,
halalas for a Saudi one — rather than in cents fixed at a hundred. The trial balance, the
balance check and every posting (invoice, bill, payment, credit note, payroll) use it.

**The tax return and the VAT split** (`splitGross`) round in the document's currency; the
return's totals in the studio's.

**Printing** (`/print/<kind>/<id>`) formats money to the record's currency: a dinar invoice
prints 1.200 JOD.

**Screens** format through `moneyText`: with the currency known, exactly its decimals; without
one, two places, or three when there is a third — never a fils cut off, never a digit
invented. The bill of quantities grid is told its tender's currency by the route and rounds
its own recomputation exactly as the server does.

**Every studio screen shows the studio's currency (2026-09-27).** An audit of every money figure
found almost none in it: `money(n)` was called without a currency on ~370 lines, so a figure
showed two decimals and no code. The studio layout now provides the studio's currency as React
context (`components/studio2/studioCurrency.js`), and a screen formats through `useMoney()`:
`money(n, currency?)` uses the RECORD's currency when given (a bill in euros shows in euros) and
the studio's otherwise, and always appends the code — `1,200.000 JOD`. Context rather than a
module variable because the screens server-render: a module variable on the server is shared by
every request in flight, so one studio's render could print another's currency. A few screens
that style the code themselves (the quotation builder and viewer, the tax return, Point of Sale)
keep `moneyText(n, currency)` and their own code span. `Field`'s `currency` prop puts the code
in an amount field — alone the studio's, `currency={bill.currency}` a record's — and amount
fields take `step="any"`, since `0.01` refused a dinar's third decimal in the browser.

Fixed on the way: the quotation viewer labelled every quotation in the studio's currency (it
now sends the quotation's own); invoices, bills and item costs ignored their own currency on
screen; Treasury formatted at nought places; the Executive board at a fixed two; the planner
in US dollars (`formatCurrency`, deleted); Nova's insights through `fmtMoney`, whose config
nothing set.

**What a record is in is kept with it (2026-09-27).** A project copies the currency of the
quotation or tender it was opened from (the studio's for a direct one); a payroll run freezes
the currency it was paid in, and a settlement snapshot the one it was calculated in — so
changing the studio's currency relabels nothing already issued. Customer 360's contract value
is converted to the studio's currency, and so is every project value the Projects dashboard
totals (`baseValue`, from the projects list).

**Records written before they kept a currency gain one on read (2026-09-27)** — the owner's
rule that an update reaches every studio by itself, so no script. `platform/db/stampCurrency`
fills a missing currency once, with a function patch that writes only into a gap (invariant 8):
a project from its quotation's or tender's frozen currency, else the studio's; a payroll run
and a settlement snapshot with the studio's, since nothing recorded theirs. The next read
finds nothing to do. Exports say what their money is in: the report
exports and the report builder carry a Currency column (a record's own, else the studio's),
the Customer insights and register CSVs name it in the money columns' headers, and the bank
file in its Amount header. The last unlabelled amount fields (pay components, a promotion's
amount threshold, a contract variation in its contract's currency, requisition and RFQ line
costs, subcontract back-charges) now name theirs.

`tests/money-model.mjs` covers the rule, the minor units, the sum, the display and the shared
total; the model tests of each module that changed still pass.

## Not built yet

- **`configureFormat`/`fmtMoney` (`lib/format.ts`) stay unwired, deliberately** — a module
  variable is the unsafe shape described above. No studio screen calls `fmtMoney` now.
- **A total across records in different currencies converts at TODAY's table**, not the rate
  of the day each was raised (`converterToBase`, lib/data/exchangeRates — Customer insights,
  Customer 360's contract value, the Projects dashboard); a rate the table lacks leaves that
  record out and says how many. Sales orders and other lists still sum their own figures
  unconverted where they total at all.
- **An older payroll run or settlement is stamped with the studio's currency TODAY**, because
  nothing recorded what it was paid in. That is what it already showed; if a studio changed its
  currency before 2026-09-27, its older runs are labelled in the new one. Projects have better
  evidence (their quotation's or tender's frozen currency) and use it.
- **A row is stamped when its LIST is read** (projects list, payroll screen, lifecycle view). A
  project page, payslip or bank file reached before its list has been opened falls back to the
  studio's currency — the same value the stamp would write, except for a project whose
  quotation or tender was in another currency.
- **The bank payment file names its currency in the Amount header**, not a column — its own
  note says a bank rejects a file for an unknown column.
- **A few browser-side calculations pass no currency** and still round at two places: the
  dashboards' client-side aggregates only sum stored amounts (unaffected), but any screen that
  multiplies a price by a quantity without the currency shows a figure that can differ by a
  fils from the server's for a three-decimal currency until the server's reload lands.
- **A currency's CASH rounding** (Switzerland's 0.05, a till rounding to the nearest coin) is
  not modelled; this is the accounting unit only.
- **A studio changing its currency** re-rounds nothing already written, and the ledger is then
  counted in the new currency's unit. There is no conversion of a book from one currency to
  another.
- ~~**A bill in a foreign currency** still posts to the ledger at its own amount, unconverted.~~
  **Converted, 18/09/2026** (`modules/finance/fx.ts`, `tests/fx-model.mjs`). A foreign bill is
  booked at a rate frozen on it — typed (`exchangeRate`, source `entered`) or else the day's
  market table, written onto the bill the first time it posts (`market`) so a correction re-posts
  at the same rate. Net and VAT are converted separately and the payable is their sum, so the
  entry balances by construction. A payment carries its own day's `rate`; the payable leaves at
  the BOOKING rate, the bank at the payment's, and the gap goes to **Exchange Differences (5800)**.
  The payment that settles the bill clears whatever is left, so rounded part-payments leave
  exactly nought. Changing a bill's currency clears its rate and re-posts it. No rate at all
  refuses the posting by name (`no-rate`) and the bill or payment still stands. **Still not
  built:** the bill form has no currency or rate field, so a foreign bill is raised only through
  the API; bills posted before 18/09/2026 stay at their raw amount (a posted entry is never
  edited — reverse and re-post by hand); the market table is TODAY's, so a bill dated last month
  and posted today takes today's rate unless one is typed; open payables are not revalued at
  month end; invoices are still studio-currency only.
