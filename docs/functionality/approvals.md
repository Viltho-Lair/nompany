# Approvals

**The Approvals page** (2026-09-19) is where approvals are answered. The amount chains that
signed bills, bids, requisitions and stock adjustments are gone; each of those is asked for from
its record and answered here.

## The Approvals page (2026-09-19)

The owner's design; the decision ledger in `docs/progress.md` holds it and the build order.

**An approval exists only because a record asked for one.** A record's Request approval button
files it, naming the record (`source`: its section, id, reference, title, and the `path` its
"Open the record" link lands on) and who asked. Nothing is typed in by hand, and there is no
"new" button on the page.

**The record reads its status from the approval**, never a copy of it — through
`modules/approvals/reads.ts`, the one place every module asks "is this approved".

**The records that ask (2026-09-19):**

| Button | Where | Files | When approved |
|---|---|---|---|
| Send for Approval | a Sales ticket, for its latest finished quotation; Technical, for an internal quotation | **Quotation approval** | the quotation reads Approved everywhere, can be locked, opens a project, and ends the RFQ asking |
| Submit PO | a Sales ticket, once its quotation is approved | **Client PO approval**, carrying what the client sent (a description, a file, or both) | the **project number is issued** (`effects.ts` → `issueProjectNumber`), as Finance's signature on the old board did |
| Request approval | Point of Sale → Returns: asking for a return is asking for its approval | **Till return**, carrying the refund as its amount | the units go back into stock and the refund is paid (`returnApproval` in `modules/sales/posReturns`); rejected, the return is closed with the reason |
| Request approval | Finance → Payables, on a received bill (or one whose last request was turned down) | **Supplier bill**, carrying its total in its own currency | the bill becomes Approved, which payment waits on (`billApproval` in `modules/finance/payables`); a no changes nothing on the bill — it is corrected and asked about again, disputed or cancelled |
| Request approval | Tendering → a tender's bill, once fully priced and before it goes out | **Bid**, carrying its value in the tender's currency | the tender may be submitted — while the bill still has the value the approval was for (`bidApproved` in `modules/tendering/bid`); nothing is written on the tender |
| Submit for approval | Procurement → Requisitions: submitting a draft is asking | **Purchase requisition**, carrying its estimate — or no amount while any line is unestimated, which walks every step | Approved, it may become a purchase order; a no makes it Rejected with the reason (`requisitionApproval` in `modules/procurement/approval`) |
| Request approval | HR → Payroll, on a draft run | **Payroll run**, carrying its net | the run becomes Approved, so its bank files are made and it can be paid (`payrollApproval` in `modules/hr/payrollService`) |
| Submit | Finance → Payables & Expenses → Claims: submitting a draft claim is asking | **Expense claim**, carrying its total | the open advance takes its part, it posts, and it is settled if nothing is left to pay (`claimApproval` in `modules/finance/claimsService`); a no makes it Rejected with the reason |
| Submit | CRM & Sales → Contracts, on a draft variation | **Change order**, carrying its value delta as an absolute amount | the variation is `approved` and counts in the contract value; a no makes it `rejected` with the reason (`changeOrderApproval` in `modules/sales/changeOrders`) |
| Submit (the timesheets route — no screen yet) | Projects, on a draft timesheet | **Timesheet**, carrying its labour cost | the sheet is `approved`; a no makes it `rejected` with the reason (`timesheetApproval` in `modules/projects/timesheets`). It never had an approve right: until a studio saves the type, whoever holds `projects.list.edit` answers |
| Send for review | Engineering & Documents → the document register, on a revision | **Document revision** — a review step, then an approval step, and nobody answers both, the owner included (`distinctSigners`) | the review yes moves the revision to `approval` with the reviewer's signature; the last yes makes it `approved` with the approver's (issuing stays `engineeringDocs.register.publish`); a no at either step sends it back (`rejected`) with the reason (`documentApproval` in `modules/quality/qualityDocRevisions`) |
| Request leave | HR → Leave, for your own leave (a manager filing somebody else's has decided already and asks nobody) | **Leave request**, carrying the days and the reason | the request is Approved in the approver's name; a no makes it Declined; the requester may still withdraw it while it waits, and a late yes then changes nothing (`leaveApproval` in `modules/hr/hr`) |
| Request release | Finance → Payables, on a bill the payment hold is holding | **Payment release**, carrying the reason and the amount outstanding | the release is written on the bill in the approver's name with the reason, and the approver may then not record that payment (`releaseApproval` in `modules/finance/payables`); a no leaves it held |
| Record adjustment | Inventory → Stock: an adjustment worth more than the lowest limit asks; under it the stock moves at once | **Stock adjustment**, valued at units × unit cost (absolute) | the movement is written (`adjustmentApproval` in `modules/inventory/adjustmentApproval`); rejected, it is closed with the reason and nothing moves |

**MOVING EVERY APPROVAL HERE, one type at a time** (the owner, 19/09/2026): the request stays
where it is made today and the answer moves to this page. Every type has moved — the till
return, the stock adjustment, the bill, the bid, the requisition, payroll, expense claims, change
orders, timesheets, document revisions, held-payment releases and leave (the last on 19/09/2026). Each move drops the type's
`approve` right — a right to do what the settings decide would be a second answer (invariant
16) — and the steps it had come with it:

- **Until a studio saves a type, its old signers answer it.** `defaultSetting` (`model.ts`)
  names whoever holds the old right today, read off the roles' stored strings because the
  catalogue no longer knows it, plus the owner and Admins, with the old limits. Worked out on
  every read and never stored; the settings screen says "not saved yet". Nothing stops the day a
  type moves.
- **A step may start at an amount** (`from`, in the studio's currency, at or above) on a type
  that carries one: "a bill has step 1 for everyone and step 2 from 50,000". The amount is
  converted with the day's rate only when some step has a limit, and the amount and the rate are
  frozen onto the approval. Under every limit nothing is asked and the record goes through.
- **Every yes asks the signer's PIN**, on every type, where before only the amount chains did.
- **The record moves when its approval is decided** (`effects.ts`), with the studio's authority
  and the approver named — the person answering may hold no right over the record. The yes that
  would finish an approval is asked of the record first, so a return that can no longer be paid
  out is refused while the answer is still the approver's. If the record's write still fails
  afterwards, the approval says so (`finish`) and offers **Try again**.
- **What is being approved cannot move under the approvers.** A bill waiting on its approval
  refuses a change to its lines, tax or currency (`approval-pending`); turned down, it edits
  again and is asked about afresh.
- **Signatures already given are carried.** A record waiting under the old engine when its type
  moves gets its approval the first time its list is read, in its requester's name, with the
  signatures it had placed on the first steps in order — nobody signs twice (`carried` on
  `requestApproval`). Nothing is deleted: the old fields stay on the record as history.
- **Reviewer ≠ approver stays where the steps are two acts** (`distinctSigners`, for document
  revisions): nobody answers two steps of one such request, the owner included.

**A quotation is approved by its approval and by nothing else.** Editing a quotation's status to
Approved is refused (`needs-approval`) — it was how anybody who could edit one skipped the people
who approve it. A quotation stored Approved before this, by that edit, stays approved.

**A rejection is answered by asking again.** The ticket offers "Rejected — send again" (and
"PO rejected — submit again"); the rejected approval stays on the Approvals page as the record
of it. While one is pending, a second is refused (`already-pending`).

**Nobody named, nothing filed.** A type with no steps set up refuses the request with a sentence
(`not-configured`) rather than filing an approval that would wait for ever — the old board
filed those and reported them as "unrouted".

**"Awaiting you" on Main** lists and counts the approvals waiting on the reader, through the
same `waitingOn` the Approvals page uses.

**Each type is answered in ordered steps** (Approvals → Approval settings). A step names
specific studio members and says whether ALL of them must approve or ANY ONE is enough. The
steps are frozen onto an approval when it is requested, so changing the settings never changes
who was asked on one already running.

**Nothing is self-approved.** The requester is taken off any step others share, and a request
where they would be the only approver on a step is refused (`no-approver`). **The owner and
Admins are the exception**: they stay on their steps and may answer their own request.

**A no from anybody at the open step rejects the whole approval**, under "any one" as well as
"all", and must give a reason. Answers are final. Asking again is a new approval; the rejected
one stays as the record of it.

**Who sees what.** Everybody opens the page (`EVERY_MEMBER_SECTION_KEYS`) and sees two lists:
what is waiting on them — only the open step, never a later one — and what they asked for, with
every step and every person's answer. **Answering needs no right**: being named on the open step
is the authority. Two rights exist, held by the owner and Admins and given to others in Access:
`approvals.overview.view` (a third list, every approval in the studio) and `approvals.settings`
(view and edit the steps). No library role is born with either (`ADMIN_ONLY_AREAS`).

**Who is told.** The people on a step when it opens; the requester when it is decided either way.

**The code:** `modules/approvals/` — `model.ts` (the rules, pure, `tests/approvals-model.mjs`),
`registry.ts` (the types — a new one is a row there plus its button), `approvals.ts` (the store).
Screen: `components/studio2/StudioApprovals.js`.

**The old board's items were converted on 19/09/2026** and the board's stored rows removed from
every studio. What it had left became approvals of their own types, and the hand-written ones
became `carried` approvals, which can be answered but never requested. The conversion code went
once it had run. What it deleted is in the export the owner holds.

## The amount chains (until 19/09/2026)

Bills, bids, requisitions and stock adjustments were signed by P2's chain engine
(`docs/superpowers/specs/2026-09-03-approval-workflow-engine-design.md`): an ordered list of
steps, each naming a RIGHT and the amount it started at, edited in Studio settings → Approvals,
walked one signature at a time. **All four moved onto the Approvals page on 19/09/2026 and the
engine went with the last of them** — its walker (`platform/approval/resolve.ts`), its validator
and its editor. Their `approve`/`approveHigh` rights left the catalogue.

**What is left is read for one purpose:** the seeds (`platform/approval/chains.ts`) and any
chain a studio had stored (`platform/approval/store.ts`) are a moved type's DEFAULT steps until
the studio saves it in Approvals settings — so a studio that had moved the bill limit to 5,000
still meets 5,000 on the day bills moved. Records part-signed under the engine carried their
signatures onto their approvals (`carried`). Everything the engine's sections of this file said
is in `git log -p -- docs/functionality/approvals.md`.

## The signer's PIN (18/09/2026)

**Approving asks the signer's personal PIN** — every approval on the Approvals page
(`signingPinProblem`,
`platform/auth/lock.ts`). Rejecting is not asked: it commits nobody to anything. It is asked
of a person who has set a PIN, and of **everybody** when the studio switches on **PIN on every
signature** (Studio settings; `signingPin` on the studio), in which case a
signer with no PIN is refused `pin-not-set` (409) and told to set one.

A request without the PIN answers `pin-required` (**428**). No screen was changed for it: the
page's response observer (`components/security/SessionLock.js`) asks for the PIN and sends
**the same request** again with it, so the screen that asked to sign gets the signature's answer.
A wrong PIN asks again with the tries left; five wrong in a row stop the PIN working on
signatures and at tills for fifteen minutes (`pin-locked`, 429). The reason is sharing: a login
handed round a team signs as one person, and the PIN typed at the moment of signing is the one
thing the named person has and the others do not.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Five types have no record to ask from yet:** Material PO, Delivery, Delivery return, ID update
  and Permit request. They appear in Approvals settings and nothing can raise one.
- **No reminders, no delegation, no out-of-office reassignment, and no withdrawing a request**
  from this page. Only a no ends a request early here; leave and expense claims can be
  withdrawn on their own screens, and their approval then refuses a late yes.
- **A step whose only approver leaves the studio cannot be answered by anybody**, and an approval
  waiting on it waits for ever — there is no reassigning yet.
- **No condition other than amount.** Supplier, cost code, project or deal cannot decide the steps.
- **Nova reads a person's approvals but cannot answer one.**
- **A document's own reviewer and approver are read but never written.** Its approval asks the
  people the document names when it names them (`stepPeople`), and nothing in the product sets
  those two fields, so in practice Approvals settings decide. The only screen that tried to set
  them (`components/studio2/QualityWorkflow.js`) is imported by nothing and calls a route that
  does not exist.
- **No screen submits a timesheet**, so its approval is reached only through the route; and
  **project costing counts a timesheet whatever its approval says** (the audit's gap 14).
- **Editing a bid's bill while its approval waits is allowed** (the approval then no longer
  covers the bid); a bill instead refuses the edit. The two should agree.
- **A cancelled requisition leaves its approval waiting** until somebody turns it down.
- **A chain a studio stored before 11/09/2026 through Finance's old API is not read** for the
  default steps — only the studio's own layer is. Nothing on a studio saved since then is affected.
- **AP reporting is not revalued.** A bill carries a currency, but the aging report still sums
  raw totals.
