// THE ENGAGEMENT VIEW'S READ LAYER.
//
// One screen assembles a deal from the engagement layer instead of from six
// department screens. The rule this file exists to enforce is the spec's safety
// property: it may never surface a record the reader could not already see on
// that record's own screen. So every stage is filtered by the permission the
// stage registry declares for it, and a stage the reader lacks is dropped from
// the payload entirely — not nulled, not counted.
import { requirePermission, can } from "@/platform/access";
import type { PermissionKey, PermissionSet } from "@/platform/access";
import { STAGE_REGISTRY } from "@/platform/engagement/registry";
import { ENG } from "@/platform/db/keys";
import { zRange } from "@/platform/db/store";
import { readEngagement, readEngagementView } from "@/platform/db/engagement";
import { getSectionByKey } from "@/platform/db/sections";
import { repo } from "@/platform/db/repo";
import type { Refusal } from "@/platform/access";

const PAGE = 25;

/** The minimal shape every caller here has in hand — studio id and the
 * resolved permission set. Deliberately not the full ModuleContext: engagements
 * is not a section (spec §3), so there is no department section to require. */
type EngagementCtx = { studio: { id: string; slug?: string }; access: PermissionSet };

/** The stage types this reader may see at all. The department lens, in one line. */
export function visibleStageTypes(access: PermissionSet): string[] {
  return Object.values(STAGE_REGISTRY)
    .filter((e) => can(access, e.permission as PermissionKey))
    .map((e) => e.type);
}

export type StageCard = {
  type: string; label: string; present: boolean; count: number;
  ref?: string; summary?: string; href?: string;
};

// A deal's status is not stored (the storage spec removed it deliberately): it
// is the project's stage when there is a project, else the ticket's status,
// else the quotation's. Derived here, never written.
function statusOf(cards: StageCard[]): string {
  const of = (t: string) => cards.find((c) => c.type === t && c.present)?.summary;
  return of("project") || of("ticket") || of("quotation") || "Draft";
}

/** Which stage types this engagement actually has. */
function stagesPresent(view: { singletons: Record<string, string | null>; members: Record<string, string[]> }): string[] {
  const out: string[] = [];
  for (const [type, id] of Object.entries(view.singletons)) if (id && STAGE_REGISTRY[type]) out.push(type);
  for (const [type, ids] of Object.entries(view.members)) if (ids.length && STAGE_REGISTRY[type]) out.push(type);
  return out;
}

function idsFor(
  view: { singletons: Record<string, string | null>; members: Record<string, string[]> },
  type: string,
): string[] {
  const one = view.singletons[type];
  if (one) return [one];
  return view.members[type] || [];
}

// The one-line summary per stage: read only the collection of a stage that both
// exists and is visible. `cardinality: "one"` stages summarise their single row;
// a "many" stage summarises its newest and carries the count.
async function summarise(
  ctx: EngagementCtx,
  entry: { type: string; collection: string; sectionKey: string },
  ids: string[],
): Promise<Partial<StageCard>> {
  const section = await getSectionByKey(ctx.studio.id, entry.sectionKey);
  if (!section) return {};
  // repo().find(scope, options) is TWO arguments, not one merged object — the
  // brief's sample folded scope and `where` together, which tsc caught: `Scope`
  // has no `where` field.
  const rows = await repo(entry.collection).find(
    { studio: ctx.studio, section },
    { where: { id: { in: ids } } },
  );
  const row = rows[rows.length - 1] as Record<string, unknown> | undefined;
  if (!row) return {};
  return {
    ref: String(row.ref || row.number || row.reference || row.id || ""),
    summary: String(row.status || row.stage || ""),
  };
}

/** One page of this studio's engagements, newest first. */
export async function listEngagements(
  ctx: EngagementCtx,
  { limit = PAGE, cursor = 0 }: { limit?: number; cursor?: number } = {},
): Promise<{ engagements: Array<{ id: string; ref: string; clientName: string; title: string; createdAt: string; stages: string[] }>; nextCursor: number | null } | Refusal> {
  const denied = requirePermission(ctx.access, "engagements.view");
  if (denied) return denied;

  const visible = new Set(visibleStageTypes(ctx.access));
  const ids = await zRange(ENG.index(ctx.studio.id), cursor, cursor + limit - 1, { rev: true });

  const engagements: Array<{ id: string; ref: string; clientName: string; title: string; createdAt: string; stages: string[] }> = [];
  for (const engId of ids) {
    const view = await readEngagementView(ctx.studio.id, engId);
    if (!view) continue;
    const stages = stagesPresent(view).filter((t) => visible.has(t));
    // An engagement this reader can see no stage of is not theirs to list.
    if (!stages.length) continue;
    engagements.push({
      id: engId,
      // ref lives on the engagement ROOT, never inside context — readEngagementView
      // returns it alongside context now (I-1: the `as string` cast on
      // Record<string, unknown> was hiding "this key does not exist here" from
      // tsc, so every row's Ref column read empty forever).
      ref: String(view.ref || ""),
      clientName: String(view.context.clientName || ""),
      title: String(view.context.title || ""),
      createdAt: String(view.context.createdAt || ""),
      stages,
    });
  }
  return { engagements, nextCursor: ids.length === limit ? cursor + limit : null };
}

/** One engagement, as cards — only the stages this reader may see. */
export async function engagementBlock(
  ctx: EngagementCtx,
  engId: string,
): Promise<{ engagement: { id: string; ref: string; context: Record<string, unknown>; status: string; cards: StageCard[] } } | Refusal | { error: "notfound" | "forbidden" }> {
  const denied = requirePermission(ctx.access, "engagements.view");
  if (denied) return denied;

  const root = await readEngagement(ctx.studio.id, engId);
  if (!root) return { error: "notfound" };
  const view = await readEngagementView(ctx.studio.id, engId);
  if (!view) return { error: "notfound" };

  const visible = new Set(visibleStageTypes(ctx.access));
  const present = new Set(stagesPresent(view));
  // Nothing here is theirs to read.
  if (![...present].some((t) => visible.has(t))) return { error: "forbidden" };

  const cards: StageCard[] = [];
  for (const entry of Object.values(STAGE_REGISTRY)) {
    if (!visible.has(entry.type)) continue;               // withheld, not blanked
    const ids = idsFor(view, entry.type);
    const card: StageCard = {
      type: entry.type, label: entry.label,
      present: ids.length > 0, count: ids.length,
    };
    if (ids.length) Object.assign(card, await summarise(ctx, entry, ids));
    cards.push(card);
  }
  return {
    engagement: {
      id: engId,
      ref: String(root.ref || ""),
      // PROJECTED, not passed through. root.context is built by buildEngagements
      // (src/platform/engagement/backfill.ts) straight from the sales ticket, so
      // it carries nine fields — including contact.name and the full site
      // address — none of which the screen renders. A reader can reach this
      // block holding engagements.view plus ANY stage right (Tasks, Finance,
      // Projects…), not necessarily sales.tickets.view, so returning the whole
      // object hands them the client's contact and site on a screen that shows
      // neither. The spec's "a viewer who can see the ticket can already read
      // its client on the ticket itself" only holds for a TICKET viewer — it
      // does not generalise to every other stage right that opens this block.
      // Minimum disclosure is the default on this boundary: return only what
      // the screen actually renders.
      context: {
        clientName: root.context.clientName ?? "",
        title: root.context.title ?? "",
      },
      status: statusOf(cards),
      cards,
    },
  };
}
