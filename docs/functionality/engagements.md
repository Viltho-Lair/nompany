# Engagements — the deal

## What it is

**One engagement is one deal.** It owns the client-facing facts once; every record in the
deal reads them from it rather than keeping a copy. Enter at any stage, in any order —
every stage is optional, and a missing stage is an invitation, never an error. The flow
alerts; it never blocks.

The stages: sales ticket, RFQ, quotation, project, and the project's children (sheets,
invoices, POs, deliveries, and the rest). All of them belong to one engagement.

## What it stores

Keys are built ONLY in `src/platform/db/keys.ts`, in the `ENG` object — never a literal.

```
s:<sid>:eng:<engId>                  the root: context + singleton pointers + lock state
s:<sid>:eng:<engId>:members:<type>   ZSET of recIds, scored by createdAt (many-cardinality)
s:<sid>:eng-index                    ZSET of every engId in the studio, scored by createdAt
s:<sid>:eng-ix:has:<type>            SET of engIds that have this stage
s:<sid>:rec-eng:<type>:<recId>       reverse index: record -> its engId
s:<sid>:rec:<type>:<recId>           declared; records still live in the section arrays
```

The root is small and rarely written:

```
{ id, studioId, ref,
  context:    { clientId, clientName, industry, urgency, title, deadline, contact{}, site{}, createdAt },
  singletons: { ticket, approvedQuotation, project },   // each recId | null
  createdAt, updatedAt }
```

**There is no engagement `status`, deliberately.** A single label is derived on read, never
stored — walked down the **template's** `statusChain` and stopping at the first stage the
deal carries *and the reader may see*. Two people can therefore read the same deal as having
different statuses, which is correct: each is told the truth about the part of it they are
entitled to, and a chain entry they lack the right to see would otherwise disclose the state
of a record whose existence is meant to stay invisible to them.

A stage with no status vocabulary of its own **is** the status: a contract has no `status`
field, so a deal whose furthest point is its contract reads "Contract". `statusType` names
the stage the label came from, so the screen can tell a stage name (translated like every
other stage name) from a record's own word (passed through).

**Membership lives in ZSETs, not on the root**, so a busy engagement never contends on one
document. Member keys use the **singular** registry type (`rfq`, `quotation`, `invoice`) —
the same identifier `attachRecord` uses, so a backfilled record and a live-created one land
in the same set. Plural keys were a real bug once.

**Ids are deterministic.** `deterministicEngId(headType, headId)` — pure-JS SHA-1 in
`src/platform/db/engagementId.ts`, deliberately NOT `node:crypto`, because `keys.ts` is
reachable from a client component and importing crypto there costs ~130 KB gzipped. A
ticket-headed deal is `deterministicEngId("ticket", ticketId)`; an internal quotation mints
its own from its own id. Same chain, same id, every time — that is what makes the backfill
idempotent.

**The registry is the single source of what a stage is** —
`src/platform/engagement/registry.ts`, pure, importable by a client component. One entry per
type: `type`, `cardinality`, `sectionKey`, `permission`, `collection`, `label`,
`unassignable`. Add a type there and the root shape, the attach step, the indexes and the
read layer all follow. Never hand-maintain a second copy of this vocabulary: a hand-written
list is how `readEngagementView` once silently dropped `bill` and `asset`.

## What it does

### The copy law — three rules, and confusing them is how data drifts

- **Context is LIVE, on the engagement.** Client, contact, site, industry, urgency, title.
  Read through the engagement, never copied onto a record. Where `clientId` names a real
  Client row, the name resolves from that row at read time; the stored `clientName` is only
  the free-text fallback for a client that has no record yet.
- **Documents and money are LOCK-FROZEN, reversibly.** Quotation prices, invoice lines, PO
  amounts are mutable while unlocked; locking snapshots them; unlocking (a separate right)
  makes them mutable again, and re-locking takes a fresh snapshot.
- **Issue-context is ISSUE-FROZEN, one-way.** An invoice's `clientName` is live while it is
  a draft and snapshots at issue — the record of who was billed, as named then. It is also
  what lets a Finance reader see it without holding a Sales right.

### Creating anything

Classify: (A) part of one engagement, (B) shared studio reference read live, (C)
infrastructure. Only A continues: find or mint the engagement → write the record with its
`engagementId` → attach (a `one` type CAS-claims the root slot and refuses a second; a
`many` type is a ZSET add) → index → `XADD` strictly before `publish`.

**A project's children resolve their deal from the project, and from nothing else.** An
invoice, a project sheet, a material order, a delivery note, a waybill and an overtime line
each carry a `projectId` and no lineage of their own, so `engagementOf(studioId, "project",
projectId)` — the reverse index the project wrote when it attached — is what says which deal
they join. Never a second derivation off the ticket/quotation chain: `openProject` already
made that choice ("the ticket's engagement, else the quotation's own"), and a derivation
repeated at the child's call site could differ by a hair and attach it to an engagement
nothing else uses. A record raised with **no project simply does not attach** — a valid end
state, not an error, and not a reason to park it in `__unassigned`, which is a holding pen
for a record awaiting promotion rather than a home for one that never had a deal. The attach
is best-effort by construction (`attachToProjectEngagement` swallows its own failures): a
create that succeeded must keep succeeding, and the backfill reconciles what was missed.

The client is an **input to** creating a ticket or quotation, not a field stored on them.
Both paths go through one helper, `resolveClientFor` (`src/modules/sales/salesClients.ts`),
which finds the client by normalised name, else by explicit id, else creates it, then folds
the deal's contact and site into it.

### Reading it

`readEngagementView(studioId, engId)` returns `{ ref, context, singletons, members, locked }`.
`src/modules/main/engagements.ts` turns that into the list and the block, filtering **every
stage by the permission its registry entry declares**, so each department reads its own part
of the same deal. The rule that governs that file:

> The engagement view must never reveal a record the viewer could not already see on that
> record's own department screen.

A withheld stage is **absent from the payload**; a visible-but-absent stage is
`present: false`. Those two must never look alike. The context is **projected** to what the
screen renders — returning `root.context` whole leaks the client's contact name and full site
address to any holder of `engagements.view` plus any one stage right.

**The block is template-driven.** Cards come back in the order the deal's flow walks, not in
registry declaration order, and the payload names the flow (`templateId`, `templateName`).
A stage the template lists and the deal lacks is an **invitation** — never a validation
error, because the flow alerts and never blocks. A stage the deal carries that its template
does not list is appended with `offTemplate: true` and shown, because a record that exists
and cannot be seen is worse than an untidy screen; it is never rendered as an invitation.

The template is resolved as: the deal's own `templateId`, else the default for its
`industryRef`, else Template A. The fallbacks exist only for deals written before templates
did, and A is chosen because it is the flow the previously hardcoded status walk was
approximating — so such a deal reads as it always did rather than becoming statusless.

**Cards are deliberately not numbered.** A withheld stage is absent from the payload, so
numbering what arrives would label stages 1, 4 and 5 as "1, 2, 3"; numbering them truthfully
would announce that two stages exist which the reader may not see. Position carries the
order without either failure.

### Deleting anything

Every create path owes a delete path, and they are one feature — never ship one without the
other.

Each stage declares its own `onDelete` in the registry: `"cascade"` for what the deal owns,
`"keep"` for what it merely borrowed. `task`, `expense`, `bill` and `asset` are kept — every
one is `unassignable`, raised on its own screen and attached to a deal afterwards, so its
presence on a deal does not mean the deal created it. A bill is money owed to a supplier;
writing that off is Finance's act, not a side effect of tidying a deal away.

**Deleting one record:** detach from the engagement BEFORE the row is removed, so a crash
leaves a row with no engagement state (which the backfill heals) rather than engagement state
pointing at a record that no longer exists (which nothing heals). Detach is the exact inverse
of attach: the singleton slot or the members ZSET, `dept`, `hasStage` when the last record of
that type goes, and `rec-eng`. A project's child needs no lineage to detach —
`detachFromItsEngagement(studioId, type, recId)` reads the reverse index its own attach wrote,
which is the only record of which deal it joined — and a record that never attached detaches
from nothing, which is a fact rather than a failure.

**Deleting a whole engagement:** children-first, registry-last, root last, idempotent on
re-run — walk the registry, never a hand-written list. Everything the deal owns dies with it:
tickets, RFQs, quotations, projects, project sheets, invoices.

**The rule that makes it safe: except if the information is created elsewhere.** A record the
deal merely *used* survives. The **Sales client above all** — `context.clientId` points at a
client, it does not own one, and other engagements reference the same row. Same for
collaborators, service actions, sections and settings: Tier B and Tier C survive. Deleting a
deal must never delete a client.

**Engagements are LOCKED by default** — `locked` absent on the root reads as locked, so
everything already stored is safe without a migration. A locked engagement cannot be edited
or deleted; unlocking is a right of its own, and the refusal lives in the store function, not
only in the route, because it is the interlock on a destructive action.

Before deleting, the affects-query answers *"deleting this will affect X, Y and Z"* — what
dies and what survives because it is owned elsewhere — filtered by the same permission rule
as the view, so it can never name a record the viewer could not already see.

### The backfill is the reconciler

`scripts/migrate/backfill-engagements.mjs` derives engagements from the existing chains. Dry
run by default, refuses the live namespace without `--allow-live`, writes only with
`--apply`, additive and idempotent — a missed dual-write is healed by re-running it. Applied
to live once; 7 engagements proven.

## Not built yet — do not assume otherwise

- **P2's six stage records have a schema, a collection and a service, and NO ROUTE, NO
  SCREEN and NO PERMISSION AREA of their own.** `contract` and `change_order`
  (`src/modules/sales/`), `timesheet` and `inspection` (`src/modules/projects/`), `job`
  (`src/modules/operations/`) and `payment` (`src/modules/finance/`) can be created and
  read by a caller holding their module's context, and nothing in the product calls one
  yet. Each answers to an EXISTING permission — `crmSales.quotations`, `projects.list`,
  `fieldService.schedule`, `finance.cash` — because minting an area for a record with no
  screen would move the 123-key matrix and every golden pinning it; each gets its own
  verbs when it gets a screen. Three consequences to know about while that is true:
  `inspection` belongs to Quality & HSE and is filed under Projects, `change_order` is
  approved under `edit` rather than an `approve` verb, and `payment` is reversed under
  `create`.
- **None of the six has a delete verb**, so each is only ever removed by its deal's
  cascade — and `payment` is `onDelete: "keep"`, so a deleted deal DETACHES it and leaves
  the row standing. Nothing detaches one individually, because nothing deletes one.
- **A change order does not adjust anything by itself.** `approvedValueDelta` sums the
  approved deltas for a caller that asks; no contract, deal or report reads it yet, so a
  deal's contract value is still the contract's own `value`.
- **A timesheet does not supersede `overtimes` yet.** Both collections exist, `overtimes`
  keeps its live screen, and nothing migrates or reconciles the two — so overtime booked
  the old way is invisible to `timesheetTotals` and vice versa.
- **A change order, a timesheet and a payment teach the deal nothing.** Each says why in
  its own service file; the short version is that a variation's title names the amendment
  rather than the deal, a timesheet knows only who worked and for how much, and a
  payment's counterparty on an outbound payment is a supplier rather than the client.
- **A change order cannot move the deal's deadline**, and neither can a job. Both are
  ranked against the contract by `platform/engagement/context.ts` — a change order is
  `commitment`, equal rank, and equal ranks never overwrite; a job is `execution` and
  WOULD overwrite, so it deliberately does not offer its dates at all, or every new job
  would drag the deal's deadline to its own. Moving an agreed end date is an explicit,
  audited edit, and there is no verb for one yet.
- Records still live in their section array collections, not at `rec:` keys.
- **Re-pointing a record at a different project does not move it between deals.**
  `editInvoice`, `editOrder`, `updateOvertime` and `updateShipment` each accept a new
  `projectId` and none of them re-attaches, so the record stays in the deal it first
  joined. That is the assignment feature (§3.6.2's promotion), not the create path.
- **`task`, `expense`, `bill` and `asset` still do not attach at all.** Every one is
  `unassignable` and `onDelete: "keep"` — raised on its own screen and assigned to a deal
  afterwards — so their attach is the assignment feature above rather than this one, and
  their delete verbs correspondingly detach nothing. When assignment lands, each of those
  four delete verbs needs its detach in the same commit.
- **Deleting a PROJECT does not delete or detach its children.** `removeProject` removes
  the row, its board and its plans, and leaves every sheet, invoice, order, delivery,
  shipment and overtime raised on it standing — still in the deal, now naming a project
  that no longer exists. The deal-level cascade reaches all of them; the project-level
  delete reaches none. Whether deleting a project should take its invoices with it is a
  product decision nobody has made.
- **Records created before the child attach shipped are unattached**, and so are any whose
  attach was swallowed. The backfill is what reconciles them, and running it is a decision
  of its own.
- **Neither an RFQ nor a project sheet has a delete verb of its own**, so both are
  cascade-deleted with their deal and neither can be deleted alone. There is nothing for
  them to detach, and nothing missing.
- `engagementBlock` reports `locked` and no screen reads it — the lock controls are on the
  list only, so opening one deal offers none.
- `removeEngagement` returns what it deleted and what it kept; the screen discards it and
  reports only success, so nothing tells the user after the fact which records survived.
- No reconcile job runs on a schedule; the backfill is manual.
- `buildEngagements`' orphan branch fills only `members.quotation` and null singletons, so a
  reconcile cannot heal an internal-quotation deal the way it heals a ticket-headed one.
- **The context has two names for the industry and nothing reconciles them.** The backfill
  writes `industry`; `platform/engagement/context.ts`, which came later, names the fact
  `industryRef` and that is what `contributeContext` writes. A backfilled deal that has
  since been contributed to can carry BOTH, with no rule saying which wins. The deal
  screen's template fallback reads either, deliberately, but that is one caller papering
  over it rather than a fix — the rename has not been done and no migration exists.
- No hop ceiling guards the engagements routes — and the block now reads the studio's
  flow templates as well (one read, or two when a pre-template deal has to be resolved
  through its industry). The lookup is deliberately one list read rather than one per
  candidate, but nothing enforces that it stays so.
- Deep links from a stage card (the backend does not emit `href`), and no `engagements` live
  channel.
