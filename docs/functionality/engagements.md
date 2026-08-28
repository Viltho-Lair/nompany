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

**There is no engagement `status`, deliberately.** A deal's status is its ticket's; its
delivery status is its project's. A single label is derived on read, never stored.

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
that type goes, and `rec-eng`.

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

- Records still live in their section array collections, not at `rec:` keys.
- **The project's children do not attach on create**, and therefore do not detach on delete.
  Invoices, expenses, shipments, deliveries, orders, overtimes, tasks, bills and assets all
  have live delete verbs and no attach, so they have nothing to detach *yet* — when any of
  them gains an attach, it needs a detach in the same commit.
- **No RFQ delete verb exists**, so RFQs are cascade-deleted with their deal but cannot be
  deleted on their own.
- `engagementBlock` reports `locked` and no screen reads it — the lock controls are on the
  list only, so opening one deal offers none.
- `removeEngagement` returns what it deleted and what it kept; the screen discards it and
  reports only success, so nothing tells the user after the fact which records survived.
- No reconcile job runs on a schedule; the backfill is manual.
- `buildEngagements`' orphan branch fills only `members.quotation` and null singletons, so a
  reconcile cannot heal an internal-quotation deal the way it heals a ticket-headed one.
- No hop ceiling guards the engagements routes.
- Deep links from a stage card (the backend does not emit `href`), and no `engagements` live
  channel.
