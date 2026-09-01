# pg-gateway — the cloud setup, step by step

The owner's half of `2026-09-01-pg-gateway-implementation.md` Task 6. Every command here
creates or changes a cloud resource, so none of it has been run from the session that wrote
it. Run them in order; each one prints enough to verify the last.

Project `nompany-application`, instance `nompany`, region `me-central1`, private IP
`10.90.208.3`, database `nompany`.

## 0. Already done

`run`, `iamcredentials`, `sts`, `artifactregistry` and `compute` are enabled (verified
01/09/2026). `cloudbuild.googleapis.com` is **not**, and is needed only for
`gcloud run deploy --source`; pushing a prebuilt image to Artifact Registry avoids it.

## 1. The gateway's identity

```bash
gcloud iam service-accounts create pg-gateway \
  --display-name="Cloud Run pg-gateway" --project=nompany-application
```

## 2. Its database user — no password, ever

The service account becomes a Cloud SQL user directly. This is the reason nothing in this
design stores, rotates, or transmits a password.

```bash
gcloud sql users create pg-gateway@nompany-application.iam \
  --instance=nompany --type=cloud_iam_service_account --project=nompany-application
```

```bash
gcloud projects add-iam-policy-binding nompany-application \
  --member="serviceAccount:pg-gateway@nompany-application.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

```bash
gcloud projects add-iam-policy-binding nompany-application \
  --member="serviceAccount:pg-gateway@nompany-application.iam.gserviceaccount.com" \
  --role="roles/cloudsql.instanceUser"
```

## 3. Its rights INSIDE the database

Run as `viltho` through the Auth Proxy. **Grant the four verbs and nothing more.** Never
make it owner and never give it `BYPASSRLS`: row-level security on `collection_rows` is the
only thing standing between one tenant and another, and a role that bypasses it makes every
RLS test in this repo pass for a reason that does not hold in production.

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON collection_rows TO "pg-gateway@nompany-application.iam";
GRANT USAGE, SELECT ON SEQUENCE collection_rows_seq TO "pg-gateway@nompany-application.iam";
```

Verify it did NOT inherit more than that:

```sql
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname LIKE 'pg-gateway%';
```

Both booleans must read `f`. If either reads `t`, stop — the gateway would be able to read
every tenant's rows at once.

## 4. Workload Identity Federation, so Vercel needs no key

The claims below were read from a real `VERCEL_OIDC_TOKEN` on 01/09/2026:

| Claim | Value |
|---|---|
| `iss` | `https://oidc.vercel.com/vilthos-projects` |
| `aud` | `https://vercel.com/vilthos-projects` |
| `owner_id` | `team_0J7Y4fhEEPPGRBtVObJLZxiW` |
| `project_id` | `prj_X8T76xfU6c9Y12sNS7Hr8AB5s0G9` |
| `environment` | `development` \| `preview` \| `production` |

```bash
gcloud iam workload-identity-pools create vercel \
  --location=global --display-name="Vercel OIDC" --project=nompany-application
```

**The attribute condition is the security control, not a formality.** `environment` is part
of every token's subject, so without pinning it a PREVIEW deployment — including one built
from a pull request — receives exactly the same database access as production. Pin the
project by `project_id` rather than by name: ids are stable, and a project rename would
silently widen access.

```bash
gcloud iam workload-identity-pools providers create-oidc vercel-oidc \
  --location=global --workload-identity-pool=vercel \
  --issuer-uri="https://oidc.vercel.com/vilthos-projects" \
  --allowed-audiences="https://vercel.com/vilthos-projects" \
  --attribute-mapping="google.subject=assertion.sub,attribute.project_id=assertion.project_id,attribute.environment=assertion.environment" \
  --attribute-condition="assertion.project_id=='prj_X8T76xfU6c9Y12sNS7Hr8AB5s0G9' && assertion.environment=='production'" \
  --project=nompany-application
```

Then let that identity impersonate the service account:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  pg-gateway@nompany-application.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/17918747100/locations/global/workloadIdentityPools/vercel/attribute.project_id/prj_X8T76xfU6c9Y12sNS7Hr8AB5s0G9" \
  --project=nompany-application
```

The project number `17918747100` was read from
`gcloud projects describe nompany-application --format="value(projectNumber)"` on 01/09/2026.

## 5. Build and deploy — RUN 01/09/2026

**`--ingress=internal` WAS WRONG IN THIS DOCUMENT AND IS THE ONE ERROR WORTH READING.**
Internal ingress accepts traffic only from inside the VPC — and Vercel being outside the VPC
is the entire problem this gateway exists to solve. Deployed that way the service is
unreachable by the only caller it has. It is `--ingress=all`, and **IAM is the gate, not the
network**: `--no-allow-unauthenticated` with no `allUsers` binding, so an anonymous request
gets 403 and only a caller holding `run.invoker` gets through. Verified both ways below.

**Docker was not installed, so the image is built by Cloud Build** rather than locally.
`cloudbuild.googleapis.com` was enabled for this (step 0 said it was not). The build context
is still the repository root, for the same reason `--source=services/pg-gateway` cannot work:
the service imports `src/platform/db/sqlGuards.ts` on purpose.

`/.gcloudignore` decides what is uploaded and two of its lines are the point — `.env.*` (live
credentials) and `media-export/` (real customer files). It brought the tarball to 925 files,
8 MiB.

```bash
gcloud services enable cloudbuild.googleapis.com --project=nompany-application
```

```bash
gcloud artifacts repositories create nompany --repository-format=docker \
  --location=me-central1 --project=nompany-application
```

Cloud Build runs as the Compute Engine default service account, which by default cannot read
back its own uploaded source (`storage.objects.get` denied — the first build failed on it).
Granted the three roles the build actually needs rather than the broad
`roles/cloudbuild.builds.builder`:

```bash
gcloud projects add-iam-policy-binding nompany-application \
  --member="serviceAccount:17918747100-compute@developer.gserviceaccount.com" \
  --role=roles/storage.objectViewer --condition=None
```

…and the same for `roles/artifactregistry.writer` and `roles/logging.logWriter`.

```bash
gcloud builds submit --config services/pg-gateway/cloudbuild.yaml \
  --substitutions=_TAG=v1 --project=nompany-application .
```

```bash
gcloud run deploy pg-gateway \
  --image=me-central1-docker.pkg.dev/nompany-application/nompany/pg-gateway:v1 \
  --region=me-central1 \
  --service-account=pg-gateway@nompany-application.iam.gserviceaccount.com \
  --set-env-vars="PG_GATEWAY_INSTANCE=nompany-application:me-central1:nompany,PG_GATEWAY_DB_USER=pg-gateway@nompany-application.iam,PG_GATEWAY_DB_NAME=nompany,PG_GATEWAY_IP_TYPE=PRIVATE" \
  --network=default --subnet=default --vpc-egress=private-ranges-only \
  --ingress=all --no-allow-unauthenticated \
  --project=nompany-application
```

Service URL: `https://pg-gateway-17918747100.me-central1.run.app`

### What was verified against the live service

Boot: `listening on :8080 → …db=nompany user=pg-gateway@nompany-application.iam ip=PRIVATE
(IAM auth, no password)`.

| Probe | Result |
|---|---|
| No token | **403** — IAM is the gate |
| Identity token, `SELECT 1` | **200** `{"rows":[{"ok":1}]}` — reaches Cloud SQL over the private IP |
| `collection_rows` with no `tenantId` | **400** — refused, not silently empty |
| `DROP TABLE collection_rows` | **400** — invariant 17, unconditional |
| `SELECT 1; DROP TABLE …` in one text | **400** — the simple-protocol batch |
| `ALTER TABLE … DISABLE ROW LEVEL SECURITY` | **400** — invariant 17 |
| `$1` bound to `"; DROP TABLE collection_rows --"` | **200**, echoed as a STRING — bind parameters bind |

That last row is the design's whole argument, demonstrated: it is what Cloud SQL's Data API
could not do, and why it was rejected.

```bash
gcloud run services get-iam-policy pg-gateway --region=me-central1 --project=nompany-application
```

`allUsers` must not appear. It does not.

## 6. Vercel — DONE 01/09/2026

`PG_TRANSPORT=gateway` and `PG_GATEWAY_URL=https://pg-gateway-17918747100.me-central1.run.app`
are set in **production only**. Preview and development stay on the default `direct` — they
have no authorized path anyway, and step 4's attribute condition deliberately refuses them.

**Both are inert until `NOMPANY_DB` is set.** `DB_BACKEND` is `redis` (the variable is absent
from production, verified by reading the environment back), so nothing on Vercel calls
Postgres at all and the transport is never consulted. That is deliberate: it makes the
cutover a change to ONE variable, with everything else already in place and proven.

Vercel reports both as `[SENSITIVE]`, so their values cannot be read back. `parseTransport`
refuses an unrecognised value rather than defaulting to `direct`, so a typo fails loudly at
the first Postgres call rather than silently taking a path that does not exist on Vercel.

### The one thing still unproven

**The Vercel → STS → impersonation → `run.invoker` chain has never run.** Everything on the
Google side is verified — the service answers, the guards hold, IAM refuses anonymous callers
— but it was proven with a developer's own identity token, which says nothing about whether
Vercel's OIDC token exchanges correctly through the pool.

It cannot be exercised without a production request that touches Postgres, and none exists
while `DB_BACKEND` is `redis`. A preview deployment cannot stand in: the attribute condition
pins `environment=='production'` on purpose. So the first real test of that chain IS the
cutover, which is a reason to do it deliberately and watching, not a reason to delay it.

## 7. Only then, close the doors

```bash
gcloud sql instances patch nompany --no-assign-ip --project=nompany-application
```

This removes the public IP. Do it **after** the gateway is proven, not before — the public
IP is not currently the working path (there are no authorized networks), but removing it
while debugging removes an option.

Set `dataApiAccess` back to disallow if it is not being used for administrative queries; it
was enabled on 31/08/2026 to evaluate it as an alternative and rejected (no bind parameters
— see the design).

## Not built yet

- **None of this has been run.** Every command above is written from the API contracts and
  the real OIDC claims, not from a successful execution.
- ~~**There is no Dockerfile yet.**~~ **Written, and it bundles.** `services/pg-gateway/Dockerfile`
  builds `src/container-entry.ts` with esbuild from the repository root, which resolves the
  extensionless `./keys` import at build time; `start.mjs` and its loader hook are deleted,
  and `npm start` runs the same bundle the image does. The bundle step is proven; **the image
  has still never been built** — no Docker on this machine.
- **No rollback procedure is written.** Reverting is `PG_TRANSPORT=direct`, but with the
  public IP already removed there is no direct path from Vercel at all, so the real rollback
  is `NOMPANY_DB=redis`.
