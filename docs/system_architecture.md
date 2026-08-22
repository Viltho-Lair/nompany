# nompany ERP — System Architecture

**As-built, 2026-08-20, commit `166300f`.** This document describes the system that exists, not the one planned. Where a capability is declared but unreachable it is marked **⊘ dead**. The companion visual is [`procedure-flow.html`](./procedure-flow.html).

---

## 1. Topology

Three surfaces share one Next.js 16 application, one Redis instance, and one deployment.

| Surface | Address | Route tree | Identity | Purpose |
|---|---|---|---|---|
| **Studio** (the ERP) | `nompany.com/<slug>/…` | `src/app/studio/[[...segments]]` | `nc_sid` → User → Collaborator | The tenant's ERP. Twelve departments. |
| **Account** | `nompany.com/{en,ar}/…` | `src/app/[locale]` | `nc_sid` → User | Sign-up, sign-in, questionnaire, account hub, careers, terms. |
| **Console** | `nompany.com/super/…` | `src/app/super` | `nom_super` → SuperAdmin | nompany's own owners. Platform-wide. |
| Marketing | `www.nompany.com` | *separate repository* | none | `nompany-main-website`. The ERP 307s `/` to it. |

**Tenancy is slug-driven and resolved at the edge.** `src/proxy.js` takes the first path segment; if it is not in `PLATFORM` (`api`, `_next`, `super`, `brand`, `studio`, `c`, `q`, favicon/robots/sitemap/manifest) and not a locale, it **rewrites** — never redirects — to `/studio/<rest>` and sets `x-studio-slug`. The browser URL never changes. The edge cannot reach Redis, so it does no validation: it routes, and `StudioPage` decides 404 vs "not a member".

> **Load-bearing invariant.** The rewrite must never be paired with a redirect in the other direction. Doing so previously produced `ERR_TOO_MANY_REDIRECTS`, and `www` must never carry a `www → apex` redirect for the same reason.

The `/super` branch checks only that the console cookie *exists*, as a convenience redirect. Authorisation happens in `src/app/super/(shell)/layout.js` against the stored token list. A forged cookie passes the edge and dies there.

---

## 2. Identity — three separate systems

### 2.1 User (subscribers)
`src/platform/auth/identity.js` over `src/platform/auth/users.js`.

- One `User` per email. `ix:email:<email>` is a `SET NX` uniqueness claim made **before** the registry row, so two concurrent signups cannot share an address; the claim is released if the write throws.
- Satellites, all 1:1, all under `u:<UserID>:`: `profile`, `verification`, `questionnaire`, `sessions`, `devices`, `studioVisits`.
- **Sign-up is OTP-first.** `signup()` creates the user and an OTP challenge but mints **no session**. Access begins only after the emailed code is verified, so an unproven address can never hold a logged-in session.
- **Sign-in is risk-based.** `login()` verifies the password first, always. A *trusted device* (`nc_dev` cookie matched against `u:<id>:devices`) gets a session immediately; an unrecognised one gets an OTP challenge. A code is therefore never sent to an address whose password was not supplied correctly. *(Audit: no rate limit precedes the password check — `recommendations.md` C-4.)*
- **OTP challenges live outside every ownership prefix** at `otp:<challengeId>`, because a challenge must work before the requester is authenticated. Redis `EX` is the entire cleanup policy.
- Sessions: `mintSession` writes `ix:session:<token>` → UserID with `EX`, and appends `{token, createdAt, expiresAt}` to `u:<id>:sessions` (capped at 10). **Expiry is enforced by the database, not the cookie.** TTL is 8 h, or 30 days with "remember me".
- A credential change (`changePassword`, `resetPassword`) revokes **every** session and **every** trusted device, so the next sign-in anywhere must pass OTP again.
- OAuth (`/api/auth/oauth/<provider>/start` → `/api/auth/callback/<provider>`) skips OTP: the provider already proved the address. A new user is created with a random password they never see and `provider` recorded so the account page can explain why they have no password.

### 2.2 Collaborator (identity *inside* a studio)
`src/platform/auth/collaborators.js`. A row in `s:<StudioID>:collaborators` carrying `{ id, userId, alias, role, roleIds[], overrides, …HR fields }`.

The **CollaboratorID, not the UserID, is the identity used everywhere inside a studio** — notifications, signatures, assignments, audit fields. This is what makes a person's studio-local name, role and employment record separable from their account.

`role` means ownership only: `"owner"` or `"member"`. What someone may *do* is entirely in `roleIds` + `overrides`.

### 2.3 SuperAdmin (nompany's owners)
`src/platform/auth/superAuth.js`. A standalone identity in `g:superAdmins`, deliberately outside every cascade — it outlives every user and studio. 12-hour session, never "remembered". *(Audit: expiry is cookie-only — C-5.)*

**Why three and not one:** a nompany owner holds a console session *and* a user session in the same browser. Sharing a namespace would mean guessing which identity a request meant, and guessing wrong exactly when it matters — posting their studio-side chat replies as nompany. The chat routes are split by namespace (`/api/chat/*` vs `/api/super/chat/*`) for precisely this reason.

---

## 3. The request lifecycle

Every studio request follows the same shape. Traced here for `GET /api/studios/<slug>/sales`, with the **measured** cost of each hop (live instance, 164 ms RTT):

```
 1  cookies() → ix:session:<token>              ┐ currentUser()
 2  g:users  → JSON.parse → .find(id)           ┘  (+ touchLastSeen, fire-and-forget, re-reads g:users)
 3  ix:slug:<slug>                              ┐ studioContext()
 4  g:studios → .find(id)                       │
 5  s:<sid>:collaborators → .find(userId)       │   ← membership. Absent ⇒ 403, and nothing is revealed.
 6  ⇉ s:<sid>:roles ‖ s:<sid>:sections          ┘   ← effectivePermissions() resolves ACCESS here, ONCE
 7  s:<sid>:sections            (again)          ← salesContext() re-reads. See H-5.
 8  ⇉ salesTickets ‖ salesClients ‖ rfqs ‖ quotations ‖ tasks ‖ projects ‖ salesServices ‖ collaborators
────────────────────────────────────────────────
    8 dependent round trips · measured 1421 ms p50 · same data in one batch: 180 ms
```

Three properties are worth naming because they are deliberate and correct:

- **Access is resolved exactly once**, at step 6, in `effectivePermissions`. Every module context is built on `studioContext`, so no service function re-derives permission. This is the single fix for the class of bug where the UI and the write path disagree.
- **Membership is the authorisation; the URL is never the authorisation.** A guessed slug returns 403 (API) or a "you're not in this studio" page — never a hint about what is inside.
- **"Not found" and "not a member" render identically** on the studio page, on purpose: membership is not discoverable from outside.

Each department then adds one guard of its own (`hrGuard`, `financeGuard`, `inventoryGuard`, `operationsGuard`, `tasksGuard`, `qualityGuard`) that resolves the module context and, for writes, checks the coarse `canManage` flag. The **fine-grained check happens inside the service function** via `requirePermission` — 12 in `hr.js`, 16 in `inventory.js`, 12 in `sales.js`, and so on. That is defence in depth, and it is the reason the coarse gate being loose (M-8) is not itself a vulnerability.

---

## 4. Stored data — the complete key catalogue

The ownership tree **is** the key tree, which is what makes cascading deletion equal to prefix deletion. Every key is built in `src/platform/db/keys.ts` and nowhere else.

### 4.1 Global registries — `g:*`
| Key | Shape | Holds |
|---|---|---|
| `g:users` | JSON array | Every User: id, email, passwordHash, status, provider, platformRole, createdAt, lastLoginAt, lastSeenAt |
| `g:studios` | JSON array | Every Studio: id, ownerUserId, name, slug, logo, country, city, currency, packageKey, tierKey |
| `g:superAdmins` | JSON array | Console identities + their raw session tokens |
| `g:joinRequests` | JSON array | Pending/decided requests to join a studio |
| `g:questionnaires` | JSON array | Questionnaire *definitions* authored in `/super` |
| `g:packages`, `g:tiers`, `g:erpServices` | JSON arrays | The commercial catalogue |
| `g:catalogSettings` | JSON object | Catalogue-wide settings (the yearly discount) |
| `g:ratings` | hash | One field per user — re-rating replaces rather than accumulates |
| `g:events` | **stream** | The platform event log the console resumes from |
| `g:superNotifications` | JSON array | Notices addressed to nompany's owners |
| `g:media:<id>` | JSON string | **Uploaded binaries, base64.** ⚠ Platform-scoped, so no cascade reaps them (C-6). |

### 4.2 Per-user — `u:<UserID>:*` (dies with the user)
`profile` · `verification` · `questionnaire` · `sessions` · `devices` · `studioVisits` (hash of StudioID → open count, which is how the account page ranks studios by actual use).

### 4.3 Per-studio — `s:<StudioID>:*` (dies with the studio)
`collaborators` · `sections` · `roles` · `settings` · `notifications` · `chatUsage` (hash, one field per `YYYY-MM`) · `counters` (hash — see below) · `events` (**stream**) · `media:<id>` *(builder exists, unused)* · `tokens` **⊘ dead** · `activityLog` **⊘ dead**.

**`s:<StudioID>:counters` deserves its own note.** It is the one thing in the product that *cannot* be derived from the records. Deleting the newest invoice makes the highest surviving reference go backwards, and the next create would reissue a number a client already holds. So the tally only moves forward. `bumpCounter(key, field, floor)` lifts the counter to a caller-supplied floor (the highest reference visible on the rows in hand) and then steps it, inside one Lua call — making the first call self-seeding for pre-existing studios and every call after it a plain increment, with no migration.

### 4.4 Per-section — `s:<StudioID>:sec:<SectionID>:c:<name>`
Every operational collection. Each row carries `{ id, studioId, sectionId, … }` and dies with its section. The section that owns each collection is declared in `SECTION_COLLECTIONS` (`keys.js:298`):

| Section key | Collections |
|---|---|
| `sales-tickets` | `salesTickets`, `generatedDocuments` |
| `sales-clients` | `salesClients` |
| `sales-settings` | `salesServices` |
| `technical-quotations` | `quotations`, `generatedDocuments` |
| `technical-rfq` | `rfqs` |
| `projects-list` / `-sla` / `-overtimes` | `projects` / `slas` / `overtimes` |
| `inventory` | `deliveries` *(on the parent: raised from several places)* |
| `inventory-stock` / `-vendors` / `-items` | `inventoryStock` / `inventoryVendors` / `inventoryItems` |
| `inventory-sheets` | `projectSheets`, `materialOrders` |
| `inventory-awb` | `awbShipments`, `awbAirlines` |
| `hr` / `hr-employees` | `vacations` / `certifications` |
| `finance-cash` | `invoices`, `expenses` |
| `operations` | `locations`, `permits`, `shifts` *(tabs of one screen, not sub-sections)* |
| `operations-tracking` | `trackingPositions` *(one last-known position per person, never a trail)* |
| `tasks` | `tasks` |
| `quality-documents` | `qualityDocuments`, `qualityTypes`, `qualityRevisions`, `qualityAudit`, `qualityAcknowledgements`, `qualityShareLinks` **⊘** |

The **employee record is the collaborator row** — there is no `employees` collection. People arrive by joining and leave by being removed; HR only fills employment fields on the row that already exists. Likewise `departments` and `positions` are gone: a department *is* a top-level section (`lib/departments.js` projects them), and a position *is* a role.

### 4.5 Indexes and claims — `ix:*`
`ix:email:<email>` → UserID · `ix:slug:<slug>` → StudioID · `ix:owner:<UserID>` → StudioID (ownership is 0..1, enforced by the claim) · `ix:session:<token>` → UserID (`EX` = real expiry) · `ix:collab:<UserID>` → **set** of StudioIDs · `ix:stoken:<token>` **⊘ dead** · `ix:qshare:<token>` **⊘ dead**.

### 4.6 Ownerless and ephemeral
`otp:<challengeId>` (TTL) · `chat:room:<id>`, `chat:room:<id>:held`, `chat:live` (TTL — a conversation is never kept; ending one leaves a short grace window for the transcript, then it is gone) · `fx:usd` + `fx:lock` (one USD-based rate table a day; every other pair is derived by division, so API calls stay independent of how many currencies anyone views) · `rl:*` (fixed-window counters) · `stat:day:<date>` + `stat:vis:<date>` (website traffic — **no TTL, deliberately**; see C-3).

### 4.7 The test namespace
`KEY_PREFIX` (`NOMPANY_KEY_PREFIX`) prefixes every key this module builds, so the integration suite runs the real repositories and real routes against the real Redis inside a namespace it can delete wholesale. Two locks: it must be asked for explicitly, and it is ignored outright when `NODE_ENV === "production"`. **`sweepOrphans` does not honour it — see C-1.**

---

## 5. The write layer

`src/platform/db/store.ts` is the only module that speaks Redis. Everything above it goes through these primitives.

**Compare-and-set is the core idea.** A collection lives in one key holding the whole array, so a naive read-modify-write loses data whenever two overlap — two people ticking different checklist items is enough. `editArr`/`editJSON` close the window with a Lua script that compares a **SHA-1 of the stored string** and only writes if it still matches:

```lua
local cur = redis.call('GET', KEYS[1])
local tag = '' ; if cur then tag = redis.sha1hex(cur) end
if tag ~= ARGV[1] then return {0, cur or ''} end     -- refused: hand back what IS there
redis.call('SET', KEYS[1], ARGV[2])
return {1, ''}
```

Three consequences worth understanding:

1. **Cost is identical to the unsafe write it replaces** — one read, one write. The 40-byte tag goes up, not a second copy of the document. No lock, no extra keys, no second connection.
2. **A refusal hands back the current value**, so a retry needs no second `GET`. One round trip per attempt.
3. **Ordering is free.** Redis is single-threaded and executes commands on one key in arrival order, so concurrent writers to a collection are serialised by the database. That is the FIFO-per-collection guarantee, and it needs no broker.

Backoff is **small and flat** (≤15 ms jitter, 64 attempts), not exponential — every contended round has exactly one winner, so N writers need up to N rounds; that is a queue draining, and exponential backoff would idle the key while writers that could make progress waited. Exhausting 64 attempts raises `ConflictError`, which *should* map to HTTP 409 and currently surfaces as 500 (H-7).

There is deliberately **no `writeCol()`**. Rows are only ever written through `addRow` / `updateRow` / `deleteRow`, because a blind whole-collection write is exactly the lost update those three exist to prevent. `updateRow` accepts a *function* patch so a caller can express "flip this field" rather than "set it to what I last saw" — under contention the function is re-applied to the row as it now is, so a flip stays a flip.

Other primitives: `claim` (`SET NX [EX]` — uniqueness), `hIncrBy` (atomic tallies), `bumpCounter` (Lua, monotonic references), `xAdd`/`xAfter`/`xLastId` (streams), `scanPrefix`/`delPrefix` (the cascade primitive, batched `DEL` in hundreds).

---

## 6. Access control

Two modules, and the split between them is the point.

**`src/platform/access/catalogue.ts` — the catalogue.** One row per protected area, declared explicitly and *not derived from the navigation tree*. There is no `sales` permission; Sales is a heading. Only leaves are rights, so nothing inherits from anything and the "does Sales imply Sales › Tickets?" question — which has no correct answer — never arises.

- **Ladder:** `none → view → edit → full`, cumulative **by convention, not by resolution**. Granting "edit" stores `view`+`create`+`edit` as three separate keys, so what is stored is always exactly what is allowed. Nothing is computed at check time.
- **Extras** are powers that do not nest in the ladder: `technical.rfq.convert`, `technical.quotations.lock` / `.unlock` (two rights, because unlocking reopens a document a client is holding), `hr.employees.salary`, `hr.vacations.approve`, `quality.documents.{setup,review,approve,publish,obsolete,share}`. **Review and approve are two rights because they are two people** — a revision signed twice by one hand has been reviewed by nobody.
- **Dashboard areas** (`sales.dashboard` … `quality.dashboard`) are view-only rights on the eight module parents that render a screen of their own. Without them, anyone who could open one ticket screen could read the whole department's funnel and win rate.
- `levelsFor(area)` omits rungs that grant nothing new — a sales ticket has no delete, so it has no "full" distinct from "edit".

**`src/platform/access/resolve.ts` — the resolver.** Deliberately dumb: a `Set` of strings, membership tested. No inheritance, no wildcards except the single Admin flag.

```
owner                      → ALL_PERMISSIONS   (a studio that can lock out its own owner is an unanswerable support ticket)
wildcard role (role_admin) → ALL_PERMISSIONS
otherwise                  → union of assigned roles' permissions
                             + overrides.allow
                             − overrides.deny     ← deny last, so an exception can genuinely take something away
```

`SECTION_AREAS` is the one place that maps nav **sections** to model **areas**, so the sidebar and the guards cannot drift. `sectionViewable` asks the parent's own area *first* and then falls through to children — so withholding a dashboard hides the summary without making the screens beneath it unreachable.

`scopeFor(ctx, area)` returns the widest scope any assigned role gives (`own` < `department` < `all`). Only `hr.employees` and `hr.vacations` are `scoped: true`, and both genuinely enforce it (`hr.js:317`, `:460`).

**Two escalation doors, one rule.** `escalates()` refuses to grant anything the actor does not hold themselves. It is enforced on the People screen *and* on join-request approval — approving somebody as "admin" assigns the wildcard role, and without the second check that was privilege escalation through the front door.

`explain()` re-runs the same steps and reports which one settled it, so "why can't Sara lock a quotation?" has an answer that cannot disagree with the enforcement.

---

## 7. The twelve departments

Each is one client component fetching one aggregate endpoint. Below: the screens, the actions behind the buttons, and the permission each answers to.

### Sales — `StudioSales.js` (69 KB) · `/api/studios/[slug]/sales`
Screens: **Dashboard** (`sales.dashboard.view`) · **Tickets** · **Clients** · **Live view** · **Settings**.

The ticket workflow is the spine of the whole ERP:

```
New ticket ──────────────► status "Lead"                    sales.tickets.create
Request RFQ ─────────────► status "Opportunity", rfq row    sales.tickets.edit + a Technical section exists
   Technical converts ───► quotation                        technical.rfq.convert
   Technical rejects ────► ticket → "Closed Lost"           (RFQ_REJECTED_TICKET_STATUS)
Send for approval ───────► task raised on the Tasks board   sales.tickets.edit + a Tasks section exists
Approved ────────────────► Sales may now pick a final status from POST_APPROVAL_STATUSES
Upload PO ───────────────► /sales/tickets/po
```

Status is **automated up to approval** — "Lead" on creation, "Opportunity" on RFQ — and only after approval does a Sales user get to choose. Urgency (`Low/Normal/High/Critical`) defaults to Normal on every ticket and is carried read-only onto any RFQ or quotation it spawns.

Sales reads Technical's and Tasks' collections **without a Technical or Tasks grant**, on a stated principle: *what became of the ticket is part of the ticket's own story*, not a window into someone else's queue. A studio with no Technical section simply gets no RFQ column rather than a button that could only fail.

Live view is a **projection** of the ticket list, not a second data source; which columns it shows is stored on the `sales-settings` sub-section.

### Technical — `StudioTechnical.js` (50 KB) · `/technical`
RFQs, quotations, the **Quotation Builder** (`QuotationBuilder.js`), Live view, Settings. Converting an RFQ writes the quotation's id back onto the RFQ — the one place in the chain where the link is genuinely held from both ends, so it is the one place a back-pointer is a fact rather than a copy. Lock/unlock are separate rights. Catalogue items priced in foreign currency are converted through `landedUnitCost()` — `(unitCost + shipping + customs) × crossRate` — off the daily USD snapshot; **no rate means no price, never a fallback to the foreign figure**.

### Projects — `StudioProjects.js` (68 KB) · `/projects`
Project list, per-project profile (`StudioProjectProfile.js`), SLA, Overtimes, Settings. A project carries the whole lineage: `ticketId`, `quotationId`, `clientId`. **A ticket has exactly one project** — a second project means a second ticket, because a client asking for more work starts the process again.

### Inventory — `StudioInventory.js` (63 KB) · `/inventory`
Stock, Vendors, Registered items, **Project sheets** (`StudioSheetViewer.js`, 43 KB — the same screen serves Inventory's and Projects' perspectives on one sheet), Deliveries, **AWB tracking** (`awb.js`, `awbStatus.js`, `awbTracking.js`; the airline registry resolves a waybill's 3-digit prefix to a carrier). `sheetColumns.js` decides which columns on a shared sheet row answer to `inventory.sheets.edit` and which to `projects.list.edit`.

### HR — `StudioHr.js` (47 KB) · `/hr`
Employees, certifications, vacations. Scope-enforced. ID and passport numbers are AES-256-GCM encrypted at rest (`fieldCrypto.js`) and revealed only on `hr.employees.salary`; presence and expiry are HR-wide, the numbers are gated. Photos are read from the account profile on every read rather than copied onto the row — so changing your picture changes it here too.

### Finance — `StudioFinance.js` (40 KB) · `/finance`
Invoices, expenses, per-project rollups, settings. Cancelled invoices and cancelled material orders are excluded from project totals — a rule that now lives on the *edge* (§8) rather than inside `finance.js`.

### Operations — `StudioOperations.js` (50 KB) · `/operations`
Locations, permits, shifts (tabs of one screen), and Tracking. `operationsCalendar.js` and `googleMaps.js` support it.

### Tasks — `StudioTasks.js` (38 KB) · `/tasks`
The board, plus Task settings. `taskRouting.js` resolves *who currently holds each approval authority* from Task settings **on every read**, so appointing somebody hands them the open approvals immediately — the assignee is never copied onto a row.

### Quality — `components/quality/**` (TypeScript) · `/quality/docs`
The controlled-document register. Opens **full screen**, outside `StudioFrame`, because a document is read rather than navigated away from. A revision moves author → reviewer → approver → published through `signables.js`, which is generic across quality documents *and* generated documents (a quotation, a delivery note) precisely so two copies of one state machine cannot drift. **Nobody signs both halves**: approving is refused when the reviewer's CollaboratorID matches the actor's. The editor (`editor.tsx`, 15 KB, TipTap) lays documents out on real paper with margins, bands and pagination.

### Main / People / Access / Studio settings
`StudioMain.js` (the studio home) · `StudioPeople.js` (members + join requests) · `StudioRoles.js` (role editor — the per-person section grid is gone; access is a role here and an assignment on People) · `StudioSettings.js` (37 KB).

---

## 8. The cross-department relation graph

`src/platform/relations.js` declares the joins once, as data. Before it, walking the chain was retyped wherever anyone needed it — seven separate `.filter(x => x.parentId === id)` expressions — which meant a missing edge was invisible, each business rule lived alone, and permission was decided separately or forgotten.

**Nodes** (13): `salesTicket`, `client`, `rfq`, `quotation`, `project`, `projectSheet`, `materialOrder`, `invoice`, `expense`, `delivery`, `overtime`, `awbShipment`, `task`. Each names its section, its collection and the permission that guards it — so a node absent from the registry cannot be traversed at all.

**Cardinality** is three-valued: `ONE` (more than one is a data fault), `SEQUENCE` (several in order, the last one counts — what a quotation's revisions are), `MANY`.

**Direction matters.** `forward` = this record holds the other's id, one lookup. `reverse` = the other holds ours, found by scanning. Reverse is not a weakness: the child is created knowing its parent, so the key is written once at the moment the fact becomes true. A back-pointer on the parent would be a second copy of the same fact — and writing it would mean a downstream module modifying a record belonging to a department it does not own.

```
                          client
                            ▲
              ┌─────────────┼──────────────┐
              │             │              │
         salesTicket ◄──── rfq ◄─────► quotation
              ▲             (reciprocal: rfqId / quotationId)
              │                              │
              └──────────► project ◄─────────┘
                             │
    ┌────────┬───────┬───────┼────────┬─────────┬──────────┬────────┐
 sheet   invoice  expense  delivery overtime  awbShipment  task  materialOrder
          (−Cancelled)                                          (−Cancelled)
```

**Paths, not copies.** A sales ticket has no `invoiceId` and an invoice has no `ticketId`. The answer is a *path* — ticket → project → invoices — resolved breadth-first by `pathBetween`. Composing beats copying the ticket's id into six more collections, which would be six more writes free to disagree with the project that already knows.

Business rules live **on the edge**: `project → invoice` excludes `status: "Cancelled"`; `salesTicket → quotation` is a `SEQUENCE` ordered by `createdAt` whose `[0]` is "the quotation this ticket is worth" — named once so the Print button and the ticket's own Quotations box cannot reach different answers.

---

## 9. Real-time

Three cooperating pieces, and the division of labour is the design.

**The event log — truth.** One Redis **Stream** per studio at `s:<StudioID>:events`, capped with `MAXLEN ~ 500`. Entry ids are assigned by Redis, monotonic, and *are* the cursor — "everything after X" is one `XRANGE`, not a scan-and-filter. Appending is O(1) and contention-free, so the log adds no contention to the writes it records. An event carries **only enough to decide what to refetch**: `{ type, scope, sectionId, collection, rowId, at }`. No row contents, no names, no values — so the log stays cheap, cannot become a second copy of the data that drifts, and a leaked event discloses only that *something* in a section changed.

**The bus — the doorbell.** `src/platform/realtime/bus.js`, Redis pub/sub on `ev:s:<StudioID>`, `nt:u:<UserID>`, `ev:super`.

> **Exactly one subscriber connection per Node process.** Under RESP2 a subscribed connection cannot run commands, so pub/sub needs its own. The obvious reading — `duplicate()` per listener — would open one Redis connection per browser tab, and **connection count is this deployment's hard ceiling** (Redis Cloud Essentials caps it and it cannot be raised). So the module keeps one connection, refcounts channels by handler set, and fans out in memory where it is free. A thousand tabs on one instance still cost one connection.

Publishing is best-effort and never throws: callers publish *after* a write that already succeeded, and losing the notification costs one replay, never correctness. `emit()` does `XADD` **then** `publish` — strictly in that order, because the id is the client's cursor and a listener must never hear about an entry not yet in the log it would resume from.

**The transport — SSE.** `src/lib/sse.js` + `GET /api/studios/[slug]/stream` and `/api/super/stream`. 25 s heartbeat, deliberate clean close at 240 s under a 300 s `maxDuration`, `X-Accel-Buffering: no`, 2 KB preamble, idempotent teardown. `LiveProvider` holds **one `EventSource` per tab**, not per hook — `useLiveUpdates` has 21 call sites and `StudioMain` alone calls it three times, while browsers cap 6 connections per domain on HTTP/1.1. The two full-screen Live views render outside `StudioFrame` and therefore carry their own `LiveProvider`; a board outside a provider updates never, silently, so `useLiveUpdates` logs a dev error for exactly that case.

`Last-Event-ID` replay is what makes polling-free safe. Remove it and every reconnect silently drops events. Measured delivery ≈150 ms against the 30 s worst case of the polling loop it replaced.

*(Audit: an event names the row that changed, and every consumer ignores it and refetches the whole module payload — H-6.)*

---

## 10. Notifications

An event and a notification are different things and the code says so: **the event log is machinery** — it carries no words and is forgotten once every client has caught up. **A notification is addressed to a person**, says something in a sentence, links somewhere, and persists until read; it survives sign-out, because the bell must show a count on a fresh page load with nothing streamed yet.

**Fan-out on write, one row per recipient**, in `s:<StudioID>:notifications`. The alternative — one row plus a read-set — would put read state in a second key per person, which is something new for the cascade to know about. Here `readAt` is just a field on the recipient's own row, and the key was already declared and already swept by `cascadeDeleteCollaborator`.

`href` is stored **studio-relative** (`"people"`, `"sales/tickets"`); the bell prefixes the slug. Storing the slug would bake in an address that can be renamed.

`markRead` scopes to the caller **inside** the atomic write, so a request naming someone else's notification id cannot mark it read no matter what it claims.

**Producers today: five.** Studio created → console. Chat waiting → console. Rating left → console. Join requested → studio admins. Quality revision handed to the next signer → that signer. *(Audit: `joinDecided`, `peopleChanged`, `taskAssigned` and `mention` are declared and never emitted — M-2. Full gap list and the missing UI in `security-and-notifications.md`.)*

---

## 11. Deletion and integrity

`src/platform/db/cascade.ts` is the **only** legal deletion path for users, studios, sections, collaborators and roles. Redis has no `ON DELETE CASCADE`, so the guarantees come from three properties:

1. the ownership tree is the key tree, so cascade = prefix deletion;
2. deletion is **children-first, registry-last**, so a re-run after a crash finds the root again and finishes — every cascade is idempotent;
3. `sweepOrphans()` reconciles registries ↔ indexes ↔ prefixes weekly.

Deleting a **role** strips the `roleIds` reference from every holder and then removes the row. Refusing to delete a role while somebody held it was the wrong answer — deleting a role means the job no longer exists — and *leaving* the pointer was worse than either, because resolution filters by id (so a dangling id grants nothing, silently) while `explain` reads a non-empty `roleIds` and answers "holds no role", which is both wrong and unhelpful at exactly the moment someone is working out what happened.

> ⚠ **`sweepOrphans` is prefix-unaware and deletes by prefix.** See `recommendations.md` C-1. This is the highest-severity finding in the audit.

---

## 12. Background work

Two Vercel crons, both gated by `cronDenied()` (`src/platform/auth/cronAuth.js`), which **fails closed**: a missing `CRON_SECRET` refuses to run rather than deleting the check. The three routes previously each carried `if (secret && auth !== bearer)` — written that way, an unset variable does not tighten the check, it removes it, and these jobs mail out a year of traffic and then delete keys.

- `0 4 * * 1` → `/api/cron/sweep-orphans`
- `5 0 * * *` → `/api/cron/year-rollover`

`x-vercel-cron` is accepted as a second door (Vercel's edge strips inbound `x-vercel-*` from outside callers) but never as a replacement for the secret being configured at all.

---

## 13. Frontend composition

```
proxy.js  ─ rewrite ─►  app/studio/[[...segments]]/page.js   (server)
                             │  currentUser → questionnaire gate → studioContext
                             │  visibleSections() filters the nav, default-deny
                             ├─ full-screen escapes (rendered BEFORE the shell):
                             │     documentation · sales-live · technical-live · quality-documents
                             └─ StudioFrame  (client)
                                   ├ LiveProvider ── one EventSource per tab
                                   ├ NotificationBell · StudioChat · RateNompany · ThemeToggle
                                   └ one of 12 module components (all "use client")
                                         └ useEffect → fetch(`/api/studios/${slug}/<module>`)
                                              └ useLiveUpdates(slug, section, load)  ← refetches everything
```

The router resolves URL shapes to screens: `/<slug>/sales-tickets/<id>` is one ticket, `/…/<id>/quotations/<qid>` is the Sales-side read-only viewer, `/<slug>/projects-list/<id>/quotation` is Projects' perspective on the same document, `/<slug>/inventory-sheets/<id>` opens the sheet workspace with that sheet loaded. A sub-section resolves to its parent's module, which then decides the screen from the active key.

**Styling** is Tailwind + shadcn/ui + MUI together, app-wide, with an explicit cascade-layer order (`tw-base < tw-components < mui < tw-utilities`) set in `globals.css` — `enableCssLayer` alone is not enough, because unlayered Tailwind preflight otherwise collapses MUI text fields. MUI dark mode is bound to the existing `.dark` class via `colorSchemeSelector: "class"`; no `<CssBaseline />`. RTL for MUI is a known gap: `stylis-plugin-rtl` is not installed.

*(Audit: no server components for data, no Suspense, no skeletons, 1.06 MB gz of client JS — M-3, M-4. Redesign in `ui-ux-overhaul.md`.)*

---

## 14. Properties to preserve through any rewrite

Anything that replaces parts of this system must keep these, because each was arrived at by fixing a real failure:

1. **One resolver for access.** Not per-route checks.
2. **Membership authorises, the URL never does.** And a non-member learns nothing.
3. **Default deny.** No role ⇒ nothing.
4. **Nobody grants what they do not hold** — enforced at *both* doors.
5. **Reference numbers only move forward.**
6. **Reviewer ≠ approver** on any signable.
7. **Atomic read-modify-write**, with ordering guaranteed per collection.
8. **Children-first, registry-last** deletion; every cascade idempotent.
9. **The stream is truth; the doorbell is a hint.** Replay by cursor on reconnect.
10. **Events carry ids, never contents.**
11. **One Redis connection per process for pub/sub**, fan-out in memory.
12. **Cron fails closed.**
13. **A right nothing can exercise is a bug.** (Three currently violate this — M-1.)
