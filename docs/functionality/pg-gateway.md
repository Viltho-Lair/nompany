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
| `src/platform/db/pg.ts` | The transport switch — which wire `pgQuery`/`withTenant` take |
| `src/platform/db/pgGateway.ts` | The client: one statement, one POST, the error and result mapping |
| `src/platform/db/pgGatewayAuth.ts` | Vercel OIDC → Google STS → an impersonated ID token, cached |

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

## Which wire a statement takes

`PG_TRANSPORT` is `direct` (the default) or `gateway`, read **once at module scope** in
`pg.ts`, the same shape `sections.ts` reads `DB_BACKEND`. `pgQuery`, `pgTx` and
`withTenant` keep their exact signatures on both.

- **`direct` is byte-for-byte what `pg.ts` did before the switch existed.** Local
  development reaches Cloud SQL through the Auth Proxy; CI reaches its own `postgres:18`
  container as `ci_app`. That is design D5 and not caution: RLS is the thing most likely
  to break under the gateway, and a test that reaches Postgres *through* a gateway is
  testing the gateway, not the policy.
- **An unrecognised value refuses.** It does not fall back to `direct` — on Vercel there
  is no direct path at all, so `PG_TRANSPORT=gatway` silently taking it produces a
  connection *timeout* rather than a configuration error, which is the harder failure to
  read. It throws when something asks for a database rather than at module load, because
  `pg.ts` is imported transitively by the dispatcher and a typo must not take down every
  Redis-backed page too.

**One statement is one HTTPS call, and there is no batching machinery.** That is measured
rather than assumed: every `withTenant` scope in `pgRows.ts` was walked, six of the eight
issue exactly one statement, and both that issue more survive being split —

- `pgUpdateRow` (SELECT, then UPDATE) because the compare-and-set is **optimistic**.
  Correctness comes from `WHERE row_version = $6`, never from holding a transaction across
  the read and the write. Invariant 8 survives; invariant 9 survives because the retry loop
  and its small flat backoff stay on the Vercel side.
- `pgAddRows` (the `nextval` reservation, then the INSERT) because **`nextval` is
  non-transactional in Postgres** — a rollback never returns sequence values, so the
  atomicity the split appears to lose was never there under `direct` either.

A batching layer would therefore exist to preserve a property neither caller has, and would
cost the thing that matters: a deferred `q()` cannot return a result the next statement's
text depends on, and `pgUpdateRow` is exactly that caller.

**`withTenant`'s re-entrancy is unchanged** — a same-tenant nested call is absorbed into
the caller's scope, a different-tenant one is refused. Both rules live above the transport
branch, so one piece of code enforces them on either wire.

**`pgTx` and `pgSchemaQuery` refuse under `gateway`**, loudly, rather than being made to
work. `pgTx` exists for atomicity across statements whose text depends on earlier results,
and a stateless gateway cannot provide that — a door still called `pgTx` that had quietly
stopped being atomic is worse than a closed one. `pgSchemaQuery` sends the schema file as
**one text holding many statements** on purpose (the simple query protocol runs it as one
implicit transaction, so a failure partway through applies nothing), and the gateway's
one-text-is-one-statement rule refuses exactly that. Both refusals name `PG_TRANSPORT=direct`;
both doors' callers are schema and migration paths that run from CI or a developer's
machine, which reach Postgres directly already.

**Nothing bypasses the counter.** Each call is reported into `commandCount.ts` twice, into
the two fields that already exist rather than into a new one: the statement itself counts
toward `queries`, identically on both transports, so every ceiling Gate A pins measures the
same thing whichever wire carried it; and a `gateway_tx` entry counts toward `envelope`,
whose whole meaning is the transaction bookkeeping wrapped around a caller's statement —
here a `BEGIN`/`set_config`/`COMMIT` the gateway runs once per HTTPS call. So `envelope`
reads as the number of network round trips (design D4), exactly rather than approximately.

## How Vercel proves who it is

No service-account key is ever created, stored in Vercel, or rotated (design D3). Three
steps, in `pgGatewayAuth.ts`:

1. `VERCEL_OIDC_TOKEN` — injected by Vercel, short-lived.
2. `POST sts.googleapis.com/v1/token` — a Workload Identity Federation token exchange,
   the OIDC JWT as `subjectToken`, returning a federated access token.
3. `POST iamcredentials.googleapis.com/…:generateIdToken` — the federated principal
   impersonates the gateway's service account and mints a Google-signed ID token whose
   audience is the Cloud Run URL. That token is the `Authorization: Bearer`.

**The token is cached until shortly before expiry**, and that is not an optimisation
detail: re-exchanging per query would add two network round trips to every statement, and
the whole point of the gateway is that a statement is one call. The expiry comes from the
token's own `exp` claim, because `generateIdToken`'s response carries no `expires_in` at
all. A 120-second skew (`PG_GATEWAY_TOKEN_SKEW_MS`) covers clock drift plus the flight time
of the request the token is attached to. Concurrent callers share one in-flight mint, so a
cold instance serving five parallel queries does one exchange rather than five; a failed
mint is not cached, so the next caller retries instead of awaiting a rejected promise.

**There is no unauthenticated fallback, and adding one would be the single worst change
available to this design.** A missing `VERCEL_OIDC_TOKEN`, a token from another issuer, an
STS refusal and an IAM refusal all throw. Google's own error body is passed through, because
it names the claim or binding that was wrong.

**Nothing is hardcoded and the defaults are still real.** Every value is read from the
environment with a default that was *read* on 01/09/2026 rather than remembered — the
issuer (`https://oidc.vercel.com/vilthos-projects`) and audience
(`https://vercel.com/vilthos-projects`) off a live token, the project number
(`17918747100`) from `gcloud projects describe`, and the pool (`vercel`), provider
(`vercel-oidc`) and service account (`pg-gateway@nompany-application.iam.gserviceaccount.com`)
from the setup runbook that creates them. `PG_GATEWAY_URL` has no default: it is both where
the gateway lives and what the ID token is addressed to, and Cloud Run rejects a token whose
audience is not its own URL (a trailing slash is stripped, because a URL copied from the
console carries one).

The Vercel token's `iss` and `aud` are checked before STS is asked. That is a **diagnostic,
not a security boundary** — STS re-checks both against the provider's own configuration,
which is where the decision lives — but STS's refusal is an opaque `invalid_grant`, and this
names the value it saw beside the value it wanted.

`node tests/pg-gateway-client.mjs` proves 35 blocks with a stubbed `fetch` and no database:
the switch's routing, the request shape (fed through the **server's own `parseTxRequest`**,
so the client's restatement of the wire shape cannot drift silently), one-call-per-statement,
bind parameters, re-entrancy, the refusals, the error mapping, the auth chain's order and the
cache's arithmetic. `npm run test:gateway` runs it alongside the service's own suite, and CI
runs both.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Nothing has ever connected to a database through this service.** Not once, not in
  CI, not locally. The IAM database user does not exist, and there is no network path
  from a developer's machine to the private IP. So the connector call, the IAM handshake,
  a real `set_config` under a real RLS policy, a real `COMMIT` and every Postgres error
  path are **unverified**. Everything above about guards, ordering, binding and status
  codes is proven; everything about *reaching Postgres* is not.
- **No statement has ever crossed this transport.** The switch, the client and the auth
  chain are written and tested against a stubbed `fetch`; none of it has been run against
  a real Cloud Run service, a real STS exchange or a real IAM binding, because none of
  those exist yet. Everything above about routing, request shape, refusals, error mapping
  and cache arithmetic is proven; everything about *reaching Google or Cloud Run* is not.
- **The cloud half of the authentication does not exist** (plan Task 6): no Workload
  Identity pool, no provider for Vercel's OIDC issuer, no service account, no
  `roles/iam.workloadIdentityUser` binding, no `run.invoker`. `pgGatewayAuth.ts` knows how
  to ask; there is nothing yet to answer, and the service still trusts whoever reaches it.
- **`VERCEL_OIDC_TOKEN` is read from `process.env`, and a warm instance may hold a stale
  one.** Vercel refreshes the variable per invocation, but `@vercel/functions`'s own
  `getVercelOidcToken()` prefers the `x-vercel-oidc-token` request header and only then
  falls back to the environment — a distinction this code cannot make, because `pg.ts` has
  no request in scope. If a warm instance's cached ID token expires and the environment's
  OIDC token has also lapsed, the re-mint fails loudly (an STS `invalid_grant`) rather than
  silently; whether that ever happens in practice is unmeasured.
- **A Postgres error's `code` does not cross the wire.** The gateway answers a failure with
  `{ error: <message> }` and no SQLSTATE, so the client can only raise a plain `Error`.
  Nothing in this repo branches on `err.code` today — checked — so nothing is broken by it,
  but a caller that wanted to (a unique-violation retry, say) could not be written against
  the gateway transport until the service sends the code too.
- **`pgUpdateRow` and `pgAddRows` were not modified, and did not need to be.** The design
  said `pgUpdateRow` "becomes two round trips"; under one-call-per-statement it already is,
  with no edit — each `q()` is its own call. Whether the extra round trip matters under real
  contention is still unmeasured, exactly as the design said.
- **`envelope` as the network budget is asserted, not observed.** The counter now reads one
  per HTTPS call by construction (`tests/pg-gateway-client.mjs` proves the arithmetic), but
  no route has been measured through a deployed gateway, and cold starts remain unbudgeted.
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
- **`pgTx` and `pgSchemaQuery` are closed under the gateway, not solved.** Both now refuse
  with a message naming `PG_TRANSPORT=direct`, which is correct for every caller they have
  today — all of them CI or a developer's machine. If something inside a Vercel request
  ever needs either, that is a design question this refusal defers rather than answers.
- **Cold starts are unbudgeted.** Nothing measures a Cloud Run instance starting before
  the first query, and the auth chain adds two round trips to the first statement a cold
  instance serves (one STS, one impersonation) that the counter above does not record —
  they are not database round trips, and putting them in `queries` would move a ceiling for
  a reason that has nothing to do with the route.
- **No parity run compares the two transports** (plan Task 5). The harness exists in
  `tests/pg-parity.mjs`; the comparison does not.
- **No retry, no circuit breaker, no rate limit.** A failed call fails — on either side.
  The client raises whatever came back and does not retry a connection-level failure;
  whether it should, or whether the gateway should refuse a caller sending batches faster
  than the pool drains, has not been decided. (`pgUpdateRow`'s own retry loop is a
  different thing: it retries a *lost compare-and-set*, not a failed call.)
