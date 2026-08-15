import { applyDueRenames } from "@/lib/data/studios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Midnight: the moment studio renames actually happen.
//
// Runs every night and usually finds nothing. Like the year rollover, it is
// scheduled daily rather than on demand so that it is exercised constantly and
// fails loudly, instead of being a path that only executes when it matters.
//
// It applies anything DUE, not anything scheduled for exactly now — a run that
// is late, or missed entirely, still catches up the next night rather than
// leaving a rename stuck for ever.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  const fromVercel = request.headers.get("x-vercel-cron");
  if (!fromVercel && secret && auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const applied = await applyDueRenames();
  const failed = applied.filter((r) => r.error);
  if (failed.length) console.error("Renames that could not be applied:", failed);
  return Response.json({ ok: true, applied: applied.length, failed: failed.length, results: applied });
}
