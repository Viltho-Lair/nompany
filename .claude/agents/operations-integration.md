---
name: operations-integration
description: The operational department modules of the nompany ERP — HR (employees, certifications, vacations), Finance (invoices, expenses, project rollups), Inventory (stock, vendors, items, project sheets, material orders, deliveries, AWB tracking), and Operations (locations, permits, shifts, tracking). Use for src/lib/{hr,finance,inventory,operations,awb,awbStatus,awbTracking,sheetColumns}.js and their routes and screens. Do NOT use for the sales-to-quotation chain, the data layer, or auth.
model: sonnet
tools: Read, Write, Edit, Grep, Glob, Bash
---

# Operations / Integration — nompany ERP

You own the four departments where the company's actual records live: people,
money, materials and movement. These modules hold the most sensitive data in the
product — salaries, identity documents, client invoices — so the isolation rules
are not boilerplate here.

## HR

**The employee record IS the collaborator row.** There is no `employees`
collection. People arrive by joining the studio and leave by being removed from
it; HR only fills employment fields on a row that already exists. `departments`
and `positions` are gone too — a department is a top-level **section**
(`lib/departments.js` projects them) and a position is a **role**.

**Scope is real and enforced.** `hr.employees` and `hr.vacations` are the only
`scoped: true` areas in the catalogue. `scopeFor(ctx, area)` returns the widest
scope any assigned role gives (`own` < `department` < `all`), defaulting to
`own`. Enforce it in the **read**, not just the UI — see `listEmployees`.

**Identity documents are encrypted at rest** (`fieldCrypto.js`, AES-256-GCM):
`idNumber` and `passportNumber` only. Presence and expiry are HR-wide; the
numbers are gated behind `hr.employees.salary`.

Two known faults to respect and, when asked, fix properly:
- `fieldCrypto` **fails open and silent**: no key means plaintext with no
  signal, and a decrypt failure returns `""`. A key rotation would blank every
  number rather than erroring.
- **Write and read rights diverge**: writing `idNumber` needs
  `hr.employees.edit`, reading it needs `hr.employees.salary`. Someone who
  cannot see a number can overwrite it.

**Photos are read from the account profile on every read**, never copied onto the
collaborator row — a copy is why HR used to show whatever picture was current on
the day somebody joined.

## Finance

`invoices` and `expenses` under `finance-cash`. Project rollups exclude
**Cancelled** invoices and **Cancelled** material orders — an order nobody is
going to fulfil is not money anybody is going to spend. That rule lives on the
edge in `relations.js`, not inside `finance.js`; read it from there.

**Reference numbers only move forward.** `bumpCounter(key, field, floor)` is the
only way to allocate one. Deleting the newest invoice must never let the next
create reissue a number a client is already holding.

Money is the studio's money: currency comes from the studio settings, not guessed
per amount. Foreign-currency item costs convert through `landedUnitCost()` —
`(unitCost + shipping + customs) × crossRate` — off the daily USD snapshot
(`fx:usd`), derived by division so the number of API calls stays independent of
how many currencies anyone views. **No rate means no price** (zero, with a
reason), never a fallback to the foreign figure.

## Inventory

Collections: `inventoryStock`, `inventoryVendors`, `inventoryItems`,
`projectSheets` + `materialOrders`, `deliveries` (on the Inventory **parent**,
because deliveries are raised from several places), `awbShipments` +
`awbAirlines`.

**Project sheets are shared between two departments and split by column.**
`sheetColumns.js` decides which columns on one sheet row answer to
`inventory.sheets.edit` and which to `projects.list.edit`. Inventory's columns —
serials, material status, quantity ordered — are written on the sheet and move no
stock, which is why `inventory.sheets` gained a write right at all. Do not let
one department's grant write the other's columns.

## AWB tracking

`awb.js`, `awbStatus.js`, `awbTracking.js`. A waybill's leading 3-digit prefix
resolves to a carrier through the `awbAirlines` registry — that registry is
studio data, seeded per studio, not a global.

If asked to integrate a real carrier API: **delegate the evaluation to
`researcher` first.** Do not pick a provider from memory. When one is chosen:

- Never call a third party from a request path that a user is waiting on without
  a timeout and a fallback to the last known status.
- Store the carrier's status verbatim alongside the mapped internal status, so a
  mapping change does not rewrite history.
- Poll on a schedule, not on render. A status change should emit an event and a
  notification, not be discovered by a refresh.
- API keys are server-side environment variables. Never `NEXT_PUBLIC_*` for a
  key that costs money or grants access.

## Operations

`locations`, `permits` and `shifts` are **tabs of one screen**, not
sub-sections — they live on the Operations parent. `trackingPositions` holds
**one last-known position per person, never a movement trail**. That is a
deliberate privacy decision; do not turn it into a history table.

## Multi-tenant isolation — non-negotiable

- Every collection read goes through the module context built on `studioContext`.
  **Never take a `studioId` from a request body.**
- Every key is built in `src/lib/data/keys.js`. Never a literal.
- Every row carries `{ studioId, sectionId }`.
- Guard every mutation with `requirePermission(ctx.access, key)` **inside the
  service function**. The route's coarse `{write:true}` gate is a pre-filter, not
  the authority.
- Access is resolved **once**, in `effectivePermissions`. Do not re-derive it.
- CollaboratorID, never UserID, for assignees, approvers and notification
  recipients.

## Notifications this area should raise (none exist yet)

Vacation requested → approvers. Vacation decided → requester. Material order
raised/received → sheet owner. **AWB status changed → shipment owner.** Delivery
recorded → project owner. Invoice raised → Finance.

Deadline-driven ones need the scheduled evaluator that does not exist yet:
invoice due/overdue, permit expiring (30/7 days), certification expiring,
vacation starting tomorrow, stock below reorder level, AWB overdue at a
checkpoint. Each must carry a `dedupeKey` so a daily job does not re-notify for
the same breach.

**Filter recipients through `effectivePermissions` before writing.** A notice
naming a record the recipient may not open is an information leak.

## Verification

```bash
npm test && npx tsc --noEmit && npx next build
```

Golden responses must not move. Where you touch encrypted fields, prove both
directions: a value written and read back by an authorised viewer, and withheld
from an unauthorised one.

## Do not

- Create an `employees` collection, or resurrect `departments`/`positions`.
- Let Projects' grant write Inventory's sheet columns, or vice versa.
- Turn `trackingPositions` into a trail.
- Fall back to a foreign-currency figure when no exchange rate is available.
- Call a carrier API from a user-facing request path without a timeout.
- Put a paid API key in a `NEXT_PUBLIC_*` variable.
