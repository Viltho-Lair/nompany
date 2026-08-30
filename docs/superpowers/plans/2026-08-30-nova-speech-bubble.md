# Nova speaks first — a bonded speech bubble carrying real studio context

*30/08/2026*

## The ask

A talk bubble beside the Nova launcher that appears every two minutes, bonded to the
launcher (same visibility, same corner, mirrored under RTL), carrying **real** studio
information chosen for the screen the person is on: "task X needs your assistance",
"quotation Q-0041 still has no assigned items", and a full catalogue besides.

The landing page fakes four such lines (`SmartInsights`). This is the studio's real one.

## The shape

### 1. Where the sentences come from — `src/modules/main/insights.ts`

A new reader on `MainContext`, which already owns the one rule that matters here:
**a section the viewer cannot see is never read** (`readIfVisible`). Nova's bubble
therefore inherits main's gating for free, and cannot leak a count from a department
the person was not granted.

Every derivation reuses the module's OWN definition of the condition, never a second
opinion:

| kind | condition | source of truth |
|---|---|---|
| `task.awaiting` | a task assigned to me, not Done | `enrichTask` (same as `headlines.awaitingMe`) |
| `task.approval` | a decision routed to me, undecided | `enrichTask` `myAuthorities` |
| `task.overdue` | mine, `dueDate` past | `Task.dueDate` |
| `quotation.noItems` | Draft quotation, `items.length === 0` | `QuotationSchema.items` |
| `quotation.stale` | Sent, no decision, > 14 days | `status` + `createdAt` |
| `rfq.unquoted` | RFQ with no `quotationId`, > 3 days | `RfqSchema.quotationId` |
| `ticket.noRfq` | open ticket, no RFQ against it | `salesTickets` × `rfqs.ticketId` |
| `ticket.deadline` | open ticket, `deadline` within 7 days | `SalesTicketSchema.deadline` |
| `project.overdue` | live project past `endDate` | `ProjectSchema.stage/endDate` |
| `project.uninvoiced` | Completed project, no invoice names it | `Invoice.projectId` |
| `stock.out` | reorder level set, on-hand <= 0 | `balances()` — the ledger, not the item |
| `stock.low` | reorder level set, on-hand <= level | `balances()` |
| `invoice.overdue` | Sent, past `dueDate`, outstanding > 0 | `invoiceTotals` |
| `invoice.draft` | Draft older than 3 days | `Invoice.status/createdAt` |
| `bill.overdue` | payable past due, outstanding > 0 | `invoiceTotals` (bills share the shape) |
| `hr.docExpiring` | ID/passport inside the expiry window | `expiringDocuments` |
| `hr.leavePending` | leave awaiting a decision, in my scope | `listVacations` scope |
| `permit.expired` | `permitState === "Expired"` | `permitState` |
| `permit.expiring` | `permitState === "Expiring"` | `permitState` |
| `notifications.unread` | unread, mine | `listForCollaborator` |

Twenty kinds. Each yields `{ id, kind, tone, section, href, vars, weight }` — **no
sentence**. The sentence is built on display.

### 2. Why the server sends tokens, not prose

House rule: *statuses and stages translate on DISPLAY only, keyed by the stored token,
so what the API returns is unchanged.* A sentence rendered server-side would be English
in an Arabic studio, or would put a language into a golden. So the route returns the
kind plus its variables, and `src/shared/studio/misc.ts` grows one builder per kind in
both languages.

### 3. The route — `GET /api/studios/[slug]/nova/insights`

`route({ auth: "studio", context: mainContext })`. Gated on `studioHasNova(studio)` the
same way `POST /nova` is: no package, no bubble. Returns `{ insights: [...] }`, capped,
ordered by weight. **No view parameter** — the client re-ranks, so one fetch serves a
whole navigation session.

### 4. Ranking by what you are looking at

`rankForView(insights, activeKey)` is pure and lives beside the derivations. Exact
section match scores highest, same department next, everything else by weight. The
client holds the fetched list in a module-scope cache for five minutes and re-ranks on
every mount, so walking Sales → Finance changes what Nova says without another read.

### 5. The bubble — `src/components/studio2/NovaBubble.jsx`

Rendered *inside* `NovaLauncher`, after the `if (!enabled) return null` — which is what
"bonded" means mechanically: there is no path on which the launcher shows and the bubble
does not, and none where the bubble outlives it. It is hidden while the panel is open,
because the panel owns the corner.

Geometry, measured against the launcher rather than guessed:

- launcher: `bottom-4`, `end-5` (20px) or `end-24` (96px beside the support chat), 64px wide
- bubble ≥ `sm`: `end-[6rem]` / `end-[10.75rem]` — 20 + 64 + 12, and 96 + 64 + 12
- bubble < `sm`: above the launcher (`bottom-[5.75rem]`), because a 300px bubble beside a
  64px button on a 360px screen is not a bubble
- the tail is a rotated square on the `end` edge, so **RTL mirrors it with everything
  else** — every offset here is logical, none is `left`/`right`

Timing: first at 15s, then every 120s, visible for 15s. `×` snoozes ten minutes.
Reduced motion drops the slide, not the bubble.

## Verification

- pure derivations and `rankForView` asserted in `tests/suite.mjs`, one assertion per
  condition that can be got wrong (the reorder-level comparison and the "Draft with no
  items" case especially — `headlines` has already shipped that bug once)
- `npm test`, `npx tsc --noEmit` (both configs), `npx next build`, bundle budget
- the screen opened under `npm run dev:sandbox`, in English and Arabic

## Not built yet

The bubble does not stream — it polls its list every five minutes rather than listening
on the event stream, so a task assigned to you thirty seconds ago waits for the next
read. Insights are not dismissible per-record beyond the session, and nothing is stored:
snoozing is component state and a refresh forgets it.
