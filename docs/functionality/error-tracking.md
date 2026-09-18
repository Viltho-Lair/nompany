# Error tracking (Sentry)

Server errors and scheduled jobs are reported to Sentry. Nothing runs in the browser.

## Turning it on

It is **off until `SENTRY_DSN` is set**. With no DSN the SDK is never started and every
report is a no-op, so a laptop, the sandbox and the test suite send nothing.

| Variable | What it does |
|---|---|
| `SENTRY_DSN` | The project's DSN. Server-only — never `NEXT_PUBLIC_`. |
| `SENTRY_TRACES_SAMPLE_RATE` | Optional, 0–1. Tracing is **off** unless this is set; it is billed per span. |

`environment` is `VERCEL_ENV` (production / preview / development), and `release` is the
commit SHA, so an error names the deploy that shipped it.

## What is reported

- **Every error thrown on the server** — route handlers, and pages through Next's
  `onRequestError` hook (`src/instrumentation.ts`), including the pages `withRequest` does
  not wrap.
- **Every `log.error` line**, as a message. Many failures are caught and logged rather than
  thrown — a studio whose daily notices failed is a caught error inside a 200 — and those
  are the ones nobody would otherwise see.
- Each event is tagged with the **request id** and **route**, so it is one search away from
  its lines in the Vercel log.

## What is never sent

Client data is sealed at rest (invariant 18) and is plain text on its way there, so
`scrub` in `platform/http/sentry.ts` removes, from every event:

- request headers (and so the session cookie), the request body and the query string —
  only the method and the path stay;
- the user, the IP address and the server name (`sendDefaultPii: false`);
- query strings on breadcrumb URLs (an outgoing call can carry an API key in one).

Extra fields go through `redact`, the same rule every log line uses.

## Scheduled jobs

Each cron checks in with a Sentry monitor on every run, and Sentry says when a run is
**missed**, **fails** (a throw or a 5xx answer) or **runs over 15 minutes**. The schedule is
read from `vercel.json`, so the monitor cannot disagree with the job. The margin is **60
minutes** because Vercel's Hobby plan runs a daily cron anywhere inside the hour it names.

All five crons are `cronJob(name, job)` (`platform/http/cron.ts`): request scope, the
secret check, then the check-in, in that order. A refused request never checks in, so
someone requesting the URL cannot mark a job as run. `testEveryCronIsMonitored` holds the
route folder, the `cronJob` name and `vercel.json` together.

## Not built yet

- **No browser error tracking.** A crash inside a client component is not reported. The
  browser SDK costs tens of kilobytes against a client budget with ~16 KB of headroom;
  `testSentryStaysOnTheServer` refuses any `@sentry` import outside the two server files.
- **No source-map upload.** Stack traces point at compiled server chunks. Uploading needs
  `withSentryConfig` in `next.config.mjs` and a `SENTRY_AUTH_TOKEN` at build time.
- **No session replay, no alert rules and no tenant tag** — which studio an error happened
  in is not on the event; the request id leads to it through the log.
- **The edge runtime is not instrumented**; nothing of ours runs there that can fail.
