// ERROR TRACKING, SERVER SIDE ONLY.
//
// Until this, an error was a log line and nothing else: `withRequest` wrote
// "request failed" with a request id and the first frame of the stack, and
// somebody had to be reading the Vercel log at the right moment to know. A
// crash nobody happened to be watching for — the planner's white screen was
// found by opening it — had no way to announce itself.
//
// OFF UNLESS `SENTRY_DSN` IS SET. No DSN, no `init`, and every call below is the
// SDK's own no-op, so a laptop, the sandbox and the test suite send nothing.
//
// NOTHING HERE REACHES A BROWSER. There is no `instrumentation-client.ts` and
// no `withSentryConfig`: the browser SDK is tens of kilobytes against a total
// client budget with ~16 KB of headroom, and the server is where the errors
// nobody sees are. `testSentryStaysOnTheServer` holds the line — the only
// importers of any `@sentry` package are this file and `src/instrumentation.ts`.
//
// WHAT IS SENT IS THE ERROR, NOT THE REQUEST. Client data is sealed at rest
// (invariant 18) and it is in plain text in a request body, a cookie and a
// query string on its way there, so `scrub` drops all of those before anything
// leaves. Fields travel through the same `redact` every log line does — one
// rule, not a second list free to disagree with it.

import * as SentryModule from "@sentry/nextjs";
import { after } from "next/server";
import vercel from "../../../vercel.json";
import { redact, REPORTER, type Fields, type Reporter } from "./observability";

// THE SDK IS A COMMONJS PACKAGE, AND NODE'S ESM LOADER SEES ONLY PART OF IT.
// Next's bundler hands back every export; plain Node (the test suite runs
// routes under it) reads the names with a static lexer that cannot follow the
// SDK's re-exports, so the namespace carried 30 names and `captureCheckIn` and
// `flush` were undefined — every cron route threw the moment a test called it.
// The whole module is on `default` there. Same trap as stylis-plugin-rtl
// (CLAUDE.md, Styling): take `default` when it exists, the namespace otherwise.
const Sentry: typeof SentryModule =
  (SentryModule as unknown as { default?: typeof SentryModule }).default ?? SentryModule;

type SentryEvent = Parameters<NonNullable<SentryModule.NodeOptions["beforeSend"]>>[0];
type SentryBreadcrumb = Parameters<NonNullable<SentryModule.NodeOptions["beforeBreadcrumb"]>>[0];

const withoutQuery = (url: unknown) => (typeof url === "string" ? url.split("?")[0] : url);

/** Strip everything that could carry a person's data off an outgoing event. */
function scrub(event: SentryEvent): SentryEvent {
  if (event.request) {
    // Headers carry the session cookie; the body carries whatever was typed;
    // the query string carries search terms. Method and path stay — they are
    // what says which route broke, and a studio slug is a public address
    // (invariant 2).
    event.request = { method: event.request.method, url: withoutQuery(event.request.url) as string };
  }
  delete event.user;
  delete event.server_name;
  if (event.extra) event.extra = redact(event.extra) as typeof event.extra;
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(scrubCrumb);
  return event;
}

function scrubCrumb(crumb: SentryBreadcrumb): SentryBreadcrumb {
  // An outgoing fetch's URL can carry an API key in its query (Maps, the
  // gateway's token exchange); the path is enough to say what was called.
  if (crumb.data) crumb.data = redact({ ...crumb.data, url: withoutQuery(crumb.data.url) }) as typeof crumb.data;
  return crumb;
}

// ON VERCEL THE FUNCTION IS FROZEN THE MOMENT THE RESPONSE IS SENT, and an
// event still in the SDK's queue goes with it. `after` keeps the function alive
// long enough to send it, and costs the response nothing. Outside a request
// (a script) `after` throws, and there a plain flush is right anyway.
function flushSoon(): void {
  try {
    after(() => Sentry.flush(2000));
  } catch {
    void Sentry.flush(2000);
  }
}

const reporter: Reporter = {
  exception(error: unknown, fields: Fields) {
    Sentry.withScope((scope) => {
      tag(scope, fields);
      Sentry.captureException(error);
    });
    flushSoon();
  },
  message(message: string, fields: Fields) {
    Sentry.withScope((scope) => {
      tag(scope, fields);
      scope.setExtras(fields);
      Sentry.captureMessage(message, "error");
    });
    flushSoon();
  },
};

// The request id is a TAG, so an event in Sentry and its lines in the Vercel
// log are one search apart — which is the whole reason the id exists.
function tag(scope: SentryModule.Scope, fields: Fields): void {
  if (typeof fields.requestId === "string" && fields.requestId) scope.setTag("requestId", fields.requestId);
  if (typeof fields.route === "string" && fields.route) scope.setTag("route", fields.route);
}

/** Called once per server process from `register()` in `src/instrumentation.ts`. */
export function startErrorTracking(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  // NOT DURING `next build`. The build prerenders pages, several of them read
  // the database, and a build machine that cannot reach it logs "request
  // failed" for each — measured on the first build with a DSN set. Reported,
  // those arrive tagged as production errors that no user ever met. Vercel
  // exposes the same variables to the build as to the runtime, so this is the
  // one place to tell the two apart.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    // No IP, no cookies, no user — the SDK's own default, stated so nobody
    // flips it while "adding context".
    sendDefaultPii: false,
    // TRACING IS OPT-IN AND OFF BY DEFAULT. It is what would put the hop
    // counts back in front of somebody (nothing has read them since Gate A
    // went), but it is billed per span and every request makes several. Set
    // SENTRY_TRACES_SAMPLE_RATE (0–1) to turn it on.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0,
    beforeSend: scrub,
    beforeBreadcrumb: scrubCrumb,
  });
  // A GLOBAL rather than a module variable: `instrumentation.ts` and the route
  // bundles are compiled separately and do not share module instances, so a
  // variable set here would be a different variable from the one
  // `observability` reads. `globalThis` is the one thing they share.
  (globalThis as Record<symbol, unknown>)[REPORTER] = reporter;
}

/** Next's hook for errors thrown anywhere on the server — pages as well as routes. */
export const captureRequestError = Sentry.captureRequestError;

// ---- cron check-ins ---------------------------------------------------------
//
// A cron that stops running fails NOTHING — no request, no error, no line. That
// is the one failure logging cannot see, and a check-in can: Sentry expects one
// on the schedule and says so when it does not arrive.
//
// THE SCHEDULE IS READ FROM vercel.json, not restated, so the monitor and the
// job cannot disagree about when the job runs.

const SCHEDULES: Record<string, string> = Object.fromEntries(
  (vercel.crons || []).map((c: { path: string; schedule: string }) => [c.path.replace(/^\/api\/cron\//, ""), c.schedule]),
);

/** The monitors this deployment declares, by slug. */
export const cronSchedules = (): Record<string, string> => ({ ...SCHEDULES });

/**
 * Run a scheduled job between two check-ins. Only ever called AFTER the cron's
 * own authorisation: a probe that is refused must not check in, or a stranger
 * requesting the URL would report the job as having run.
 */
export async function monitored(slug: string, run: () => Promise<Response>): Promise<Response> {
  const schedule = SCHEDULES[slug];
  const checkInId = Sentry.captureCheckIn(
    { monitorSlug: slug, status: "in_progress" },
    schedule ? {
      schedule: { type: "crontab", value: schedule },
      timezone: "Etc/UTC",
      // SIXTY MINUTES, AND THAT IS THE PLAN. Vercel's Hobby tier fires a daily
      // cron somewhere inside the hour it names, not on the minute, so a
      // tighter margin reports a job that ran on time as missed.
      checkinMargin: 60,
      maxRuntime: 15,
    } : undefined,
  );
  const started = Date.now();
  let status: "ok" | "error" = "error";
  try {
    const res = await run();
    // A job that ANSWERS 5xx failed as surely as one that throws.
    status = res.status < 500 ? "ok" : "error";
    return res;
  } finally {
    Sentry.captureCheckIn({ checkInId, monitorSlug: slug, status, duration: (Date.now() - started) / 1000 });
    await Sentry.flush(2000);
  }
}
