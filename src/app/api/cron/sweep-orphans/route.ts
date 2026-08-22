import { cronDenied } from "@/platform/auth/cronAuth";
import { sweepOrphans } from "@/platform/db/cascade";
import { memoryPolicy } from "@/platform/db/store";
import { log, withRequest } from "@/platform/http/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Weekly integrity sweep for the restructured store: verifies registries ↔
// indexes ↔ key prefixes and reaps anything a crash mid-cascade stranded.
// Scheduled in vercel.json; every fix is idempotent, so re-runs are safe.
// CRON_SECRET gates it, and a missing one refuses rather than opens the door —
// this job DELETES keys, so it is the last place to be permissive about who is
// calling. See platform/auth/cronAuth.js.
//
// It also reports the two INFRASTRUCTURE facts nothing else in the product
// would notice going wrong: the eviction policy, and how much headroom is left.
// Both live in the Redis Cloud console rather than in this repository, so the
// only way they get looked at is if something looks at them on a schedule —
// and this job already runs on one. Reported, never enforced: the app cannot
// change either, and failing the sweep over a warning would help nobody.
// WRAPPED, because this is the job where "which run did that?" is a question
// somebody will actually need answered. It deletes keys on a schedule, its
// output is a tally rather than a page, and it runs unattended — so every line
// it writes carries the same request id, and it finishes by saying how long it
// took and how many round trips it spent. The hop count on THIS route is also
// the audit's M-10 in numbers: the sweep is O(N) sequential, and the completion
// line is where that stops being a prediction.
export async function GET(request: Request) {
  return withRequest("cron/sweep-orphans", async () => {
    const denied = cronDenied(request);
    if (denied) return denied;

    return runSweep();
  });
}

async function runSweep() {
  const [result, memory] = await Promise.all([sweepOrphans(), memoryPolicy().catch(() => null)]);

  if (memory && !memory.safe) {
    // An allkeys-* policy does not refuse writes when the instance fills — it
    // deletes whatever it judges least recently used, which here is live
    // business records. This is the loudest thing this job can say.
    log.error(
      `[sweep] UNSAFE EVICTION POLICY: maxmemory-policy is "${memory.policy}", expected "noeviction". `
      + "A full instance will silently delete live records instead of refusing writes.",
    );
  }
  if (memory?.maxBytes && memory.usedBytes / memory.maxBytes > 0.8) {
    log.warn(`[sweep] memory at ${Math.round((memory.usedBytes / memory.maxBytes) * 100)}% (${memory.usedHuman})`);
  }

  return Response.json({ ok: true, ...result, memory });
}
