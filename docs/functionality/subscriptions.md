# Subscriptions — what each studio has paid nompany for, and what it may do

A studio's subscription to nompany: whether it is on trial, paid, complimentary or
lapsed, until when, and how many members it has paid for. This is nompany billing its
customers. It is not a studio's own Finance.

## What it stores

One document per studio at `g:subscription:<studioId>` (`BILLING.subscription`), holding
the subscription **and its history** together, so an event and its history line are one
compare-and-set. It is under `g:` deliberately: what a customer paid outlives the studio,
so no studio cascade reaches it.

| Field | Meaning |
|---|---|
| `kind` | `trial` (not paid yet), `paid`, or `comp` (given by nompany) |
| `period` | `monthly` or `yearly` |
| `anchorDay` | The day of the month it renews on. 31 renews on the last day of shorter months and returns to 31 |
| `paidUntil` | The first day **not** covered (`YYYY-MM-DD`). For a trial, the day it ends |
| `seats` | Members paid for. 0 means the package's own ceiling |
| `free` | The plan costs nothing (the Free package). **It ends**: when its time is up the studio is read-only at once, with no grace, unless it has picked a paid package. Set from the base price when the plan changes |
| `cancelAt` | The day a cancellation takes effect, or `""` |
| `seenEventIds` | The last 200 event ids applied, so a repeated event is applied once |

The history is append-only. Each line records the event id and type, when, who (`super:<adminId>`
or `system`), what the event carried, and the subscription before and after it.

Catalogue settings gained `trialMonths` and `graceMonths`, both default **3** (the owner,
23/09/2026), edited in the pricing settings dialog on the Packages screen.

## What it does

- **The status is worked out, never stored** (`subscriptionStatus`, `shared/subscription`),
  from the dates and today in **Amman time**. The checks run in this order: cancelled,
  complimentary, trial, a Free package whose time is up (`read_only` at once — the owner,
  23/09/2026: "Free package ends after 3 months unless the studio picks a paid package"),
  paid (`active`), unpaid but inside the grace months
  (`past_due`, still fully working), otherwise `read_only`. Nothing is deleted at any
  status.
- **Only a payment moves `paidUntil` forward; only a reversal moves it back.** A refused
  charge moves nothing and is only recorded.
  - Paying before or on time, or during grace, extends from `paidUntil`. Days used during
    grace are paid for.
  - Paying **after going read-only** starts from the payment day, which becomes the new
    anchor. Locked days are not charged.
  - The same event id twice is applied once.
- **New studios start on a trial** as long as their package's own Duration (months) — the
  length the Free card on the pricing page states — or `trialMonths` when the package has
  none. It is written at creation before the
  registry row. **Studios that existed before subscriptions are complimentary**, planted on
  their first read, so no script is needed (the owner, 23/09/2026).
- **Taking complimentary off makes a studio due that day**, not years back. Money is
  refused while it is complimentary.
- **A cancellation takes effect at `paidUntil`.** Paying or resuming clears it.
- **Seats block**: a join request is refused with `member-limit` once members reach the
  subscription's seats, or the package's ceiling when seats are 0 (`memberLimitOf`). This
  also closed a gap: a **compound** package has no package-level ceiling, so a studio on
  one had no member limit at all.
- **The console:** `/super → Studios` shows each studio's subscription status and
  paid-until date, and groups studios by subscription. The studio dialog's Subscription
  panel can record a payment received (periods, amount, currency, bank reference), reverse
  one that bounced, set seats and period, extend a trial, switch complimentary on or off,
  cancel and resume, and shows the history. Every action sends an event id minted before
  it is sent, so a retried press is one event.

## Not built yet

- **Read-only is not enforced.** The status is worked out and shown, and `canWrite` says
  what may write, but no route consults it yet. A read-only studio can still create.
  **This is the next step.**
- **Past-due reminders**, renewal emails and a renewal job: nothing sends anything yet.
- **No invoice, credit note or JoFotara submission** is produced by a recorded payment.
- **No checkout and no payment provider.** Every payment is recorded by hand in the
  console.
- **The studio owner cannot see their subscription** (no Billing page in studio Settings).
- **A package's Duration (months) is only the length of a new studio's trial.** On a paid
  package it is not yet a fixed term after which renewal stops.
