// FLOW TEMPLATES AND INDUSTRIES A TENANT OWNS — Law 2, "flow templates as data".
//
// The seven templates and twenty-five industries in platform/engagement/ are
// SEEDS. This module is what makes them editable: a studio clones a template,
// reorders its stages, inserts a checkpoint, adds the industry its trade needs.
// Adding an industry has to be a row rather than a release, and that only means
// anything if something stores the row.
//
// STORED AS OVERRIDES, NEVER AS A FULL COPY. A studio that edits Template A does
// not fork the other six. Two consequences, both wanted: a later correction to a
// built-in still reaches every studio that never touched it, and a studio's
// stored data is exactly what it changed rather than a snapshot of everything
// that existed the day it first opened the editor.
//
// VALIDATED ON WRITE, NOT ON READ. A template naming a stage the registry does
// not have renders as nothing — silently, forever, on a screen nobody thinks to
// doubt. Refusing it at the door means the studio hears about it while it is
// still their edit, in words about the edit. Validating on read instead would
// mean discovering it at the worst moment, on somebody else's screen.
import { S } from "./keys";
import { readArr, editArr } from "./store";
import { FLOW_TEMPLATES, templateProblems } from "../engagement/templates";
import type { FlowTemplate } from "../engagement/templates";
import { INDUSTRIES, industryProblems } from "../engagement/industries";
import type { IndustryEntry } from "../engagement/industries";
import { STAGE_REGISTRY } from "../engagement/registry";

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
    const next = rows.filter((r) => r.id !== template.id);
    next.push(template);
    return { next, result: undefined };
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

/** Every industry this studio can choose: the seeded twenty-five, as it has edited them. */
export async function listIndustries(studioId: string): Promise<IndustryEntry[]> {
  const overrides = await readArr<IndustryEntry & { id?: string }>(S.industries(studioId));
  // IndustryEntry is keyed by `key`, not `id`; merge() wants an `id`, so the two
  // are bridged here rather than by giving industries a second identifier that
  // would then need keeping in step with the first.
  const asIded = overrides.map((o) => ({ ...o, id: o.key }));
  const seeds = INDUSTRIES.map((i) => ({ ...i, id: i.key }));
  return merge(seeds, asIded).map(({ id: _id, ...rest }) => rest as IndustryEntry);
}

export async function getIndustry(studioId: string, key: string): Promise<IndustryEntry | null> {
  return (await listIndustries(studioId)).find((i) => i.key === key) || null;
}

/**
 * Add or edit an industry.
 *
 * REFUSES ONE POINTING AT A TEMPLATE THAT DOES NOT EXIST — including a template
 * this studio deleted. Every deal created in that industry would start on
 * nothing: no stages, no heads, no status chain, and the symptom would be an
 * empty container rather than a message naming the row.
 *
 * Checked against THIS STUDIO'S templates, not the built-ins, because that is
 * the list a deal will actually resolve against.
 */
export async function saveIndustry(studioId: string, industry: IndustryEntry): Promise<void> {
  if (!industry?.key) throw new Error("industry: a key is required");

  const templateIds = (await listFlowTemplates(studioId)).map((t) => t.id);
  const problems = industryProblems(templateIds, [industry]);
  if (problems.length) {
    throw new Error(`industry-refused: ${problems.join("; ")}`);
  }

  await editArr<IndustryEntry, void>(S.industries(studioId), (rows) => {
    const next = rows.filter((r) => r.key !== industry.key);
    next.push(industry);
    return { next, result: undefined };
  });
}

/** Drop a studio's override, restoring the seeded industry underneath it. */
export async function deleteIndustry(studioId: string, key: string): Promise<boolean> {
  return editArr<IndustryEntry, boolean>(S.industries(studioId), (rows) => {
    const next = rows.filter((r) => r.key !== key);
    return { next, result: next.length !== rows.length };
  });
}

/**
 * The template a new deal in this industry starts on, for THIS studio.
 *
 * "" when the industry is unknown, which stays a real case rather than an error:
 * a studio may have deleted an industry that existing deals still name. The
 * caller decides, and every caller must, because there is no sensible universal
 * default across seven genuinely different flows.
 */
export async function defaultTemplateForStudio(studioId: string, industryKey: string): Promise<string> {
  return (await getIndustry(studioId, industryKey))?.primary || "";
}
