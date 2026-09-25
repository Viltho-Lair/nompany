# E-invoicing — preparing each invoice's official file

**Where:** Finance → Tax, the E-invoicing section · Studio settings → Official values (what the
files need) · `modules/finance/einvoice.ts` (the contract), `modules/finance/einvoiceService.ts`,
`rules.einvoice` in `shared/compliance/countries/*.json`, `tests/einvoice-model.mjs` · Jordan:
`jofotara*.ts`, `ublXml.ts`, `tests/jofotara-model.mjs` · Saudi Arabia: `zatca*.ts`,
`tests/zatca-model.mjs`.

## The rule: nompany prepares, the company submits

**The owner, 26/09/2026:** *"our job is to prepare companies to submit their invoicing on the
official channels not through us … we must not interact with official channels at all, our job
is only the delivery of work done on the system."*

So nompany **never contacts a tax authority.** No endpoint, no API credential, no certificate,
no one-time password. It builds each invoice's file exactly as the authority's official
instructions describe. The company downloads it, submits it through the authority's own channel
itself, and records what the authority answered. `tests/einvoice-model.mjs` holds this: no
adapter has anything but `prepare`, no e-invoicing module calls `fetch`, and no file under `src/`
names an authority's API host.

**There was a submission path, twice, and both are gone.** Jordan's adapter posted invoices to
JoFotara with the studio's Client-Id and Secret-Key (22–26/09/2026, on `main`), with a Send
button, a daily retry cron and a credentials panel in Studio settings. Saudi Arabia's onboarded
with ZATCA for a certificate, signed invoices with it and reported them (25/09/2026, never
committed). All of it was removed on 26/09/2026. **Do not put it back**; the reason is recorded
in `docs/progress.md`'s e-invoicing ledger row.

**Stored credentials were not deleted.** Studios that saved Jordan's credentials between 22/09
and 26/09/2026 still carry them, sealed, on `einvoiceSettings`. Nothing reads them, the studio
export strips them, and deleting live data needs the owner's two confirmations (invariant 17).

## What it does

- **A country declares it** in its definition: the authority, the system, the mode (clearance,
  reporting, or mixed), the day it came into force, and the name of the ADAPTER that prepares its
  file. Declared today: **Saudi Arabia** (ZATCA / Fatoora, mixed, from 04/12/2021, `zatca`) and
  **Jordan** (ISTD / JoFotara, clearance, from 01/04/2025, `jofotara`).
- **The queue on Finance → Tax:** every issued invoice dated on or after the mandate, until the
  studio records that the authority accepted it. Drafts, cancelled invoices and invoices from
  before the mandate are not required.
- **Download file** (`finance.receivables.edit`) prepares the invoice's official XML and
  downloads it. **Prepared once and kept on the invoice** (`einvoice.document`), so every later
  download is the same bytes. For Saudi Arabia this matters: the file takes the studio's next
  counter and hash, and building it twice would put one invoice in the chain twice. The file is
  built again only after the studio recorded a rejection, because a refused invoice is corrected
  and resubmitted as a new document.
- **What the file needs is named first.** A missing official value (the tax number, Jordan's
  income source sequence and invoice code, Saudi Arabia's VAT number and national address) is
  refused with the value named, and nothing is written. The Finance setup notice already lists
  missing official values, so these appear there too.
- **Record answer** (`finance.receivables.edit`): accepted or rejected, the authority's reference
  for the invoice (**required for an acceptance**), its QR, and its message. An acceptance can be
  recorded without a prepared file, because a studio may have issued that invoice in the
  authority's own portal.
- **The QR prints on the invoice** from `einvoice.qr`, drawn server-side at the bottom of every
  printed sheet. Where the seller builds the QR (Saudi Arabia's five tags), it is there from the
  moment the file is prepared. Where the authority issues it (Jordan), it is there once the studio
  pastes it in. A fiscal QR is required by law, so it is not a layout element a studio can drop.
- **Where nompany has no adapter for the country**, the screen and the setup notice say so, and
  the queue is the studio's to-do list for the authority's own system. No country that declares
  e-invoicing is in that position today.
- **States:** `prepared` (the file exists; the studio has not recorded an answer), `accepted`,
  `rejected`. `pending`, `submitted` and `failed` are legacy from the submission days: still
  read, still counted as needing action, never written.

## Jordan

**The file is ISTD's UBL**, built from the invoice (`jofotaraDocument`, pure) and written by
`ublXml`. **Three official values go into it**, and all three live in Official values because they
are printed inside the document: the tax number, the **JoFotara income source sequence** and the
**JoFotara invoice code**. The last two were fields of the credentials panel until 26/09/2026.

**The QR is JoFotara's to issue**, on acceptance. Nobody else can build it, so a Jordanian
invoice prints its QR once the studio records JoFotara's answer and pastes the QR in.

**EIGHT THINGS A TUTORIAL GOT WRONG AND THE AUTHORITY'S GUIDE CORRECTED**, each pinned by a test.
Every one looks right to somebody who knows UBL and does not know JORDAN'S UBL:

1. `cbc:ProfileID` is required and first.
2. `cbc:InvoiceTypeCode` is **always 388**, with Jordan's own code in its `name` attribute (five
   pairs: 011/021, 111/121, 311/321, 411/421, 511/521).
3. `currencyID` is **"JO"**, not ISO 4217's "JOD".
4. A line uses `cac:TaxTotal` with a `cbc:RoundingAmount`, never `cac:ClassifiedTaxCategory`.
5. Tax ids carry `schemeID="UN/ECE 5305"` and `"UN/ECE 5153"`.
6. **A discount is `cac:AllowanceCharge` inside `cac:Price`**, with reason `DISCOUNT`.
7. `cbc:TaxCurrencyCode` sits beside the document currency.
8. `cac:SellerSupplierParty` carries the income source sequence.

**THE NAMESPACES WERE WRONG UNTIL 25/09/2026.** `cac` and `cbc` were declared without UBL 2.1's
`-2` suffix, which puts every element in no schema at all. Pinned by a test.

## Saudi Arabia

**The file is ZATCA's UBL**, complete in every field the SELLER writes, and **unsigned**.

**What that means for a Saudi company.** In phase 2, ZATCA requires a cryptographic stamp signed
with a certificate that ZATCA issues to the company's own e-invoicing solution, and the QR's tags
6 to 9 come from that stamp. Nompany holds no such certificate and asks for none, so the
company's certified solution (or ZATCA's own channel) stamps and reports the file.

- **Tax is taken once per category on the total** (`documentTotals`, method `document`), as
  ZATCA's standard says and as every Saudi invoice here is already totalled. So the file's payable
  amount is the total the customer was shown. Each line still shows its own rounded tax.
- **The XML is written already canonical**: no whitespace, no self-closing elements, attributes
  and namespaces in canonical order, canonical escaping. So the file with its QR reference cut out
  IS the canonical form ZATCA hashes, and no canonicaliser is needed. A test cuts it and compares.
- **The chain:** every file carries a counter and the previous file's hash (ICV and PIH). Both
  move together in ONE compare-and-set on `S.einvoiceChain`, so two invoices can never claim the
  same place, and a document with a problem takes no link.
- **The seller comes from the official values** SA.json already asks for: the Arabic legal name,
  the VAT number, the commercial registration and the national address in its parts. A studio
  with no VAT rate reads as not VAT-registered, and SA.json then hides its VAT number.
- **The issue time** is when the invoice was created, in the studio's time zone, if that was on
  its issue date. Otherwise it is midnight, rather than an invented time.
- **The QR's five seller tags**: seller, VAT number, time, total, VAT. **The time has no `Z`**:
  with one, ZATCA's validator warned KSA-25 on every document.
- **Measured against ZATCA once.** On 25/09/2026, before the owner's rule, the owner authorised a
  check on ZATCA's public developer portal. Signed documents built from this code passed with no
  error, which confirmed the canonical form, the hash and the QR timestamp. It is not repeated:
  nompany does not contact ZATCA.

## Not built yet

- **Nothing here has been opened in `dev:sandbox`** since the rewrite of 26/09/2026: not the
  download, not the recording, not the new official values.
- **No Jordanian file has been through JoFotara.** The first one a studio submits and records
  as accepted is the check; one recorded as rejected, with ISTD's words, is the next fix.
- **Credit and debit notes.** Only invoices are prepared. Until notes are, a studio reports its
  sales and not its refunds, which OVER-declares output tax. For Jordan this was held until a
  first invoice is accepted (the owner, 22/09/2026).
- **Saudi business (B2B) invoices.** An invoice records no buyer VAT number or national address,
  so a standard invoice is refused locally and every Saudi file is simplified.
- **Zero-rated and exempt Saudi lines** are refused until a line can record its VATEX reason.
  Only SAR documents.
- **A discount is not written as an allowance.** A till receipt records discounts per line and
  per sale; an invoice records none. Mapping them onto UBL `AllowanceCharge` is parked on the
  owner's instruction, 22/09/2026.
- **A prepared file does not notice a later edit** to its invoice. It is handed out again as
  prepared.
- Countries other than Saudi Arabia and Jordan declare nothing yet, though `docs/progress.md`'s
  country research lists several that require e-invoicing.
