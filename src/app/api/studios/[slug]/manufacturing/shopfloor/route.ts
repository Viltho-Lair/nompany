import { route, refused } from "@/platform/http/route";
import { engineContext } from "@/platform/engine/context";
import type { EngineContext } from "@/platform/engine/context";
import { shopFloor, startRun, endRun, checkBatch } from "@/modules/manufacturing/shopfloorService";
import type { PlanningContext } from "@/modules/manufacturing/planning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE SHOP-FLOOR TERMINAL. Reading is the planning right; the two WRITES answer
// to different engine rights on purpose — logging a run is working on a work
// order, passing a batch is a judgement about that batch, and an operator who
// may do the first is frequently not the person who may do the second.
const spec = { auth: "studio", context: engineContext, body: true, name: "manufacturing/shopfloor" };

function shopContext(c: EngineContext): PlanningContext | null {
  const section = c.sections.find((s) => s.key === "manufacturing") ?? null;
  if (!section) return null;
  // The terminal reads no Inventory register, so the three foreign sections are
  // null rather than resolved — `PlanningContext` allows it, and looking up
  // sections nothing reads would be three searches per request for nothing.
  return { ...c, section, itemsSection: null, stockSection: null, sheetsSection: null };
}

export const GET = route({ ...spec, body: false }, async (c) => {
  const ctx = shopContext(c as EngineContext);
  if (!ctx) return { error: "no-section" };
  const result = await shopFloor(ctx);
  return refused(result) ? result : { ok: true, ...result };
});

// THE ACT IS NAMED IN THE BODY, never reached through a generic edit — the rule
// every transition in this product follows since a rejected change order
// approved itself.
export const POST = route(spec, async (c) => {
  const ctx = shopContext(c as EngineContext);
  if (!ctx) return { error: "no-section" };
  const action = String(c.body?.action ?? "");
  const result = action === "start" ? await startRun(ctx, c.body)
    : action === "end" ? await endRun(ctx, c.body)
      : action === "check" ? await checkBatch(ctx, c.body)
        : { error: "action" };
  return refused(result) ? result : { ok: true, ...result };
});
