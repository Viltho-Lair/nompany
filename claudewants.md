# What I need from you

**How this file works:** I add a request here when I hit something only you can do.
You do it. I delete the request and carry on. I never stop working while something
sits here — I work around it and come back.

---

## Open requests

*(none)*

---

## Done

- **01/09** `gcloud auth login`, `gcloud auth application-default login` — expired
  credentials (two different ones; ADC is what the proxy uses).
- **01/09** Restore `DATABASE_URL` to a connection string — it held an instance connection
  name, which `pg` silently ignores while falling back to localhost.
- **01/09** Create the Vercel Blob store and its read/write token.
- **01/09** Delete the Redis Cloud instance — done by the owner. I could not do this
  one: it lives in Redis Cloud's own console and I hold no credential for that
  account, only a connection string, which can delete DATA but not a subscription.
- **01/09** Delete `REDIS_URL` from Vercel — nothing reads it; the package is uninstalled
  and the module deleted.
- **01/09** Delete `NOMPANY_DB` from production — absence is now verifiable, and the
  default it falls back to is `postgres`.

---

## What I am NOT going to ask you for

- **Data migration.** Nothing moves. Postgres started empty and the app fills it.
- **Docker.** Not needed — the gateway image builds on Cloud Build.
- **A second Blob store.** The existing one is used as-is.
- **Approval for schema changes.** I own `pgSchema.sql` and apply it through the DDL door,
  which refuses `DROP TABLE`, `TRUNCATE` and anything that disables row-level security.
