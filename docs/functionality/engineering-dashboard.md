# The Engineering & Documents dashboard — what is waiting, what is late, where it stands

**Where:** `/<slug>/engineering-docs`, the section root, with the register cards below it.
**The figures:** `src/modules/engineering/model.ts` (pure, `tests/engineering-dashboard.mjs`).
**The service:** `src/modules/engineering/dashboard.ts` (`engineeringContext`, `engineeringDashboard`).
**The route:** `/api/studios/<slug>/engineering/dashboard` (GET only).
**The screen:** `EngineeringDashboard.jsx`. Built 13/09/2026.

## Why it exists

Until 13/09/2026 this root opened the presales dashboard — RFQs and quotations — which left with
the Quotations department (`quotations.md`), leaving only the generic register summary. What an
engineering or document-control lead asks first is not a count per status: it is what is waiting
on them, what is late, where the ball is on the questions asked, how the reviews of what was
submitted came back, and which controlled documents are due a review.

## No rule is restated

A document's state is the register's own `documentState`, and "waiting on me" is the open
revision's gate (`review` → the reviewer, `approval` → the approver), exactly as `waitingOn`
decides it. RFI, submittal, transmittal, BOM and library figures are read off the statuses the
built-in record types declare (`platform/engine/builtins.ts`). No clock is read on the screen:
`asOf` is the server's day and travels with the answer.

## It has no right of its own

`engineeringDocs.dashboard` is the key every role holding the old root already has, and it opens
the **Quotations** dashboard now. A second dashboard right would be held by nobody on the day it
ships, and would withhold nothing: **every block is gated by the reader's right over its own
register** (`engineeringDocs.register.view`, `engine.<type>.view`), and a register the reader may
not open is **never read**. The root is reachable by anybody who may open one of its registers —
the registers are declared as the context's `sub`, so a person holding only `engine.rfi.view` gets
in, which a prefix search from `engineering-docs` would not find. A register whose own section row
is missing counts as absent rather than falling back to the root's rows.

## What it shows

**Free, always** — one tile per register the reader holds:

| Tile | What it counts |
|---|---|
| Waiting on you | Documents whose open revision is at review with you as reviewer, or at approval with you as approver — beside how many are in review or approval at all |
| Open RFIs | Status Open, with how many are past *Needed by*. **Answered is not open** — the asker has not accepted the answer yet — and has its own tile |
| Submittals out for review | Submitted or Under review, with how many are past *Response due*. A draft or a sent-back submittal is not late on the reviewer |
| Document reviews due | **Effective** documents whose next review falls in the next 30 days or has passed. A draft has nothing issued to review; an obsolete one is not worked to |
| Transmittals awaiting acknowledgement, RFIs answered, engineering BOMs in review, current library references | The second row |

**Paid widgets** (registry section `engineering-docs`):

| Key | Widget |
|---|---|
| `engineering.attention` | Late RFIs and submittals by name, most late first, linking to the register |
| `engineering.document-status` | Documents by state (one state per document, so a donut) |
| `engineering.rfi-ball-in-court` | Open RFIs by who has to act next; a blank is counted as *Not set*, so the rows add up |
| `engineering.submittal-outcomes` | Approved / Approved as noted / Revise and resubmit, as they stand now |
| `engineering.rfi-intake` | RFIs raised per month, six months, by *Raised* else when entered |
| `engineering.review-due` | The documents coming due for review, with days left or overdue |

## Not built yet

- **RFI response time** is not measured. Engine records keep no status history, so when an RFI was
  answered is not recorded — only that it was.
- **Transmittal acknowledgement is a status**, not a person: who has not acknowledged a transmittal
  is not tracked.
- **Document acknowledgements** (who has read an issued document) are not on the dashboard.
- **A studio's own record types** under Engineering & Documents are not summarised here — only the
  five built-ins; they still appear in the register cards below.
- **No dashboard right**: the page cannot be withheld from somebody who holds one of its registers
  (see above for why).
