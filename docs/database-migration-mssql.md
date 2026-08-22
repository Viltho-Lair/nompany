# Database Migration — Redis → Microsoft SQL Server

**Objective:** move the entire data layer to SQL Server, with zero data loss, zero downtime, and exact functional parity — while gaining the indexes, joins, pagination and transactions the current model cannot express.

**Precondition:** the repository seam from `refactoring-strategy.md` §2.2 exists and every service already calls `repo(collection).find({ where, order, limit, cursor })`. Without it this is an application rewrite; with it, it is a second adapter.

---

## 1. What Redis is doing that SQL must replace

Not all of it is storage. Sorting the roles is the first step, because three of them should **not** move to SQL.

| Redis role | Where | Destination |
|---|---|---|
| Document store (collections, registries) | `g:*`, `s:*`, `u:*` | **SQL Server** — tables |
| Uniqueness claims | `ix:email`, `ix:slug`, `ix:owner` | **SQL** — `UNIQUE` constraints (stronger: enforced by the engine, not by a `SET NX` the app must remember) |
| Lookup index | `ix:collab` (SET) | **SQL** — the `Collaborator` table's own index |
| Sessions with TTL | `ix:session:<token>` | **SQL** table + `ExpiresAt` + a sweep job — *or* stay in Redis. See §5. |
| Ephemeral auth (OTP), rate limits, chat rooms, FX cache | `otp:`, `rl:`, `chat:`, `fx:` | **Stay in Redis.** TTL-as-policy is exactly what Redis is for and re-implementing it in SQL is strictly worse. |
| Monotonic counters | `s:<id>:counters` | **SQL** — `SEQUENCE` per (studio, prefix), or a `Counter` table updated with `UPDLOCK` |
| Event log | `s:<id>:events` (stream) | **Stay in Redis.** Capped, cursor-addressable, O(1) append, replayed by `Last-Event-ID`. SQL has no cheap equivalent and the log is not a system of record. |
| Pub/sub doorbell | `ev:*`, `nt:*` | **Stay in Redis.** |
| Binary blobs | `g:media:*` | **Vercel Blob** (C-6) — never SQL `VARBINARY`, never Redis. |

**The end state is SQL Server for records, Redis for ephemera and real-time.** Anyone proposing "move everything" should read the event-log and TTL rows again.

---

## 2. Schema mapping

Every table carries `StudioId` where it is tenant data. That is the structural fix for gap #6 in `recommendations.md` §5: today multi-tenancy is a `studioContext` call somebody remembered to make.

### 2.1 Platform

```sql
CREATE TABLE dbo.[User] (
  UserId          VARCHAR(32)   NOT NULL PRIMARY KEY,        -- 'usr_…' preserved verbatim
  Email           NVARCHAR(320) NOT NULL,
  PasswordHash    VARCHAR(72)   NOT NULL,
  Status          VARCHAR(16)   NOT NULL DEFAULT 'active',
  Provider        VARCHAR(32)   NULL,
  PlatformRole    VARCHAR(32)   NULL,
  CreatedAt       DATETIME2(3)  NOT NULL,
  LastLoginAt     DATETIME2(3)  NULL,
  LastSeenAt      DATETIME2(3)  NULL,
  DeletedAt       DATETIME2(3)  NULL,                        -- soft delete (gap #2)
  RowVersion      ROWVERSION    NOT NULL
);
CREATE UNIQUE INDEX UX_User_Email ON dbo.[User](Email) WHERE DeletedAt IS NULL;  -- replaces ix:email
CREATE INDEX IX_User_LastSeen ON dbo.[User](LastSeenAt DESC) INCLUDE (Email, Status);
```

> `LastSeenAt` moving here is what fixes H-2's write amplification: a `UPDATE … SET LastSeenAt` touches one row, where today it rewrites the whole registry.

```sql
CREATE TABLE dbo.UserProfile (       -- u:<id>:profile        1:1
  UserId VARCHAR(32) NOT NULL PRIMARY KEY REFERENCES dbo.[User](UserId) ON DELETE CASCADE,
  FullName NVARCHAR(300) NULL, ShortName NVARCHAR(300) NULL, Phone NVARCHAR(60) NULL,
  Dob DATE NULL, PhotoUrl NVARCHAR(500) NULL,                -- was a 1.5 MB base64 string
  Language CHAR(2) NOT NULL DEFAULT 'en', WorkAddress NVARCHAR(500) NULL
);

CREATE TABLE dbo.UserVerification (  -- u:<id>:verification   1:1
  UserId VARCHAR(32) NOT NULL PRIMARY KEY REFERENCES dbo.[User](UserId) ON DELETE CASCADE,
  EmailVerifiedAt DATETIME2(3) NULL,
  ResetCodeHash VARCHAR(64) NULL, ResetCodeExpires DATETIME2(3) NULL, ResetCodeAttempts INT NOT NULL DEFAULT 0
);                                   -- note: the reset code becomes a HASH, not plaintext

CREATE TABLE dbo.UserQuestionnaire ( -- u:<id>:questionnaire  1:1
  UserId VARCHAR(32) NOT NULL PRIMARY KEY REFERENCES dbo.[User](UserId) ON DELETE CASCADE,
  Intent VARCHAR(16) NULL, Field NVARCHAR(120) NULL, Country NVARCHAR(80) NULL, City NVARCHAR(80) NULL,
  Erps NVARCHAR(MAX) NULL CHECK (Erps IS NULL OR ISJSON(Erps) = 1),   -- a short opaque list; JSON is right
  PackageKey VARCHAR(40) NULL, CompletedAt DATETIME2(3) NULL
);

CREATE TABLE dbo.UserDevice (        -- u:<id>:devices        1:N
  DeviceId VARCHAR(64) NOT NULL PRIMARY KEY,
  UserId VARCHAR(32) NOT NULL REFERENCES dbo.[User](UserId) ON DELETE CASCADE,
  Label NVARCHAR(120) NULL, DeviceType VARCHAR(16) NULL, Location NVARCHAR(120) NULL,
  IpHash VARCHAR(24) NULL,                                   -- keyed HMAC, never the address
  Trusted BIT NOT NULL DEFAULT 0, TrustedUntil DATETIME2(3) NULL,
  FirstSeenAt DATETIME2(3) NOT NULL, LastSeenAt DATETIME2(3) NOT NULL
);

CREATE TABLE dbo.StudioVisit (       -- u:<id>:studioVisits   hash → rows
  UserId VARCHAR(32) NOT NULL, StudioId VARCHAR(32) NOT NULL, Visits INT NOT NULL DEFAULT 0,
  CONSTRAINT PK_StudioVisit PRIMARY KEY (UserId, StudioId)
);

CREATE TABLE dbo.SuperAdmin (        -- g:superAdmins
  SuperAdminId VARCHAR(32) NOT NULL PRIMARY KEY,
  Email NVARCHAR(320) NOT NULL UNIQUE,
  PasswordHash VARCHAR(72) NOT NULL,
  CreatedAt DATETIME2(3) NOT NULL, PasswordSetAt DATETIME2(3) NOT NULL
);
-- sessionTokens[] becomes rows with a real expiry — this is the C-5 fix
CREATE TABLE dbo.SuperSession (
  TokenHash VARCHAR(64) NOT NULL PRIMARY KEY,                -- sha256, never the token (H-1)
  SuperAdminId VARCHAR(32) NOT NULL REFERENCES dbo.SuperAdmin(SuperAdminId) ON DELETE CASCADE,
  CreatedAt DATETIME2(3) NOT NULL, ExpiresAt DATETIME2(3) NOT NULL
);
```

### 2.2 Tenant

```sql
CREATE TABLE dbo.Studio (            -- g:studios
  StudioId    VARCHAR(32)  NOT NULL PRIMARY KEY,
  OwnerUserId VARCHAR(32)  NOT NULL REFERENCES dbo.[User](UserId),
  Name        NVARCHAR(200) NOT NULL,
  Slug        VARCHAR(64)  NOT NULL,
  LogoUrl     NVARCHAR(500) NULL,
  Country NVARCHAR(80) NULL, City NVARCHAR(80) NULL, Currency CHAR(3) NULL,
  PackageKey VARCHAR(40) NULL, TierKey VARCHAR(40) NULL,
  CreatedAt DATETIME2(3) NOT NULL, DeletedAt DATETIME2(3) NULL,
  RowVersion ROWVERSION NOT NULL
);
CREATE UNIQUE INDEX UX_Studio_Slug  ON dbo.Studio(Slug)        WHERE DeletedAt IS NULL;  -- ix:slug
CREATE UNIQUE INDEX UX_Studio_Owner ON dbo.Studio(OwnerUserId) WHERE DeletedAt IS NULL;  -- ix:owner (0..1)

CREATE TABLE dbo.Section (           -- s:<id>:sections
  SectionId VARCHAR(32) NOT NULL PRIMARY KEY,
  StudioId  VARCHAR(32) NOT NULL REFERENCES dbo.Studio(StudioId) ON DELETE CASCADE,
  [Key]     VARCHAR(64) NOT NULL,
  Name      NVARCHAR(120) NOT NULL,
  ParentId  VARCHAR(32) NULL REFERENCES dbo.Section(SectionId),
  Enabled BIT NOT NULL DEFAULT 1, SortOrder INT NOT NULL DEFAULT 0,
  Settings NVARCHAR(MAX) NULL CHECK (Settings IS NULL OR ISJSON(Settings) = 1),
  CreatedAt DATETIME2(3) NOT NULL,
  CONSTRAINT UX_Section UNIQUE (StudioId, [Key])
);

CREATE TABLE dbo.Role (              -- s:<id>:roles
  RoleId VARCHAR(32) NOT NULL PRIMARY KEY,
  StudioId VARCHAR(32) NOT NULL REFERENCES dbo.Studio(StudioId) ON DELETE CASCADE,
  Name NVARCHAR(120) NOT NULL, Description NVARCHAR(400) NULL,
  Wildcard BIT NOT NULL DEFAULT 0,
  Scopes NVARCHAR(MAX) NULL CHECK (Scopes IS NULL OR ISJSON(Scopes) = 1),
  CreatedAt DATETIME2(3) NOT NULL
);
-- Permissions are RELATIONAL, not a JSON blob: "who can approve vacations?"
-- is a question the product will be asked and cannot answer today.
CREATE TABLE dbo.RolePermission (
  RoleId VARCHAR(32) NOT NULL REFERENCES dbo.Role(RoleId) ON DELETE CASCADE,
  PermissionKey VARCHAR(64) NOT NULL,
  CONSTRAINT PK_RolePermission PRIMARY KEY (RoleId, PermissionKey)
);

CREATE TABLE dbo.Collaborator (      -- s:<id>:collaborators  (also THE employee record)
  CollaboratorId VARCHAR(32) NOT NULL PRIMARY KEY,
  StudioId VARCHAR(32) NOT NULL REFERENCES dbo.Studio(StudioId) ON DELETE CASCADE,
  UserId   VARCHAR(32) NOT NULL REFERENCES dbo.[User](UserId),
  Alias NVARCHAR(120) NULL,
  [Role] VARCHAR(16) NOT NULL DEFAULT 'member',   -- ownership only: 'owner' | 'member'
  DepartmentId VARCHAR(32) NULL REFERENCES dbo.Section(SectionId),
  EmployeeCode NVARCHAR(60) NULL, DateOfJoin DATE NULL, Mobile NVARCHAR(60) NULL,
  IdNumber       VARBINARY(512) NULL,             -- AES-256-GCM ciphertext, as today
  PassportNumber VARBINARY(512) NULL,
  IdExpiry DATE NULL, PassportExpiry DATE NULL,
  Salary DECIMAL(18,2) NULL, SalaryCurrency CHAR(3) NULL,
  CreatedAt DATETIME2(3) NOT NULL,
  CONSTRAINT UX_Collaborator UNIQUE (StudioId, UserId)
);
CREATE INDEX IX_Collaborator_User ON dbo.Collaborator(UserId) INCLUDE (StudioId);  -- replaces ix:collab

CREATE TABLE dbo.CollaboratorRole (       -- roleIds[]
  CollaboratorId VARCHAR(32) NOT NULL REFERENCES dbo.Collaborator(CollaboratorId) ON DELETE CASCADE,
  RoleId VARCHAR(32) NOT NULL REFERENCES dbo.Role(RoleId),
  CONSTRAINT PK_CollaboratorRole PRIMARY KEY (CollaboratorId, RoleId)
);
CREATE TABLE dbo.CollaboratorOverride (   -- overrides.allow / .deny
  CollaboratorId VARCHAR(32) NOT NULL REFERENCES dbo.Collaborator(CollaboratorId) ON DELETE CASCADE,
  PermissionKey VARCHAR(64) NOT NULL,
  Effect CHAR(1) NOT NULL CHECK (Effect IN ('A','D')),
  CONSTRAINT PK_CollaboratorOverride PRIMARY KEY (CollaboratorId, PermissionKey)
);
```

> **`cascadeDeleteRole` becomes a foreign key.** Today it hand-strips `roleIds` from every holder because a dangling id grants nothing silently *and* makes `explain()` give a wrong answer. `ON DELETE CASCADE` on `CollaboratorRole` does the same thing, atomically, for free.

### 2.3 Operational collections

Each of the 32 collections becomes a real table. The pattern, using `SalesTicket`:

```sql
CREATE TABLE dbo.SalesTicket (
  TicketId  VARCHAR(32) NOT NULL PRIMARY KEY,
  StudioId  VARCHAR(32) NOT NULL REFERENCES dbo.Studio(StudioId) ON DELETE CASCADE,
  SectionId VARCHAR(32) NOT NULL REFERENCES dbo.Section(SectionId),
  Ref VARCHAR(40) NOT NULL,
  Title NVARCHAR(200) NOT NULL,
  ClientId VARCHAR(32) NULL REFERENCES dbo.SalesClient(ClientId),
  Status   VARCHAR(32) NOT NULL,
  Urgency  VARCHAR(16) NOT NULL DEFAULT 'Normal',
  Industry NVARCHAR(80) NULL,
  Probability INT NULL,
  Value DECIMAL(18,2) NULL, Currency CHAR(3) NULL,
  Country NVARCHAR(80) NULL, City NVARCHAR(80) NULL,
  CreatedByCollaboratorId VARCHAR(32) NULL REFERENCES dbo.Collaborator(CollaboratorId),
  AssignedToCollaboratorId VARCHAR(32) NULL REFERENCES dbo.Collaborator(CollaboratorId),
  CreatedAt DATETIME2(3) NOT NULL, UpdatedAt DATETIME2(3) NOT NULL,
  DeletedAt DATETIME2(3) NULL,
  Extra NVARCHAR(MAX) NULL CHECK (Extra IS NULL OR ISJSON(Extra) = 1),  -- forward-compat escape hatch
  RowVersion ROWVERSION NOT NULL,
  CONSTRAINT UX_SalesTicket_Ref UNIQUE (StudioId, Ref)
);
CREATE INDEX IX_SalesTicket_Studio_Created ON dbo.SalesTicket(StudioId, CreatedAt DESC)
  INCLUDE (Title, Status, Urgency, ClientId, Value);   -- the Tickets list, covered
CREATE INDEX IX_SalesTicket_Client ON dbo.SalesTicket(StudioId, ClientId);
CREATE INDEX IX_SalesTicket_Status ON dbo.SalesTicket(StudioId, Status) WHERE DeletedAt IS NULL;
```

**Full table list**, one per collection, all with `(StudioId, SectionId, CreatedAt, DeletedAt, RowVersion)`:

| Module | Tables |
|---|---|
| Sales | `SalesTicket`, `SalesClient`, `SalesService`, `GeneratedDocument` |
| Technical | `Rfq`, `Quotation`, `QuotationLine` *(new — lines are a nested array today)* |
| Projects | `Project`, `Sla`, `Overtime` |
| Inventory | `InventoryItem`, `InventoryVendor`, `InventoryStock`, `ProjectSheet`, `SheetRow` *(new)*, `MaterialOrder`, `Delivery`, `AwbShipment`, `AwbAirline` |
| HR | `Vacation`, `Certification` |
| Finance | `Invoice`, `InvoiceLine` *(new)*, `Expense` |
| Operations | `Location`, `Permit`, `Shift`, `TrackingPosition` |
| Tasks | `Task` |
| Quality | `QualityDocument`, `QualityType`, `QualityRevision`, `QualityAudit`, `QualityAcknowledgement`, `QualityShareLink` |
| Cross | `Notification`, `JoinRequest`, `Counter`, `AuditLog` *(new — H-11)* |

**Three nested arrays are promoted to child tables** — quotation lines, invoice lines, sheet rows. They are the arrays that grow without bound and that people want to filter and total, and leaving them as JSON would carry the current model's worst property into the new one.

**`Extra NVARCHAR(MAX)` with `ISJSON`** is a deliberate escape hatch: JSON documents are loose today, and a field that exists on some rows and not others must land somewhere during backfill rather than being silently dropped. It is a migration aid, and every field found in it after cutover is a candidate for promotion to a column.

### 2.4 The relation graph becomes foreign keys

`src/platform/relations.js` already declares the whole edge set. Every `forward` edge is a foreign key, one for one:

| Edge (`relations.js`) | Foreign key |
|---|---|
| `rfq → salesTicket` (`ticketId`) | `Rfq.TicketId → SalesTicket` |
| `quotation → salesTicket` / `→ rfq` | `Quotation.TicketId`, `Quotation.RfqId` |
| `rfq → quotation` (reciprocal) | `Rfq.QuotationId → Quotation` |
| `project → quotation` / `→ salesTicket` / `→ client` | three FKs on `Project` |
| `projectSheet · invoice · expense · delivery · overtime · awbShipment · task · materialOrder → project` | `ProjectId` FK on each |
| `salesTicket → client` | `SalesTicket.ClientId` |

Every `reverse` edge — the ones that are `.filter()` scans today — becomes an **indexed lookup**. `project → invoice` with `exclude: {status:'Cancelled'}` becomes a filtered index:

```sql
CREATE INDEX IX_Invoice_Project ON dbo.Invoice(ProjectId) WHERE Status <> 'Cancelled' AND DeletedAt IS NULL;
```

The business rule that lives on the edge stays in one place — it just moves from a JavaScript constant into an index predicate *and* the repository's default `where`. Both are generated from `relations.js`, so they cannot disagree.

`pathBetween` (ticket → project → invoices) becomes a two-join query instead of two full collection scans.

---

## 3. Concurrency: replacing compare-and-set

Today, correctness comes from a Lua CAS over a whole-collection string. In SQL the equivalent is narrower, cheaper and stronger.

| Redis today | SQL Server |
|---|---|
| `editArr` CAS on the whole collection | `UPDATE … WHERE Id = @id AND RowVersion = @seen` → 0 rows affected means conflict |
| Serialisation per collection (Redis single-threaded) | Row-level locking — **finer**; two people editing two different tickets never contend at all |
| `ConflictError` after 64 attempts | 0 rows affected → 409 immediately, or retry in the repository |
| `claim()` = `SET NX` | `UNIQUE` constraint; catch error 2627/2601 |
| `bumpCounter` Lua | `SEQUENCE` per (StudioId, Prefix), or `UPDATE Counter SET Value = CASE WHEN Value < @floor THEN @floor ELSE Value END + 1 OUTPUT inserted.Value WITH (UPDLOCK, HOLDLOCK)` — the floor semantics preserved exactly |
| Multi-key writes are not atomic | **A real transaction.** Approving a join request currently writes a request row, a collaborator row and a notification in three separate operations, any of which can fail independently. |

Set `READ_COMMITTED_SNAPSHOT ON` so readers never block writers — which is what the current model gives for free and would otherwise be a regression.

**Preserve the function-patch semantics.** `updateRow(…, (row) => ({ done: !row.done }))` means "flip", not "set to what I last saw". In SQL that is either an expression update (`SET Done = ~Done`) or a retry loop on `RowVersion`. The repository must keep accepting a function; losing this reintroduces the lost-update class the CAS was written to close.

---

## 4. Migration strategy — dual-write, backfill, verify, cut over

Zero downtime, reversible at every stage.

```
 STAGE 0   Schema + repository adapter, unused in production
              │  SQL Server provisioned, same region as the functions.
              │  repo/sql.ts written; the golden suite runs green against BOTH adapters
              │  in CI. Nothing in production changes.
              ▼
 STAGE 1   BACKFILL (read-only against Redis)
              │  Per studio: read every key under s:<StudioID>:*, insert into SQL
              │  inside one transaction per studio. Idempotent (MERGE on primary key),
              │  resumable, and re-runnable. Records a checksum per collection.
              ▼
 STAGE 2   DUAL WRITE, read from Redis        ◄── the safety period
              │  Every mutation writes Redis FIRST (still the source of truth),
              │  then SQL. A SQL failure logs loudly and does NOT fail the request.
              │  A reconciler re-runs the backfill diff nightly and reports drift.
              │  Reads still come from Redis: behaviour identical, risk near zero.
              ▼
 STAGE 3   DUAL WRITE, read from SQL, per studio
              │  A per-studio flag flips reads to SQL. Roll out to one internal
              │  studio, then 5%, then all. Redis still written, so rollback is
              │  a flag flip with no data to recover.
              ▼
 STAGE 4   SQL is the source of truth
              │  Writes go to SQL inside transactions. Redis writes stop for
              │  migrated collections. Redis keeps: otp, rl, chat, fx, events,
              │  pub/sub, and (optionally) sessions.
              ▼
 STAGE 5   Decommission
              │  After a full retention window with clean reconciliation, delete
              │  the migrated key prefixes. Keep one final export.
```

### Backfill mechanics

- **One transaction per studio**, not per row and not per table — a studio is the natural consistency boundary and the natural retry unit.
- **Insertion order follows the FK graph:** `User → Studio → Section → Role → Collaborator → SalesClient → SalesTicket → Rfq → Quotation → Project → everything hanging off Project`. This is exactly `relations.js`' topological order, so it is derived, not hand-maintained.
- **Ids are preserved verbatim.** `usr_…`, `std_…`, `sec_…`, `tkt_…` become the primary keys. This is the single most important decision in the whole migration: it means every stored cross-reference, every URL, every notification `href` and every generated document keeps working, and rollback is possible at any moment.
- **Type coercion is explicit and logged.** ISO strings → `DATETIME2`, string amounts → `DECIMAL(18,2)`, `""` → `NULL`. Every coercion that loses information (a malformed date, a non-numeric amount) is written to a `MigrationAnomaly` table rather than silently defaulted. That table is reviewed before Stage 3, not after.
- **Unknown fields land in `Extra`.** Nothing is dropped.

### Verification — three independent checks

1. **Row counts** per collection per studio: Redis array length = SQL `COUNT(*)`. Cheap, catches gross failure.
2. **Checksums**: for each collection, a stable hash over the sorted, canonicalised rows on both sides. Catches per-field corruption that counts miss.
3. **Response equality** — the strongest. Replay the golden request set against both adapters and diff the JSON. If `GET /api/studios/<slug>/sales` is byte-identical from Redis and from SQL for every fixture and every real studio, the migration is correct **by the only definition that matters to a user**.

Stage 3 does not begin for a studio until all three pass for that studio.

### Rollback

| Stage | Rollback |
|---|---|
| 0-1 | Drop the SQL database. No production impact. |
| 2 | Stop writing SQL. Redis was never not the truth. |
| 3 | Flip the read flag back. Redis is still fully written. |
| 4 | Replay the SQL→Redis reverse backfill for the window since cutover. **This is why Stage 4 waits until Stage 3 has run clean for a full cycle.** |

---

## 5. Sessions — a decision to make explicitly

Sessions can move or stay, and the tradeoff is real:

- **Stay in Redis:** `EX` gives free expiry with no sweeper. Auth stays fast (one `GET`, and it is the hottest read in the system). Cost: two stores on the auth path.
- **Move to SQL:** one store; auditable "who was signed in when"; needs a sweep job for expired rows and adds a database round trip to every authenticated request.

**Recommendation: keep sessions in Redis**, hashed (H-1), and move only the *device list* to SQL (it is user data people want to see and it has no TTL semantics). Do the same for the console: `SuperSession` above is written for the SQL option, but the same table shape works as a Redis key with `EX` — what matters for C-5 is that the expiry is enforced by the store, not by the cookie.

---

## 6. Connection management

Vercel functions are ephemeral and can scale to hundreds of concurrent instances. A naive `mssql` pool per instance exhausts SQL Server's connection limit exactly as Redis Cloud's cap constrains the pub/sub design today — the same lesson, a different store.

- One pool **per process**, pinned to `globalThis` (the pattern `bus.js` already uses to survive hot reload).
- Small `max` (2-5), because concurrency comes from instance count, not pool size.
- Prefer **Azure SQL with serverless compute** or a connection proxy; if the deployment stays on Vercel, evaluate the HTTP-based driver path so a cold function does not pay a TDS handshake.
- Set the function region to the database region. This is the same unfixed issue as `recommendations.md` M-11 — do not repeat it with a new store.

---

## 7. What the migration buys

| Question | Today | After |
|---|---|---|
| One ticket by id | read all tickets | index seek |
| Tickets page 3, sorted by value | read all, sort, slice in JS | `ORDER BY … OFFSET … FETCH` |
| "Open tickets over 50k in Q3" | read all, filter in JS | indexed `WHERE` |
| Project total from invoices | read all invoices, filter, sum | `SUM` with a filtered index |
| Update one ticket | rewrite the whole collection | one row |
| Two people editing two tickets | contend on one key | no contention |
| Approve a join request | 3 independent writes | one transaction |
| "Who can approve vacations?" | unanswerable without scanning every role | one query on `RolePermission` |
| Cross-tenant leak | prevented by a call someone remembered | prevented by `StudioId` + FK + row-level security |
| Restore a deleted studio | impossible | `DeletedAt` + point-in-time restore |
| Audit "who changed this" | no record | `AuditLog` + temporal tables |

## 8. What must not be lost

1. **Ids preserved verbatim.** Every URL, cross-reference and generated document depends on it.
2. **Reference numbers only move forward** — the counter floor semantics, exactly.
3. **The function-patch update.** "Flip" must stay "flip".
4. **Per-collection ordering guarantees** that Redis gave for free — row locking is finer, but any place that depended on collection-wide serialisation must be identified and given an explicit transaction.
5. **The event stream and pub/sub stay in Redis.** They are not records.
6. **TTL-as-policy stays in Redis.** OTP, rate limits, chat rooms.
7. **`KEY_PREFIX` isolation has a SQL equivalent** — a separate database for tests, never a shared one with a prefix column. And `sweepOrphans`' prefix bug (C-1) must be fixed *before* migration, not carried into it.
8. **Soft delete replaces prefix deletion.** The cascade's idempotence came from children-first ordering; FKs give it structurally, but only if `ON DELETE CASCADE` is declared on every child — a missing one turns a delete into an error at the worst moment.
