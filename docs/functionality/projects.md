# Projects — where work is delivered

## What it is

**A project is delivered work**, with a stage (`Received` → `In Progress` → `On
Hold` → `Completed`), a manager, dates, a support window, and — once a project
has children — a board and a plan. There are **two ways one begins**:

1. **From an approved quotation.** The whole chain — ticket, RFQ, quotation —
   is already known, so the dialog asks for three things (which quotation,
   who manages it, where) and the server reads everything else off the chain.
2. **Directly.** The studio was handed the job with no ticket, no RFQ, no
   quotation behind it — work brought in by a call, a walk-in, a referral.
   The client, the title, the industry, a description, a value, dates and the
   support period are typed on the spot.

`src/modules/projects/projects.ts`'s `openProject` decides which one ran by
whether the request body carries a `quotationId` — there is no mode flag a
client could set to skip the gate. Everything below that split — the row
itself, the two sheets, the engagement attach, the manager notification —
cannot tell which head ran, and that is deliberate: a second create path is a
second place the engagement dual-write could be forgotten, which is exactly
how a record ends up on no deal at all. See `quotationSource` and
`directSource` in that file, and `NewProject` / `FromQuotation` /
`DirectProject` in `src/components/studio2/StudioProjects.js` for the two
halves of the dialog.

## What each path supplies

| Fact | From a quotation | Direct |
|---|---|---|
| Title | the ticket's, else the quotation's | typed |
| Client | the engagement's `context.clientId`/`clientName`, live | resolved by `resolveClientFor` |
| Value | the quotation's `total` | typed, defaults to 0 |
| `ticketId` / `rfqId` / `quotationId` / `quotationNumber` | the chain | all `""` |
| Industry | not read; irrelevant to this path | typed, written onto the Client record |
| Description (`notes`) | never sent; stays `""` | typed |
| Dates, support period | typed on the shared dialog fields either way | — |

**From a quotation, the commercial gate is hard.** `quotationSource` asks
`quotationApproved(quote, tasks)` — approval is a fact about the `po` approval
TASK, never about the quotation's own stored status, because the decision is
made on the board and nothing writes it back onto the document. An
unapproved or already-used quotation (`existing.some((p) => p.quotationId ===
quotationId)`) refuses before anything is written. The direct head has no
commercial gate and no one-project-per-quotation check, because it has no
quotation to check against.

## The client is Sales' record

**Projects does not own a client model — Sales does, and `directSource`
resolves into it exactly the way `createTicket` and `createQuotation` do:
one call to `resolveClientFor` (`src/modules/sales/salesClients.ts`).** It
finds the client by normalised name, else by the given id; if neither
matches, it creates one. Either way, this deal's contact and site are then
folded onto that Client record (`upsertContact` / `upsertLocation`, each a
no-op write when nothing actually changed). A studio with no Sales clients
section has no client model to resolve into and `directSource` refuses with
`{ error: "client" }`, the same refusal `createQuotation` gives in that case.

**Industry is the client's fact, not the project's.** `directSource` hands the
typed industry to `resolveClientFor`, which uses it only when it CREATES the
client; on a name that already matches, the existing client's industry stands
and the typed value is dropped rather than overwriting what Sales holds. Either
way the project row stores no copy — a fourth copy of something the Client row
owns is the drift this product keeps removing. It reaches the engagement by being read live off the Client row:
`buildEngagements`' orphan-project branch (`src/platform/engagement/
backfill.ts`) sets `context.industry` from `clientById.get(p.clientId)
?.industry`, never from the project.

## The project number is Finance's to issue

**`number` is `""` on both paths, by design.** It is quoted on invoices,
purchase orders and delivery notes — the studio's commitment to bill the
work — and issuing it is Finance's act, taken when the `po` approval task
is fully decided (`issueProjectNumber`, called from `decideTask`, not
guarded by a Projects permission: it is the *consequence* of an authority
signing, not an action somebody takes on the Projects screen). It is
idempotent — a project that already has a number keeps it — and derived from
the highest already issued (`nextReference`), never from a count, so a
deleted project cannot have its number reused. A direct project is no
exception: nothing about being created without a quotation issues it a
number early, or a different way.

## A direct project roots its own engagement

**Every project joins an engagement**, because the stage registry marks
`project` as `unassignable: false` — a project is never supposed to be loose.
From a quotation, the engagement is knowable before the row exists
(`engagementIdForLineage`: the ticket's, else the quotation's own) and
`openProject` attaches to it and records the approved quotation
(`attachRecord` + `setApprovedQuotation`). A direct project has neither, so
it cannot be resolved — it is minted, on the row that was just created, at
`deterministicEngId("project", project.id)`. That is
`attachProjectEngagement(studioId, project, client)`
(`src/platform/db/engagement.ts`), the same shape an internal quotation's own
engagement takes one stage up.

`buildEngagements` (`src/platform/engagement/backfill.ts`) carries a matching
third branch — after the ticket branch and the internal-quotation branch —
for a project with neither `ticketId` nor `quotationId`, so the reconciler
rebuilds the identical root from the stored row alone. That branch reads the
live Client row for name and industry the same way the other two branches do,
falls back to the project's own `number`, else its `title`, for the
engagement's `ref` (a permanently blank ref would leave the card unnamed on
the engagements view), and fills every member slot (`sheet`, `invoice`,
`order`, and the rest) from the project's children the same way the
ticket-headed branch does.

Both the attach and the mint are best-effort — wrapped so a create that
succeeded keeps succeeding even if the engagement write fails — and the
backfill reconciles what a failed attach missed.

`removeProject` resolves the engagement to detach from the same way:
`engagementIdFor` tries the reverse index first, and falls back to
`engagementIdForLineage({ ticketId, quotationId, projectId })` — the third
field, `projectId`, is what lets a direct project's delete find its own
root when the reverse index was never written.

## The sheets

**Both project sheets — Main and Bulk — are created on either path**, in
`openProject`, and again lazily by `ensureSheetsExist`
(`src/modules/inventory/inventory.ts`) for any project opened before a sheet
existed. Neither guards on `quotationId`: a direct project gets its pair
exactly as a quotation-sourced one does, so the two create paths never
disagree about whether a project has sheets, and each seeded sheet attaches
to the project's engagement as a `sheet` member the same way one drawn up by
`openProject` does.

**A sheet holds no line of its own.** It stores only its own additions,
keyed by the quotation row they belong to (`lines: { [rowId]: {...} }`); the
rows themselves are read back live through `quotationId` on every read
(`composeSheet`, `listProjectSheets`). A direct project's `quotationId` is
`""`, so `composeSheet` has nothing to read rows from and returns no tables
— **permanently empty, not broken.** The viewer
(`src/components/studio2/StudioSheetViewer.js`) tells the two kinds of empty
apart in words rather than showing an identical blank grid: a sheet with a
`quotationId` and no tables is waiting on somebody to price the quotation
(`quotationNoPricedLines`); a sheet with none is a project raised directly,
which can never fill from this screen (`noQuotationBehindProject`).

## Not built yet — do not assume otherwise

- **Attaching a quotation to an existing direct project is not written.**
  The sheets are keyed by `projectId`, not by a lineage the project carries
  once, so — mechanically — pointing a direct project's `quotationId` at a
  real quotation would make its sheets read rows and fill on the next
  request, no migration required. Nothing does that pointing: no route, no
  screen action, no store function accepts a quotation on an already-open
  project. A direct project's chain is empty for its whole life today.
- **A direct project's engagement cannot be promoted into a ticket-rooted
  one.** If a ticket for the same client and work turns up after the fact,
  there is no path that re-roots the project's engagement at
  `deterministicEngId("ticket", ticketId)` and folds the direct root's
  members and context into it — they would remain two separate deals for the
  same work, one of them orphaned from any ticket. Nothing detects the
  collision, either.
- **Nothing outside Finance's `po`-approval path issues a project number.**
  There is no manual override, no route, and no screen control that lets
  anyone else set or force one — a direct project with no quotation, and
  therefore no `po` task, keeps `number: ""` for as long as it exists, with
  no way to give it one.
