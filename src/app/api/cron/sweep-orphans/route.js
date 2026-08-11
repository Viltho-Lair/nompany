import { sweepOrphans } from "@/lib/data/cascade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Weekly integrity sweep for the restructured store: verifies registries ↔
// indexes ↔ key prefixes and reaps anything a crash mid-cascade stranded.
// Scheduled in vercel.json; every fix is idempotent, so re-runs are safe.
// An optional CRON_SECRET gates it if set (same pattern as purge-applications).
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await sweepOrphans();
  return Response.json({ ok: true, ...result });
}
