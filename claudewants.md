# What I need from you

**How this file works:** I add a request here when I hit something only you can do.
You do it. I delete the request and carry on. I never stop working while something
sits here — I work around it and come back.

**Right now: nothing is blocking.** I have Postgres through the proxy, the gateway is
deployed, and the schema is mine to extend. This section stays empty until it isn't.

---

## Open requests

*(none)*

---

## Done — kept so you can see what was asked and when

- **01/09** `gcloud auth login` — expired CLI credential. Done.
- **01/09** `gcloud auth application-default login` — expired ADC, which the proxy uses. Done.
- **01/09** Restore `DATABASE_URL` to a connection string (it held an instance connection
  name, which `pg` silently ignores). Done.
- **01/09** Create the Vercel Blob store and its read/write token. Done.

---

## What I am NOT going to ask you for

Recorded so you know these are handled and will not come back as requests:

- **Data migration.** Nothing moves from Redis. Postgres starts empty and the app
  populates it from zero, as you said.
- **Docker.** Not needed for anything — the gateway image builds on Cloud Build.
- **A second Blob store.** The existing one is used as-is.
- **Approval for schema changes.** I own `pgSchema.sql` and apply it through the DDL
  door, which refuses `DROP TABLE`, `TRUNCATE` and anything that disables RLS.
