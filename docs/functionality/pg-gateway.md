# The Postgres gateway

How a statement gets from Vercel to Cloud SQL when there is no network path between
them. A small Cloud Run service, `services/pg-gateway`, that takes a batch of SQL over
HTTPS and runs it as one transaction.

## What it is

Vercel cannot reach the Cloud SQL instance at all. The instance has a public IP but
**zero authorized networks**, its private IP lives on a VPC Vercel is not in, and
`enablePrivatePathForGoogleCloudServices` is off. Local development works only because
the Cloud SQL Auth Proxy authenticates by IAM rather than by network path, which is why
the gap was invisible until deploy was considered.

The alternatives were weighed and written down in
`docs/superpowers/specs/2026-08-31-cloud-run-db-gateway-design.md` so they are not
revisited by accident: authorizing `0.0.0.0/0` (a multi-tenant ERP on the open internet
behind a password), Vercel Secure Compute static IPs (correct, but a paid add-on), and
the **Cloud SQL Data API**, which was enabled and read from its own discovery document
before being rejected — `ExecuteSqlPayload` has **no bind-parameter field**, and the pg
layer binds 38 placeholders, three of which carry tenant-authored JSON. Without binds
that JSON is concatenated into SQL text, which is a SQL-injection surface across the
whole ERP on exactly the data tenants control. **Bind parameters are the reason this
service exists.**

| Where | What it is |
|---|---|
| `services/pg-gateway/start.mjs` | The process entry — registers the module resolver, then `main()` |
| `services/pg-gateway/src/main.ts` | The wiring: config → pool → the one transaction function → listen |
| `services/pg-gateway/src/server.ts` | `POST /tx`, `GET /healthz`, the body ceiling, the status codes |
| `services/pg-gateway/src/request.ts` | The request shape, validated strictly (unknown keys refused) |
| `services/pg-gateway/src/guard.ts` | The guards, re-run on this side of the network |
| `services/pg-gateway/src/tx.ts` | `BEGIN` → tenant → statements → `COMMIT`, and the client discipline |
| `services/pg-gateway/src/pool.ts` | The one place a connection is opened, through the Cloud SQL connector |
| `services/pg-gateway/src/config.ts` | Every address, from the environment; refuses to start if a password exists |
| `src/platform/db/sqlGuards.ts` | The guards themselves — **imported by both** this service and `pg.ts` |
| `src/platform/db/pgClientGuard.ts` | The held-client crash guard, likewise shared |

**The contract is one call, one transaction:**

```
POST /tx   { tenantId?: string, statements: [{ text, values? }] }
        -> { results: [{ rows, rowCount }] }
```

Holding a transaction open across several HTTP calls, keyed by a transaction id, was the
obvious design and was rejected: it needs session affinity, it leaks transactions holding
row locks whenever an instance dies mid-scope, and it turns every Cloud Run cold start
into a correctness event rather than a latency one.

**This is safe only because the compare-and-set is optimistic.** `pgUpdateRow` re-reads
`row_version` and writes `… WHERE row_version = $6`; correctness comes from that
predicate, not from holding a transaction across the read and the write. Invariant 8
survives the split because the CAS never depended on the transaction. Invariant 9
survives too — the retry loop and its small flat backoff stay on the Vercel side.

## What it stores

**Nothing.** The service is stateless: no cache, no session, no transaction registry, no
file. It holds a `pg` pool and a Cloud SQL connector for the life of the process and that
is all. Everything it writes, it writes into `collection_rows` on the caller's behalf,
inside the caller's own transaction.

It also **logs nothing about the statements** beyond how many there were and whether a
tenant was set. `values` carry tenant data, so they never reach Cloud Logging.

## What it does

**Reads its whole address from the environment** — `PG_GATEWAY_INSTANCE`,
`PG_GATEWAY_DB_USER`, `PG_GATEWAY_DB_NAME`, `PG_GATEWAY_IP_TYPE` (default `PRIVATE`),
`PG_GATEWAY_POOL_MAX`, `PORT`, and the two timeouts. The design names a private IP,
`10.90.208.3`; that address is deliberately **not** in the code, because the Cloud SQL
connector resolves it from the instance connection name.

**Authenticates as an IAM service-account database user, and holds no password at all.**
The connector mints a short-lived token per connection. `readConfig` **refuses to start**
if `PGPASSWORD`, `PG_GATEWAY_DB_PASSWORD` or `DATABASE_URL` is set — a password-shaped
variable in this container is evidence that the IAM path is not the one in use, and boot
is the only moment anyone will look.

**Runs the batch as one transaction:** `BEGIN` → `SELECT set_config('nompany.tenant_id',
$1, true)` when a tenant is given → each statement in order **with its `values` bound** →
`COMMIT`. `set_config(..., true)` is `SET LOCAL`, cleared by Postgres itself at COMMIT or
ROLLBACK — a session-level `SET` would still be sitting on a backend that transaction-mode
pooling has already handed to a different tenant. The tenant id is a bind parameter, not
text, because it arrives from across a network.

Any failure rolls back, and the client is released **with** the error so pg-pool destroys
the physical connection instead of handing a connection of unknown transaction state to
the next caller. A connection that already emitted `error` is not asked to roll back at
all.

**Re-runs the app's own guards, server-side.** This is the point of the whole arrangement:

- **A guard that lives only at the caller is not a guard once the callee is separately
  reachable.** `pg.ts` checks before it sends; a caller that is not `pg.ts` skips every
  one of those checks simply by not being `pg.ts`.
- Nothing is reimplemented. `assertNotTenantScoped`, `assertDdlOnly` and the statement
  splitter were lifted out of `pg.ts` into `src/platform/db/sqlGuards.ts` — a pure module
  that imports `TBL` and nothing else — and both sides import it. A second copy would
  drift, and the copy that drifts is the one guarding a remote SQL endpoint.

The rules, per statement:

| Statement | With no `tenantId` | With a `tenantId` |
|---|---|---|
| `SELECT`/`INSERT`/`UPDATE`/`DELETE`/`WITH`/`VALUES` naming `collection_rows` | **refused** — RLS would return zero rows rather than fail | allowed; `set_config` + RLS is the mechanism |
| The exact DDL shapes `pgSchema.sql` uses | allowed | **refused** — a schema statement has no tenant |
| `DROP TABLE`, `DROP DATABASE`, `TRUNCATE`, `DROP SCHEMA`, `DROP OWNED`, `DISABLE ROW LEVEL SECURITY` | **refused, naming invariant 17** | **refused, naming invariant 17** |
| Anything else | **refused** — the allowlist is the door, not a leading keyword | same |

**One `text` must be exactly one statement**, and that rule is specific to this service.
`pg` uses the extended (bind-parameter) protocol only when a query carries values; with
none it uses the *simple* protocol, which runs `SELECT 1; DROP TABLE collection_rows` as a
semicolon-separated batch in a single message. So every text is split with the same
string- and comment-aware tokenizer the DDL guard uses and refused unless it yields one
statement. A semicolon inside a quoted string is ordinary text; an unterminated quote is
refused rather than guessed at.

**Refusals are 400, database failures are 500.** A refusal is a decision made before
Postgres was asked anything, so retrying will never help, and the message is returned in
full — the caller is this project's own application, and a 400 whose body says only "bad
request" turns a five-second fix into an afternoon. A refused batch never takes a pooled
connection: the handler guards first, and `runBatch` guards again so no other route into
it can execute an unguarded batch.

**The body is capped at 4 MB**, refused as it arrives. `GET /healthz` deliberately touches
no database — a liveness probe that opened a connection would turn a database blip into a
restart loop and remove the capacity that might have recovered.

**It does not authenticate its caller, and must never be deployed so that anyone can.**
Authentication is Cloud Run's: ingress internal, IAM `run.invoker`, Vercel OIDC federated
through Workload Identity. An `--allow-unauthenticated` deploy of this service is a remote
SQL execution endpoint against every tenant's data at once — the single worst failure
available in this design.

**Tested without a database at all.** There is no IAM database user yet and no VPC path
from a developer's machine, so the parts that decide things are independent of the part
that connects: `parseTxRequest` and `guardBatch` are pure, `runBatch` takes any object
with a `query` method, and the HTTP handler takes the transaction function as a parameter.
`node services/pg-gateway/test/gateway.test.mjs` proves 32 blocks — the guard rules, the
statement order, the bound parameters, the rollback, the status codes — with no Postgres
in the room, the same shape `tests/pg-query.mjs` uses.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Nothing has ever connected to a database through this service.** Not once, not in
  CI, not locally. The IAM database user does not exist, and there is no network path
  from a developer's machine to the private IP. So the connector call, the IAM handshake,
  a real `set_config` under a real RLS policy, a real `COMMIT` and every Postgres error
  path are **unverified**. Everything above about guards, ordering, binding and status
  codes is proven; everything about *reaching Postgres* is not.
- **`pg.ts` does not use it.** There is no `PG_TRANSPORT` switch (plan Task 3), so
  `pgQuery`, `pgTx` and `withTenant` still speak to `DATABASE_URL` directly, and this
  service has no caller at all. Local and CI stay on the direct transport deliberately —
  a test that reaches Postgres through a gateway tests the gateway, not the RLS policy.
- **`pgUpdateRow` has not been split into two round trips.** The design says it must
  become SELECT-then-UPDATE under this transport, because a function patch cannot cross a
  network. That is unwritten.
- **There is no authentication wiring** (plan Task 4): no Workload Identity pool, no
  provider for Vercel's OIDC issuer, no service account, no IAM binding. The service
  trusts whoever reaches it.
- **It has never been deployed** (plan Task 6): no Artifact Registry image, no Cloud Run
  service. There IS now a `Dockerfile`, but **it has never been built** — Docker is not
  installed on the machine that wrote it — so it is a plan for an image rather than a
  working one. It bundles with esbuild from the repository root, which is what lets the
  container drop `start.mjs`'s loader hook (see `src/container-entry.ts`).
  `cloudbuild.googleapis.com` is still not enabled, and the image path does not need it.
- **The container installs no init process and the service handles no SIGTERM.** Node runs
  as PID 1 in that image, where it gets no default signal handling, and Cloud Run sends
  SIGTERM before evicting an instance. Until the service installs a handler (or the image
  gains `--init`), an eviction can cut a transaction short rather than draining it.
- **The runbook's deploy step has been corrected since this was written.** It used to say
  `gcloud run deploy --source=services/pg-gateway`, which uploads only that directory and
  therefore could not see the shared guards the service imports. It now builds an image
  with the repository root as the build context, which is the only shape that works.
- **That same deploy command sets no environment variables**, and this service refuses to
  start without `PG_GATEWAY_INSTANCE`, `PG_GATEWAY_DB_USER` and `PG_GATEWAY_DB_NAME`.
  Refusing is the correct behaviour — nothing is hardcoded — but the command needs a
  `--set-env-vars` before it will ever come up.
- **`start.mjs` registers `tests/loader.mjs`.** A deployable importing a file out of
  `tests/` is a wart, and it is here because the shared guards reach their siblings with
  extensionless specifiers that plain Node's ESM resolver cannot follow. A bundling
  container build would resolve those at build time and the hook would go away. Nothing
  about the service's behaviour depends on which way that goes.
- **`pgTx` — multi-statement and not tenant-scoped — has not been mapped onto the batch
  shape.** Its callers are schema and migration paths, which may keep the direct
  transport. Open.
- **`pgSchemaQuery` cannot cross this gateway as it stands, and that is a decision
  waiting to be made rather than a bug found late.** It hands `pgSchema.sql` to Postgres
  as **one text holding many statements** on purpose — the simple query protocol runs the
  whole file as one implicit transaction, so a failure partway through leaves nothing
  applied. The gateway's one-text-is-one-statement rule refuses exactly that. Either the
  migration runner keeps the direct transport (it runs from a developer's machine or CI,
  which both reach Postgres already), or it sends the file as a batch of statements and
  loses the all-or-nothing property the single text buys. Nothing has been changed either
  way, because `pg.ts` has no transport switch yet.
- **Cold starts are unbudgeted.** `commandCount.ts`'s `envelope` counter becomes the
  network cost once one `withTenant` scope is one HTTPS round trip, but nothing measures a
  Cloud Run instance starting before the first query.
- **No parity run compares the two transports** (plan Task 5). The harness exists in
  `tests/pg-parity.mjs`; the comparison does not.
- **No retry, no circuit breaker, no rate limit.** A failed call fails. Whether the
  gateway should retry a connection-level failure, or refuse a caller sending batches
  faster than the pool drains, has not been decided.
