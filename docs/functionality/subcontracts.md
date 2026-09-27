# Subcontracts — a package valued period by period

**Where:** `/<slug>/procurement-subcontracts`, behind `procurement.subcontracts`.
**The records:** `SubcontractSchema` and `PaymentCertificateSchema`
(`src/modules/procurement/subcontractSchema.ts`).
**The arithmetic:** `src/modules/procurement/subcontractModel.ts`.
**The service:** `subcontracts.ts`. **The route:**
`/api/studios/<slug>/procurement/subcontracts`.

## What it is

A **subcontract** is an agreed value for a package of work. **Payment certificates** value that
work periodically; retention is withheld from each, back-charges are deducted, and the balance
is what the subcontractor is owed.

## Why it is not a purchase order

A purchase order buys **goods** against a line list and is *received* — you can count what
arrived. A subcontract buys **work** against a value and is *valued*, as a proportion of
something nobody can count in a warehouse. That is why it is its own record rather than a
status on `materialOrders`, and why its certificates are cumulative rather than a list of
deliveries.

## It is the mirror of the billing schedule

`billing-milestones.md` built retention on the **client** side — money a customer withholds
from what the studio invoices. This is the same arithmetic with the roles reversed, and it
**calls billing's own `retentionOn`** rather than restating what a percentage means. Ten per
cent cannot come to mean two different things in one product.

## Who may do what

**`procurement.subcontracts`**, view/create/edit/delete, with **`certify` as an extra**. Writing
a valuation is administration; *agreeing* it creates a debt — the separation a requisition's
approval draws (answered on the Approvals page since 19/09/2026; the
`procurement.requisitions.approve` this line used to cite left the catalogue that day), and
`certify` is not a rung on the view/edit ladder. Catalogue 166 → 171.

**The valuation's writer does not certify it** (invariant 7, 27/09/2026). A separate right
alone could not say that: somebody holding both `edit` and `certify` — a project manager
usually does — wrote a figure and then agreed it. `certifyCertificate` now refuses
`same-signer` when the certifier is `createdByCollaboratorId`, asked again inside the function
patch (invariant 8), and the screen shows "Written by you" in place of the button. **No
owner/Admin exception**: invariant 7 names three (a payroll run, a bill, a stock adjustment) and
a certificate is not one; the approvals module carries none for it either. Should the owner
extend it, `certifierProblem` (`subcontractModel.ts`) is the one place.

**On the archetypes the two halves sit with different people.** `buyer` holds
`procurement.subcontracts` at `edit` — the Subcontracts Administrator in its own note. `certify`
is on **deliverer** (Project Manager, Production Manager), beside `crmSales.contracts.approve`
which it already held for the same reason: the person who can say the work happened is the one
running the job, not the one who placed the order.

## The decision the whole slice turns on

**Certificates are cumulative.** Each values the whole package to date and pays the difference.
`thisPeriod` is derived, never stored.

Storing the increment instead would let a mistake in one period ride silently through every
later one, because nothing would ever restate the total. **Cumulative is self-correcting:** get
period three wrong and period four puts it right, and the correction is visible as a period that
paid less rather than as an edit nobody can see.

The same rule is why **`certifiedToDate` is the last certified certificate's cumulative and
never a sum** — summing would count a corrected period once in its own right and again inside
every later total, compounding silently into a subcontractor apparently being overpaid for
reasons nobody can reconstruct.

**A valuation cannot go below the last certified one.** That is what a back-charge is for, and a
back-charge *says why* while a reversed valuation says nothing. Re-checked at the moment of
certifying as well as when written, because a draft may have been prepared before an earlier
period was agreed.

**`thisPeriod` is measured from the last *certified* certificate**, not the previous row — a
draft sitting between two certified periods must not absorb the value of the period after it.

**Certificates are valued in period order regardless of arrival order**, since a difference
computed against the wrong predecessor is a wrong payment.

## The rest of what it does

**Retention freezes once anything is certified.** Every certificate already written withheld a
percentage; changing it afterwards would silently re-price money the studio has told a
subcontractor it is holding, and the certificates would no longer sum to the position.

**A back-charge with no description is dropped**, not stored as an unexplained number against
somebody's money.

**Net payable can be negative and is not clamped.** A period whose back-charges exceed the work
done means the studio is owed money; hiding that behind a zero would lose it.

**Over-valuation is flagged, not refused.** A variation agreed off-system is the usual cause, and
refusing the figure would make the screen lie about what has been certified.

**A certified certificate does not edit.** It states what somebody agreed was owed; the
correction belongs in the next cumulative valuation, where it is visible.

**A valued subcontract does not delete** — Terminated is a state it *has*, and deleting would
orphan every certificate recording money owed.

**Certificates are numbered within the subcontract**, not across the studio: a subcontractor
talks about "certificate 3 on the drylining", and a studio-wide sequence would mean nothing to
them. **From a tally, not a count** (invariant 10, 27/09/2026): the number was
`existing.length + 1`, so two valuations written at once both became the same certificate. It
is `bumpCounter` now, one field per subcontract in the studio's counters
(`SUBCONTRACT-CERT:<id>`), seeded from the highest number already issued.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **`Paid` is a status nothing sets.** It exists in `CERTIFICATE_STATUSES` and no payment run
  writes it; certifying is as far as this goes. Following the money is Finance's, and nothing
  joins the two yet.
- **No bill is raised.** A certified certificate is money owed and does not appear in Payables,
  so the cost report does not see it. That is the largest remaining gap and the natural next
  step — `projects/costing.ts` counts bills, and a certificate is not one.
- **The cost code is set and not read.** The form picks the project and one of its cost codes
  (since 11/09/2026; before that neither had a field), but nothing reads `costCodeId` — certified
  value is not in the project's cost until a certificate raises a bill.
- **`vendorId` is not validated against the supplier register** at the write. The form picks it
  from the register and the row names the supplier; a deleted supplier shows as its id.
- **No variations.** A package whose scope grows is valued past its own value and flagged;
  there is no record of *why* it grew, which is what a subcontract variation would be.
- **No retention release.** The date is recorded and `releasable` computed; nothing raises the
  release payment, exactly as on the client side.
- **No certificate template or print.** A subcontractor cannot be sent the certificate; it exists
  only on screen.
