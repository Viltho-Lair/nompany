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

`tests/money-model.mjs` covers the rule, the minor units, the sum, the display and the shared
total; the model tests of each module that changed still pass.

## Not built yet

- **Most screens do not know the studio's currency**, so they show two places or three
  depending on the value rather than the currency's fixed decimals — a JOD amount of 1.200
  shows as 1.20. `configureFormat` (`lib/format.ts`) exists to hand the studio's currency to
  the client and **nothing calls it**; wiring it in the studio shell is the fix.
- **A few browser-side calculations pass no currency** and still round at two places: the
  dashboards' client-side aggregates only sum stored amounts (unaffected), but any screen that
  multiplies a price by a quantity without the currency shows a figure that can differ by a
  fils from the server's for a three-decimal currency until the server's reload lands.
- **A currency's CASH rounding** (Switzerland's 0.05, a till rounding to the nearest coin) is
  not modelled; this is the accounting unit only.
- **A studio changing its currency** re-rounds nothing already written, and the ledger is then
  counted in the new currency's unit. There is no conversion of a book from one currency to
  another.
- **A bill in a foreign currency** still posts to the ledger at its own amount, unconverted —
  unchanged by this work; see `approvals.md` for the FX the approval chain uses.
