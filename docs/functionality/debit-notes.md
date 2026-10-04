# Debit notes — adding to an invoice after it was issued

**Where:** Finance → Receivables → Debit notes · `modules/finance/debitNotes.ts` (the rules,
pure), `debitNoteService.ts` (raise, issue, cancel), `ledger.ts` `postDebitNote`,
`app/api/studios/[slug]/finance/debit-notes`, `components/studio2/DebitNotesPanel.js`,
`tests/debit-note-model.mjs`.

## What it is

An issued invoice is never edited. When it **undercharged** — a price agreed higher, a quantity
short-counted, a charge left off — the correction is a second document that adds to it: a debit
note, the mirror of a credit note. Before 04/10/2026 a studio raised a second invoice, which a
client reads as a second sale and a tax authority files as one.

**It is for every country** (the owner, 04/10/2026: "Yes, build them … it is global"). A debit
note is ordinary accounting: it is owed, it posts, it is in the VAT return wherever the studio is.
Only whether it ALSO reaches a tax authority depends on the country, and that is the e-invoicing
adapter's business (`einvoicing.md`) — Saudi Arabia's today.

## What it does

- **Raised on screen** against an ISSUED invoice: an amount including tax and a reason. A draft
  invoice is edited instead; a cancelled one charged nobody anything to add to.
- **A reason is required in every country** — it charges a client more after they were invoiced,
  and one that does not say why is the one they dispute. (Saudi Arabia's e-invoice requires it
  too.)
- **No ceiling**, unlike a credit note: an invoice can be corrected up by more than it charged.
- **The amount is gross, taxed at the INVOICE's rate**, split by `splitGross` — the one function
  the ledger, the VAT return and the e-invoice use, so the three agree to the halala.
- **Draft → Issued → (never edited); a draft can be cancelled.** Numbered in its own series,
  `DBN` (`DN` is taken by deliveries), set in Studio settings → Numbering like every other.
- **Issuing posts:** Dr Accounts Receivable (gross), Cr Revenue (net), Cr VAT Payable (tax) —
  source `debit-note`, so it posts once and is never re-posted.
- **It is owed:** the invoice list's `expected` and `outstanding` rise by what was added
  (`debited` beside `credited`), which is what the customer credit limit, reminders and the Cash
  screen read. A payment on the invoice may cover the note — the overpayment check allows the
  invoice's outstanding plus its issued debit notes.
- **The VAT return has a line of its own**, "Added on debit notes": payable is output + debits −
  credits − input. A return filed before 04/10/2026 declared no debits and still reads.
- **Customer insights** count it in what a customer was charged.
- **Where nompany submits** (Saudi Arabia): a debit note is ZATCA's 383 naming the invoice and the
  reason; on a business invoice it is cleared before it is issued, otherwise reported as issued or
  nightly — exactly as a credit note. Elsewhere nothing more happens.

Measured 04/10/2026: the model test (rules, balance, return, posting, the 383); ZATCA's developer
portal reported a consumer debit note and cleared a business one, no warning.

## Not built yet

- **Not opened in `dev:sandbox`.** The local database connection hung when it was finished; the
  route, the screen and the posting have been checked by type, lint and the model test only.
- **No printed debit note.** The print layouts are for invoices and quotations; a debit note has
  no layout type yet.
- **Jordan's adapter does not prepare one** — Jordan's e-invoicing is prepare-only and does not
  prepare credit notes either.
- **A debit note is not shown on the invoice's own row** — `debited` travels with the invoice and
  the screen does not draw it yet.
