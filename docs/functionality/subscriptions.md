# Subscriptions — what each studio has paid nompany for, and what it may do

A studio's subscription to nompany: whether it's on Standard's free period, paid,
complimentary, or somewhere on the unpaid ladder, until when, and how many members it has
paid for. This is nompany billing its customers. It is not a studio's own Finance.

## The owner's rules (24/09/2026)

These replaced a trial for every studio and a three-month grace (23/09/2026).

- **Only Standard has a free period.** Standard (free, 1–4 users) gets three months per
  studio, and they're optional: paying at any time ends them and starts the paid package
  that day. **Paid packages have no trial and apply only once paid.** Nothing puts a studio
  back on a free period once it has left one.
- **The unpaid ladder**, counted in days from the date payment fell due. The invoice is
  issued at the start of the period (day 0).

  | Day | Status | What people can do |
  |---|---|---|
  | 0–19 | `due` | Everything, as normal |
  | 20–89 | `closed` | View and export only. Nothing is created or changed |
  | 90–364 | `shut_down` | Members are locked out. The owner can only read (pay and download everything) |
  | 365 | `expired` | Deleted by `cron/studio-deletions`. **Not wired yet** (see below) |

  **Paying at any point before deletion restores the studio at once.**
- **A Standard studio at the end of its three months takes the same ladder, closed that
  day**: there is no invoice it was late with. A cancellation that has taken effect is
  read the same way (`cancelled`, view only).

## What it stores

One document per studio at `g:subscription:<studioId>` (`BILLING.subscription`), holding
the subscription **and its append-only history** together, so an event and its history
line are one compare-and-set. It is under `g:` so no studio cascade reaches it. When a
studio is deleted, its document is given an expiry ten years out (terms §10).

| Field | Meaning |
|---|---|
| `kind` | `trial` (Standard's free months), `paid`, or `comp` (given by nompany) |
| `period` | `monthly` or `yearly` |
| `anchorDay` | The day of the month it renews on. 31 renews on the last day of short months and returns to 31 |
| `paidUntil` | The first day **not** covered (`YYYY-MM-DD`). For a free period, the day it ends |
| `seats` | Members paid for. 0 means the package's own ceiling |
| `cancelAt` | The day a cancellation takes effect, or `""` |
| `seenEventIds` | The last 200 event ids applied, so a repeated event is applied once |

Older documents may still carry a `free` field from 23/09/2026. Nothing reads it.

The catalogue settings keep `trialMonths` (default 3), used only when the Standard package
names no Duration of its own. The old `graceMonths` setting is gone: the ladder is
`LADDER` in `shared/subscription`.

## What it does

- **The status is worked out, never stored** (`subscriptionStatus`), from the dates and
  today in **Amman time**. `accessFor` turns a status into `full`, `view` or `owner-only`.
- **One gate decides every request** (`gateRequest`, called through
  `subscriptionRefusal` in `platform/http/route.ts`):
  - `full`: everything goes.
  - `view`: reads go; every change is refused with `studio-closed` (402).
  - `owner-only`: members are refused everything with `studio-shut-down` (402); the owner
    may read and change nothing.
  - Always open: notifications, the access check, and the live stream.
  - The wrapper asks on both the session path and the API-key path. So do the studio
    routes written outside the wrapper (members, roles, join requests, deals, the settings
    screens, overtimes, RFQs, technical settings, flows, the report builder's
    non-preview actions) and uploads (`/api/media`). A shut-down studio's files are
    refused to members too. **`subscription-model` fails if a new raw write route skips
    the gate.**
  - Requesting or cancelling a studio's deletion is always allowed to its owner.
  - Support chat with nompany (`/api/chat/start`) is not gated, so a closed studio can
    still reach nompany.
- **Only a payment moves `paidUntil` forward; only a reversal moves it back.** A refused
  charge moves nothing and is only recorded.
  - During Standard's free period, the paid package starts **today**.
  - Paid on time or within the open 20 days, the new period runs from the due date.
  - Once closed or shut down, it starts again from the payment day (the new anchor);
    locked days are not charged.
  - A payment may name the **package, tier and seats** it is for. The studio moves onto
    that package only once the payment is applied, and only the first time.
- **New studios** start on Standard's free months (the package's own Duration, else
  `trialMonths`). A studio created on a paid package is due the same day. **Studios that
  existed before subscriptions are complimentary**, planted on first read.
- **Seats, at every door** (step 2, 24/09/2026). A seat is the owner plus everyone who
  joined: every row of the studio's member list. The limit is the seats the subscription
  paid for, else the package's own ceiling (`shared/seats`). A **compound** package's
  ceiling is its largest band; its form has no package-level maximum, so until now a
  studio on Small or Medium had **no limit at all**.
  - There is exactly one way in besides the owner at creation: approving a join request.
    The seat is now counted **inside the same write that adds the member**, so two
    approvals racing for the last seat can't both get in. An approval that loses goes
    back to **pending** rather than telling somebody yes and leaving them outside.
  - Asking to join is never refused for being full, because a non-member must learn
    nothing about a studio's contents (invariant 2). The refusal comes at approval, to
    somebody inside.
  - A studio already over its limit (a package whose limit dropped) keeps everybody;
    nobody more can join until it upgrades. `/super → Studios` shows used / limit and
    turns red when over.
- **The studio sees it.**
  - A banner above every screen when payment is due, the studio is closed or cancelled,
    or Standard's free period ends within 14 days.
  - Once shut down, the studio is replaced by one screen. Like the not-a-member screen,
    the page itself never renders. The owner is told what's kept and until when; a member
    is told only the owner can reopen it.
- **The console:** `/super → Studios` shows each studio's subscription status and
  paid-until date and groups studios by status. The studio dialog's Subscription panel
  shows the ladder's dates and can record a payment (with the package and tier it's for),
  reverse one, set seats and period, extend a free period, switch complimentary on or off,
  and cancel or resume, with the history underneath.

## Not built yet

- **Deletion at 365 days.** `expired` is computed, but `cron/studio-deletions` only
  deletes studios whose **owner** asked. Wiring expired studios into it comes with the
  export and warning emails (step 6), since the terms promise warnings first.
- **Warning emails** (30, 7 and 1 days before shut-down and deletion) and payment
  reminders. The terms promise these from 24/10/2026.
- **Download everything** for a shut-down studio's owner. The shut-down screen draws no
  button for it rather than one that does nothing.
- **Invoices, credit notes and JoFotara**, **checkout**, and the owner's **Billing page**.
  "Pay" links to the contact page until then.
- The **upgrade button** (step 3).
