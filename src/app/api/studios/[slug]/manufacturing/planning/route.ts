import { route, refused } from "@/platform/http/route";
import { engineContext } from "@/platform/engine/context";
import type { EngineContext } from "@/platform/engine/context";
import {
  productionPlan, addBomLine, editBomLine, removeBomLine,
} from "@/modules/manufacturing/planning";
import type { PlanningContext } from "@/modules/manufacturing/planning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PRODUCTION PLANNING — what the factory needs to buy, and whether the shop can
// take the work.
//
// THE ENGINE'S OWN CONTEXT, not a module context of Manufacturing's, and for
// the reason `platform/engine/context.ts` gives: `moduleContext`'s section
// guard refuses anybody holding only an engine right, which is most of this
// section's audience. The registers this reads are engine registers.
//
// ACCESS IS STILL RESOLVED ONCE (invariant 3). This finds sections in the list
// the context already carries; it re-derives nothing.
const spec = { auth: "studio", context: engineContext, body: true, name: "manufacturing/planning" };

/**
 * A SECTION BY KEY, FALLING BACK TO ITS ROOT — the same rule `moduleContext`
 * applies, restated here because this route builds its own scope. A studio that
 * has not planted `inventory-stock` still has `inventory`, and its rows are
 * there; reading only the child would report an empty ledger on a studio that
 * has stock.
 */
function sectionOf(ctx: EngineContext, key: string, root: string) {
  return ctx.sections.find((s) => s.key === key)
    ?? ctx.sections.find((s) => s.key === root)
    ?? null;
}

function planningContext(c: EngineContext): PlanningContext | null {
  // Manufacturing's own root has no parent to fall back to, so it is looked up
  // plainly — and a studio without it cannot plan, which is what `no-section`
  // says everywhere else in the product.
  const section = c.sections.find((s) => s.key === "manufacturing") ?? null;
  if (!section) return null;
  return {
    ...c,
    section,
    itemsSection: sectionOf(c, "inventory-items", "inventory"),
    stockSection: sectionOf(c, "inventory-stock", "inventory"),
    sheetsSection: sectionOf(c, "inventory-sheets", "inventory"),
  };
}

export const GET = route({ ...spec, body: false }, async (c) => {
  const ctx = planningContext(c as EngineContext);
  if (!ctx) return { error: "no-section" };
  const result = await productionPlan(ctx);
  return refused(result) ? result : { ok: true, ...result };
});

// A BOM LINE IS THE BOM'S CONTENT and answers to `engine.bom.edit`; the service
// asks, not this route.
export const POST = route(spec, async (c) => {
  const ctx = planningContext(c as EngineContext);
  if (!ctx) return { error: "no-section" };
  const result = await addBomLine(ctx, c.body);
  return refused(result) ? result : { ok: true, ...result };
});

export const PUT = route(spec, async (c) => {
  const ctx = planningContext(c as EngineContext);
  if (!ctx) return { error: "no-section" };
  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const result = await editBomLine(ctx, id, c.body);
  return refused(result) ? result : { ok: true, ...result };
});

export const DELETE = route(spec, async (c) => {
  const ctx = planningContext(c as EngineContext);
  if (!ctx) return { error: "no-section" };
  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  const result = await removeBomLine(ctx, id);
  return refused(result) ? result : result;
});
