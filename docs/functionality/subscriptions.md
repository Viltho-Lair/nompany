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
  | 365 | `expired` | Deleted by `cron/studio-deletions`, once warned, behind `UNPAID_DELETIONS` (see below) |

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
  - **A studio on a compound package is on a BAND** (24/09/2026, the owner). The band's
    id is stored on the studio as `categoryId`, next to `packageId`. The limit reads,
    most specific first: seats recorded on the subscription (an override), then the
    band's `maxEmployees`, then the package's ceiling.
    - Before this, a Medium studio sold 50–99 read "1 of 249", because the package's
      largest band was the only figure there was.
    - A compound studio with **no band** keeps the largest band. Nothing is guessed for
      it; `/super` shows "none" until somebody picks one.
    - `/super`'s studio dialog has a Band dropdown whenever the package has bands.
      Changing the package clears the band, and a band from another package is refused
      (`unknown-band`).
    - An upgrade request's quote carries the band, and a recorded payment stores it with
      the package. The payment form no longer copies the band's size into Seats, because
      the band sets the limit itself.
    - The Studios table and the studio's own header show the band beside the package
      ("Medium · 50–99").
    - A package **not on the public price list** (the old Premium) is marked "not on sale"
      in the dropdown, with a note to move the studio or keep it deliberately.
  - A studio already over its limit (a package whose limit dropped) keeps everybody;
    nobody more can join until it upgrades. `/super → Studios` shows used / limit and
    turns red when over.
- **The upgrade button** (step 3, 24/09/2026), shown to the owner in the studio header and
  on `/account`'s owned studios **when the studio's package has its "Upgrade button" switch
  on** (`/super → Packages`; the owner: "premium shouldn't show upgrade"). A package saved
  before the switch offers it when it costs nothing and is not Premium. That is not by type
  alone: the seeded default package is stored as "compound". The
  default is filled in on read, so the Packages screen shows the real state. The dialog
  has no "No tier": **Basic is the default tier**. Both open one dialog
  (`components/billing/UpgradeDialog`), loaded only when opened.
  - The owner picks a package, band, tier and monthly or yearly, priced in their region's
    currency with tax by the same rule the server uses (`shared/upgradeQuote`). A year is
    twelve of the price list's per-month "billed yearly" figure. Standard, and packages
    invoiced on headcount, can't be picked.
  - The dialog opens on the package picked at signup (`studio.requestedPlan`, set by
    studio creation); older studios open on the first package on sale.
  - **It's a request, not a payment.** `POST /api/studios/<slug>/upgrade` (owner only)
    re-quotes on the server and stores `studio.upgradeRequest` with the quote locked,
    then notifies `/super`. The owner can change or withdraw it.
  - **It stays open in a closed or shut-down studio** (`upgrade` is on the gate's
    always-open list), since that's when an owner most needs to pay.
  - In `/super`, the Subscription panel shows the request and fills "Record payment" from
    it: package, tier, seats, billing period and total. The payment carries its period, so
    a yearly one buys a year, and recording it moves the studio onto the package and
    clears the request.
- **Download everything** (step 6, 24/09/2026): `GET /api/studios/<slug>/export`, owner
  only, returns one JSON file (`lib/data/studioExport`).
  - It contains every record in every section, including switched-off and filed-only
    ones and each register's engine records, read through `readCol` so clients' details
    come out unsealed. It also has the members, roles, settings, section tree, and a list
    of uploaded files with names, sizes and the address that serves each one.
  - Secrets (API keys, the e-invoicing secret) and nompany's billing record are left out.
  - It is a read, so it works in a closed or shut-down studio. The shut-down screen and
    every owned studio on `/account` link to it.
- **The warnings** (`cron/subscription-notices`, daily 06:30 UTC). They go to the owner,
  in the studio's language, 30, 7 and 1 days before shut-down and again before deletion
  (`noticesDue`).
  - One email per step per run. A run that missed days sends only the most urgent
    warning and marks the earlier ones as sent.
  - A warning is recorded in the document's `sentNotices` only once the email went, and
    each step is recorded on its own.
- **Deletion at 365 days** is part of `cron/studio-deletions`, with its **own switch,
  `UNPAID_DELETIONS=on`**. That is separate from `STUDIO_DELETIONS`, which covers
  owner-requested deletions, because invariant 17 asks for this confirmation separately.
  Without it, the run only reports the studios it would delete.
  - A studio is deleted only when it is `expired` **and its one-day deletion warning was
    sent** (`unpaidDeletionDue`). A studio that was never warned is held and reported as
    `not-warned`.
  - Each studio is looked at again right before it goes, so a payment in the meantime
    keeps it. Files and the ten-year billing expiry are handled the same way as an
    owner-requested deletion.
- **Tracking it** (24/09/2026):
  - **Billing watch** on `/super → Studios`: every studio with something coming, soonest
    first (`nextStep`). That means a free or paid period ending within 30 days, or any
    studio already on the ladder, with its next step, date, days left, the warnings its
    owner was sent, and whether it asked to upgrade.
  - **Each warning email that went is a line in the studio's history** (`warning-sent`,
    with the step, the days, the date and the address), shown in the Subscription panel.
  - **Failures reach `/super` as notifications**: a warning that didn't send (or had no
    owner address), and any unpaid studio held from deletion as `not-warned`, every
    run while it stands.
  - **The sandbox clock** (`/api/studios/<slug>/sandbox-clock`, and a control on each
    owned studio on `/account`) moves a test studio to any day of the ladder, previews
    the warning emails, and resets.
    - It answers 404 unless the process is the sandbox (`lib/sandbox`: never a
      production build, and only when a key builder comes back namespaced), and the
      function under it refuses too.
    - It is on the gate's always-open list, so a shut-down studio can be moved back.
    - Each move is recorded as `sandbox-clock` and clears the sent warnings.
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

- **`UNPAID_DELETIONS` is not set anywhere.** Unpaid studios are reported and never
  deleted until the owner switches it on.
- **Reminders before the ladder starts** (an invoice due, a free period ending) exist only
  as the in-studio banner. No email.
- **The export includes no file bytes**: it lists each file and the address that serves
  it. It is built in memory, which is fine at today's sizes.
- **Invoices, credit notes and JoFotara**, **checkout**, and the owner's **Billing page**.
  An upgrade is a request that nompany answers by recording a transfer. The banner's and
  shut-down screen's "pay" still link to the contact page, not to the upgrade dialog.
