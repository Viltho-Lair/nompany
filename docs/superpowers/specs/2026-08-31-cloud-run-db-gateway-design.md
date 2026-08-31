# Reaching Cloud SQL from Vercel — a Cloud Run gateway

**Status:** design, not started. Decided 31/08/2026.
**Blocks:** P1 Task 10 (the Postgres cutover). Nothing else.

## The problem, stated exactly

`src/platform/db/pg.ts` speaks the Postgres wire protocol to `DATABASE_URL` through
`pg.Pool`. Vercel cannot reach the instance:

| Fact | Value | Source |
|---|---|---|
| Instance | `nompany`, `POSTGRES_18`, `me-central1`, `db-custom-2-8192`, `RUNNABLE` | `gcloud sql instances describe` |
| Public IPv4 | enabled — `34.18.173.127`, `34.18.77.168` | same |
| `authorizedNetworks` | **absent — zero entries** | same |
| Private IP | `10.90.208.3` on `projects/nompany-application/global/networks/default` | same |
| `enablePrivatePathForGoogleCloudServices` | `false` | same |
| `sslMode` | `ENCRYPTED_ONLY` (`requireSsl: false`) | same |

Google states the consequence in the config itself: *"Configuring authorized network or
using CloudSQL auth proxy or language connectors is a prerequisite for connecting to Public
IP."* Local development works because the Auth Proxy authenticates by IAM rather than by
network path, which is why this was invisible until deploy was considered.

`DATABASE_URL` **is** now set in production. That makes the situation worse rather than
better: with no route, a cutover fails on connection timeout rather than on the immediate
`pg: DATABASE_URL is not set` throw, and a timeout is the harder failure to read.

**Rejected alternatives**, recorded so they are not revisited by accident: authorizing
`0.0.0.0/0` (exposes a multi-tenant ERP to the internet behind a password alone); Vercel
Secure Compute static IPs (correct, least-privilege, but a paid add-on); staying on Redis
(safe, and remains the right interim state — see "Before any of this").

## Shape

One Cloud Run service, `pg-gateway`, in `me-central1`, with Direct VPC egress onto the
`default` network so it reaches `10.90.208.3` privately. Vercel calls it over HTTPS. The
public IP on the instance can then be turned **off** entirely, which is a security
improvement over today rather than a new exposure.

```
Vercel (pg.ts, transport: "gateway")  --HTTPS+OIDC-->  Cloud Run pg-gateway  --private IP-->  Cloud SQL
```

## D1 — The gateway is STATELESS. One call = one transaction.

The obvious design is to hold a transaction open across several HTTP calls, keyed by a
transaction id, so `withTenant`'s callback keeps working unchanged. **Rejected.** It needs
session affinity (a call routed to a second instance finds no transaction), it leaks
transactions holding row locks whenever an instance dies mid-scope, and it turns every
Cloud Run cold start into a correctness event rather than a latency one.

Instead each call carries a **statement batch** executed as one transaction:

```
POST /tx   { tenantId?: string, statements: [{ text, values }] }
        -> { results: [{ rows, rowCount }] }
```

The gateway does `BEGIN` → `SET LOCAL app.tenant_id` (when `tenantId` is given) → each
statement in order → `COMMIT`, on one pooled connection, and rolls back on any error.

**This is safe only because the compare-and-set is optimistic.** `pgUpdateRow` re-reads
`row_version` and writes `... WHERE row_version = $6`; correctness comes from that predicate,
not from holding a transaction across the read and the write. Invariant 8 survives the split
because the CAS never depended on the transaction in the first place. Invariant 9 also
survives: the retry loop stays on the Vercel side and its backoff stays small and flat, so
N contending writers still drain in N rounds.

## D2 — A function patch cannot cross the network, and is not asked to

`pgUpdateRow` accepts `patch: Row | ((row) => Row)`, and the function form is deliberate —
CLAUDE.md invariant 8: "`updateRow` takes a **function** patch so 'flip this field' stays a
flip under contention." An arbitrary closure cannot be serialised to Cloud Run.

It does not need to be. The read and the write become **two calls**, and the patch runs on
the Vercel side between them exactly as it does today:

1. `SELECT payload, row_version …` — one call.
2. compute `patch(current.payload)` locally.
3. `UPDATE … SET payload = …, row_version = row_version + 1 WHERE … AND row_version = $6` —
   one call. A losing writer gets `rowCount: 0` and the existing loop retries.

Cost: `pgUpdateRow` goes from one round trip per attempt to two. That is the price of the
gateway and it is **measured, not assumed** — see D4. Nothing about the semantics changes;
this is the same optimistic CAS with a longer wire between its halves.

## D3 — Authentication: Vercel OIDC, no long-lived key

`VERCEL_OIDC_TOKEN` is already present in the project's environment, so OIDC is enabled.
The chain is: Vercel OIDC token → Google STS via **Workload Identity Federation** →
impersonate a service account holding `roles/run.invoker` on `pg-gateway`. No service-account
JSON key is ever created, stored in Vercel, or rotated.

The gateway's ingress is **internal + IAM-authenticated**; it is never `allUsers`.

**The gateway executes SQL text it is given, so an unauthenticated instance of it is a
remote-code-execution endpoint against every tenant's data at once.** That is the single
worst failure available in this design, and the mitigations are: IAM on the service (no
anonymous invocation), the DB role it connects as is the non-superuser `NOBYPASSRLS` role
(so RLS still confines every statement even if an authorised caller is compromised), and
`pgSchemaQuery`'s existing DDL refusals stay on the Vercel side **and** are re-asserted
inside the gateway — a guard that lives only at the caller is not a guard once the callee
is separately reachable.

## D4 — The network budget already has a counter

`commandCount.ts` distinguishes `queries` (a caller's own statement) from `envelope` (the
`BEGIN`/`SET LOCAL`/`COMMIT` bookkeeping), and its header notes that "envelope's cost tracks
how many SEPARATE `withTenant` scopes a route happens to open." Under this design **one
`withTenant` scope is exactly one HTTPS round trip**, so `envelope` becomes the network cost
without inventing a new measurement. Hop counts are part of the contract (CLAUDE.md), and
this extends that contract to the gateway rather than creating an unmeasured hop.

## D5 — CI and local keep the direct transport

`pg.ts` gains a transport switch: `direct` (today's `pg.Pool`) and `gateway`. **CI stays on
`direct`** against its `postgres:18` container, connecting as `ci_app` (`NOSUPERUSER`,
`NOBYPASSRLS`). This is not a convenience: RLS is the thing most likely to break under the
gateway, and a test that reaches Postgres through a gateway is testing the gateway, not the
policy. Local development stays on `direct` through the Auth Proxy. Only Vercel uses
`gateway`, and a parity run comparing the two transports is how it is proven equivalent.

## Before any of this

**`NOMPANY_DB` in production must be `redis` (or removed) until the gateway exists.** It is
currently set to a value the CLI reports as `[SENSITIVE]`, and `DATABASE_URL` is now set
alongside it. If that value is `postgres` or `parity`, merging P1 points production at an
unreachable database. P1's parity result is already proven locally and in CI, so the cutover
loses nothing by waiting.

## What only the account owner can do

None of this is startable from here — the Cloud Run Admin API is **not enabled** on
`nompany-application`, and there are **no workload identity pools**. Enabling APIs and
creating cloud resources are account changes and are the owner's to make:

1. Enable `run.googleapis.com` (and `iamcredentials.googleapis.com`, `sts.googleapis.com`).
2. Create the Workload Identity Pool + provider for Vercel's OIDC issuer.
3. Create the `pg-gateway` service account, grant it Cloud SQL Client and the DB role.
4. Deploy the service with Direct VPC egress on `default`, ingress internal, no `allUsers`.
5. Then, and only then, turn the instance's **public IP off**.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Nothing in this document is implemented.** There is no `pg-gateway` service, no transport
  switch in `pg.ts`, no WIF pool, and no Cloud Run API enabled.
- **The two-call `pgUpdateRow` is designed, not measured.** Whether the extra round trip
  matters under real contention is unknown until `envelope` is read against a deployed
  gateway.
- **`pgTx` (multi-statement, non-tenant-scoped) has not been mapped onto the batch shape.**
  Its callers are schema/migration paths, which may keep the `direct` transport instead; that
  decision is open.
- **Cold starts are unbudgeted.** A Cloud Run instance that must start before the first query
  adds latency no counter here measures.
