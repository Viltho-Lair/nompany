# E-invoicing — the framework

**Where:** Finance → Tax, the E-invoicing section · the setup notice on every Finance screen ·
`modules/finance/einvoice.ts` (pure), `modules/finance/einvoiceService.ts`,
`rules.einvoice` in `shared/compliance/countries/*.json`, `tests/einvoice-model.mjs`.

## What it is

The country-neutral half of sending invoices to a tax authority, built 18/09/2026 on the
owner's instruction: **the framework only, no country's adapter yet** — adapters are kept as
a future option in `docs/progress.md`. There is no home market: a studio's COUNTRY says
whether its invoices must reach an authority.

**A country declares it** in its definition: the authority, the system, the mode (`clearance` —
valid only once accepted; `reporting` — valid at once, reported after; `mixed` — business
invoices cleared, consumer ones reported), the day it came in force, and the name of the
ADAPTER that would submit them. Declared today: **Saudi Arabia** (ZATCA / Fatoora, mixed, from
04/12/2021, adapter `zatca`) and **Jordan** (ISTD / JoFotara, clearance, from 01/04/2025,
adapter `jofotara` — whether JoFotara clears or reports is disputed between sources, so it is
declared as clearance, the stricter reading).

**An adapter** is one entry in `EINVOICE_ADAPTERS`, keyed by that name, meeting one contract:
given the invoice, the studio and the rules, answer `submitted | accepted | rejected | failed`
with the authority's id, QR and message. **The registry is empty.**

## What it does

- **Every issued invoice dated on or after the mandate** in such a studio is in the Tax
  screen's queue until the authority has accepted it — "Not sent" while nothing has tried.
  Drafts, cancelled invoices and invoices from before the mandate are not required.
- **The screen says nompany is not connected**, and that until it is the studio issues these
  invoices through the authority's own system — the queue is that to-do list. No Send button
  is offered without an adapter, and the route refuses one by name (`no-adapter`) **without
  writing anything**, because a stored failure would read as an attempt that happened.
- **The setup notice** on every Finance screen says the country requires e-invoicing and
  nompany does not submit yet — the owner's "annotate important setup".
- **With an adapter**, Send (`finance.receivables.edit`) stores the answer on the invoice
  (`einvoice`: status, adapter, attempts, uuid, QR, message); a transport failure is kept as
  `failed` with its reason so a retry is the obvious next act.

## Jordan (22/09/2026)

**The credentials are the STUDIO's, never the platform's**, and that is the shape of the
integration rather than a detail. A taxpayer registers with ISTD, creates an application in the
JoFotara portal's API Settings, and is issued a **Client-Id**, a **Secret-Key** and an **income
source sequence**. nompany is software; it is not a taxpayer on anybody's behalf and cannot
register for them. Each studio enters its own, sealed at rest with a purpose subkey of
`NOMPANY_DATA_KEY`, and one studio's credentials never reach another's document.

**THE CREDENTIALS ARE ENTERED IN STUDIO SETTINGS**, beside the country and the official values
whose TIN the adapter reads — the panel appears only where the country's own definition names an
authority, so a studio sees its own obligations and no other country's. Client ID, secret key,
income source sequence, invoice code and an optional sandbox address.

**The secret is write-only.** It is sealed with a purpose subkey of `NOMPANY_DATA_KEY` and the
response says whether one is SET, never what it is — so there is nothing to redact and nothing
to leak into a screenshot. **A blank box does not erase it:** the form was never shown the
secret, so an ordinary save cannot post it back, and treating the blank as a deletion would wipe
a credential every time somebody changed the client id. Removing one is its own button.

**Three files, and only the last one touches the network.** `jofotaraDocument` decides what is
sent and is pure; `ublXml` writes the standard's XML; `jofotara` posts it. Submission is
`POST https://backend.jofotara.gov.jo/core/invoices/` with `Client-Id` and `Secret-Key`
headers and a body of `{"invoice": "<base64 UBL>"}`; the answer carries `EINV_QR`,
`EINV_NUM` and `EINV_INV_UUID`, kept under the authority's own names so what we hold can be
compared with what the portal shows.

**EIGHT THINGS A TUTORIAL GOT WRONG AND THE AUTHORITY'S GUIDE CORRECTED** — every one looks
right to somebody who knows UBL and does not know JORDAN'S UBL, and each is pinned by a test:
`cbc:ProfileID` is required and first; `cbc:InvoiceTypeCode` is **always 388** with Jordan's
own code in its `name` attribute (five pairs — 011/021, 111/121, 311/321, 411/421, 511/521);
`currencyID` is **"JO"**, not ISO 4217's "JOD"; a line uses `cac:TaxTotal` with a
`cbc:RoundingAmount`, never `cac:ClassifiedTaxCategory`; tax ids carry
`schemeID="UN/ECE 5305"` and `"UN/ECE 5153"`; **a discount is `cac:AllowanceCharge` inside
`cac:Price`** with reason `DISCOUNT`; `cbc:TaxCurrencyCode` sits beside the document
currency; and `cac:SellerSupplierParty` carries the income source sequence.

**A rejection is not a failure.** `rejected` is the authority saying no to this document and
the studio must change something; `failed` is the transport, and the answer to it is to try
again. The queue shows them differently.

## Not built yet

- **Any adapter but Jordan's.** ZATCA phase 2 needs signed UBL 2.1 XML, the invoice hash
  chain, the cryptographic stamp, the QR's nine TLV tags, clearance and reporting APIs, and
  onboarding with an OTP from the Fatoora portal.
- **Jordan's adapter is written and NOT VERIFIED** (22/09/2026). It has never been submitted to
  ISTD, sandbox or otherwise, and a studio must enter its own credentials before anything is
  sent at all — which is the gate keeping an unproven adapter out of somebody's books. What it
  needs to become trustworthy: a taxpayer's sandbox **Client-Id**, **Secret-Key** and **income
  source sequence**, and one accepted submission.
- **Clearance does not gate issuing.** In a clearance country an invoice should not be valid
  until accepted; without an adapter, gating would stop the studio invoicing at all, so issuing
  is unchanged and the queue shows what is outstanding.
- **No automatic retry** (a cron) and no printing of the returned QR on the invoice.
- **A discount is not emitted as an allowance.** A till receipt records what an offer and what
  the cashier took off, per line and per sale (`promotions.md`, `pos.md`); an invoice records no
  discount at all. So when an adapter is written, mapping those onto UBL `AllowanceCharge` with
  a net `TaxableAmount` is part of writing it — the owner's instruction, 22/09/2026: park it
  here beside ZATCA until they say.
- Countries other than Saudi Arabia and Jordan declare nothing yet, though
  `docs/progress.md`'s country research lists several that require e-invoicing.
