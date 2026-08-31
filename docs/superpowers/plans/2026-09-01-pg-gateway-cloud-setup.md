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

## 5. Deploy

Ingress **internal**, and never `--allow-unauthenticated`. An unauthenticated gateway is a
remote SQL execution endpoint against every tenant at once — it is the single worst failure
this design can produce, and one flag is the difference.

```bash
gcloud run deploy pg-gateway \
  --source=services/pg-gateway \
  --region=me-central1 \
  --service-account=pg-gateway@nompany-application.iam.gserviceaccount.com \
  --network=default --subnet=default --vpc-egress=private-ranges-only \
  --ingress=internal --no-allow-unauthenticated \
  --project=nompany-application
```

Confirm it is not public before sending it anything real:

```bash
gcloud run services get-iam-policy pg-gateway --region=me-central1 --project=nompany-application
```

`allUsers` must not appear. If it does, remove it before going further.

## 6. Vercel

Set `PG_TRANSPORT=gateway` and `PG_GATEWAY_URL=<the Cloud Run URL>` in **production only**.
Leave preview and development on the default `direct` — they have no authorized path anyway,
and the attribute condition in step 4 deliberately refuses them.

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
- **No rollback procedure is written.** Reverting is `PG_TRANSPORT=direct`, but with the
  public IP already removed there is no direct path from Vercel at all, so the real rollback
  is `NOMPANY_DB=redis`.
