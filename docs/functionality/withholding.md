# Withholding tax

Tax deducted at source. Rules on Finance's own settings, two fields on an invoice, and a
reclaim list. **No new permission key** — the rules are Finance settings
(`finance.settings.edit`) and the figures ride on the invoice list.

## What it is

**VAT is built and withholding is not, and they are not the same shape.** VAT is ADDED to
what a document is worth and collected on the authority's behalf; withholding is DEDUCTED
from what is actually handed over, while the invoice stays worth what it says.

**A studio that modelled WHT as a negative VAT rate would produce an invoice for the wrong
amount and a receivable that never clears** — the client pays the net and the ledger expects
the gross. So it sits BESIDE the total, not inside it: `invoiceTotals` is untouched, `total`
is still subtotal plus VAT, and what changes is how much CASH is expected.

**The base is the subtotal, never the VAT-inclusive total.** Withholding is a tax on income,
and taxing the tax is the commonest way to get this wrong by exactly the VAT rate — on a 16%
VAT and a 5% WHT that is eight-tenths of a per cent on every invoice, small enough never to
be noticed and large enough to matter across a year.

**The threshold is tested on the base too.** A rule that applied above 1,000 would otherwise
catch a 900 invoice carrying 100 of VAT — the authority's money being used to cross the
studio's own threshold.

### What it refuses to say

**`applies: false` is not `amount: 0`.** "This rule did not apply" and "this rule applied
and produced nothing" are different facts, and a reader shown 0.00 cannot tell which — nor
whether somebody forgot to set a rule at all.

**A rate of nought is refused.** It withholds nothing, and a studio with one would see a WHT
line of 0.00 on every document and learn to ignore the column, which is the state this
exists to end. A rate of 100 or more is refused too: no jurisdiction hands the whole invoice
to the authority, and a typo of 50 for 5 is the shape that catches.

**Nothing is seeded.** An empty rule list is the normal case and means nothing is withheld,
so a studio in a jurisdiction without WHT never sees the column — rather than finding a
seeded rate and having to delete it.

### Settlement

**A client who withholds pays less and still owes nothing.** Judging settlement against the
gross would leave every withheld invoice permanently short by the tax, chased by a credit
controller for money the client is legally required NOT to send. So `outstanding` is against
`netPayable`, and the withheld amount is carried separately — a receivable from the
authority rather than from the client.

### The certificate is the asset

Tax withheld is only worth anything to the studio if it can prove it was paid over.
`certificateRef` is what turns a deduction into a reclaimable credit, and its ABSENCE is
what `unclaimedWithholding` lists: what to chase, which is a different list from what was
withheld.

**The rule is matched by LABEL, not an id**, because the rules are a list on the settings
and have no ids — and because a rule the studio has since deleted should read as "no longer
withheld" rather than pointing at nothing. **Unvalidated at the write**, exactly as
`milestoneId` and `costCodeId` are: the reader matches it, which is the only place that can
also cope with the rule being deleted later.

## What building it found

**`saveFinanceSettings` had no caller.** It has existed complete since the module was
written — guarding `finance.settings.edit`, validating the approval chains it used to own,
writing the section's settings — and nothing in the product invoked it, so a studio's cash
categories were whatever the defaults said and could not be changed. The same defect the
five posting functions carried, found the same way: by needing one of them. It has a route
now (`/finance/settings`).

## Not built yet

**No ZATCA adapter, deliberately.** The programme list names one; this product is based in
Jordan and sells across the region as a generalist SME tool, so a Saudi e-invoicing adapter
is a country integration rather than a tax engine — building it now would be building for a
market this is not in. Recorded as a decision, not an omission.

- **Invoices only.** A BILL from a supplier can be subject to withholding the studio must
  deduct and pay over, and nothing computes it — which is the half with a liability attached
  rather than a receivable.
- **Nothing posts it.** The withheld amount is reported and does not reach the ledger, so
  the tax credit is not an account and cannot be reconciled against what the authority says.
- **One rule per document.** No stacking, no per-line rates, and no rule chosen automatically
  from a client's or a supplier's category — somebody picks it on each invoice.
- **No certificate record.** `certificateRef` is a typed string; there is no document, no
  date and no file behind it.
- **No return.** Nothing summarises a period's withholding into anything a studio could file.
