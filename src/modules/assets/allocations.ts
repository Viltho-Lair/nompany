// PUTTING A MACHINE ON A JOB, AND TAKING IT OFF AGAIN.
//
// The rules live in `./utilisation`, pure, so the screen refuses what this
// refuses. This file is the doors: who may open them, what is read, what is
// written, and where the rate comes from.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { getSectionByKey } from "@/platform/db/sections";
import { projectEngagementId } from "@/platform/db/engagement";
import { moduleContext } from "@/modules/context";
import { roundSum } from "@/shared/money";
import { dayIn, studioTimezone } from "@/shared/timezone";
import { allocationProblem, bookable, utilisation, type Allocation } from "./utilisation";
import type { Section } from "@/platform/db/sections";
import type { ModuleContext } from "@/modules/context";

const Allocations = repo("assetAllocations");
const Records = repo("engineRecords");
const Projects = repo("projects");

/**
 * THE STUDIO'S PROJECTS, as labels — the job picker for somebody who may book
 * plant and may not read the deals (`engagements.view`). That reader was handed
 * a text box wanting a deal's internal id; a project is the job a machine
 * actually goes to, and `allocateAsset` resolves it to that project's deal.
 */
async function projectOptions(ctx: AssetsContext) {
  const section = ctx.sections.find((x) => x.key === "projects-list")
    || ctx.sections.find((x) => x.key === "projects");
  if (!section) return [];
  const rows = await Projects.find({ studio: ctx.studio, section });
  return rows
    .map((p) => ({ id: String(p.id), number: str(p.number, 60), title: str(p.title, 200) }))
    .sort((a, b) => (a.number || a.title).localeCompare(b.number || b.title));
}

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
// A HIRE RATE AS TYPED. A per-day rate is a price, not an amount anybody is
// paid, so it keeps up to four places rather than being cut to cents — a dinar
// has three, and the charge it produces is rounded to the currency in
// `utilisation` where the money is actually made.
const money = (v: unknown) => {
  const n = roundSum(Number(v) || 0);
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
  return new Map([...(await fleetFor(ctx))].map(([id, m]) => [id, m.rate]));
}

/**
 * Each machine's rate AND STATUS, by record id — one read serving both the
 * rate the hire copies and the status `bookable` refuses on.
 */
async function fleetFor(ctx: AssetsContext): Promise<Map<string, { rate: number; status: string }>> {
  const section = ctx.sections.find((x) => x.key === "engine-equipment");
  if (!section) return new Map();
  const rows = await Records.find(
    { studio: ctx.studio, section },
    { where: { typeKey: "equipment" } },
  );
  return new Map(rows.map((r) => [
    String(r.id),
    { rate: money((r.values as Record<string, unknown> | undefined)?.hireRate), status: str(r.status, 40) },
  ]));
}

/**
 * THE FLEET AS THE SCREEN NEEDS IT — id, name, tag, status and hire rate.
 *
 * THE REPORT SPEAKS IN IDS AND A PERSON DOES NOT. `utilisation` groups by
 * `assetId` because that is the only thing an allocation stores, which is right
 * for the arithmetic and unreadable on a screen: a register of "rec_01H8…, 42
 * days" tells a plant manager nothing. Resolved HERE rather than in the browser
 * because the equipment records are engine rows under `engine-equipment`, and a
 * second fetch for them would be a second chance for the names on screen to
 * disagree with the ids underneath them.
 *
 * STATUS TRAVELS TOO, so the picker can say a machine is Under repair or
 * Disposed and offer it disabled. It IS a refusal now (`bookable` in
 * `allocateAsset`): this comment used to argue a studio might book plant being
 * fixed for a job next month, but the refusal has no dates to reason with, and
 * what it actually allowed was a job charged for a machine in the workshop, or
 * for one the company had sold. `bookable` travels as its own flag so the
 * picker and the server cannot disagree about which statuses count.
 */
async function assetOptions(ctx: AssetsContext) {
  const section = ctx.sections.find((x) => x.key === "engine-equipment");
  if (!section) return [];
  const rows = await Records.find(
    { studio: ctx.studio, section },
    { where: { typeKey: "equipment" } },
  );
  return rows.map((r) => {
    const v = (r.values as Record<string, unknown> | undefined) || {};
    return {
      id: String(r.id),
      name: str(v.name, 120),
      assetTag: str(v.assetTag, 60),
      category: str(v.category, 40),
      status: str(r.status, 40),
      bookable: bookable(r.status),
      hireRate: money(v.hireRate),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listAllocations(ctx: AssetsContext) {
  const denied = requirePermission(ctx.access, "assets.utilisation.view");
  if (denied) return denied;
  // ONE ROUND TRIP FOR BOTH, the argument the route's own comment makes about
  // the list and the report: the names and the rows are read together so they
  // cannot come from two different moments.
  const [allocations, assets, projects] = await Promise.all([
    Allocations.find(scope(ctx)),
    assetOptions(ctx),
    projectOptions(ctx),
  ]);
  return {
    allocations,
    assets,
    projects,
    // THE CURRENCY THE CHARGES ARE IN, so the screen shows each amount to that
    // currency's decimals through the shared money helper.
    currency: String(ctx.studio.currency || ""),
    // WHETHER THE READER MAY WRITE, answered by the server rather than inferred
    // in the browser from the shape of what came back — ONE FLAG PER ACT.
    // `assets.utilisation` is a full-verb area and the doors below ask
    // `.create` to put a machine out and `.delete` to remove a hire; a single
    // `canManage` read off `.edit` drew both buttons for somebody the server
    // then refused, and hid them from somebody it would have allowed.
    canCreate: !requirePermission(ctx.access, "assets.utilisation.create"),
    canEdit: !requirePermission(ctx.access, "assets.utilisation.edit"),
    canDelete: !requirePermission(ctx.access, "assets.utilisation.delete"),
  };
}

/**
 * WHAT EVERY DEAL WAS CHARGED FOR PLANT, over a window.
 *
 * `asOf` IS THE SERVER'S AND TRAVELS BACK. An allocation still open runs to the
 * end of the window being asked about, never to "today" as the browser sees it
 * — two people in two time zones must not get two answers for last month.
 *
 * AND "TODAY" IS THE STUDIO'S DAY (shared/timezone.ts). This read the UTC date,
 * so a machine still out gained its next day at UTC midnight — three hours
 * early in Riyadh, hours late west of Greenwich. Unset falls back to UTC, which
 * is exactly what this answered before.
 */
export async function utilisationReport(
  ctx: AssetsContext,
  period: { from: string; to: string },
) {
  const denied = requirePermission(ctx.access, "assets.utilisation.view");
  if (denied) return denied;

  const [allocations, rates] = await Promise.all([Allocations.find(scope(ctx)), ratesFor(ctx)]);
  const to = period.to || dayIn(new Date(), studioTimezone(ctx.studio as { timezone?: unknown }));

  return utilisation(
    allocations as unknown as Allocation[],
    { from: period.from, to },
    (assetId) => rates.get(assetId) || 0,
    to,
    ctx.studio.currency,
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

  const [existing, fleet] = await Promise.all([Allocations.find(scope(ctx)), fleetFor(ctx)]);
  const assetId = str(body?.assetId, 60);
  // A PROJECT STANDS IN FOR ITS DEAL, for a reader offered projects rather than
  // deals. Resolved through the reverse index openProject recorded, so the hire
  // lands on the same deal the project's own records join. A project with no
  // deal behind it resolves to "" and is refused `deal`, as a blank would be.
  const projectId = str(body?.projectId, 60);
  const dealId = str(body?.dealId, 60) || (projectId ? await projectEngagementId(ctx.studio.id, projectId) : "");

  const proposed = {
    id: "",
    assetId,
    dealId,
    from: str(body?.from, 40),
    to: str(body?.to, 40),
  };
  const problem = allocationProblem(proposed, existing as unknown as Allocation[]);
  if (problem) return { error: problem };

  // THE ASSET MUST BE ONE THE STUDIO HOLDS. Checked against the register rather
  // than trusted: an id that names no equipment would allocate at no rate and
  // report utilisation for a machine that does not exist.
  const machine = fleet.get(assetId);
  if (!machine) return { error: "asset" };
  // AND IT MUST BE ONE THAT CAN WORK — see `bookable`. The status travels
  // with the refusal so the screen can say which one stood in the way.
  if (!bookable(machine.status)) return { error: "unavailable", status: machine.status };

  // NAMED, NOT SPREAD. `proposed` carries `id: ""` so `allocationProblem` can
  // tell "this is new" from "this is an edit of itself" — spreading it into the
  // create handed the store an empty id, which the first row took and every one
  // after collided with on the primary key. The repo mints the id; nothing here
  // should be offering one.
  const allocation = await Allocations.create(scope(ctx), {
    assetId: proposed.assetId,
    dealId: proposed.dealId,
    // THE PROJECT IT WAS BOOKED THROUGH, when it was. The deal id is what the
    // report groups by, and a reader refused `engagements.view` cannot turn it
    // into a name — the screen printed the internal id. Kept beside it so that
    // reader sees the project they picked. Blank when booked against a deal.
    projectId: str(body?.dealId, 60) ? "" : projectId,
    from: proposed.from,
    to: proposed.to,
    dailyRate: money(body?.dailyRate) || machine.rate || 0,
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
