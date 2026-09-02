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
import { statusStage } from "@/platform/engagement/context";
import { ENG } from "@/platform/db/keys";
import { zRange } from "@/platform/db/store";
import { readEngagement, readEngagementView, engagementIdFor, setEngagementLock, resolveDealId } from "@/platform/db/engagement";
import { cascadeDeleteEngagement } from "@/platform/db/cascade";
import type { EngagementLineage } from "@/platform/db/engagement";
import { getSectionByKey } from "@/platform/db/sections";
import { repo } from "@/platform/db/repo";
import { listFlowTemplates, defaultTemplateForStudio, pickTemplate, industryKeyOf } from "@/platform/db/flows";
import type { Refusal } from "@/platform/access";

const PAGE = 25;

// The clients collection is read ONCE per request and turned into an id->name
// map, the same shape Sales' composeTicket builds (sales.ts:574) — never a
// lookup per engagement. listEngagements pages up to 25 engagements; a
// per-row read would be 25 extra Redis round trips for one field. The name is
// resolved live, never trusted from the stored context, because a copied name
// drifts the moment somebody renames the client — the same reason Sales
// resolves it live in composeTicket rather than keeping the ticket's own
// clientName.
async function clientNameById(studioId: string): Promise<Record<string, string>> {
  const section = await getSectionByKey(studioId, "crm-sales-clients");
  if (!section) return {};
  const clients = await repo("salesClients").find(
    { studio: { id: studioId }, section },
  ) as Array<{ id: string; name?: string }>;
  return Object.fromEntries(clients.map((c) => [c.id, c.name || ""]));
}

// One engagement's client name, live: the row's current name when clientId
// names a real Client, else the stored fallback (free text that never became
// a record).
function resolveClientName(
  context: { clientId?: unknown; clientName?: unknown },
  nameById: Record<string, string>,
): string {
  const id = String(context.clientId || "");
  return (id && nameById[id]) || String(context.clientName || "");
}

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
  /**
   * True for a stage the deal carries that its template does not list — a
   * template switched mid-deal, an import, an edge case nobody modelled.
   *
   * It is SHOWN rather than hidden: the blueprint's rule is that such a stage
   * "is displayed, never lost", because a record that exists and cannot be seen
   * is worse than an untidy screen. It is never an invitation, though — the
   * flow does not ask for what it does not use.
   */
  offTemplate: boolean;
  ref?: string; summary?: string; href?: string;
};

// A deal's status is not stored (Law 5, and the storage spec removed the column
// deliberately): it is walked, at read time, from the TEMPLATE's statusChain.
//
// THIS USED TO BE `project || ticket || quotation`, HARDCODED. Two things were
// wrong with that beyond the hardcoding. It was one template's chain applied to
// all seven — Template G has no ticket at all, and a recurring contract would
// have read "Draft" forever. And it was not even A's own order: A's chain is
// project → contract → quotation → ticket, so a deal with a contract and a
// ticket reported the ticket's status while the contract sat above it.
//
// DERIVED FROM CARDS THE READER CAN SEE, not from every stage present. A chain
// entry the viewer lacks the right to see is skipped rather than reported: the
// alternative leaks the state of a record whose existence §2.8 says must stay
// invisible to them. So two people can legitimately read the same deal as
// having different statuses, which is correct — each is told the truth about
// the part of it they are entitled to.
function statusOf(cards: StageCard[], statusChain: readonly string[]): { status: string; statusType: string } {
  // THE WALK ITSELF IS statusStage, not a second copy of it here. It is the
  // pure helper the engagement layer already exposes and tests, and the one the
  // rest of the model asks when it wants to know how far a deal has got.
  //
  // What this function adds is the part that is not pure: turning the stage it
  // names into the words on the screen, which only the assembled cards know.
  const type = statusStage(statusChain, cards.filter((c) => c.present).map((c) => c.type));
  if (!type) return { status: "Draft", statusType: "" };

  const card = cards.find((c) => c.type === type);

  // NOT EVERY STAGE HAS A STATUS OF ITS OWN, and the two that matter most do
  // not. summarise() reads `row.status || row.stage`, and a CONTRACT has
  // neither — it is an agreement, not a workflow, so nothing on it moves
  // through states. Template G's chain is `["contract"]` and nothing else, so
  // taking the summary blindly would have read EVERY recurring contract as
  // "Draft" for its whole life, which is the same defect the hardcoded chain
  // had, arriving by a different road.
  //
  // When the record has no status vocabulary, the STAGE is the status: a deal
  // whose furthest point is its contract is "at contract", and saying so is
  // both true and the most a reader can be told.
  if (card?.summary) return { status: card.summary, statusType: type };
  return { status: card?.label || "Draft", statusType: type };
}

/**
 * WHICH FLOW THIS DEAL WALKS.
 *
 * Read from the deal first, because a deal's template is a decision somebody
 * made and must not drift when an industry's default is later edited.
 *
 * THE FALLBACKS EXIST FOR DEALS THAT PREDATE TEMPLATES, and they are ordered so
 * behaviour does not change under anybody: the deal's own templateId, then the
 * default for its industry, then Template A. A is not a guess dressed as a
 * default — it is the flow whose chain the hardcoded `project || ticket ||
 * quotation` was approximating, so a deal written before any of this reads
 * exactly as it did before, rather than becoming statusless the day templates
 * arrived.
 */
async function dealTemplate(ctx: EngagementCtx, root: { templateId?: string; context: Record<string, unknown> }) {
  // ONE READ OF THE TEMPLATE LIST, THEN PICKS FROM IT. getFlowTemplate is
  // listFlowTemplates plus a find — the merge of seeds and tenant overrides is
  // the whole cost — so calling it once per candidate would read the same key
  // up to three times to answer one question. Hop counts are part of the
  // contract here (a route going from 2 round trips to 8 fails the build), and
  // this is a per-deal read on the deal screen.
  const templates = await listFlowTemplates(ctx.studio.id);

  // THE PRECEDENCE ITSELF LIVES IN pickTemplate, shared with the usage scan.
  // Two copies of "which flow is this deal on" is two answers, and the screen
  // showing one while the settings warning counts the other is worse than no
  // warning at all.
  const known = String(root.templateId || "");
  if (known) {
    const chosen = pickTemplate(templates, known, "");
    if (chosen?.id === known) return chosen;
  }

  // The industry costs a SECOND read, so it is asked only when the deal itself
  // does not know — which is every deal written before templates existed, and
  // no deal written after. The usage scan reads every industry once instead,
  // which is why pickTemplate takes the answer rather than fetching it.
  const industryKey = industryKeyOf(root.context as Record<string, unknown> | undefined);
  const primary = industryKey ? await defaultTemplateForStudio(ctx.studio.id, industryKey) : "";
  return pickTemplate(templates, known, primary);
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
): Promise<{ engagements: Array<{ id: string; ref: string; clientName: string; title: string; createdAt: string; stages: string[]; locked: boolean }>; nextCursor: number | null } | Refusal> {
  const denied = requirePermission(ctx.access, "engagements.view");
  if (denied) return denied;

  const visible = new Set(visibleStageTypes(ctx.access));
  const ids = await zRange(ENG.index(ctx.studio.id), cursor, cursor + limit - 1, { rev: true });
  // Read once for the whole page (up to PAGE=25 engagements below), not once
  // per row — see clientNameById's own comment.
  const nameById = await clientNameById(ctx.studio.id);

  const engagements: Array<{ id: string; ref: string; clientName: string; title: string; createdAt: string; stages: string[]; locked: boolean }> = [];
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
      clientName: resolveClientName(view.context, nameById),
      title: String(view.context.title || ""),
      createdAt: String(view.context.createdAt || ""),
      stages,
      // LOCKED IS THE DEFAULT, and it is decided in the store, not here —
      // readEngagementView reports a root with no `locked` field as locked, so
      // every engagement written before the lock existed reads as locked without
      // a migration or a single write to live data. The row carries it so the list
      // can draw the unlock control without a second request per row.
      locked: view.locked,
    });
  }
  return { engagements, nextCursor: ids.length === limit ? cursor + limit : null };
}

/** One engagement, as cards — only the stages this reader may see. */
export async function engagementBlock(
  ctx: EngagementCtx,
  engId: string,
): Promise<{ engagement: { id: string; ref: string; context: Record<string, unknown>; status: string; statusType: string; templateId: string; templateName: string; locked: boolean; cards: StageCard[] } } | Refusal | { error: "notfound" | "forbidden" }> {
  const denied = requirePermission(ctx.access, "engagements.view");
  if (denied) return denied;

  // RESOLVED THROUGH THE ALIAS (deal-aliases Task 3): the id in this URL may be
  // a derivation somebody bookmarked, linked from a notification, or typed off
  // an older screen, and a deal minted after that point answers to a different
  // id now. Without this the same "the answer simply changed" gap that
  // detachRecord and applyDescriptor already close would 404 a deal that
  // plainly exists — the reader's only fault being that their link predates it.
  const dealId = await resolveDealId(ctx.studio.id, engId);
  const root = await readEngagement(ctx.studio.id, dealId);
  if (!root) return { error: "notfound" };
  const view = await readEngagementView(ctx.studio.id, dealId);
  if (!view) return { error: "notfound" };

  const visible = new Set(visibleStageTypes(ctx.access));
  const present = new Set(stagesPresent(view));
  // Nothing here is theirs to read.
  if (![...present].some((t) => visible.has(t))) return { error: "forbidden" };

  // THE TEMPLATE DECIDES THE ORDER, AND WHICH BLANKS ARE INVITATIONS.
  //
  // Cards used to come out in STAGE_REGISTRY order — the order the types happen
  // to be declared in — which is not the order any flow walks. A deal screen is
  // read top to bottom as the shape of the work, so the sequence is the content.
  //
  // A stage the template lists and the deal lacks is an INVITATION, never a
  // validation error (Law 3: the flow alerts, it never blocks). A stage the
  // template does not list but the deal carries is appended and marked, because
  // it is displayed, never lost.
  const template = await dealTemplate(ctx, root);
  const ordered = template ? [...template.stages] : Object.keys(STAGE_REGISTRY);
  const listed = new Set(ordered);

  const cards: StageCard[] = [];
  const addCard = async (type: string, offTemplate: boolean) => {
    const entry = STAGE_REGISTRY[type];
    if (!entry) return;                                   // templateProblems catches this
    if (!visible.has(type)) return;                       // withheld, not blanked
    const ids = idsFor(view, type);
    // An off-template stage the deal does not have is not a card at all — it is
    // neither something the flow asks for nor something the deal holds.
    if (offTemplate && !ids.length) return;
    const card: StageCard = {
      type, label: entry.label,
      present: ids.length > 0, count: ids.length, offTemplate,
    };
    if (ids.length) Object.assign(card, await summarise(ctx, entry, ids));
    cards.push(card);
  };

  for (const type of ordered) await addCard(type, false);
  for (const type of present) if (!listed.has(type)) await addCard(type, true);
  // Live, not the stored copy — see clientNameById's comment. One lookup for
  // the single engagement this block renders.
  const nameById = await clientNameById(ctx.studio.id);
  // Named rather than spread into the object below. The response body is the
  // contract and its key order is pinned by the goldens, so which keys a line
  // contributes should be readable at the line, not inferred from a function's
  // return type.
  const { status, statusType } = statusOf(cards, template?.statusChain ?? []);
  return {
    engagement: {
      // THE RESOLVED id, not the one the caller sent — a reader who followed a
      // derivation should get back the deal's real address, not the alias they
      // happened to arrive through.
      id: dealId,
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
        clientName: resolveClientName(root.context, nameById),
        title: root.context.title ?? "",
      },
      status,
      statusType,
      // The flow this deal walks, so the screen can name it and the
      // stage cards mean something beyond a list of nouns.
      templateId: template?.id ?? "",
      templateName: template?.name ?? "",
      // Same default as the list row: absent means locked, decided in the store.
      // The block carries it so opening one deal answers "can I act on this?"
      // without asking a second time.
      locked: view.locked,
      cards,
    },
  };
}

// ---- "deleting this will affect X, Y and Z" ---------------------------------
//
// THE ANSWER THE SPEC ASKS FOR (§3.5), read-only. Given a record about to be
// deleted, it names the deal that record belongs to, the root pointers that
// would be cleared, and the sibling stages that would be left behind — so a
// confirmation can say what is actually at stake instead of "are you sure?".
//
// IT NAMES NOTHING THE READER COULD NOT ALREADY SEE, and that property is
// absolute rather than best-effort. Two gates, both the ones the engagements
// view already uses:
//
//  1. The record's OWN stage permission is required. You cannot ask what
//     deleting a quotation affects without the right to see quotations — the
//     question would otherwise be an oracle for whether a record exists.
//  2. Every sibling stage is filtered through visibleStageTypes, the same one
//     line listEngagements and engagementBlock filter by, so a stage the reader
//     holds no permission for is ABSENT from the answer — not zeroed, not
//     counted, not named.
//
// engagements.view is deliberately NOT required. This is asked from the
// record's own department screen, about a record the caller already holds the
// right to see and delete; requiring a separate grantable key they may not hold
// would silently blank the warning on the one screen that needs it. What the
// answer carries is bounded instead: the engagement's id and ref, never its
// context — the same minimum-disclosure rule engagementBlock's own projection
// applies, and for the same reason.
export type DeletionImpact = {
  engagementId: string;
  ref: string;
  /** Root pointers that name this record and would be cleared ("project", "approvedQuotation"). */
  clears: string[];
  /** True when this is the engagement's LAST record of its type — the stage goes with it. */
  lastOfType: boolean;
  /** What else is on this deal, of the stages this reader may see. */
  siblings: Array<{ type: string; label: string; count: number }>;
};

export async function deletionImpact(
  ctx: EngagementCtx,
  type: string,
  record: { id: string } & EngagementLineage,
): Promise<{ impact: DeletionImpact | null } | Refusal> {
  const entry = STAGE_REGISTRY[type];
  // Not a stage at all (Tier B/C — a client, a vendor, an inventory item): it
  // has no engagement state, so deleting it affects no deal. A fact, not a
  // refusal, and answered without asking Redis anything.
  if (!entry) return { impact: null };
  const denied = requirePermission(ctx.access, entry.permission as PermissionKey);
  if (denied) return denied;

  const engId = await engagementIdFor(ctx.studio.id, type, record.id, record);
  if (!engId) return { impact: null };
  const view = await readEngagementView(ctx.studio.id, engId);
  if (!view) return { impact: null };

  // Matched on the VALUE, exactly as detachRecord clears them, so the warning
  // and the deletion can never disagree about which pointers go.
  const clears = Object.entries(view.singletons)
    .filter(([, id]) => id === record.id)
    .map(([slot]) => slot);

  const visible = new Set(visibleStageTypes(ctx.access));
  const siblings = Object.values(STAGE_REGISTRY)
    .filter((e) => e.type !== type && visible.has(e.type))
    .map((e) => ({ type: e.type, label: e.label, count: idsFor(view, e.type).length }))
    .filter((s) => s.count > 0);

  return {
    impact: {
      engagementId: engId,
      ref: view.ref || "",
      clears,
      lastOfType: idsFor(view, type).filter((id) => id !== record.id).length === 0,
      siblings,
    },
  };
}

// ---- deleting a whole deal --------------------------------------------------

// "DELETING THIS DEAL WILL DELETE X, Y AND Z — AND LEAVE A, B AND C ALONE."
//
// The whole-engagement twin of deletionImpact above, and the answer a
// confirmation dialog needs before it may offer the button. Read-only.
//
// Two lists, not one, because the interesting half of the user's rule is the
// second: a Sales client is NOT named here at all — it is not a stage, so it is
// neither deleted nor "kept", it is simply not part of the deal's contents.
// `survives` is the narrower thing: stage records that this deal used but did
// not create (tasks, expenses, bills, assets — see STAGE_REGISTRY's onDelete),
// which stay put and merely stop pointing at it.
//
// SAME SAFETY PROPERTY, SAME ONE LINE: every stage is filtered through
// visibleStageTypes, so this can never name a record the reader could not
// already see on that record's own department screen. A stage they lack is
// absent, not zeroed — and that means the counts here are what THIS reader
// would see, deliberately, not a studio-wide total that would leak the
// existence of work they have no right to.
export type EngagementImpact = {
  id: string;
  ref: string;
  locked: boolean;
  deletes: Array<{ type: string; label: string; count: number }>;
  survives: Array<{ type: string; label: string; count: number }>;
};

export async function engagementImpact(
  ctx: EngagementCtx, engId: string,
): Promise<{ impact: EngagementImpact } | Refusal | { error: "notfound" }> {
  const denied = requirePermission(ctx.access, "engagements.view");
  if (denied) return denied;

  const view = await readEngagementView(ctx.studio.id, engId);
  if (!view) return { error: "notfound" };

  const visible = new Set(visibleStageTypes(ctx.access));
  const deletes: EngagementImpact["deletes"] = [];
  const survives: EngagementImpact["survives"] = [];
  for (const entry of Object.values(STAGE_REGISTRY)) {
    if (!visible.has(entry.type)) continue;              // withheld, not counted
    const count = idsFor(view, entry.type).length;
    if (!count) continue;
    (entry.onDelete === "cascade" ? deletes : survives)
      .push({ type: entry.type, label: entry.label, count });
  }
  return { impact: { id: engId, ref: view.ref || "", locked: view.locked, deletes, survives } };
}

// LOCK OR UNLOCK. Its own right, because holding the power to delete a deal must
// not by itself include the power to take the safety off it.
export async function lockEngagement(
  ctx: EngagementCtx, engId: string, locked: boolean,
): Promise<{ ok: true; locked: boolean } | Refusal | { error: "notfound" }> {
  const denied = requirePermission(ctx.access, "engagements.lock");
  if (denied) return denied;
  const done = await setEngagementLock(ctx.studio.id, engId, locked);
  return done ? { ok: true, locked } : { error: "notfound" };
}

// DELETE THE DEAL AND EVERYTHING IT OWNS. The permission is checked here; the
// LOCK is checked inside cascadeDeleteEngagement, not here, because an interlock
// on a destructive action that lives only in its caller is an interlock until
// somebody writes a second caller.
//
// The reader must also be able to SEE the deal before deleting it — the same
// "no stage of this is yours" rule engagementBlock applies — so a Finance-only
// reader who happens to hold engagements.delete cannot destroy a deal that, to
// them, does not exist.
export async function removeEngagement(
  ctx: EngagementCtx, engId: string,
): Promise<{ ok: true; deleted: Array<{ type: string; id: string }>; kept: Array<{ type: string; id: string }> }
  | Refusal | { error: "notfound" | "forbidden" | "locked" }> {
  const denied = requirePermission(ctx.access, "engagements.delete");
  if (denied) return denied;

  const view = await readEngagementView(ctx.studio.id, engId);
  if (!view) return { error: "notfound" };
  const visible = new Set(visibleStageTypes(ctx.access));
  const present = Object.values(STAGE_REGISTRY)
    .filter((e) => idsFor(view, e.type).length)
    .map((e) => e.type);
  // An engagement with nothing on it is nobody's to be refused — an empty deal
  // is exactly what a delete is for. Only a deal whose every stage is hidden
  // from this reader is refused.
  if (present.length && !present.some((t) => visible.has(t))) return { error: "forbidden" };

  return cascadeDeleteEngagement(ctx.studio.id, engId);
}
