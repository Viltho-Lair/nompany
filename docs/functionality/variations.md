# Variations — scope moving after signature

**Where:** on each contract in the register, `/<slug>/crm-sales-contracts`, behind
`crmSales.contracts`.
**The record:** `src/modules/sales/changeOrderSchema.ts`.
**The service:** `src/modules/sales/changeOrders.ts`. **The route:**
`/api/studios/<slug>/sales/change-orders`.

## What it is

A **variation** (change order) is scope moving after a contract is signed: additional work, an
omission, an extension of time. A contract is agreed once; a project accumulates variations,
each a separate negotiation with its own answer — which is why an amendment is not a second
contract, and why a variation never heads a deal.

## What was already there, and what was not

**Everything except a way in.** The schema, the service, the route and the approve/reject
buttons on the register were all written in P2. What did not exist was any way to **raise** a
variation or to **submit** one — so no change order could ever reach `submitted`, and the answer
path was unreachable code behind a working-looking screen.

That is not a cosmetic gap. **It is how a real defect survived:** the route passed its whole
request body where `answerChangeOrder` expects a boolean, so `{ action: "reject" }` — an object,
therefore truthy — **approved the variation it was rejecting**, adding its value to the contract.
Nothing caught it. The compiler could not: the route handler's `body` is not statically typed,
so it saw no mismatch. No test could: the transition was unreachable, and unreachable code is
untested code by construction. Gate A had no change-order coverage at all.

Both are fixed here, and the Gate A block that proves the fix is the coverage that was missing.

## Who may do what

**No new permission area.** Variations answer to `crmSales.contracts`, which is right on the
same argument the BOQ makes about its tender: a variation *is* a contract's content. `create`
raises one, `edit` amends and submits a draft. **Answering is the Approvals page's** since
19/09/2026: submitting a variation asks for its approval (type `change-order`), and the people who
answer are Approvals settings'. Until a studio saves the type they are whoever held the old
`crmSales.contracts.approve` (now gone) plus the owner and Admins.

## What it does

**Two acts here and one on the Approvals page**: raise and edit (POST and PUT) and **submit**
(PATCH, draft → submitted, which files the approval, carrying the value delta as an ABSOLUTE
amount — a deduction is as material as an addition). **The answer** is given on the Approvals
page, and the last yes or a no writes `approved` or `rejected` here. A PATCH with
`approve`/`reject` is refused (`not-answerable`). A variation submitted before 19/09/2026 gets
its approval the first time the register is read.

**Always born a draft.** The create path takes no status and the screen sends none. A status
accepted from a request body would be the side entrance around the transition.

**A draft is the only thing that edits.** Once submitted, the thing somebody was asked to answer
must not change underneath them.

**Invariant 7 lives on the Approvals page.** The person who submitted a variation is never asked to
answer it — **unless they are the studio's Admin**, the owner's rule for every approval since
19/09/2026. (Before it, the owner was refused on identity alone.)

**Both deltas are signed.** An omission is a variation too, so a negative `valueDelta` is the
only honest way to record one, and `timeDeltaDays` follows the same rule. Neither is ever an
absolute — two variations approved out of order would each claim to know the new total, and the
later would erase the earlier. The screen's hint says so on the field, because a box labelled
"value" invites exactly the absolute figure the schema refuses to store.

**Only approved variations move the contract value**, and the register says so above the list. A
submitted one is a claim, and a claim in somebody's inbox has not changed what was agreed.

**A rejection is stamped like an approval.** "Nobody answered" and "this person said no" are
different states, and a rejection with no signatory is the first wearing the second's status.

**The deal id is the engagement's, not the ticket's.** A contract and a variation both attach to
the *engagement*; the dual-write mints its own id and leaves the derived one as an alias, so a
caller holding a ticket id has to resolve it. Passing the raw row id is what threw
`no-engagement` when the Gate A fixture was first written.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **No number is ever issued.** `number` is stored and always blank — there is no
  `nextReference` call and no screen field, so a variation cannot be quoted to a client by
  reference the way a contract or an invoice can. This is the largest remaining gap.
- **No delete.** The service has no remove at all, so a draft raised by mistake stays for ever.
  Rejected ones are kept deliberately; a never-submitted draft is a different case and has no
  answer yet.
- **The time delta moves nothing.** `timeDeltaDays` is recorded and read and no date anywhere
  changes because of it — not the contract's end date, not the deal's deadline, not the project's.
  Moving a deadline a contract established is an explicit, audited edit rather than something a
  variation does on the way past, and there is no screen for that edit yet.
- **No effect on the cost breakdown.** An approved variation moves the contract's value and does
  not touch the project's budget, so a job whose scope grew keeps the allowances it was opened
  with. `cost-codes.md` is the other end of this.
- **No attachments and no correspondence.** A variation is a title, a scope, two deltas and
  notes; the instruction or drawing it came from lives nowhere.
- **Raised only from the contracts register.** There is no way to raise one from the project
  delivering the work, which is where a site team would notice the need.
