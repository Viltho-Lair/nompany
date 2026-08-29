# Direct project creation — design

**Status:** approved in conversation (2026-08-29), ready for an implementation plan.
**Supersedes nothing.** Extends `openProject` (`src/modules/projects/projects.ts`), the
engagement spine (`src/platform/db/engagement.ts`, `src/platform/engagement/backfill.ts`)
and the Projects list screen (`src/components/studio2/StudioProjects.js`).
Builds on `2026-08-26-engagement-storage-model-design.md` §3.4 (deterministic engagement
ids) and `2026-08-27-engagements-view-design.md`.

---

## 1. Problem

A project cannot be created. It can only be **derived**.

`openProject` takes three fields — `quotationId`, `managerCollaboratorId`, `location` —
and reads everything else off the approved quotation: title, client, value, the
ticket → RFQ → quotation lineage, the engagement it joins, and the two project sheets,
which hold no rows of their own and read the quotation's priced rows back through
`quotationId`. A hard commercial gate (`quotationApproved`) refuses anything else, and
the list screen's empty state says so in words: "projects open from an approved
quotation."

That is correct for work that came through the funnel. It is wrong for work that did
not. A studio handed a job directly — no ticket, no RFQ, no quotation — has no way to
record it as a project at all, and the button that would do it (`Open project`) names
the derivation rather than the act.

## 2. Goal

**New project** is a real create. Two ways in, one project afterwards:

- **From an approved quotation** — today's path, unchanged in behaviour and in response
  bytes.
- **New client work** — the client, the job and its figures typed by hand, capturing the
  same contact and site facts a new quotation captures, folded onto the same Client
  record by the same helper.

A directly-created project is a first-class member of the engagement layer: it mints its
own engagement, the way an internal (ticket-less) quotation already does, so it appears
on the engagements view and reconciles identically.

## 3. The two modes

One dialog. A segmented control at the top chooses the mode; the rest of the form is the
mode's own.

**Default:** *From an approved quotation* when `approvedQuotations.length > 0`,
*New client work* otherwise. The current dead-end — a dialog whose entire body is "no
approved quotations are waiting" plus a Close button — disappears, because the direct
mode is always available.

### 3.1 From an approved quotation (unchanged)

Quotation picker (with its `client · total` hint), project manager, location. Same
payload, same server branch, same response.

### 3.2 New client work

| Field | Control | Notes |
|---|---|---|
| Client | `Combo` over the studio's clients | Existing name → its `clientId`; a name off the list → a new client by name. Same case-insensitive, whitespace-collapsed match `NewQuotation` uses. |
| Title | text, required | |
| Type / industry | `Combo` over `TICKET_INDUSTRIES` | The same list Sales and Technical offer. Not a third copy. |
| Description | textarea | Stored on the project's `notes`. |
| Project manager | person select | The direct analogue of the quotation's *Handled by*. Optional. |
| Value | number | Typed, because there is no quotation total to read. Defaults 0. |
| Start date · Target end | `StudioDate` | In place of the quotation's single *Deadline* — a project has both. |
| Support period | number (days) | Defaults from `settings.supportPeriodDays`, as today. |
| **Contact + site** | `ClientBlock` | The shared eight fields, verbatim. Site starts at the studio's own country/city. |

`location` (the project row's own field, and the list's Location column and filter) is
filled from the site's city, so nothing downstream sees a new shape.

Required to save: client name, title. Everything else is optional and editable
afterwards in the project's detail dialog, as today.

## 4. Server

### 4.1 One write, two heads

`openProject` splits its **head**, not its body. A resolution step returns the same
shape either way:

```
{ title, clientId, clientName, value, quotationId, quotationNumber,
  rfqId, ticketId, engId, industry, notes }
```

- **Quotation head** — today's code, moved verbatim: find the quotation, the
  `quotationApproved` gate, the one-project-per-quotation check,
  `engagementIdForLineage`, and the engagement-first client resolution with its ticket
  fallback.
- **Direct head** — no quotation, so no gate and no duplicate check. Lineage ids are all
  `""`. The client is resolved through `resolveClientFor` against the Sales clients
  section, exactly as `createQuotation` does — find-or-create by normalised name, then
  fold this deal's contact and site onto the Client record. A studio with no Sales
  clients section refuses with `error: "client"`, the same refusal `createQuotation`
  returns in that case.

Everything below the split is shared and untouched: the row write, the sheets, the
engagement attach, `announceProjectManager`.

### 4.2 Route and permissions

`POST /api/studios/<slug>/projects` keeps one call to `openProject`; the branch is
`body.quotationId ? … : …` inside the module. No new permission key — a direct create is
`projects.list.create`, the right that already means "raise a project here". No new
route, no change to the status table.

### 4.3 The project row

Identical shape — **no new field on the project row.** `number: ""` until Finance issues
one, unchanged, because a project's number is Finance's act and the direct path does not
change who takes it. `quotationId`, `quotationNumber`, `rfqId` and `ticketId` are `""`;
`value` is the typed figure; `receivedDate` is today; `openedByCollaboratorId` is the
creator.

**Industry is not stored on the project.** It is the *client's* fact, and it is passed to
`resolveClientFor`, which writes it onto a Client record it creates — exactly what
`createQuotation` does with the same field. A project that copied it would be the fourth
copy of a fact the Client row already owns, and copies drift (the engagement spec's §1.2
is that lesson). It reaches the engagement's `context.industry` through the same route
every other stage does.

The detail dialog's lineage strip already filters falsy steps, so it renders nothing when
all four lineage ids are blank. It should say *Direct* rather than leave an unlabelled
gap.

## 5. Engagement

A directly-created project has no ticket and no quotation, so `engagementIdForLineage`
returns `""` today and the project would join **no deal at all** — invisible on the
engagements view, while `unassignable: false` in the stage registry says a project is
never supposed to be loose.

It mints its own root, `deterministicEngId("project", projectId)`. That is the same
answer an internal quotation already gets (`attachQuotationEngagement`), applied one
stage further down.

Two additive edits, both there to keep the live path and the reconciler in agreement:

1. **`engagementIdForLineage` gains a third fallback**, `projectId`, after ticket and
   quotation. Precedence is unchanged, so no existing derivation moves. `removeProject`
   already resolves through `engagementIdFor` (reverse index first), so a direct
   project's detach is correct with or without this — the fallback covers a row whose
   reverse index was never written.
2. **`buildEngagements` gains a third branch** — projects with no `ticketId` and no
   `quotationId` get their own descriptor: `singletons.project = id`, `context` drawn
   from the project's own client/title/industry and its `createdAt`, members gathered by
   `projectId` across the existing `memberTypes` table.

Edit 2 is the one that matters. Without it the reconciler does not rebuild what the live
path writes, and a directly-created project's engagement is silently dropped on the next
backfill pass. This is the same defect the internal-quotation path was fixed for once
already (`buildEngagements` read `q.clientName` where the live path read the Client row),
and it is worth stating plainly: **a live attach with no matching backfill branch is a
data-loss bug wearing a passing test suite.**

## 6. The sheets

Both sheets are created for a direct project too, with `quotationId: ""` — decided
deliberately, so a project's Sheets tab is the same tab everywhere.

The cost is stated rather than hidden: `sheetLines` composes a sheet's rows by reading
the quotation's rows back through `quotationId`, so a direct project's two sheets render
**permanently empty** until a quotation is attached to it. The sheet viewer must show an
explicit "this project has no quotation behind it" state rather than an empty grid — an
empty grid reads as a bug, and a stated absence reads as a fact.

Attaching a quotation to an existing project is **out of scope and not built**. The
sheets are ready for it: they are keyed by `projectId` and read the quotation live, so
the day that path lands, the existing sheets fill without migration.

## 7. Response shape — a deliberate golden re-record

The direct form needs three things the projects `GET` does not currently send:

| Addition | Why |
|---|---|
| `clients[].locations` | `ClientBlock` offers a client's **saved sites** back so nobody retypes one. `listProjectClients` trims to `{id, name, logo, contacts}` today. |
| `vocabulary.industries` | The Type/industry Combo, from `TICKET_INDUSTRIES`. |
| `studioDefaults.{country, city}` | A new site starts at the studio's own country and city, the same default a ticket and a quotation start from. |

This changes a golden body. Per the house rule it is **its own commit**, ahead of the
feature commit, with the reason stated in the subject and the body.
`NOMPANY_RECORD_GOLDENS` is never set in CI; the re-record is local and deliberate.

## 8. Copy

New keys in `src/shared/studio/projects.ts`, EN and AR both: the button (`New project`),
the two mode labels, the direct form's field labels that are not already there, and the
sheet viewer's no-quotation empty state. Statuses and stages are untouched. The client
name, the industry and the site are **data** and are never translated.

## 9. Testing

Beyond the standard four (`npm test`, `npx tsc --noEmit`, the strict config,
`npx next build`):

1. **The direct create writes a project and a project-rooted engagement.** One assertion
   per half: the row exists with blank lineage; the engagement root exists at
   `deterministicEngId("project", id)` with `singletons.project` pointing back.
2. **The reconciler agrees.** `buildEngagements` over that project alone produces the
   **same** `engId` and the same `singletons.project` the live path wrote. This is the
   §5 failure, asserted directly.
3. **The quotation path is unchanged.** Its golden stays byte-identical; the split must
   be a refactor, not a rewrite.
4. **`resolveClientFor` is called once, not twice.** The hop count for `POST /projects`
   is part of the contract, so the direct branch must not add a second Clients read on
   top of the one `ticketFacts` already performs.
5. **Refusals.** A direct create with no client name → `error: "client"`. A studio with
   no Sales clients section → the same. Neither writes a row.

Then browser-verify both modes against `npm run dev:sandbox` — a Server Component cannot
read the locale and neither `tsc` nor `next build` catches an unbound `tr`, so the screen
gets opened.

## 10. Not built yet

- **Attaching a quotation to an existing direct project** (§6). The sheets are ready; the
  path is not written.
- **Promoting a direct project's engagement** into a ticket-rooted one, should a ticket
  arrive later. Out of scope; §3.6.2's promotion in the engagement spec covers the
  general shape when it is wanted.
- **A project number.** A direct project still gets its number from Finance. Nothing
  here issues one.
