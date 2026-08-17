// WHO MAY RUN A SCHEDULED JOB.
//
// The three cron routes each carried their own copy of this check, and each
// copy had the same hole: `if (secret && auth !== bearer)`. Written that way, a
// missing CRON_SECRET does not make the check stricter — it deletes it. The
// jobs behind these paths mail out a year of traffic and then clear it, apply
// pending renames, and sweep orphaned keys, so "open to anyone who knows the
// URL" is not a state to be one unset variable away from.
//
// So: ONE implementation, and it FAILS CLOSED. No secret configured means no
// job runs, which is a loud, safe, fixable failure rather than a silent hole.
//
// Vercel signs its own cron invocations with `x-vercel-cron`, and its edge
// strips inbound `x-vercel-*` headers from outside callers, so that header is
// trustworthy where it appears. It is accepted as a second door, never as a
// replacement for the secret being set at all.

export function cronDenied(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET is not set — refusing to run a scheduled job.");
    return Response.json({ error: "not-configured" }, { status: 503 });
  }
  if (request.headers.get("x-vercel-cron")) return null;
  if (request.headers.get("authorization") === `Bearer ${secret}`) return null;
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
