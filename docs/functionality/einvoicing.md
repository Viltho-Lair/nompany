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

## Not built yet

- **Any adapter.** ZATCA phase 2 needs signed UBL 2.1 XML, the invoice hash chain, the
  cryptographic stamp, the QR's nine TLV tags, clearance and reporting APIs, and onboarding with
  an OTP from the Fatoora portal. JoFotara needs UBL in a JSON body with a client id and secret
  and returns the QR on acceptance. Both need a test account to verify against.
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
