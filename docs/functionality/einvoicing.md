# E-invoicing — each invoice's official file, and submitting it where nompany submits

**Where:** Finance → Tax, the E-invoicing section · Studio settings → Official values (what the
files need) · `modules/finance/einvoice.ts` (the contract), `modules/finance/einvoiceService.ts`,
`rules.einvoice` in `shared/compliance/countries/*.json`, `tests/einvoice-model.mjs` · Jordan:
`jofotara*.ts`, `ublXml.ts`, `tests/jofotara-model.mjs` · Saudi Arabia: `zatca*.ts`,
`tests/zatca-model.mjs`; the ZATCA unit (onboarding, keys, certificates) `zatcaUnit.ts`, the stamp
`zatcaSign.ts`, the request and certificate parsing `zatcaCrypto.ts`, the ONLY door to ZATCA
`zatcaApi.ts`, the nightly batch `app/api/cron/einvoice-report`.

## The rule, by country — it has had two answers

**26/09/2026, the owner:** *"our job is to prepare companies to submit their invoicing on the
official channels not through us … we must not interact with official channels at all, our job
is only the delivery of work done on the system."* Jordan's JoFotara submission (on `main`
22–26/09/2026, with a Send button, a daily retry cron and a credentials panel) and Saudi
Arabia's ZATCA onboarding and reporting (built 25/09, never committed) were removed that day.

**03/10/2026, the owner's decision A, for Saudi Arabia: nompany SUBMITS**, and the studio
chooses when, inside ZATCA's limits: a consumer (simplified) invoice reported as it is issued or
in a daily batch, a business (standard) one cleared at issue. Phase 2 makes the seller's own
e-invoicing unit sign every invoice, so an unsigned file was one every Saudi studio had to
finish somewhere else. **Jordan is still prepare-only**: the decision named Saudi Arabia.

`tests/einvoice-model.mjs` holds the boundary: every adapter prepares, only ZATCA's submits,
ONE file under `src/` names an authority's API host and it is `zatcaApi.ts`, it is the only
e-invoicing module that calls `fetch`, and **only ZATCA's developer portal is open**
(`ZATCA_OPEN_ENVIRONMENTS`). Opening simulation or production is the owner's decision, made in
that one line and in that test.

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

**The file is ZATCA's UBL**, complete in every field the seller writes. **Signed and reported
once the studio has connected a unit; unsigned, to download, until then.**

### Connecting — the studio's ZATCA unit

Finance → Tax → **Connection to ZATCA**, behind `finance.settings.edit`. Somebody generates a
one-time password on ZATCA's Fatoora portal and types it here — ZATCA's own proof that the
taxpayer asked for this unit. Then, in one step (`onboardZatcaUnit`):

1. a secp256k1 key and a certificate request with ZATCA's fields (the VAT number, the unit's
   serial `1-nompany|2-erp|3-<unit id>`, invoice types `0100` — simplified only for now, the
   branch's address, the industry, and the environment's certificate template);
2. the **compliance** certificate, for the OTP;
3. ZATCA's checks on a sample **invoice, credit note and debit note** — on a chain of their own,
   so onboarding takes no link from the studio's;
4. the **production** certificate.

**All or nothing**: the unit is written only once step 4 answers. The private key and both
secrets are sealed with `encryptField` (a NOMPANY_DATA_KEY purpose subkey, invariant 18) under
`S.zatcaUnit`; the certificate tokens are public and stay readable. A screen sees where, since
when and the timing — never a key or a secret. Connecting again replaces the unit and keeps the
timing.

### Business invoices — cleared before they are issued (slice 2, 04/10/2026)

**The buyer's tax registration** — VAT number, commercial registration, and the registered
address in its parts — is recorded once on the client in Sales (`taxRegistration`,
`shared/taxRegistration`, one form block shared with Finance) and **snapshotted onto the
invoice** as `buyerTax` when it is raised from a project, or typed on the invoice behind "Add
the customer's tax registration". Editable while a draft, frozen once issued, like the lines.
Sealed: the client whole by default, the invoice's copy by name in `sealCipher` (invariant 18).

**A VAT number makes a STANDARD invoice** (`zatcaBuyerOf`). It must name the buyer's VAT
number (15 digits, 3…3) and national address — street, building, district, city and a
five-digit postal code (BR-KSA-63) — each refused by its own name (`buyer-vat`,
`buyer-address`, `buyer-postal`). The buyer's commercial registration is written as its
party identification when known.

**Cleared at issue, and a refusal stops the issue.** `editInvoice` asks `clearBeforeIssue`
BEFORE it writes Draft → Sent: the invoice is prepared, stamped and sent to ZATCA's clearance
endpoint; CLEARED and the move goes ahead with **ZATCA's own copy kept as the file** (it carries
ZATCA's stamp and QR, read out of its indented XML by `qrOf`); refused or not reached and the
move is REFUSED, the invoice stays a draft and the Invoices screen says why. This is the one
e-invoicing answer that is not best-effort: an uncleared standard invoice is not a valid
invoice. It happens whatever the studio chose for its consumer invoices. A draft edited after a
clearance that failed drops its prepared file, so the next issue prepares the draft as it now
is.

**A unit must declare business invoices to clear them.** Units are connected with invoice types
`1100` since 04/10/2026, and ZATCA's onboarding checks six samples — a standard invoice,
credit note and debit note (each must come back CLEARED) and the simplified three (REPORTED).
The standard samples name an invented buyer, never one of the studio's customers. **A unit
connected before then declared `0100`**: a business invoice is refused with
`unit-simplified-only` until the studio connects again.

Measured against ZATCA's developer portal, 04/10/2026: a stamped standard invoice passed the
compliance check as CLEARED with no warning, and a standard invoice and credit note were each
CLEARED by the clearance endpoint, which returned its own stamped copy. **In `dev:sandbox`, the
same day:** a business invoice on a unit connected for consumer invoices only was refused
`unit-simplified-only` and stayed a draft; after connecting again (six samples passed, the daily
timing kept) it was cleared at issue as ICV 1, keeping ZATCA's copy and QR; one with a four-digit
postal code was refused locally (`buyer-postal`) WITHOUT taking a chain link, and once corrected
on the draft it cleared as ICV 2; a client saved with its tax registration.

### Till receipts — simplified invoices from the counter (04/10/2026)

A sale at a till is a simplified tax invoice in ZATCA's eyes. **The owner, 04/10/2026: "Yes"** to
writing a basket discount as ZATCA's document-level allowance and folding the shop's offers and
the cashier's line discounts into each line's net.

- **The receipt's own figures are the truth** (`zatcaReceipt.ts`, pure). Each tax category's
  taxable amount and tax are the receipt's stored `breakdown`; the allowance is the basket
  discount in that category without its tax; the lines are built to add up to taxable plus
  allowance. So the document ZATCA receives equals the slip in the customer's hand to the halala,
  and ZATCA's own rule (lines less allowances is the taxable amount) holds by construction.
- **No line rounds:** a net that does not divide into a two-decimal price — three for 24.34 — is
  written as "24.34 per 3" (UBL `BaseQuantity`).
- **Stamped at the sale, reported after it.** `createSale` calls `stampOnSale` before it answers —
  local work, a chain link and a signature — so the slip prints ZATCA's QR; the report waits for
  nobody: `after()` hands it to `submitOnIssue` (for a studio that reports as it goes) or the
  nightly batch takes it. Only a connected studio stamps; a sale is never refused over its stamp.
- **One chain** with the invoices, and **one queue**: the Tax screen lists outstanding receipts
  beside invoices ("Till receipt"), and the batch submits both in the order they were made.
- **The QR is drawn on the server** (`einvoiceQr.ts`, the `qrcode` package two-factor already
  ships) when a receipt is read — the sale's answer, the till's recent list, a reprint — never
  stored and never drawn in the browser, so no studio's till carries the library.

Measured 04/10/2026: four receipts priced by the till's own functions — tax-inclusive and
exclusive prices, with and without a basket discount, an offer, a line discount and a
three-for-ten line — each REPORTED by the developer portal's compliance check with no warning,
every total equal to the receipt's. In `dev:sandbox`: a sale stamped at the till (ICV 3 after
two cleared invoices), held on "once a day" and reported from the Tax queue; a sale on "as each is
issued" reported after the response; the reprinted slip carries the QR.

### Renewing the certificate

A production certificate ends (the developer portal's run three years). The Tax screen says
until when, turns amber inside the last **30 days** (`RENEW_WITHIN_DAYS`) and offers **Renew
certificate**: an OTP from the Fatoora portal again, a NEW key and request for the SAME unit —
same serial, same id, built by the same `csrInput` onboarding uses so the two cannot describe
the unit differently — and ZATCA's renewal call (`PATCH /production/csids`) signed in with the
certificate being replaced. **The chain carries on**: it is the same unit. That is the
difference from connecting again, which makes a new unit and starts a new chain. A renewal that
finds the unit replaced meanwhile refuses (`unit-replaced`) rather than putting the new
certificate on a unit it was not issued for.

### One act on one invoice at a time

Preparing takes a chain link, so two acts on one unprepared invoice — an issue and the nightly
batch, two people at the button — would each take one. Every act that can prepare holds a
**lease** first (`S.einvoiceLease`, a claim with a 120-second TTL so a crashed holder locks
nothing for long) and reads the invoice again once it holds it. The loser is told
`einvoice-busy`; the batch skips it. Measured in `dev:sandbox`: two submissions of one
invoice at once — one accepted, one busy, one chain link taken.

### Stamping

`zatcaSign.ts`, pure. The invoice hash (base64 of the raw SHA-256 of the canonical document
without its three cut parts) is signed with ECDSA over its 32 raw bytes. The XAdES signed
properties carry the signing time and the certificate's digest, issuer and decimal serial. **Two
digests are base64 of the HEX text** of the SHA-256 — the certificate's and the signed
properties' — which is the standard's own way, like the chain's first PIH. The signed properties
are hashed with each element carrying its own namespace and **the digest method self-closed**:
written open-and-shut, ZATCA's reporting endpoint refused "Invalid signed properties hashing"
while its compliance check had passed the same file. The stamped file puts `ext:UBLExtensions`
first in the root and `cac:Signature` straight after the QR, and its QR carries all nine tags.
**Stamping moves nothing the hash covers**, so the chain link recorded at preparing is the hash
ZATCA computes.

### The chain belongs to the unit

ZATCA counts per unit, so the chain document records which unit it counts for, and a new unit
starts at 1 from the standard's seed. A chain written before units counts for "no unit" and
continues for unsigned files.

### Reporting, and when

- **As each invoice is issued** (the default): issuing — Draft to Sent in `editInvoice` —
  reports it. Best-effort, by the same rule as posting it: the invoice was issued whatever ZATCA
  says, and the answer travels back beside it; the Invoices screen says a rejection or an outage
  on the spot.
- **Once a day**: `cron/einvoice-report` at 21:00 UTC, midnight in Riyadh, inside ZATCA's 24
  hours. It also retries everything an immediate report did not reach.
- **Submit to Fatoora** on a row of the Tax screen sends any outstanding invoice now, whatever
  its date.
- The nightly batch takes only invoices **issued on or after the day the studio connected**: an
  older one may have reached ZATCA some other way, so a person submits it. **A rejected one
  waits for a person** — sent again unchanged it collects the same refusal.

**Three answers:** reported (200/202) is `accepted`, its warnings kept as the message;
`NOT_REPORTED` (400) is `rejected` with the rules it broke; anything else — no answer, a 401
on the unit's own certificate, a 5xx — reached nobody who judged the document, so the invoice
stays `prepared`, the attempt is counted, and the night retries it. A file kept from before the
unit (or signed by a replaced one) is prepared again under the current unit before it is sent.

### The document

- **Tax is taken once per category on the total** (`documentTotals`, method `document`), as
  ZATCA's standard says and as every Saudi invoice here is already totalled. So the file's payable
  amount is the total the customer was shown. Each line still shows its own rounded tax.
- **The XML is written already canonical**: no whitespace, no self-closing elements in the hashed
  part, attributes and namespaces in canonical order, canonical escaping. So the file with its
  three parts cut out IS the canonical form ZATCA hashes, and no canonicaliser is needed. A test
  cuts it and compares, unstamped and stamped.
- **The chain:** every file carries a counter and the previous file's hash (ICV and PIH). Both
  move together in ONE compare-and-set on `S.einvoiceChain`, so two invoices can never claim the
  same place, and a document with a problem takes no link.
- **The seller comes from the official values** SA.json already asks for: the Arabic legal name,
  the VAT number, the commercial registration and the national address in its parts. A studio
  with no VAT rate reads as not VAT-registered, and SA.json then hides its VAT number.
- **The issue time** is when the invoice was created, in the studio's time zone, if that was on
  its issue date. Otherwise it is midnight, rather than an invented time.
- **The QR's time has no `Z`**: with one, ZATCA's validator warned KSA-25 on every document.

**WHAT THE DEVELOPER PORTAL CANNOT PROVE.** Its "production" certificate is a fixed sample issued
to another company, whatever request it is sent, so a report there is signed with our key under a
certificate whose public key is not ours — and it is still accepted. The portal therefore checks
the document, the hash, the QR and the signed-properties digest, and does NOT check that the
signature matches the unit's own certificate. **Only ZATCA's simulation environment proves that**,
and simulation needs a real taxpayer's OTP from the Fatoora simulation portal.

**Measured against ZATCA's developer portal, 04/10/2026**, with an invented company (VAT
399999999900003): a stamped simplified invoice, credit note and debit note each passed the
compliance check and were each REPORTED by the reporting endpoint with no warning; and in
`dev:sandbox` a test studio connected through the screen, an invoice issued under "as each is
issued" was reported at issue (ICV 1 of the new unit), and one issued under "once a day" waited
in the queue and was reported from its row's button (ICV 2, PIH the first one's hash).

## Not built yet

- **ONLY ZATCA'S DEVELOPER PORTAL IS OPEN.** Invoices reported there are tests and reach no
  record of ZATCA's. Simulation and production are declared and refused in `zatcaApi.ts` until
  the owner opens them. Nothing has been sent to either.
- **The nightly batch has not run.** `CRON_SECRET` is empty locally, so the job fails closed
  there (invariant 15); it calls the same `submitFor` the button does, which has.
- **Non-Saudi buyers.** A business invoice to a buyer with no Saudi VAT number (an export, a
  buyer registered elsewhere) is not modelled: a VAT number that is not Saudi is refused as
  `buyer-vat`. ZATCA's rules for those (another ID scheme, an export flag) are not written.
- **ZATCA's cleared copy is not yet what prints.** The kept file is ZATCA's copy and its QR is
  stored, but the printed invoice is still drawn from the invoice record.
- **Saudi credit and debit notes — the slice after.** Onboarding already signs and checks both;
  a studio's own credit notes are not yet stamped or reported.
- **NOT TESTED AGAINST SIMULATION** — it is closed, and it needs a real taxpayer's OTP. Until it
  runs, nothing proves the signature matches the unit's own certificate (see above).
- **Renewal is shown on the Tax screen only** — no notification and no e-mail reaches somebody
  who does not open it in the last thirty days.
- **The slip is not titled "Simplified tax invoice" (فاتورة ضريبية مبسطة)** — it says Receipt.
  ZATCA requires the title on the printed document; the slip's header is the till's own.
- **A till return is not reported** — it is a credit note, slice 3.
- **The printed invoice (Finance) does not draw its QR yet**; the till slip does.
- **Nothing in Jordan's half has been opened in `dev:sandbox`** since the rewrite of
  26/09/2026: not the download, not the recording.
- **No Jordanian file has been through JoFotara.** The first one a studio submits and records
  as accepted is the check; one recorded as rejected, with ISTD's words, is the next fix.
- **Credit and debit notes.** Only invoices are prepared. Until notes are, a studio reports its
  sales and not its refunds, which OVER-declares output tax. For Jordan this was held until a
  first invoice is accepted (the owner, 22/09/2026).
- **Zero-rated and exempt Saudi lines** are refused until a line can record its VATEX reason.
  Only SAR documents.
- **A discount is not written as an allowance for JORDAN.** Saudi till receipts write their basket
  discount as `AllowanceCharge` since 04/10/2026 (the owner's "Yes"); Jordan's adapter, and an
  invoice (which records no discount), do not.
- **A prepared file does not notice a later edit** to its invoice. It is handed out again as
  prepared.
- Countries other than Saudi Arabia and Jordan declare nothing yet, though `docs/progress.md`'s
  country research lists several that require e-invoicing.
