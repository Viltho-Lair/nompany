# VAT — one studio rate, and a tax return (tier 6, 11/09/2026)

**Studio settings → VAT rate**, and **Finance → Ledger → Tax return**. The owner's rule,
replacing the 10/09/2026 plan to study tax codes first: *a studio fills in a VAT rate or it
does not; if it does, it deals with tax; if it does not, no tax value is registered; the tax
return is visible only when a rate is set.*

## The rate

`vatRate` on the studio record, beside `currency`, written through the settings route
(`administration.settings.edit`). **Blank or nought means not registered.** A value that is
not a number from 0 to 100 is refused (`vatRate`), never coerced — "15%" read as 0 would
switch the studio's tax off while the screen said it had saved. `shared/vat.ts` holds the
three answers every module gives the same way: `studioVatRate`, `cleanVatSetting`,
`documentVatRate`.

## Where a document gets its rate

`documentVatRate(studio, requested, fallback)`:

- **No studio rate → 0**, whatever the document asked for. Quotations, sales orders,
  invoices and bills all go through it on create and on edit.
- **With a rate:** what the document asked for (an explicit 0 is kept — a zero-rated sale is
  real), else the fallback (a quotation revision keeps its predecessor's rate), else the
  studio's.
- The forms start a new document at the studio's rate and **draw no VAT field at all** when
  the studio has none (invoice, bill, sales order, quotation builder).
- **A document keeps the rate it was saved with.** Setting or clearing the studio rate
  changes nothing already written; editing a document's rate on a studio that has since
  cleared its rate writes 0.

## The tax return

`GET /finance/tax?from=&to=` (`modules/finance/taxReturn.ts`, arithmetic in
`shared/vat.taxReturn`), `finance.ledger.view`, a tab on the Ledger drawn only when the
studio has a rate. The default period is the previous calendar month.

- **Output**: invoices Sent or Paid, by issue date. **Credits**: credit notes Issued, by
  their issue date, split at the invoice's own rate with `splitGross` — the same function the
  ledger posts the note with, so the two cannot disagree. **Input**: bills Received,
  Approved or Paid, by bill date. Drafts, cancelled documents and **disputed bills** are out.
- **Payable = output − credits − input**; negative is reclaimable.
- **Read from the documents, not the ledger**: input and output tax both post to 2100, so the
  journal knows the net and cannot say how much was charged and how much reclaimed.
- **A document in another currency is listed beside the return, not counted.** The return is
  filed in the studio's currency at the authority's rate for each date, which nompany does
  not hold; converting at a market rate would print a figure that looks filed and is not.

## What was fixed on the way

- A new **bill defaulted to 15%** on the server and in its form, a year after invoices and
  quotations stopped guessing a country's rate.
- The invoice and bill forms read `vocabulary.defaultVatRate`, which **no route sent**, so the
  invoice's VAT field opened on the text "undefined" and saved 0.
- The ledger's credit-note split and the return share `splitGross`.

## Not built yet

- **Tax codes** (standard, zero-rated, exempt, reverse charge) per item and per customer, and
  tax per LINE — a document still has one rate.
- **Separate input and output VAT accounts** in the chart; both post to 2100.
- **Filing**: no export in any authority's format, no locking of a filed period (closing the
  month in `periods.md` is the nearest thing), no record that a return was filed.
- **Conversion** of documents in other currencies.
- **Expenses** carry no VAT, so they are not in the return.
- `companySettings.vatRate` / `currentVatRate()` (`lib/format.ts`) are an older, unread copy
  of the idea and were left alone.
