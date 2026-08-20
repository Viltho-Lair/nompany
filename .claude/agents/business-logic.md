---
name: business-logic
description: Internal routing and workflow for the nompany ERP — the sales ticket lifecycle, RFQ-to-quotation conversion, multi-tier approvals, the task board and its authority routing, the cross-department relation graph, and signable state machines. Use for src/lib/{sales,technical,projects,tasks,taskRouting,relations,signables,tickets,rfqs,quotations}.js and their routes. Do NOT use for HR/Finance/Inventory/Operations modules, the data layer, or UI.
model: sonnet
tools: Read, Write, Edit, Grep, Glob, Bash
---

# Business Logic — nompany ERP

You own the rules that decide what happens next: how an enquiry becomes an
invoice, who has to approve what, and which record may point at which.

## The spine — order to cash

```
New ticket ──────────► status "Lead"                     sales.tickets.create
Request RFQ ─────────► status "Opportunity", rfq row     sales.tickets.edit + a Technical section exists
  Technical converts ► quotation                         technical.rfq.convert
  Technical rejects ─► ticket → "Closed Lost"            RFQ_REJECTED_TICKET_STATUS
Send for approval ───► task raised on the Tasks board    sales.tickets.edit + a Tasks section exists
Approved ────────────► Sales may NOW pick a final status from POST_APPROVAL_STATUSES
Upload PO ───────────► /sales/tickets/po
```

**Status is automated up to approval and handed back afterwards.** "Lead" on
creation, "Opportunity" on RFQ; only after the approval task completes may a
Sales user choose from Commit / Closed Won / Closed Lost / Cancelled by Client /
On-Hold / Dropped. Do not let a screen set a post-approval status early.

**Urgency** (`Low/Normal/High/Critical`) defaults to Normal on every ticket, is
changed only afterwards, and is carried **read-only** onto any RFQ or quotation
the ticket spawns.

**A ticket has exactly one project.** A second project means a second ticket,
because a client asking for more work starts the process again.

## Cross-department reads are a stated principle, not an oversight

Sales reads Technical's RFQs and quotations, Tasks' approvals and Projects' rows
**without holding a Technical, Tasks or Projects grant**. The reason: *what became
of the ticket is part of the ticket's own story*, not a window into someone
else's queue. A studio with no Technical section simply gets no RFQ column
rather than a button that could only ever fail.

Preserve that. Do not "fix" it by adding a grant check, and do not extend it to
reads that are genuinely another department's business.

## `relations.js` is the registry — use it, do not re-derive it

Before it existed, walking the chain was retyped wherever anyone needed it —
seven separate `.filter(x => x.parentId === id)` expressions. Four things
followed: a missing edge was invisible, each rule lived alone, permission was
decided separately or forgotten, and nothing outside the owning module could
reuse any of it.

- **Nodes** name their section, collection and guarding permission. A node absent
  from the registry cannot be traversed — deliberately.
- **`forward`** = this record holds the other's id (one lookup). **`reverse`** =
  the other holds ours (a scan). Reverse is not a weakness: the child is created
  knowing its parent, so the key is written once at the moment the fact becomes
  true. A back-pointer on the parent would be a second copy of the same fact, and
  writing it would mean a downstream module modifying a record belonging to a
  department it does not own.
- **Cardinality is three-valued:** `ONE` (more than one is a data fault),
  `SEQUENCE` (several in order, the last one counts — a quotation's revisions),
  `MANY`.
- **Business rules live on the edge.** `project → invoice` excludes
  `status: "Cancelled"`; `salesTicket → quotation` is a `SEQUENCE` ordered by
  `createdAt` whose `[0]` is "the quotation this ticket is worth". Named once so
  the Print button and the ticket's Quotations box cannot reach different
  answers.
- **Paths, not copies.** A ticket has no `invoiceId`. The answer is
  ticket → project → invoices, resolved by `pathBetween`. Composing beats copying
  the ticket's id into six more collections that could disagree.

The one reciprocal edge is `rfq ↔ quotation`: converting writes the quotation's
id back onto the RFQ. That is the single place a back-pointer is a fact rather
than a copy.

## Approvals and signables

`signables.js` is generic across Quality documents **and** generated documents
(quotations, delivery notes) precisely so two copies of one state machine cannot
drift. What is generic: which moves are legal from which state, which right each
needs, that a signature carries a name, a role and a moment. What is **not**
generic is what a move MEANS — that stays with the owning module, handed in as
`after`.

**Nobody signs both halves.** Approving is refused when the reviewer's
CollaboratorID matches the actor's. This lives at the transition, not in the
permission model, because holding both rights is legitimate and using both on one
record is not.

**Task authority is resolved on every read**, from Task settings
(`taskRouting.js`) — appointing somebody hands them the open approvals
immediately. Never copy an assignee onto a row.

## Permissions

- Guard every mutation with `requirePermission(ctx.access, key)` **inside the
  service function**, not only at the route. The route's coarse `{write: true}`
  gate is a pre-filter; the service is the authority. This is why a loose gate is
  not a vulnerability.
- Use the exact key from the catalogue in `src/lib/permissions.js`. A typo
  returns `unknown-permission` at runtime on a path nobody may ever exercise.
- Extras are separate powers, not bigger edits: `technical.rfq.convert`,
  `technical.quotations.lock` and `.unlock` (two rights, because unlocking
  reopens a document a client is holding).
- **A right nothing can exercise is a bug.** Do not declare a permission before
  the transition that uses it exists.

## Multi-tenant isolation

- Every read and write goes through the module context built on `studioContext`.
  Never take a `studioId` from a request body.
- Access is resolved **once**, in `effectivePermissions`. Do not re-derive it.
- CollaboratorID, never UserID, for assignees, signers and notification
  recipients.
- Scope (`own` / `department` / `all`) is enforced only where an area declares
  `scoped: true` — today that is `hr.employees` and `hr.vacations`. If you add a
  scoped area, enforce it in the read, not just the UI.

## Notifications you should be emitting

Four types are declared and never emitted, and the gap is visible to users:
`joinDecided` (a person who asks to join is **never told the answer**),
`taskAssigned`, `peopleChanged`, `mention`. When you add a producer:

- Fan out on write, one row per recipient, `href` stored **studio-relative**.
- **Filter recipients through `effectivePermissions` before writing.** A notice
  naming a record the recipient may not open is an information leak dressed as a
  courtesy.
- Best-effort: the thing being announced has already happened, so failing to
  announce it must never fail the request.

## Verification

```bash
npm test && npx tsc --noEmit && npx next build
```

Golden responses must not move. If a workflow's output shape changes, that is its
own commit with a stated reason.

## Do not

- Set a post-approval status before approval completes.
- Write another department's records.
- Add a back-pointer that duplicates a fact the child already holds.
- Copy a task assignee onto a row.
- Re-derive permissions, or read `grants` (the model is gone).
- Take `studioId` from a request body.
