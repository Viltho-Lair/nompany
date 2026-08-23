# nompany — the guide

nompany is a multi-tenant ERP: one platform that runs many companies, each in its
own private workspace. This guide explains what the product does and how to use
it — for the people who run a company inside it, the people who administer one,
and anyone deciding whether it fits.

It is written for users, not developers. Where a rule exists for a reason, the
reason is given, because knowing *why* a screen behaves a certain way is what lets
you trust it.

---

## 1. The shape of the product

Everything lives at one address, and which part you see depends on where you are:

- **A company workspace** — `nompany.com/<company>/…`. This is the ERP itself: the
  twelve departments a company works in. Each company (we call it a **studio**)
  has its own slug, its own data, its own people, and never sees another's.
- **Your account** — `nompany.com/en/…` (or `/ar/`). Your personal hub: your
  profile, the studio you own, the studios you've joined, your devices, and your
  own AI key for Nova. This is *yours*, shared with no studio.
- **The console** — `nompany.com/super`. nompany's own back office, where the
  people who run the platform manage studios, plans, and features. Most users
  never see it.

A studio's slug is a **public address** — like a company's name on a door. Knowing
it lets you *ask to join*; it does not let you see anything inside. Membership is
what grants access, never the URL.

---

## 2. Getting started

1. **Sign up** with your email. You verify the address before a company can be
   created under it.
2. **Answer the short questionnaire** — it asks whether you're here to *create* a
   company or *join* one, and a little about your field. Nobody reaches an account
   or a studio until it's answered.
3. **Create your studio** (you may own one) or **join an existing one** by typing
   its code — this raises a request the studio's admins approve.

Once you're in a studio, the left nav lists the departments you're allowed to
open. What you *don't* see, you don't have access to — nompany shows nothing it
won't let you use.

---

## 3. Roles & access — how permission works

This is the heart of the system, so it's worth understanding once.

- **Default deny.** With no role, you can do nothing. Access is only ever what
  your roles grant — there's no hidden fallback.
- **Roles are sets of permissions.** An admin builds roles on the **Access**
  screen (e.g. "Sales rep", "Finance manager") and assigns them to people on the
  **People** screen. A person can hold several roles; they get the union.
- **Admin is a role, not a flag.** The Admin role holds everything. The studio
  **owner** always holds everything and can never be locked out.
- **Scopes.** Some rights come with a reach — *own* records, your *department's*,
  or *all*. A team lead might see their department's leave but no further.
- **Nobody grants what they don't hold.** You cannot hand someone a permission you
  lack — enforced both when editing a person and when approving a join request.
- **Reviewer is not approver.** On anything that gets signed off, the person who
  raised it cannot also approve it — holding both rights is fine, using both on
  one record is not.

Every screen respects one resolved answer to "what may this person do", so what a
button offers and what the system actually allows can never drift apart.

---

## 4. The twelve departments

Each studio has twelve departments. You see the ones your roles open.

| Department | What it holds |
|---|---|
| **Main** | The home screen — headline figures and recent activity across everything you can see. |
| **Sales** | Sales tickets (opportunities), the client directory, and the service catalogue. |
| **Technical** | RFQs (requests for quotation) and the internal quotations that answer them. |
| **Projects** | Projects (opened from approved quotations), SLA support contracts, and overtime. |
| **Inventory** | Stock items, vendors, purchase/material orders, deliveries, project sheets, and air-waybill (AWB) shipment tracking. |
| **HR** | Employees, leave requests, certifications, and identity/passport document tracking. |
| **Finance** | Invoices, expenses, supplier bills (accounts payable), fixed assets, the general ledger, and the finance dashboards. |
| **Operations** | Locations, permits, shifts/rota, and live positions. |
| **Quality** | Controlled documents and their revision workflow. |
| **Tasks** | The task board, including typed tasks that route approvals to the right people. |
| **People** | Members, their roles, and join requests. |
| **Access** | Roles and the permission catalogue. |

---

## 5. The core flow: a sale becomes a project becomes an invoice

The departments aren't islands — the main workflow runs straight through them.

1. **Sales** — a **ticket** is raised for a client (title, services, deadline,
   budget). It starts as a *Lead*.
2. **Technical** — someone raises an **RFQ** against the ticket, which moves it to
   an *Opportunity*, then builds an internal **quotation** with priced lines.
3. **Approval** — the quotation is sent for approval. Approval routes as a task to
   whoever holds the authority; the raiser can't approve their own.
4. **Projects** — an **approved** quotation can be opened as a **project**. The
   commercial gate is real: only an approved quotation becomes a project.
5. **Finance** — the project is billed. An **invoice** is raised (from the project,
   so the client is snapshotted), payments are recorded against it, and the money
   flows into the reports and — when posted — the ledger.

Reference numbers only ever move forward. Deleting a draft never lets the next one
reuse a number a client already holds.

---

## 6. Finance in depth

Finance is the richest department, so here's what each piece does.

- **Invoices** — raised as drafts, then issued. Each carries VAT (15% by default),
  lines, and a payment history. *Paid* is derived from the payments, never
  declared, so the balance is always defensible. Overdue is flagged automatically.
- **Expenses** — money out, by category, optionally tagged to a project.
- **Bills (Accounts Payable)** — what you owe vendors. A bill mirrors an invoice
  (same lines, same VAT), with one thing invoices lack: **approval**. Raising a
  bill and authorising it are two acts, and one person may not do both to the same
  bill. Payments are recorded against it just like an invoice.
- **Fixed assets** — what the company owns and writes down over time. Depreciation
  is **derived**, never a stored schedule that goes stale: straight-line, or a
  reducing balance that lands on salvage at end of life. Disposing an asset stops
  the clock and works out the gain or loss.
- **The general ledger** — a real double-entry book. Every posting balances to the
  cent, and a posted entry is never edited — you correct it by posting a
  **reversal**, so the record only ever grows. An invoice, a payment, an expense
  or a bill can each be posted into a balanced journal entry with the conventional
  accounts behind it. The trial balance is guaranteed to balance, because no
  unbalanced entry was ever allowed in.
- **The dashboards** — receivables/payables aging, top debtors and vendors,
  collection rate, days-sales-outstanding, income vs expense, expense mix, and the
  fixed-asset register. **Dashboard analytics is a paid capability** (see §9): a
  studio sees the widgets its tier includes, and a locked teaser naming the rest.

---

## 7. HR, Operations, Inventory, Quality — the record departments

- **HR** keeps employees (people's studio-local records), their **leave** (request
  → approve, with balances read from the requests), **certifications**, and
  **document expiry** (ID and passport). Identity numbers are encrypted and only
  visible to those with the specific right.
- **Operations** tracks **locations**, **permits** (with validity derived from
  their dates, so "expiring" is always current), **shifts** (with clash and
  approved-leave guards), and **live positions** — where people are now.
- **Inventory** holds **items** (with on-hand quantity and reorder levels),
  **vendors**, **orders** (purchase/material), **deliveries**, **project sheets**
  (built from a quotation's rows), and **AWB tracking** for air freight, with
  carrier status milestones.
- **Quality** manages **controlled documents** through a revision workflow —
  drafting, review, approval and issue — where reviewer and approver must differ.

---

## 8. Tasks & notifications

- **The task board** shows work as cards you can advance. Most tasks are simple;
  **typed tasks** (approvals, purchase orders, permit requests, and the like) are
  decision records that route to the right authority and can't be freely edited.
  You always see your own work; what else you see depends on your role.
- **The bell** carries **notifications** — addressed to *you*, persisting until
  read, surviving sign-out. They arrive live and are also there on a fresh load.
- **Time-driven notices.** A daily job tells the people who can act about things
  time alone makes urgent: **overdue invoices and bills**, and **expiring
  documents and permits**. Each fires once as it passes a milestone (a bill at 1,
  7, 14, 30, 60, 90 days overdue; a document 30, 14, 7, 3, 1 and 0 days before it
  lapses), so you're nudged as things pass a threshold, never spammed daily. Each
  notice reaches only the people who hold the right to see that record.

---

## 9. Plans: packages and tiers

A studio's subscription has **two independent axes**:

- **Package** — the commercial shape: how many employees, whether it includes live
  chat with nompany, and whether it includes **Nova** (the assistant). This is the
  headcount/feature axis.
- **Tier** — what **dashboard analytics** the studio sees. Analytics is sold by a
  ladder: a tier includes a chosen set of dashboard components across the
  departments; anything above it shows as a locked teaser that names what it would
  reveal. The console picks each tier's components on a per-section switchboard.

The two don't mix: a small headcount package can still buy deep analytics, and a
large one can buy shallow. Availability of Nova rides on the *package*; what your
*dashboards* show rides on the *tier*.

---

## 10. Nova — the assistant

Nova is a per-user assistant inside your studios. It answers questions from your
data and can carry out simple self-service actions on your behalf.

**Turning it on.** Nova is included when your studio's package includes it — a
star-faced launcher then appears bottom-right, beside the chat button. Nova runs
on **your own AI subscription**: in your account settings, pick your provider
(Claude, ChatGPT, or Gemini) and paste that provider's key. It's stored encrypted
and never shown again. Until you set a key, Nova tells you how to get one.

**Asking.** "Which invoices are overdue?", "What's my remaining leave?",
"Summarise our finances." Nova only ever sees what *you* are allowed to see — every
lookup runs under your own permissions, and it re-checks each one, so it's never
looser than your own screens and often tighter. It cites references so you can find
the record.

**Doing.** Nova can prepare simple actions — request leave, add a comment to a
ticket, mark notifications read, advance one of your own tasks. It gathers the
details in conversation, then shows you a **Confirm** card. Nothing is written
until *you* click Confirm; the assistant itself can never make the change. What
Nova offers is set two ways: your package must include it, and the console decides
which capabilities are switched on platform-wide — and on top of both, it can only
ever do what your own role already permits.

**Nudges.** Even with the chat closed, Nova's badge shows what's waiting on you;
open it and it offers to walk you through what needs attention.

---

## 11. What's coming

- **Nova**, deeper: answers that stream as they're written, more self-service
  actions, and guided "how do I…" help about using the screens.
- **The interface overhaul** continues — a unified visual system, denser data
  grids, a full accessibility pass, and complete Arabic across every screen (the
  right-to-left layout is already in place).

---

*This guide describes the product as it stands. Where behaviour and this document
disagree, the product is right and the document is stale — tell us.*
