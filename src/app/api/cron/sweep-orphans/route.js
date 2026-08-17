import { cronDenied } from "@/lib/cronAuth";
import { sweepOrphans } from "@/lib/data/cascade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Weekly integrity sweep for the restructured store: verifies registries ↔
// indexes ↔ key prefixes and reaps anything a crash mid-cascade stranded.
// Scheduled in vercel.json; every fix is idempotent, so re-runs are safe.
// CRON_SECRET gates it, and a missing one refuses rather than opens the door —
// this job DELETES keys, so it is the last place to be permissive about who is
// calling. See lib/cronAuth.js.
export async function GET(request) {
  const denied = cronDenied(request);
  if (denied) return denied;

  const result = await sweepOrphans();
  return Response.json({ ok: true, ...result });
}
