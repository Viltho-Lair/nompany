# Cloud Run pg-gateway — implementation plan

**Design:** `docs/superpowers/specs/2026-08-31-cloud-run-db-gateway-design.md`
**Decided 01/09/2026:** the gateway authenticates to Cloud SQL as an **IAM service-account
database user**. No password exists anywhere — not in Secret Manager, not in an env var.

**Enabled already:** `run`, `iamcredentials`, `sts`, plus `artifactregistry` and `compute`.
**Not enabled:** `cloudbuild.googleapis.com` — needed only if deploying with
`gcloud run deploy --source`. A prebuilt image pushed to Artifact Registry avoids it.

## Where it lives

`services/pg-gateway/` in this repo, with its own `package.json` and `tsconfig.json`, so it
is versioned alongside the schema it serves and a migration cannot land without the gateway
that speaks to it.

**It must be added to the root `tsconfig.json`'s `exclude`.** That config includes `**/*.ts`
and excludes only `node_modules` and `tests`, so without this the gateway's source is graded
by the app's typecheck against dependencies the app does not have. `next build` ignores it
already (Next compiles only what `src/app` imports).

## Task 1 — the service

`POST /tx`, one call = one transaction (design D1).

```
{ tenantId?: string, statements: [{ text: string, values?: unknown[] }] }
 -> { results: [{ rows, rowCount }] }
```

`BEGIN` → `SET LOCAL app.tenant_id = $1` when `tenantId` is given → each statement in order,
**with its values bound** → `COMMIT`; rollback on any error, and the connection released with
the error so a poisoned client leaves the pool (the same discipline `pg.ts` already applies).

Bind parameters are the whole reason this service exists rather than the Data API — see the
design's rejection note. `values` is passed to `pg` as parameters and is **never** interpolated
into `text`.

Connects over Direct VPC egress to the private IP `10.90.208.3`, as the IAM service-account
user, using `@google-cloud/cloud-sql-connector` with `authType: IAM`.

## Task 2 — the guards, re-asserted server-side

`pg.ts` refuses DDL, `FLUSHDB`-equivalents, unbounded deletes and tenant-scoped text outside
`withTenant`. Those checks currently live only at the caller. **Once the gateway is separately
reachable, a guard that lives only at the caller is not a guard**, so `assertDdlOnly`,
`nameDangerousShape` and the tenant-scope assertion are re-run inside the service on every
statement. Invariant 17's refusals (`DROP TABLE`, `TRUNCATE`, `DROP DATABASE`, disabling RLS
on `collection_rows`) are unconditional here as they are there.

The DB role the gateway connects as is **`NOBYPASSRLS`**, so even an authorised caller cannot
escape a tenant's own rows.

## Task 3 — the transport switch in `pg.ts`

`PG_TRANSPORT` = `direct` (default) | `gateway`. `direct` is today's `pg.Pool` and stays the
default so **local and CI are unchanged** (design D5: a test that reaches Postgres through the
gateway tests the gateway, not the RLS policy).

`pgQuery`, `pgTx` and `withTenant` keep their signatures. Under `gateway`, `withTenant`
collects its callback's statements per round trip rather than holding a connection.

**`pgUpdateRow` becomes two round trips** — SELECT, compute `patch()` locally, UPDATE
`… WHERE row_version = $6`. Correctness is unchanged because the CAS is optimistic; the
version predicate does the work, not the transaction. Invariant 9 holds: the retry loop and
its small flat backoff stay on the Vercel side.

## Task 4 — authentication, no long-lived key

Vercel OIDC (`VERCEL_OIDC_TOKEN`, already present) → Google STS via Workload Identity
Federation → impersonate the gateway's invoker service account → ID token for `run.invoker`.
Ingress is internal + IAM. **Never `allUsers`** — an unauthenticated gateway is a remote SQL
execution endpoint against every tenant at once.

## Task 5 — proving the two transports agree

A parity run comparing `direct` and `gateway` over the same operations, in the shape
`tests/pg-parity.mjs` already uses for redis-vs-postgres: same call, both transports, compared
as `JSON.stringify` text. Cheap because the comparison harness exists.

**Done, and it did NOT need Task 6.** This plan assumed a deployed gateway; the seams Tasks
1–4 left make a complete run possible on one machine, which is better than waiting for a
deploy because it runs on every push. `npm run test:gateway:parity`
(`tests/pg-transport-parity.mjs`) starts the real server against a real `pg.Pool`, points a
child process's real client at it over loopback HTTP, and compares every `pgRows.ts`
operation as text. See `docs/functionality/pg-gateway.md`, *Do the two transports agree?*.

## Task 6 — the owner's steps

1. Create the gateway service account.
2. `gcloud sql users create <sa-email> --instance=nompany --type=cloud_iam_service_account`.
3. Grant it `roles/cloudsql.client` and `roles/cloudsql.instanceUser`.
4. Grant the DB role its rights on `collection_rows` (SELECT/INSERT/UPDATE/DELETE only —
   never owner, never `BYPASSRLS`).
5. Create the Workload Identity Pool + provider for Vercel's OIDC issuer.
6. Deploy with Direct VPC egress on `default`, ingress internal, no `allUsers`.
7. Set `PG_TRANSPORT=gateway` and the gateway URL in Vercel.
8. **Then** turn the instance's public IP off, and set `dataApiAccess` back to disallow if
   it is not being used for admin queries.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Tasks 1–5 are written; Task 6 is not.** The service, the shared guards, the transport
  switch and the auth client are tested with no database and no Google in the room
  (`npm run test:gateway`), and Task 5's parity run now drives the real client over real
  HTTP into the real server, a real Postgres and a real RLS policy
  (`npm run test:gateway:parity`). There is still **no WIF pool, no service account, no IAM
  binding and no deploy**, so no statement has crossed the CLOUD half of this transport —
  the Cloud SQL connector, `authType: IAM`, STS, impersonation, Cloud Run's IAM check and
  Direct VPC egress have never run.
- **Task 5's brief expected `postTx`'s `deps.token` to be the injection seam. It is not
  reachable from `pg.ts`.** `runGateway` calls `gatewayStatement(tenantId, text, params)`
  with no `deps`, so nothing driving `pgRows.ts` can pass a token that way, and adding a
  parameter for a test's benefit was the wrong trade. The seam actually used is the one
  `readGatewayAuthConfig` already documents: `GCP_STS_URL` and `GCP_IAM_CREDENTIALS_URL`
  are read from the environment, so a loopback stub answers the two auth legs and the real
  chain carries a fixed token to the gateway unmodified. `deps.token` remains a genuine
  seam for a caller that passes `deps` — there is not one today.
- **Task 3 turned out smaller than this plan expected, and Task 4 larger.** `withTenant`
  does not "collect its callback's statements per round trip" — it sends **one statement per
  HTTPS call**, because every scope in `pgRows.ts` was walked and the only two that issue
  more than one statement both survive being split (optimistic CAS in `pgUpdateRow`;
  `nextval` being non-transactional in `pgAddRows`). So `pgUpdateRow` "becomes two round
  trips" with no edit to it at all, and no batching machinery exists. See
  `docs/functionality/pg-gateway.md`.
- **`pgTx` is decided, and the decision is that it REFUSES under `gateway`.** So does
  `pgSchemaQuery`, whose one-text-many-statements shape the gateway's own contract forbids.
  Both name `PG_TRANSPORT=direct`; every caller either door has is CI or a developer's machine.
- **Cold starts are unbudgeted.** No counter here measures a Cloud Run instance starting
  before the first query.
- **`NOMPANY_DB` in production is unverifiable from here.** It reads `[SENSITIVE]`, so the
  claim that it is `redis` rests on the owner's word. Deleting the variable instead would be
  checkable, since `sections.ts:206` defaults to `redis` when unset.
