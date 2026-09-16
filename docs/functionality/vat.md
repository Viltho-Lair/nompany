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

## A line's tax category, and the country's method (16/09/2026)

Layer 1 of the country rules (`docs/progress.md`, "Country document rules"): the arithmetic
every priced document needs, whatever country the studio is in. `shared/taxProfile.ts` and
`shared/documentTotals.ts`.

**A line is standard, zero-rated or exempt** — not an arbitrary rate, which keeps the owner's
rule: the studio sets ONE rate, and the only departures are the two every VAT law has.
Standard is taxed at the document's rate; zero-rated and exempt carry no tax, and are kept
apart because a return reports them apart. **A line with no category is standard**, so it is
stored only when it is something else and every line written before categories reads as it
did.

- **Registered items carry a category** (Inventory → the item form). It is **copied** onto a
  quotation line with the price when the builder picks the item, so changing the item moves
  no quotation already written. The builder shows a tag on a non-standard line.
- **Invoices, bills and sales orders** ask for a category per line — only when the studio has
  a rate; a studio that charges no tax is asked nothing. A non-standard line shows a tag in
  the detail view.

**How the tax is added up depends on the studio's country** (`studio.country`, Studio
settings):

- `document` — each line's net rounded to the currency, then the tax taken once per rate on
  the total. Saudi Arabia, the EU countries researched, Chile, the US and Canada.
- `line` — each line's tax taken and rounded on its own, and summed. The UAE, Oman, Bahrain,
  Jordan, Egypt, Kenya, Turkey, Brazil, Mexico, Colombia, Peru.

**The method is FROZEN on a document when it is raised** (`taxMethod`), the way its currency
is: an invoice's totals are recomputed on every read, and changing the arithmetic under an
issued invoice would move its total beneath a posted entry and a payment. **A document with
no stored method — everything raised before this, and everything raised by a studio whose
country is unset or not listed — totals exactly as it always did** (`legacy`: the subtotal
rounded once, the tax taken on it). Setting no country changes nothing.

**Every screen that prices a document runs the same function** (`documentTotals`), so a
zero-rated line shows untaxed before it is saved.

**A document with more than one rate shows what was taxed at each**: under the subtotal in
the invoice and bill detail, and on the printed document ("Taxable at 15%", "Zero-rated",
"Exempt", in the document's language). A document with one rate prints as it did.

## The tax return

`GET /finance/tax?from=&to=` (`modules/finance/taxReturn.ts`, arithmetic in
`shared/vat.taxReturn`), `finance.ledger.view`, a tab on the Ledger drawn only when the
studio has a rate. The default period is the previous calendar month.

- **Output**: invoices Sent or Paid, by issue date. **Credits**: credit notes Issued, by
  their issue date, split at the invoice's own rate with `splitGross` — the same function the
  ledger posts the note with, so the two cannot disagree. **Input**: bills Received,
  Approved or Paid, by bill date. Drafts, cancelled documents and **disputed bills** are out.
- **Payable = output − credits − input**; negative is reclaimable.
- **Zero-rated and exempt amounts are listed apart** under each figure, from the document's
  own breakdown — a return reports a zero-rated supply separately from an exempt one.
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

- ~~Tax per line~~ **built 16/09/2026** as three categories (above). Still missing:
  **reverse charge**, a category **per customer** (an exporter's zero-rating), and
  **several standard rates** in one studio (a reduced rate beside the standard one — Egypt's
  table tax, Turkey's 1/10/20, Europe's reduced rates). A document still has one rate for its
  standard lines.
- **A quotation line's category is not editable in the builder** — it comes from the item.
  An unlisted line is standard. Invoices, bills and sales orders take it per line.
- **Credit notes split at the invoice's rate as if every line were standard.** A note against
  a mixed invoice gives back tax on its zero-rated share too; the note has no lines to say
  which part it credits.
- **The country's fiscal layer is not built for any country** — no QR code, signature or
  reporting. See the "Country document rules" section of `docs/progress.md`; each is built
  when a studio in that country needs it.
- **`pricesIncludeTax` and `requiredLanguage`** are recorded per country and read by
  nothing yet: the POS will read the first; a layout could warn on the second.
- **Separate input and output VAT accounts** in the chart; both post to 2100.
- **Filing**: no export in any authority's format, no locking of a filed period (closing the
  month in `periods.md` is the nearest thing), no record that a return was filed.
- **Conversion** of documents in other currencies.
- **Expenses** carry no VAT, so they are not in the return.
- `companySettings.vatRate` / `currentVatRate()` (`lib/format.ts`) are an older, unread copy
  of the idea and were left alone.
