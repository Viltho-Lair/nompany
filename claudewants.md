# What I need from you

**How this file works:** I add a request here when I hit something only you can do.
You do it. I delete the request and carry on. I never stop working while something
sits here — I work around it and come back.

---

## Open requests

### 1. Remove `REDIS_URL` from Vercel (all environments)

Nothing reads it any more. The `redis` package is uninstalled, `src/platform/db/redis.ts`
is deleted, and no file in the repo imports either. Leaving the variable set is harmless
today but it is a live credential to a store the product no longer uses.

**Do this LAST**, after the deploy is confirmed working — while it is still set, rolling
back to an older build is possible; once it is gone, that build has nothing to connect to.

### 2. Delete the Redis Cloud instance itself — when you are ready

Same reasoning, one step further, and it is the one that ends the subscription. I am not
touching it: it is an account-level destruction outside this repo, and it should happen
after the Postgres deploy has run for long enough that you would have noticed a problem.

---

## Done

- **01/09** `gcloud auth login`, `gcloud auth application-default login` — expired
  credentials (two different ones; ADC is what the proxy uses).
- **01/09** Restore `DATABASE_URL` to a connection string — it held an instance connection
  name, which `pg` silently ignores while falling back to localhost.
- **01/09** Create the Vercel Blob store and its read/write token.
- **01/09** Delete `NOMPANY_DB` from production — absence is now verifiable, and the
  default it falls back to is `postgres`.

---

## What I am NOT going to ask you for

- **Data migration.** Nothing moves. Postgres started empty and the app fills it.
- **Docker.** Not needed — the gateway image builds on Cloud Build.
- **A second Blob store.** The existing one is used as-is.
- **Approval for schema changes.** I own `pgSchema.sql` and apply it through the DDL door,
  which refuses `DROP TABLE`, `TRUNCATE` and anything that disables row-level security.
