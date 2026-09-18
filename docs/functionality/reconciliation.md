# Bank reconciliation

What the bank says, against what the books say. A tab on the Ledger
(`/<slug>/finance-ledger`), one collection — `bankStatementLines` — and **no new permission
key**.

## What it is

**The ledger has always been able to report a bank balance and never to check it.** Every
posting that touched the bank account was somebody's word for it, and the one document that
could contradict them — the statement — had nowhere to go. So a studio could be confident
in a figure wrong by a payment that never cleared, a charge nobody booked, or a cheque paid
in twice.

**Reading is `finance.ledger.view` and matching is `.post`**, because confirming a pair is a
statement about what the books mean, and the person who may not put an entry in them has no
business declaring one settled.

**The book side is derived from the journal**, never stored: every posting that touched the
bank account is computed on every read, so a reconciliation cannot drift from the ledger it
is reconciling. A debit to the bank is money in, and the statement is read the same way —
so nothing flips a sign at the point of matching, which is where a sign error would silently
pair a receipt with a payment.

### Three states, and two of them are different problems

- **Matched.** Both sides agree; nothing to do.
- **On the statement, not in the books.** Money moved and nobody recorded it — a charge, a
  direct debit, interest, a payment received. **The fix is a posting.**
- **In the books, not on the statement.** Recorded and not yet cleared — a cheque written
  and not presented. **The fix is usually time**, and calling it an error would send
  somebody chasing a cheque that is simply in the post.

**The difference is not an error figure.** It is the sum of everything not yet paired, and a
healthy reconciliation has one. What makes it wrong is the difference not being EXPLAINED by
the two lists, which is why both come back rather than a single number. `bookBalance` is
every book line, matched or not — subtracting the unmatched would give a figure that is
neither the ledger's nor the bank's.

### Nothing is matched automatically

Two payments of 500 in one week are indistinguishable by amount, and an automatic pairing
would silently reconcile the wrong two and leave two real discrepancies cancelling each
other out. So this SUGGESTS and a person confirms — the posture FEFO takes on the shop
floor, for the same reason.

**The amount must match exactly.** A tolerance would pair a 500 with a 499.50 and hide a
bank charge of fifty pence, which is precisely what a reconciliation exists to surface.
Dates are allowed to differ within a week, because a payment made on Friday clears on
Monday and always has.

**The pairing is greedy per line, not globally optimal**, and that is a choice: two lines
and two entries of one amount can be paired two ways, and this takes the closest for the
first. Solving it properly is an assignment problem and would buy nothing, because a person
confirms every pair — and for two payments of one amount in one week the dates are not what
tells them apart. The bank's own description is, and only a person reads that.

**A person may confirm a pairing this never suggested** — an unrecognisable bank
description, dates months apart — **but not one where the money differs**, because that is
two events rather than a match. And an entry already matched to another line is refused:
one ledger entry answering two statement lines would be two real discrepancies cancelling
out.

**Undoing needs no reason.** A mismatched pair is an ordinary mistake made while working
through a list, not a decision about the books — unlike reopening a closed period, which is.

**Partial is reported, not rolled back.** A pasted statement with one bad row records the
rest and says which, rather than making somebody paste again.

### Importing a statement, and rules (18/09/2026, Finance plan step 5)

**A bank's CSV is imported** (pasted or chosen as a file) into the chosen money account. The
header is READ, not assumed: a date column, a description column, and one signed amount or a
debit/credit pair — English and Arabic column names are recognised; quoted commas, thousands
separators, a decimal comma, a trailing minus and brackets for negative are all read. **Day and
month order is the studio's to say** (day/month/year by default), because 03/04 is a different day
in each reading. A row that does not read is reported by its row number and the rest are kept.
**A line already on the statement is skipped** — same day, amount and description, compared by
COUNT so two identical coffees stay two — so importing an overlapping export adds only what is
new. Nothing is matched by the import.

**Rules post what the books never hold** (`bankRules`, filed under the ledger): "a line whose
description contains X, money in / out / either, posts to account Y". A rule PROPOSES — the line
shows "Post to Y and match", and "Apply rules to N lines" does several — and applying it posts a
manual entry dated the bank's day (Dr the money account for money in, Cr it for money out) and
pairs the line with it, in one act. **A line the books may already answer (a suggestion exists)
is left alone** (`books-may-have-it`): posting it too would count the money twice. A rule cannot
post to a money account (that would be a transfer dressed as a charge), needs three characters to
look for, and the first rule written wins. Importing, rules and applying them are
`finance.ledger.post`, like matching.

## Not built yet

- **No OFX, MT940 or CAMT import and no live bank feed** — CSV only. Typed lines are still capped
  at 500 per paste; an import at 2000 lines.
- ~~**One bank account.**~~ **One money account at a time, 18/09/2026.** The panel picks which
  of the studio's money accounts (`ledger.md`) it reconciles; a statement line carries the
  account it was entered against, and a line with none is 1010's — every line entered before.
  A line is only ever matched against its own account's postings.
- **Only rules post the unrecorded.** A one-off line no rule answers is still posted from the
  Ledger by hand and then matched.
- **Rules match on the description only** — not on an amount range, a reference pattern or a
  counterparty — and cannot split a line across accounts or carry VAT.
- **No statement balance carried forward.** The "statement says" figure is the sum of the
  lines entered, not a closing balance the bank printed, so a missing line is invisible
  unless it is also missing from the books.
- **No reconciliation is ever finished.** There is no "reconciled up to" date and no lock;
  matched pairs simply accumulate.
