// THE FLOWS A TENANT OWNS — Law 2, "flow templates as data".
//
// The seven templates in platform/engagement/ are STARTERS. A studio's first
// flow is copied from its trade's starter, and from then on the studio adds,
// removes, reorders and measures its own steps (the owner, 05/10/2026: "I
// should run nompany, not the flow"). The industries list is read only to pick
// that starter; a studio no longer edits it.
//
// STORED BESIDE THE STARTERS, by id. A studio's flow carrying a starter's id
// REPLACES that starter for this studio, so an older deal that names "A" walks
// the studio's own copy of A; a flow with a new id is the studio's alone. The
// starters stay readable underneath, because a deal written before the studio
// had flows may name one it never adopted.
//
// VALIDATED ON WRITE, NOT ON READ. A template naming a stage the registry does
// not have renders as nothing — silently, forever, on a screen nobody thinks to
// doubt. Refusing it at the door means the studio hears about it while it is
// still their edit, in words about the edit. Validating on read instead would
// mean discovering it at the worst moment, on somebody else's screen.
import { S, REG } from "./keys";
import { readArr, editArr } from "./store";
import { FLOW_TEMPLATES, templateProblems } from "../engagement/templates";
import type { FlowTemplate } from "../engagement/templates";
import { INDUSTRIES } from "../engagement/industries";
import type { IndustryEntry } from "../engagement/industries";
import { STAGE_REGISTRY } from "../engagement/registry";
import { mergeIndustries } from "@/shared/industryCatalogue";

const stageTypes = () => Object.keys(STAGE_REGISTRY);

/**
 * MERGE A SEED LIST WITH A TENANT'S OVERRIDES.
 *
 * An override with a seed's id REPLACES it; one with a new id is appended. Seed
 * order is preserved, because it is the order the seven templates are presented
 * in and a studio editing one should not reshuffle the list.
 */
function merge<T extends { id: string }>(seeds: readonly T[], overrides: readonly T[]): T[] {
  const byId = new Map(overrides.map((o) => [o.id, o]));
  const merged = seeds.map((s) => byId.get(s.id) ?? s);
  const seedIds = new Set(seeds.map((s) => s.id));
  return [...merged, ...overrides.filter((o) => !seedIds.has(o.id))];
}

// ---- templates --------------------------------------------------------------

/** Every flow template this studio can use: the built-ins, as it has edited them. */
export async function listFlowTemplates(studioId: string): Promise<FlowTemplate[]> {
  const overrides = await readArr<FlowTemplate>(S.flowTemplates(studioId));
  return merge(FLOW_TEMPLATES, overrides);
}

export async function getFlowTemplate(studioId: string, id: string): Promise<FlowTemplate | null> {
  return (await listFlowTemplates(studioId)).find((t) => t.id === id) || null;
}

/**
 * Save a studio's version of a template — a clone, or an edit of a built-in.
 *
 * REFUSES A TEMPLATE THAT COULD NOT WORK. The four things that can be wrong here
 * are all invisible at runtime and none of them throws:
 *
 *   - a stage that is not a registry type: the card never renders;
 *   - a head that is not one of its own stages: a deal that can be opened by a
 *     record the flow does not contain;
 *   - a statusChain naming a stage it does not use: every deal on this template
 *     reads as statusless, which looks like a data problem;
 *   - a cardinality override for a stage it does not carry: silently inert.
 *
 * The check runs against the WHOLE merged list rather than the one template, so
 * an edit is validated in the company it will actually keep.
 */
export async function saveFlowTemplate(studioId: string, template: FlowTemplate): Promise<void> {
  if (!template?.id) throw new Error("flow-template: an id is required");

  const problems = templateProblems(stageTypes(), [template]);
  if (problems.length) {
    throw new Error(`flow-template-refused: ${problems.join("; ")}`);
  }

  await editArr<FlowTemplate, void>(S.flowTemplates(studioId), (rows) => {
    // ONE DEFAULT. Marking a flow the default unmarks the rest in the same
    // write, so two flows can never both claim a new deal.
    const others = rows.filter((r) => r.id !== template.id)
      .map((r) => (template.isDefault && r.isDefault ? { ...r, isDefault: false } : r));
    const at = rows.findIndex((r) => r.id === template.id);
    const next = [...others];
    next.splice(at < 0 ? next.length : at, 0, template);
    return { next, result: undefined };
  });
}

// ---- the studio's OWN flows (05/10/2026) -------------------------------------
//
// THE STUDIO OWNS ITS FLOWS OUTRIGHT — the owner: "I should run nompany, not
// the flow." A studio starts with ONE flow, copied from its trade's starter the
// first time anything asks, and from then on it adds, removes, reorders and
// measures its own steps. The seven built-ins stay in code as starters and as
// what an older deal naming one still resolves to (`listFlowTemplates`); they
// are no longer a list every studio scrolls past.

/** The flows this studio has made its own, in its order. */
export async function listOwnFlows(studioId: string): Promise<FlowTemplate[]> {
  return readArr<FlowTemplate>(S.flowTemplates(studioId));
}

/**
 * THE FLOW A NEW DEAL STARTS ON: the studio's default, else its first own flow,
 * else its trade's starter (a studio that has not opened its flows yet), else A.
 */
export async function studioDefaultFlowId(studioId: string, own?: readonly FlowTemplate[]): Promise<string> {
  const rows = own || await listOwnFlows(studioId);
  const chosen = rows.find((r) => r.isDefault) || rows[0];
  if (chosen) return chosen.id;
  return (await defaultTemplateForTrade(studioId)) || "A";
}

/**
 * A STUDIO WITH NO FLOW OF ITS OWN GETS ITS STARTER, written once — the first
 * time its flows are opened. Planted on read like a section (a new studio needs
 * no script), inside `editArr` so two first readers plant one flow, and only
 * into an EMPTY list: a studio that has any flow of its own already chose.
 *
 * THE COPY KEEPS THE STARTER'S ID, so every deal already walking that flow is
 * on the studio's copy the moment it exists — nothing is re-pointed.
 */
export async function plantStarterFlow(studioId: string): Promise<FlowTemplate[]> {
  const rows = await listOwnFlows(studioId);
  if (rows.length) return rows;
  const starterId = await studioDefaultFlowId(studioId, rows);
  const starter = FLOW_TEMPLATES.find((t) => t.id === starterId) || FLOW_TEMPLATES[0];
  return editArr<FlowTemplate, FlowTemplate[]>(S.flowTemplates(studioId), (current) => {
    if (current.length) return { result: current };
    const next = [{ ...starter, isDefault: true }];
    return { next, result: next };
  });
}

/**
 * Drop a studio's override, restoring the built-in underneath it.
 *
 * A CLONE IS DELETED; AN EDITED BUILT-IN IS REVERTED. Same operation, and the
 * difference is only whether a seed exists with that id — which is exactly what
 * "stored as overrides" buys, and why this needs no separate "revert".
 */
export async function deleteFlowTemplate(studioId: string, id: string): Promise<boolean> {
  return editArr<FlowTemplate, boolean>(S.flowTemplates(studioId), (rows) => {
    const next = rows.filter((r) => r.id !== id);
    return { next, result: next.length !== rows.length };
  });
}

// ---- industries -------------------------------------------------------------

/**
 * THE TRADES THIS STUDIO CAN PUT A DEAL IN — three layers, most local last.
 *
 * The code's twenty-five (`INDUSTRIES`), then the ones the CONSOLE has added or
 * changed (`REG.erpIndustries`, 20/09/2026 — "so I can add more in the future"),
 * then the studio's own. Adding a trade to the product stopped being a release
 * the day the middle layer landed; the outer two are unchanged by it.
 *
 * READ IN ONE WAVE. The console list is a small platform-level array and the
 * studio's is usually empty, and this is on the deal screen's path.
 */
export async function listIndustries(studioId: string): Promise<IndustryEntry[]> {
  const [platform, overrides] = await Promise.all([
    readArr<IndustryEntry & { id?: string }>(REG.erpIndustries),
    readArr<IndustryEntry & { id?: string }>(S.industries(studioId)),
  ]);
  // IndustryEntry is keyed by `key`, not `id`; merge() wants an `id`, so the two
  // are bridged here rather than by giving industries a second identifier that
  // would then need keeping in step with the first.
  const asIded = overrides.map((o) => ({ ...o, id: o.key }));
  const seeds = merge(
    INDUSTRIES.map((i) => ({ ...i, id: i.key })),
    platform.map((p) => ({ ...p, id: p.key })),
  );
  return merge(seeds, asIded).map(({ id: _id, ...rest }) => rest as IndustryEntry);
}

/** The console's own list, without any studio's edits — what `/super` shows. */
export async function listPlatformIndustries(): Promise<IndustryEntry[]> {
  const platform = await readArr<IndustryEntry & { id?: string }>(REG.erpIndustries);
  return merge(
    INDUSTRIES.map((i) => ({ ...i, id: i.key })),
    platform.map((p) => ({ ...p, id: p.key })),
  ).map(({ id: _id, ...rest }) => rest as IndustryEntry);
}

// THE CONSOLE NO LONGER WRITES THIS LIST (29/09/2026). ERP settings' trade
// table was retired when the owner moved "which flow a deal starts on" onto the
// industry catalogue, per specialism (/super → Industries). What the console
// stored here before that still applies — it is the INHERITED answer a
// specialism with no flow of its own falls back to (defaultTemplateForTrade),
// so retiring the table changed no studio's flow.

/**
 * THE STARTER A STUDIO'S FIRST FLOW IS COPIED FROM — its trade's, read once by
 * `plantStarterFlow` and by `studioDefaultFlowId` before the studio has a flow
 * of its own. Since 05/10/2026 that is ALL it decides: the studio owns its flows
 * after the copy, and no table re-routes a deal.
 *
 * The order, most local first:
 *
 *   1. a row the studio wrote for its trade before 05/10/2026 (the retired
 *      Industries panel) — honoured, because it was that studio's own answer;
 *   2. its specialism's flow, when the console set one (/super → Industries);
 *   3. the trade map for its field, joined by `IndustryEntry.field`.
 *
 * A DEAL'S OWN "INDUSTRY" IS NOT ASKED, and never usefully was: it is the
 * CLIENT's segment ("Residential", "Banking"), a different vocabulary from the
 * trade the map is keyed by, so it matched nothing (found 20/09/2026).
 */
export async function defaultTemplateForTrade(studioId: string): Promise<string> {
  const studios = await readArr<{ id: string; fieldOfWork?: string; industry?: string }>(REG.studios);
  const studio = studios.find((s) => s.id === studioId);
  const field = String(studio?.fieldOfWork || "");
  if (!field) return "";
  const own = (await readArr<IndustryEntry>(S.industries(studioId))).find((i) => i.field === field);
  if (own?.primary) return own.primary;
  const specialism = String(studio?.industry || "");
  if (specialism) {
    const catalogue = mergeIndustries(await readArr(REG.industryCatalogue));
    const flow = catalogue.flatMap((i) => i.specialisms).find((sp) => sp.key === specialism)?.flow;
    if (flow) return flow;
  }
  const match = (await listIndustries(studioId)).find((i) => i.field === field);
  return match?.primary || "";
}

// ---- which flow a deal walks ------------------------------------------------

/**
 * WHICH FLOW A DEAL WALKS — the precedence, and nothing else.
 *
 * Pure, and takes the lists already in hand, because it has two callers with
 * very different read patterns: the deal screen resolves ONE deal, while the
 * flows board resolves hundreds with the lists read once up front.
 *
 * What must not drift is the ORDER: the deal's own templateId, then the
 * studio's default flow (`studioDefaultFlowId` — an industry table's answer
 * until 05/10/2026), then Template A. Two copies of that is two answers to
 * "which flow is this deal on", and the board counting a deal on one flow
 * while its page shows another is worse than no board.
 *
 * Template A is the last resort rather than a guess: it is the flow whose chain
 * the previously hardcoded status walk was approximating, so a deal written
 * before templates existed reads as it always did.
 */
export function pickTemplate(
  templates: readonly FlowTemplate[],
  templateId: string,
  defaultId: string,
): FlowTemplate | null {
  const byId = (id: string) => (id ? templates.find((t) => t.id === id) || null : null);
  return byId(templateId) || byId(defaultId) || byId("A");
}
