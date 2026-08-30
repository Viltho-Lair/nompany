# Nova's speech bubble

Nova saying something useful without being asked — a small talk bubble beside her launcher
that appears every two minutes, carrying one real fact about the studio, chosen for the
screen the person is looking at.

## What it is

A bubble anchored to the Nova launcher in the studio shell. In an English studio it sits to
the **left** of her head; in an Arabic one it sits to the right, because every offset in it
is logical (`end-*`) and the whole arrangement mirrors with the document direction. On a
narrow screen it moves **above** the launcher instead, where there is room for a sentence.

It is bonded to the launcher rather than merely placed near it: `NovaBubble` renders from
inside `NovaLauncher`, after the `enabled` guard, so a studio whose package does not include
Nova has neither, and there is no state in which one shows without the other. It stands down
while the chat panel is open, because the panel occupies the same corner.

The pieces:

| Where | What it does |
|---|---|
| `src/modules/main/insights.ts` | The derivations — rows in, insights out. Server-side; reads. |
| `src/shared/studio/insights.ts` | The wire shape, `rankForView`, and the sentences in EN/AR |
| `src/app/api/studios/[slug]/nova/insights/route.ts` | `GET`, gated on membership *and* on the Nova package |
| `src/components/studio2/NovaBubble.jsx` | The bubble: geometry, rhythm, the two actions |
| `src/components/studio2/NovaLauncher.jsx` | Mounts it, and takes "Ask Nova about this" into the chat |
| `src/modules/main/awaiting.ts` | `taskQueueFrom` — one definition of "waiting on me", shared |
| `src/app/globals.css` | `@keyframes nova-bubble-in` |

## What it can say

Twenty kinds, every one derived from the studio's own rows at read time. There is no stored
feed and nothing precomputed.

| Kind | When | Read from |
|---|---|---|
| `task.overdue` | a task assigned to you, past its due date | Tasks |
| `task.approval` | a decision routed to you, undecided | Tasks |
| `task.awaiting` | a task assigned to you, still open | Tasks |
| `quotation.noItems` | a Draft quotation with nothing priced under it | Technical |
| `quotation.stale` | Sent to the client 14+ days ago with no answer | Technical |
| `rfq.unquoted` | an RFQ 3+ days old with no quotation against it | Technical |
| `ticket.noRfq` | an open ticket nobody has raised an RFQ for | Sales + Technical |
| `ticket.deadline` | an open ticket due within 7 days, or past due | Sales |
| `project.overdue` | a live project past its end date | Projects |
| `project.uninvoiced` | a Completed project no invoice names | Projects + Finance |
| `stock.out` | an item with a reorder level and nothing on hand | Inventory |
| `stock.low` | on-hand at or below the reorder level | Inventory |
| `invoice.overdue` | Sent, past due, still outstanding | Finance |
| `invoice.draft` | a Draft invoice 3+ days old — the money was never asked for | Finance |
| `bill.overdue` | a payable past due and unpaid | Finance |
| `permit.expired` | `permitState` says Expired | Operations |
| `permit.expiring` | `permitState` says Expiring | Operations |
| `hr.docExpiring` | an ID or passport inside the expiry window | HR |
| `hr.leavePending` | leave waiting on a decision | HR |
| `notifications.unread` | your own unread notifications | the bell's own store |

Each names the single most pressing record and says how many others there are — *"Q-0041 is
still a draft with no items priced. (+2 more)"* — rather than listing them.

**Every condition is the owning module's own rule, never a second opinion.** On-hand comes
from `balances()` (the ledger, not a field on the item); outstanding from `invoiceTotals`;
permit state from `permitState`; expiring documents from `expiringDocuments`; "waiting on me"
from the same `enrichTask` routing the Awaiting-you widget uses, extracted into
`taskQueueFrom` so there is one definition rather than two. A bubble that disagreed with the
screen behind it would be worse than no bubble.

## Who sees what

`mainContext` is the authorisation, and its rule carries unchanged: **a section the viewer
cannot see is never read** — not read and hidden, not read at all. Finance, Payables,
Operations permits, the employee roll and leave are checked against their *leaf* right as
well, before the read, which is the same coarse-gate tightening Nova's chat tools apply:
being able to open Finance is not being able to read what is owed.

Two derivations cross a section boundary and go silent rather than guess. "This ticket has no
RFQ" is a statement about Technical, and "this project was never invoiced" is a statement
about Finance — so each is only made when both sections are visible. A `null` list means *not
yours to know*, never *there are none*.

Leave is gated on `hr.vacations.approve` rather than on view: "three requests are waiting" is
a thing to say to an approver and an over-share to everybody else.

## Language

**The API ships no prose.** It returns a kind and its variables; the sentence is assembled on
display from the reader's own dictionary, exactly as statuses and engagement stages are. That
is what keeps an Arabic studio from being handed English by an endpoint, and keeps a language
out of the goldens. Money goes through the caller's formatter (`fmtMoney`), so it is the
studio's currency and decimals — `shared/` never imports it.

A kind this build does not recognise is **skipped**, not drawn half-empty: the server can ship
ahead of the client on a deploy, and half a sentence reads as bad data rather than a rollout.

## Rhythm

First appearance 15 seconds after the shell mounts, then every 120 seconds, visible for 15.
The `×` buys ten quiet minutes. It walks the ranked queue rather than repeating its top item,
and only starts over once everything has been said once — otherwise one loud overdue invoice
would be the only thing Nova ever mentioned.

## Where you are

The shell passes the active section key down, so the ranking is about the screen: that
section's own insights first, then its department's, then everything else by weight. Nothing
is filtered out by the view — an invoice ninety days overdue is worth saying on the Tasks
board too; it simply says it later.

Ranking is **pure and client-side**, and the read is cached at module scope for five minutes.
Every studio screen is its own server render, so a fetch per mount would be thirteen
collection reads per click; instead one read serves a whole session of navigation and is
re-ranked as you move.

## Not built yet

- **It polls, it does not stream.** The list is re-read every five minutes rather than
  listening on the event stream, so a task assigned to you thirty seconds ago waits for the
  next read. `useLiveUpdates` is right there and this does not use it.
- **Snoozing is not remembered.** The `×` lives in component state; a refresh forgets it, and
  so does walking to another screen. There is no per-record "don't tell me about this again".
- **It never deep-links to a record.** *Open* goes to the section screen — the tickets list,
  the quotations list — not to the ticket or the quotation the sentence named. The routes for
  that exist; the hrefs do not use them.
- **No engagement insights.** The engagement layer is the natural home for "this deal has
  stalled between stages", and nothing here reads it.
- **Nothing is scheduled.** These fire while a tab is open and nowhere else. The daily notice
  cron (`timeNotices.ts`) is the thing that reaches somebody who is not looking, and the two
  do not share a catalogue — a condition worth a bubble has to be written twice to also be
  worth a notification.
- **It is not announced.** The bubble is a labelled landmark, not a live region — deliberately,
  because `role="status"` would interrupt a screen-reader user every two minutes with something
  they did not ask for, and a polite region inserted with its own text is the case several
  screen readers miss anyway. The cost is real: somebody who does not go looking for the
  landmark never learns a bubble appeared. The right answer is probably a per-person setting,
  and there is no settings surface for Nova to hang one on yet.
- **No quiet hours, and no per-person off switch.** Someone who does not want Nova speaking
  can dismiss each bubble, and that is all.
