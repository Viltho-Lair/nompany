# Customer documents — quotations and invoices as the client receives them

**Tier 4, the owner's design (11/09/2026).** A quotation or an invoice reaches a client as a
document built in the **Document builder** (Engineering & Documents → the register): the
studio designs a **template**, marks it as the **default layout** for a document type in one
language, and the template's **placeholders** are filled from the record when it is printed.
Most of the engine predates this — `modules/quality/qualityFields.ts` (the field catalogue,
the studio's legal rows, the quotation's tables and totals as blocks) and
`modules/quality/quality.ts` (`mergeValuesFor`, `resolveBlocks`, `watermarkFor`) survived the
old builder's removal and were wired to nothing. This file grows slice by slice; what is not
built yet is listed at the end.

## What a document is issued with

**Expiry is set in days, per type, beside the code** — the owner's words were "in the same
place a code is set for a quotation, a date of expiry is issued for each type in days".

- **A quotation sequence has *valid for (days)*** (Technical settings → Quotation numbering,
  beside the label, prefix and start). A quotation raised under it stores
  `validUntil` = the day it was raised + those days. Blank or 0 means no expiry.
  `validUntil` is **editable per quotation** in the builder's footer — the sequence proposes,
  the quotation keeps what it was given. A revision is a new document handed to the client,
  so it gets a fresh expiry from the sequence that issued its number (read off the prefix,
  not whichever sequence is default today).
- **The invoice series has *days to pay*** (Master data → Numbering, on the Invoices row
  only). A new invoice with no due date typed gets its issue date + those days; a typed due
  date always wins, and 0 leaves the due date blank as before. **Only a series that declares
  a payment term takes one** (`hasDueDays` in `modules/administration/numbering.ts`): a
  bill's due date is the supplier's, so a term typed against bills is refused on save and
  dropped on read.

**The currency is frozen onto the document when it is raised.** A quotation and an invoice
each store the studio's `currency` at that moment, so a document already sent never changes
money because Studio settings did. Documents raised before this carry none and read the
studio's, which is exactly what they showed before. The builder shows the quotation's own.

The date arithmetic is `shared/dates.ts` (`addDaysISO`), pure and UTC, so a screen and the
server compute the same day.

## Placeholders in the builder

**A document says what it is a layout FOR** — the *Layout for* choice in the document's
header: Quotations, Invoices, or Not a layout. That binding (`subjectType`, which existed and
had no screen) decides which record every placeholder resolves against, so it is refused on
an issued document with no revision open, exactly as the body is.

**Insert field** (the editor's toolbar) lists what the server says this author may place on
this document, grouped: Company, Legal information (the studio's own rows, as typed), the
document itself, and — once bound — the quotation's or invoice's own fields. A *block* is a
field that resolves to rows: a quotation's tables and totals, an invoice's lines and totals.
Blocks go in the body only; the header and footer take inline fields, which is where a
letterhead's company name and VAT number belong.

**A placeholder is a node, not `{{text}}`.** `mergeField` (inline) and `mergeBlock` carry the
catalogue key and a label for the author; they are atoms, so a keystroke cannot half-delete one
and a typo cannot make one. **The save refuses a key nothing can resolve** (`field`), in the
body and in both bands (`unknownPlaceholders` in `modules/quality/qualityFields.ts` — the
allowlist the catalogue's own header had promised and nothing had implemented).

**What is offered follows what can print.** Two rules were added to `reachOf` because the new
test found them broken:

- **The origin is a hop.** A reader who cannot open invoices is offered nothing reached through
  an invoice — the render already refuses such a subject, so the menu was offering gaps.
- **No journey crosses a MANY edge.** A quotation reaches its project and a project has many
  invoices, so "the invoice's number" on a quotation layout names no invoice. An invoice still
  reaches the quotation it bills, through its project, because each of those hops is one.

**The quotation's client** resolves from the Client record it names, or its ticket's client —
not through a relations edge, which would be the shorter path and resolve nothing for a
converted quotation. A document with no frozen currency prints the studio's.

**Every catalogue field has an Arabic label**, keyed by the field's key in
`shared/studio/quality.ts`; a studio's own legal label is data and is shown as typed.
`tests/customer-documents.mjs` holds all of the above.

**The header and footer are read-only on an issued document now.** They took keystrokes before
and never saved them, which reads as the page accepting an edit and forgetting it.

## The layout customers receive

**One layout per type per language**, stored on the studio record as
`documentLayouts.quotation.en = <document id>` (`modules/quality/layouts.ts`), beside
`numbering`, because what every client receives is the company's decision.

**Only a published layout can be chosen.** A layout document shows a strip under its header:
*Use as the quotation layout in English* once it has an effective revision, *Publish this
layout before it can be the one customers receive* until then, and *Customers receive this…*
once chosen, with *Stop using*. The language of the slot is the **published revision's**,
because that is what prints.

**Choosing answers to `administration.settings.edit`**, not to the register's rights: the
person who writes a layout is not necessarily the person who decides what every client
receives. **The quality docs route is the only writer** (`setDefaultLayout`) — the one place
that can check the binding, the language and the publication together. Studio settings does
not accept the key, so there is never a second door.

## Printing

**Print** is on the quotation viewer (Sales) and on every invoice row (Finance, for every
reader of the row — a draft prints too, stamped). It opens `/<slug>/print/<kind>/<id>`, a
full-screen page (`shared/studioRoute`, like Engagements) with an **English / Arabic** switch
that picks which layout fills; it starts at the reader's own language.

`GET /api/studios/<slug>/documents/print?kind=&id=&lang=` (`modules/quality/print.ts`):

1. **The record's right first** — `crmSales.quotations.view` or `finance.cash.view` — before a
   layout is read. **It does not use the register's context**, whose view guard would refuse a
   Finance user printing an invoice; it builds the same shape from the studio context, and the
   resolver still permission-checks every hop.
2. The chosen layout's **effective revision** — its frozen snapshot, never the working copy.
3. `mergeValuesFor` and `resolveBlocks` against the record, then `fillTemplate`
   (`modules/quality/fill.ts`, pure): a field becomes its value and keeps its marks; a block
   becomes real tables — one per named group under its heading — with column heads and totals
   in the document's language (`shared/studio/documents.ts`), money to two places with the
   currency, and figures on the side the line ends (left, in Arabic). A stored date prints
   dd/mm/yyyy.
4. **A placeholder nothing could read prints its own name** in brackets and is counted on
   screen; one that resolved to an empty value prints a dash. Those are two different facts.
5. **The stamp**: an invoice prints DRAFT until sent and CANCELLED once cancelled; a quotation
   prints DRAFT until it is Approved or Sent. It is in the document's language and repeats on
   every printed sheet.

The page lays the filled document on the **same sheets** it was designed on — the editor,
read-only — so there is no second renderer to disagree with the first. **Print is the export**:
the browser's Save as PDF produces exactly what is drawn, Arabic shaped by the browser.

**A studio with no layout** is told so, with *Create a starter layout* for somebody who may
create register documents: a draft bound to the type, in the chosen language, with a
letterhead carrying the company name and **its legal rows as placeholders**, the record's
number, date, client and expiry or due date, the lines and totals, and a terms section. It is
still a draft — edited, published and chosen before anything prints from it.
`tests/customer-documents.mjs` asserts every starter passes the save-time allowlist.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **No live preview of a filled layout while authoring.** The author sees `[Client]` chips;
  the filled document is the print page.
- **A studio of one cannot publish a layout**, because the builder's approval ladder has no
  Admin exception. Stated and accepted when approval was chosen.
- **A layout's binding can change while a revision is open.** If a chosen layout is re-bound
  to another type mid-revision, the slot still names it until someone stops using it.
- **Print is on the quotation viewer and invoice rows only** — not on Technical's quotation
  list, a sales order, a delivery note or a purchase order. Each is a catalogue entry and a
  button, not new machinery.
- **No email.** How a document reaches the client by email is an open row in
  `docs/progress.md`.
- **The due date is not proposed on screen.** The invoice form still shows a blank due date;
  the term is applied by the server when the field is left empty.
