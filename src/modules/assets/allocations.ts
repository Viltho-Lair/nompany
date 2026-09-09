// PUTTING A MACHINE ON A JOB, AND TAKING IT OFF AGAIN.
//
// The rules live in `./utilisation`, pure, so the screen refuses what this
// refuses. This file is the doors: who may open them, what is read, what is
// written, and where the rate comes from.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { getSectionByKey } from "@/platform/db/sections";
import { moduleContext } from "@/modules/context";
import { allocationProblem, utilisation, type Allocation } from "./utilisation";
import type { Section } from "@/platform/db/sections";
import type { ModuleContext } from "@/modules/context";

const Allocations = repo("assetAllocations");
const Records = repo("engineRecords");

export type AssetsContext = ModuleContext & {
  /**
   * The Assets root, under the name this file's readers use. It IS `section` —
   * the factory's own root — and the alias is kept because every function below
   * already reads `assetsSection`, the same courtesy Projects extends with
   * `projectsList`.
   */
  assetsSection: Section;
};

/**
 * THE ASSETS CONTEXT — from the factory, like every other department's.
 *
 * IT WAS HAND-ROLLED AND RESOLVED A SECTION NOTHING READ. The old version
 * demanded `administration-settings` and refused `no-section` without it,
 * because its comment believed the equipment records lived there. They do not:
 * `equipmentRates` below says so itself — "UNDER `engine-equipment`, NOT UNDER
 * SETTINGS" — and finds that section off `ctx.sections` directly. So the field
 * was resolved, refused on, and then read by nothing, which meant a studio
 * could be 404'd out of its own plant register over a section the register
 * never touches. Both are gone.
 *
 * `assetsSection` is the root under the name the readers below already use.
 */
export const assetsContext = moduleContext<AssetsContext>({
  root: "assets",
  sub: { assets: "assets" },
});

const scope = (ctx: AssetsContext) => ({ studio: ctx.studio, section: ctx.assetsSection });

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const money = (v: unknown) => {
  const n = Math.round((Number(v) || 0) * 100) / 100;
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * The `hireRate` on each equipment record, by record id.
 *
 * UNDER `engine-equipment`, NOT UNDER SETTINGS. The engine keeps its TYPE rows
 * beside the studio's other configuration and its RECORD rows in the
 * sub-section each type plants (`typeFor` in platform/engine/records) — two
 * different sections, and reading the wrong one returns an empty map rather
 * than an error. That cost a round of "every allocation is refused `asset`"
 * with nothing wrong but the section handle.
 */
async function ratesFor(ctx: AssetsContext): Promise<Map<string, number>> {
  const section = ctx.sections.find((x) => x.key === "engine-equipment");
  if (!section) return new Map();
  const rows = await Records.find(
    { studio: ctx.studio, section },
    { where: { typeKey: "equipment" } },
  );
  return new Map(rows.map((r) => [
    String(r.id),
    money((r.values as Record<string, unknown> | undefined)?.hireRate),
  ]));
}

export async function listAllocations(ctx: AssetsContext) {
  const denied = requirePermission(ctx.access, "assets.utilisation.view");
  if (denied) return denied;
  return { allocations: await Allocations.find(scope(ctx)) };
}

/**
 * WHAT EVERY DEAL WAS CHARGED FOR PLANT, over a window.
 *
 * `asOf` IS THE SERVER'S AND TRAVELS BACK. An allocation still open runs to the
 * end of the window being asked about, never to "today" as the browser sees it
 * — two people in two time zones must not get two answers for last month.
 */
export async function utilisationReport(
  ctx: AssetsContext,
  period: { from: string; to: string },
) {
  const denied = requirePermission(ctx.access, "assets.utilisation.view");
  if (denied) return denied;

  const [allocations, rates] = await Promise.all([Allocations.find(scope(ctx)), ratesFor(ctx)]);
  const to = period.to || new Date().toISOString().slice(0, 10);

  return utilisation(
    allocations as unknown as Allocation[],
    { from: period.from, to },
    (assetId) => rates.get(assetId) || 0,
    to,
  );
}

/**
 * PUT A MACHINE ON A JOB.
 *
 * THE RATE IS COPIED HERE, once, from the equipment register. Editing the
 * register later must not re-price a hire that has already been reported on a
 * job — the BOQ rate rule, and the reason a quotation line keeps its price.
 */
export async function allocateAsset(ctx: AssetsContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "assets.utilisation.create");
  if (denied) return denied;

  const [existing, rates] = await Promise.all([Allocations.find(scope(ctx)), ratesFor(ctx)]);
  const assetId = str(body?.assetId, 60);

  const proposed = {
    id: "",
    assetId,
    dealId: str(body?.dealId, 60),
    from: str(body?.from, 40),
    to: str(body?.to, 40),
  };
  const problem = allocationProblem(proposed, existing as unknown as Allocation[]);
  if (problem) return { error: problem };

  // THE ASSET MUST BE ONE THE STUDIO HOLDS. Checked against the register rather
  // than trusted: an id that names no equipment would allocate at no rate and
  // report utilisation for a machine that does not exist.
  if (!rates.has(assetId)) return { error: "asset" };

  // NAMED, NOT SPREAD. `proposed` carries `id: ""` so `allocationProblem` can
  // tell "this is new" from "this is an edit of itself" — spreading it into the
  // create handed the store an empty id, which the first row took and every one
  // after collided with on the primary key. The repo mints the id; nothing here
  // should be offering one.
  const allocation = await Allocations.create(scope(ctx), {
    assetId: proposed.assetId,
    dealId: proposed.dealId,
    from: proposed.from,
    to: proposed.to,
    dailyRate: money(body?.dailyRate) || rates.get(assetId) || 0,
    note: str(body?.note, 500),
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { allocation };
}

/** Bring it back, or correct the dates. The clash check runs again. */
export async function editAllocation(ctx: AssetsContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "assets.utilisation.edit");
  if (denied) return denied;

  const existing = await Allocations.find(scope(ctx));
  const current = existing.find((a) => a.id === id);
  if (!current) return { error: "notfound" };

  const merged = {
    id,
    assetId: String(current.assetId),
    dealId: body?.dealId !== undefined ? str(body.dealId, 60) : String(current.dealId),
    from: body?.from !== undefined ? str(body.from, 40) : String(current.from),
    to: body?.to !== undefined ? str(body.to, 40) : String(current.to || ""),
  };
  // RE-CHECKED ON EVERY EDIT, not only on create. Extending a hire is exactly
  // how a machine ends up on two jobs at once, and it is the edit rather than
  // the original booking that does it.
  const problem = allocationProblem(merged, existing as unknown as Allocation[]);
  if (problem) return { error: problem };

  const updated = await Allocations.update(scope(ctx), id, {
    dealId: merged.dealId, from: merged.from, to: merged.to,
    ...(body?.note !== undefined ? { note: str(body.note, 500) } : {}),
  });
  return updated ? { allocation: updated } : { error: "notfound" };
}

/**
 * REMOVE ONE.
 *
 * DELETABLE, unlike a posted document: an allocation is a record of intent that
 * somebody may simply have entered against the wrong machine, and it posts to
 * nothing. What it feeds is a report that is re-derived on every read, so
 * removing one leaves nothing stale behind.
 */
export async function removeAllocation(ctx: AssetsContext, id: string) {
  const denied = requirePermission(ctx.access, "assets.utilisation.delete");
  if (denied) return denied;
  return (await Allocations.remove(scope(ctx), id)) ? { ok: true } : { error: "notfound" };
}
