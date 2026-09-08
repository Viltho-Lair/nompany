import { route, refused } from "@/platform/http/route";
import {
  assetsContext, listAllocations, allocateAsset, editAllocation,
  removeAllocation, utilisationReport,
} from "@/modules/assets/allocations";
import type { AssetsContext } from "@/modules/assets/allocations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHICH MACHINE IS ON WHICH JOB, AND WHAT IT COST THEM.
//
// The equipment register has held `hireRate` since it shipped and nothing read
// it; a contractor that owns its plant and does not charge it to jobs reports
// every job as more profitable than it is. This is the door that changes that.
const spec = { auth: "studio", context: assetsContext, body: true, name: "assets/allocations" };

// THE LIST AND THE REPORT COME BACK TOGETHER, from one read of the allocations.
// Serving them separately would be two reads of one collection and two chances
// for the rows on screen to disagree with the total above them — the same
// argument the ledger route makes for serving its four views at once.
export const GET = route({ ...spec, body: false }, async (c) => {
  const ctx = c as AssetsContext & { request: Request };
  const url = new URL(ctx.request.url);

  const list = await listAllocations(ctx);
  if (refused(list)) return list;

  const report = await utilisationReport(ctx, {
    from: String(url.searchParams.get("from") || ""),
    to: String(url.searchParams.get("to") || ""),
  });
  if (refused(report)) return report;

  return { ...list, utilisation: report };
});

export const POST = route(spec, async (c) => {
  const result = await allocateAsset(c as AssetsContext, c.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, ...result } };
});

export const PUT = route(spec, async (c) => {
  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const result = await editAllocation(c as AssetsContext, id, c.body);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const DELETE = route(spec, async (c) => {
  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const result = await removeAllocation(c as AssetsContext, id);
  if (refused(result)) return result;
  return result;
});
