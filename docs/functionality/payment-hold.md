# The payment hold

Finance refuses to pay a supplier bill that disagrees with its purchase order and goods
receipts, or that names a supplier whose paperwork has lapsed. Set in **Finance → Settings**;
seen on every bill row in **Payables**.

## What it is

**Both halves already existed and nothing joined them.** Procurement computes whether an
order's three documents agree (`threeWayMatch`) and whether a supplier's paperwork is in date
(`supplierQualification`). Inventory already refused to *place* an order with a lapsed supplier;
Finance would still *pay* one. The hold is the one act that moves money asking both.

`modules/finance/hold.ts` is the policy, and it is pure: it takes the two functions' **answers**,
not the documents behind them, so it reimplements neither. `payables.ts` reads the records and
asks both; the screen shows exactly what the pay door refuses.

## Three modes, and off is the default

- **Off** — nothing is read and nothing is held. Every studio starts here, deliberately: a hold
  that defaulted to on would stop real payments over paperwork nobody had been asked to file.
- **Warn** — each bill shows what *would* hold it, and the payment dialog repeats it. Nothing is
  refused. This is how a studio finds out what switching to block would stop.
- **Block** — the payment is refused until the hold is released or the cause is fixed.

## What holds a bill

- **The supplier**, on **every bill that names one** from the register — with or without a
  purchase order. Suspended, rejected, or a document expired: the same three answers Inventory
  already gives when refusing an order, in the same words. An **unassessed** supplier is usable,
  so a studio that has never opened the register is held over nothing.
- **The match**, only on a bill that answers a purchase order — three-way matching needs three
  documents, and rent has one. Billing for goods **not received at all** holds whatever the
  tolerance; billing for **more than was received** holds when it passes the tolerance. Billing
  for less is not held.

**The supplier check reaching bills with no order is the one change from the plan.** A
subcontractor is invoiced on a hand-typed bill with no purchase order behind it, so confining
the whole hold to order-backed bills would have missed the case it exists for.

## The tolerance is two dials

A percentage of what was received, and an absolute amount. A difference inside **either — the
greater of the two —** passes. A percentage alone lets a large order drift by a lot of money; an
amount alone is wrong across order sizes.

## Releasing a held payment

- **Its own right, `finance.payables.release`**, held by the department-head archetype and not
  by `money`, which pays.
- **A reason is required**, and kept on the bill with who gave it and when.
- **The person who released it may not record the payment.** Holding both rights is allowed;
  using both on one bill is not — the invariant-7 shape.
- **A release covers the reasons it was given for.** A supplier whose certificate lapses after
  somebody released an over-billing is held again.

## It refuses the payment, not the bill

A held bill can still be received, approved and disputed. What is held is the money — refusing
the document would mean a studio could not record an invoice it has genuinely received.

## Not built yet

- **A subcontract certificate still raises no bill.** A subcontractor's bill is typed by hand; it
  is checked against the supplier only if it names one from the register. A bill carrying only a
  typed supplier name is not checked.
- **The amount tolerance does not convert currencies.** It applies in the bill's own currency.
- **Nobody is told when a bill becomes held or is released.** The row and the dialog say so; no
  notification is sent.
- **A bill naming an order that no longer exists is not matched**, and so not held over it.
- **Releases are not listed anywhere but on the bill.** There is no register of overrides.
- **Each part payment is checked when it is made.** A bill part-paid before the hold was switched
  on keeps what was paid.
