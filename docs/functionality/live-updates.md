# Live updates — how a board learns that somebody else changed something

**The connection:** `src/components/studio2/LiveProvider.js` — one `EventSource` per tab,
opened by `StudioFrame` inside `src/app/studio/layout.js` so it survives navigation.
**The hooks:** `useLiveUpdates.js` (refetch) and `useLiveRows.js` (patch one row).
**The server half:** `/api/studios/<slug>/stream` (route), `platform/realtime/events.ts`
(the log), `platform/realtime/bus.ts` (the doorbell).
**The record:** none. An event says *what changed*, never any data.

## What a board actually subscribes to

```js
useLiveUpdates(slug, "projects-list", reload);
```

Three arguments, and **the middle one is a section KEY — the key the board's records are
WRITTEN under.** Not the section the screen sits in, not the URL it is reached at, not the
endpoint it fetches from. `platform/db/keys.ts`'s `SECTION_COLLECTIONS` is the authority:
whatever section key owns the collection is the key an event about it will carry.

The chain is short and worth reading once, because every mistake below is a link in it:

1. A service writes through `repo`, which is scoped by `{ studio, section }` — the section
   being whichever one the module context resolved (`listSection`, `ticketsSection`,
   `registerSection`, …).
2. `pgRows` emits `{ type, sectionId, collection, rowId }` after the write.
3. The stream route turns `sectionId` into that section's **key** and sends it, but only to
   connections whose reader may view that section (`sectionViewable`).
4. `LiveProvider` hands the event to everybody listening on that key **and on every ancestor
   of it** — so `finance-cash` reaches a board watching `finance`.
5. The board's `onChange` runs. It refetches, or `useLiveRows` replaces one row.

## Two ways to write a watch that can never fire

Both produce the same symptom, and the symptom is the problem: **a board that never refreshes
is indistinguishable from a board with nothing to refresh.** Nothing in the build, the type
checker or the golden responses can see either one.

**Passing two arguments.** `useLiveUpdates(slug, reload)` puts the handler where `watch`
belongs, so `subscribe()` is handed a *function* as a section key and `onChange` is
`undefined`. Nineteen screens shipped this way — the whole of Procurement, Tendering,
Contracts, the pipeline, customer 360, the four project sub-screens and Master data — and
every one of them was dead from the day it was written. These are browser `.js` files, which
`checkJs: false` exempts from `tsc`, and a missing argument is legal JavaScript, so there was
nothing to fail. The hook **throws in development** on that shape now, and
`testEveryLiveWatchCanActuallyFire` in `tests/restructure.mjs` refuses it in CI.

**Naming a real section that owns no collection.** This is the subtler one, and it survives
a spelling check. Several sections are *destinations* over somebody else's rows:

| Board | Its section | Where its records really live |
|---|---|---|
| Pipeline | `crm-sales-pipeline` | `crm-sales-tickets` (a deal is a `salesTicket`) |
| Contracts | `crm-sales-contracts` | `crm-sales-quotations` (with the quotations) |
| Expediting | `procurement-expediting` | `inventory-sheets` (it chases purchase orders) |
| Receiving | `procurement-receiving` | `inventory-sheets` (receipts sit with their orders) |
| Master data | `administration-master` | itself — but it is READ through Operations' payload |

The same test asks this half: a watch key is only accepted if some collection is written at
it or beneath it.

## A screen with more than one watch is normal

Several boards are joins, and each block's rows live in a different section. Customer 360
watches four (`crm-sales-clients`, `crm-sales-tickets`, `crm-sales-quotations`,
`projects-list`); the project cost report watches three, because the budget is the project's
own, the actual is Payables' bills and the committed is Inventory's purchase orders. This
costs nothing extra on the wire — invariant 14 is about the `EventSource`, and there is one
of those per tab regardless of how many hooks fan out from it.

The rule for adding one: watch a foreign section when its rows change a figure the screen
DISPLAYS. A rename the screen merely resolves — a client's name on a tender, an item's name
beside an agreed rate — is not worth a refetch, and the code says so where it declines.

## Why the parent fan-out exists

Until the fifteen-section restructure the section model was flat: `sales`, `projects`,
`finance`. A watch key and a written-under key were the same string, so the match was `===`.
The restructure moved every collection into a sub-section and **unplugged every board that
watches a department root** — Main, the ticket profile, Finance, Projects, both Live views,
Engineering & Documents — with nothing to report it, because the subscription was registered,
the connection was open and the events were arriving under a key nobody was listening on.

Walking up the dashes is the same rule `sectionViewable` already uses for "a section's
children". It must be the dash and not a bare `startsWith`, or `engine-` would swallow
`engineering-docs`. It widens nothing a reader may not hear: step 3 above has already decided,
per event, whether this connection is told at all.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Only `row.updated` is patched.** `useLiveRows` replaces one row in place; a create, a
  delete, an unmapped collection or a failed fetch all fall back to the board's full `load()`.
  That is deliberate (an update cannot change these lists' order), not a stub — but it means a
  busy studio still refetches whole payloads for creates.
- **One board uses it.** `useLiveRows` has a single caller (`StudioSales`); every other screen
  still answers an event with a full module refetch.
- **A watch is only checked at source level.** The CI assertion reads the call sites; nothing
  asserts at RUNTIME that a section a board watches is one its writes actually emit, so a
  service re-pointed at a different section would not fail this test.
- **Nothing tells a board it fell behind.** The stream sends `reset` when a client is further
  behind than the log is long, and no screen listens for it — the tab keeps its stale payload
  until something else triggers a load.
- **No test opens two clients.** That one screen refreshes when another changes a record is
  verified by hand in the sandbox, not by the suite; the browser pane cannot hold two
  authenticated tabs.
- **`slug` is still the hook's first argument and is unused** for the subscription — the
  connection's studio comes from `LiveProvider`. It is kept because `useLiveRows` needs it for
  its `/rows` fetch, and 63 call sites pass it.
