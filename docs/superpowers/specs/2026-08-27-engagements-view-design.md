# The Engagements View — design

**Status:** approved in design (27/08/2026). The first read surface for the engagement storage model.

**Builds on:** `docs/superpowers/specs/2026-08-26-engagement-storage-model-design.md` (the storage model)
and the shipped Phase 0 / 1a / 1b work on `main` — the engagement store, the backfill, and the whole
spine dual-writing its engagement on create.

---

## 1. Why

The engagement layer exists and is populated: every ticket, RFQ, quotation and project written since
Phase 1b attaches to its engagement, and the backfill has clustered the pre-existing chains. **Nothing
reads it.** A deal is still assembled by eye across six department screens.

This is the first surface that reads the layer — one screen where a deal is a single block: its client
and title stated once, and each stage shown as present or offered, never as a broken field.

## 2. Goal

A person opens `/<slug>/engagements`, sees the deals they are entitled to see, opens one, and reads the
whole engagement in one place: the live context, and a card per stage that exists. Stages they hold no
right to are absent. Stages that do not exist yet read as an optional next step, not as missing data.

**v1 is read-only.** No actions on the block.

## 3. Location and routing

The studio URL scheme is `/<slug>/<section-key>` — the first path segment IS a section key, and the bare
`/<slug>` is Main. Engagements is **not a section**:

- **URL:** `/<slug>/engagements`, an explicit early return in `src/app/studio/[[...segments]]/page.js`,
  checked BEFORE the section lookup. An established pattern in that file: `documentation`, `sales-live`
  and the project board are all non-section routes resolved the same way.
- **Nav:** an entry in the non-section `admin` array in `src/components/studio2/StudioFrame.js`
  (today People and Access), placed **above People**.

### Why not a section — the trap this avoids

`sectionViewable` in `src/platform/access/resolve.ts` ends in `return !own`, with the comment that
"a heading with neither areas nor children — the studio home — has nothing to protect, so it stays."
Main is visible to every member precisely because it has **no area and no children**.

Giving Main a child section (`main-engagements`) would change `sectionViewable("main")` from that
fallthrough to `children.some(viewable)`. A member without the engagements right would then fail every
branch, and **Main would disappear from their sidebar entirely.** A new top-level section would instead
make a thirteenth department. The non-section route avoids both.

## 4. Access

### The key

One new catalogue area in `src/platform/access/catalogue.ts`:

```
{ key: "engagements", group: "Engagements", label: "Engagements", verbs: ["view"] }
```

giving the single key `engagements.view`. It appears on the Access screen like every other right, so an
owner or admin grants it to any role. Owner and Admin hold it automatically — both short-circuit to
`ALL_PERMISSIONS` in `effectivePermissions` — and everyone else is default-denied (invariant 4).

**Deliberately not `scoped`.** An own/department/all dimension would be a second mechanism for something
the per-stage permissions below already do.

### What each person sees inside — the department lens

`engagements.view` grants the *screen*. What appears *in* it is decided per stage by the permission the
**stage registry already carries** (`src/platform/engagement/registry.ts`): `ticket` to
`sales.tickets.view`, `rfq` to `technical.rfq.view`, `quotation` to `technical.quotations.view`,
`project` to `projects.list.view`, `invoice` to `finance.cash.view`, and so on for every stage.

So Sales sees the ticket, Technical the RFQ and quotations, Projects the project, Finance the invoices.
Each department reads its own part of the same deal. A stage the viewer holds no right to is
**withheld** — not blanked, not placeholdered, not counted.

### The safety property

> **The engagement view must never reveal a record the viewer could not already see on that record's own
> department screen.**

It holds by construction, and it is the rule the tests pin. A Sales user seeing every engagement's ticket
is exactly what `sales.tickets.view` already grants them on the Sales screen; the engagement view
*assembles* what they may see and never widens it. An engagement in which the viewer can see no stage at
all is not listed.

Engagement **context** (client, title, ref) is shown when at least one stage is visible — a viewer who can
see the ticket can already read its client on the ticket itself.

## 5. Storage — the engagement index

Listing must enumerate a studio's engagements. There is no such index today, and deriving the list by
re-reading `salesTickets` (plus orphan quotations) on every load is exactly the whole-collection scan this
restructure exists to remove.

**New key builder** in `src/platform/db/keys.ts`, added to the existing `ENG` object:

```
index: (studioId) => `${P}s:${studioId}:eng-index`
```

a **ZSET of engagement ids scored by `Date.parse(createdAt)`**.

**One insertion point:** `applyDescriptor` in `src/platform/db/engagement.ts`. Every path that creates an
engagement root already funnels through it — the ticket dual-write, the internal-quotation dual-write, and
the backfill. `attachToTicketEngagement` needs no index write: it attaches to a root that already exists.
The same one-line write goes into `createEngagement`, so no root-creating primitive can miss the index.

Re-running the backfill populates the index for the engagements already on live; `ZADD` per id makes that
idempotent.

**Scored by `createdAt`, not insertion order**, because that is what makes later analysis possible:
`ZRANGEBYSCORE` answers "engagements created this month" directly, and the existing `eng-ix:has:<type>`
sets compose with it for funnel figures — `SCARD has:quotation` against `SCARD has:project`, `SDIFF` for
the drop-off — without reading a collection.

## 6. Read layer

A new module `src/modules/main/engagements.ts`, gated inside the service functions rather than only at the
route — the `createTicket` precedent: routes get added and forgotten.

- **`listEngagements(ctx, { limit, cursor })`** — `ZRANGE` the index newest-first, batch-read those roots
  with `getJSONMany`, drop any engagement the viewer can see no stage of, and return one row each:
  engagement id, ref, client name, title, the stages that exist AND are visible to this viewer, a derived
  status, and `createdAt`. Cost is O(page), not O(collection).
- **`engagementBlock(ctx, engId)`** — `readEngagementView` for the context and stage ids, then resolve a
  one-line summary for each **visible** stage from its own record: ticket ref and status, RFQ status,
  quotation number and status, project number and stage. Only the collections whose stages both exist and
  are visible are read. Refuses with `forbidden` when no stage is visible.

**Derived status.** The engagement stores no status of its own — the storage spec removed it deliberately,
because a deal's status is its ticket's and its delivery status is its project's stage. The view computes
one label: the project's stage when there is a project, else the ticket's status, else the quotation's.
Derived on read, never stored.

## 7. Routes

Two GETs, through the existing route wrapper and `mainContext`:

- `GET /api/studios/[slug]/main/engagements` — the paged list.
- `GET /api/studios/[slug]/main/engagements/[engId]` — one block.

Both are new routes, so they ADD golden cases. The existing 144 goldens must stay byte-identical.

## 8. The screen

Loaded through `nextDynamic()` like every other department screen, so it lands in its own chunk and the
largest-chunk budget (250 KB gz) is unaffected.

- **List** — the studio's deals: ref, client, title, derived status, and a badge per stage showing which
  exist. The badges are where "enter from any stage" becomes visible: a deal that began at a quotation
  simply has no ticket badge.
- **Block** — a context header (client, title, ref, derived status) and one card per stage. A stage that
  exists shows its reference and one-line summary, linking to that record's own screen. A stage that does
  not exist renders as an **optional next step** ("No project yet"), never as "N/A" or an empty row. A
  stage the viewer may not see is absent entirely.

## 9. Testing and contracts

- **Index** — an engagement created through a create path lands in the index; the backfill populates it;
  re-running is idempotent.
- **List** — returns the studio's engagements newest-first; paging works; an engagement with no visible
  stage is omitted.
- **Block** — a partial engagement renders (a deal with no project is not an error); absent stages are
  absent rather than an error.
- **The safety property** — a collaborator holding `engagements.view` but not `finance.cash.view` gets a
  block with no invoice data anywhere in the payload. This is the permission proof the design rests on, and
  it belongs in the permission matrix.
- **Contracts** — the permission matrix gains one key (102 to 103), picked up automatically. New routes ADD
  goldens; existing goldens must not change. `NOMPANY_RECORD_GOLDENS` is never set in CI.

## 10. Non-goals

Not in v1: any action on the block (converting, approving, opening a project); full stage detail such as
quotation lines or invoice amounts — the block is an overview and each card links to the record's own
screen; the project's children attaching on create; and the deferred engagement-layer cleanup already
ledgered (score members by `createdAt`, `dept`/`hasStage` on backfilled engagements, routing the
best-effort write miss through observability, and the reconcile job).

## 11. Compliance

- Keys are built only in `src/platform/db/keys.ts` (invariant 1) — the new `ENG.index` builder included.
- Access is resolved once, in `effectivePermissions`; no route re-derives it (invariant 3). Default deny
  (invariant 4).
- Membership authorises: the engagement index is read under the caller's own studio, so no cross-tenant
  read is expressible (invariant 2).
- Reads only. This spec adds no write beyond the single `ZADD` maintaining the index, which is additive and
  reconcilable by the backfill.
