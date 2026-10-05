// THE STUDIO'S DEAL FLOWS, AS ONE BOARD — the owner, 05/10/2026: "I should run
// nompany, not the flow … let the users feel free to improve their own flow
// based on their requirements with less steps."
//
// Before this, a deal's flow lived in three places run by two people: which
// flow a trade starts on (nompany's industry table), the flow's steps (a Studio
// settings editor with seven lists, four of which nothing read), and the KPIs
// on those steps (a measure catalogue in /super, numbered on a third screen).
// Here it is one page: the studio's flows, each step with the deals at it, how
// many are late, and the step's own target — suggested from how long the
// studio's deals actually took.
//
// READ FROM THE DEALS' COMPLETION SNAPSHOTS (platform/engagement/completion),
// the same snapshot every deal list reads — never by opening every record of
// every deal. A deal with no snapshot yet is counted as such, not guessed at;
// the nightly refresh and opening the deal both fill it.
import { requirePermission, can } from "@/platform/access";
import type { Refusal } from "@/platform/access";
import { ENG } from "@/platform/db/keys";
import { zRange, getJSONMany } from "@/platform/db/store";
import {
  listFlowTemplates, plantStarterFlow, saveFlowTemplate, deleteFlowTemplate, pickTemplate, studioDefaultFlowId,
} from "@/platform/db/flows";
import { FLOW_TEMPLATES, deriveFlowShape, templateProblems, type FlowTemplate } from "@/platform/engagement/templates";
import { STAGE_REGISTRY } from "@/platform/engagement/registry";
import type { Engagement } from "@/platform/db/engagement";
import { setDealTemplate, resolveDealId, readEngagement } from "@/platform/db/engagement";
import { readDeal } from "./workTypes";
import { factsFromDeal } from "./workKpis";
import { currentStepTarget, daysBetween, judgeStep, nextStepTargets, stepTargetIn, stepTargetProblem, suggestDays } from "./flowSteps";
import { runningStages, visibleStageTypes, type EngagementCtx } from "./engagements";

type Ctx = EngagementCtx & { actor: string };

/** How many deals the board reads — newest first; the figures say when there are more. */
const SCAN_CAP = 500;

export type FlowStepRow = {
  type: string;
  /** The registry's English; the screen translates by type. */
  label: string;
  target: { days: number | null; from: string };
  /** False when this reader may not see the step's records — its figures are then null. */
  visible: boolean;
  /** Open deals AT this step now. */
  open: number | null;
  /** Of those, past this step's target and not yet beyond it. */
  late: number | null;
  /** Deals that reached this step under a target, and how many in time. */
  judged: number | null;
  met: number | null;
  /** From the studio's own history, measured from the target's current start. */
  suggestion: { average: number; suggested: number; from: number } | null;
};

export type FlowBoard = {
  id: string;
  name: string;
  isDefault: boolean;
  steps: FlowStepRow[];
  /** Deals walking this flow, of those scanned: open, done, cancelled. */
  deals: { open: number; done: number; cancelled: number };
};

/** Every step type a flow may be made of, for the "add a step" picker. */
const stepTypes = () => Object.keys(STAGE_REGISTRY);

async function scanDeals(studioId: string) {
  const ids = await zRange(ENG.index(studioId), 0, SCAN_CAP, { rev: true });
  const scanned = Math.min(ids.length, SCAN_CAP);
  const roots = scanned ? await getJSONMany<Engagement>(ids.slice(0, scanned).map((id) => ENG.root(studioId, id))) : [];
  return { ids: ids.slice(0, scanned), roots, capped: ids.length > SCAN_CAP };
}

export async function readDealFlows(ctx: Ctx): Promise<{
  flows: FlowBoard[];
  starters: { id: string; name: string; stages: readonly string[] }[];
  stepTypes: string[];
  scanned: number; capped: boolean; unread: number;
  canManage: boolean;
} | Refusal> {
  const denied = requirePermission(ctx.access, "engagements.view");
  if (denied) return denied;
  const studioId = ctx.studio.id;
  const own = await plantStarterFlow(studioId);
  const [all, defaultId, scan] = await Promise.all([
    listFlowTemplates(studioId), studioDefaultFlowId(studioId, own), scanDeals(studioId),
  ]);
  const visible = new Set(visibleStageTypes(ctx.access, ctx.sections));
  const asOf = new Date().toISOString();

  // A FLOW OUTSIDE THE STUDIO'S OWN LIST IS SHOWN WHILE A DEAL WALKS IT — an
  // older deal on a built-in the studio never adopted. Hiding the flow live
  // deals are on would hide the thing the board exists to show.
  const shown = new Map<string, FlowTemplate>(own.map((t) => [t.id, t]));
  type Acc = { open: number; done: number; cancelled: number; at: Map<string, number>; late: Map<string, number>; judged: Map<string, number>; met: Map<string, number>; took: Map<string, number[]> };
  const acc = new Map<string, Acc>();
  const accFor = (id: string): Acc => {
    let a = acc.get(id);
    if (!a) { a = { open: 0, done: 0, cancelled: 0, at: new Map(), late: new Map(), judged: new Map(), met: new Map(), took: new Map() }; acc.set(id, a); }
    return a;
  };
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  let unread = 0;

  scan.roots.forEach((root, i) => {
    if (!root) return;
    const template = pickTemplate(all, String(root.templateId || ""), defaultId);
    if (!template) return;
    if (!shown.has(template.id)) shown.set(template.id, template);
    const a = accFor(template.id);
    const snapshot = root.completion?.stages;
    if (!snapshot) { unread += 1; return; }
    const present = new Set(Object.keys(snapshot));
    const running = runningStages(ctx, template, present);
    const reading = readDeal(running, present, {}, snapshot);
    if (reading.state === "cancelled") { a.cancelled += 1; return; }
    if (reading.state === "done") a.done += 1;
    else { a.open += 1; if (reading.token) bump(a.at, reading.token); }

    const firstAt: Record<string, string> = {};
    for (const [type, st] of Object.entries(snapshot)) if (st.firstAt) firstAt[type] = st.firstAt;
    const facts = factsFromDeal(scan.ids[i], firstAt, running);
    const opened = String(root.createdAt || facts.openedAt || "");
    const measured = { ...facts, openedAt: opened, state: reading.state === "done" ? "done" as const : "open" as const };
    for (const step of running) {
      // WHAT THE STUDIO'S DEALS ACTUALLY TOOK, from the start the step's target
      // counts from today — the number a suggestion is made of.
      const now = currentStepTarget(template.targets?.[step]);
      const took = daysBetween(now.from ? firstAt[now.from] || "" : opened, firstAt[step] || "");
      if (took !== null) a.took.set(step, [...(a.took.get(step) || []), took]);

      const target = stepTargetIn(template.targets?.[step], opened);
      if (!target) continue;
      const judged = judgeStep(step, target, measured, asOf);
      if (!judged) continue;
      if (firstAt[step]) {
        bump(a.judged, step);
        if (judged.outcome === "met") bump(a.met, step);
      } else if (judged.outcome === "missed" && reading.state === "open") {
        bump(a.late, step);
      }
    }
  });

  const flows: FlowBoard[] = [...shown.values()].map((t) => {
    const a = acc.get(t.id);
    return {
      id: t.id,
      name: t.name,
      isDefault: t.id === defaultId,
      deals: { open: a?.open ?? 0, done: a?.done ?? 0, cancelled: a?.cancelled ?? 0 },
      steps: t.stages.map((type) => {
        const seen = visible.has(type);
        const n = (m?: Map<string, number>) => (seen ? m?.get(type) ?? 0 : null);
        return {
          type,
          label: STAGE_REGISTRY[type]?.label || type,
          target: currentStepTarget(t.targets?.[type]),
          visible: seen,
          open: n(a?.at), late: n(a?.late), judged: n(a?.judged), met: n(a?.met),
          suggestion: seen ? suggestDays(a?.took.get(type) || []) : null,
        };
      }),
    };
  });

  return {
    flows,
    starters: FLOW_TEMPLATES.map((t) => ({ id: t.id, name: t.name, stages: t.stages })),
    stepTypes: stepTypes(),
    scanned: scan.ids.length, capped: scan.capped, unread,
    canManage: can(ctx.access, "administration.settings.edit"),
  };
}

// ---- changing a flow ---------------------------------------------------------

export type FlowRefusal = { error: "refused"; detail: string };

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * SAVE A FLOW: its name, its steps in order, each step's target, and whether
 * it is the default. Everything else a flow carries follows from the steps
 * (`deriveFlowShape`) — the studio edits steps and nothing else.
 *
 * A target change is APPENDED as a new version (`nextStepTargets`); a step
 * removed keeps its history, so adding it back continues it.
 */
export async function saveDealFlow(ctx: Ctx, body: Record<string, unknown>): Promise<{ ok: true } | FlowRefusal | Refusal> {
  const denied = requirePermission(ctx.access, "administration.settings.edit");
  if (denied) return denied;
  const id = str(body.id, 40);
  const all = await listFlowTemplates(ctx.studio.id);
  const previous = all.find((t) => t.id === id);
  if (!previous) return { error: "refused", detail: "no-flow" };

  const stages = (Array.isArray(body.stages) ? body.stages : previous.stages).slice(0, 40).map((s) => str(s, 40)).filter(Boolean);
  if (new Set(stages).size !== stages.length) return { error: "refused", detail: "repeated-step" };
  if (!stages.length) return { error: "refused", detail: "no-steps" };

  let targets = previous.targets || {};
  const asked = (body.targets && typeof body.targets === "object" ? body.targets : {}) as Record<string, { days?: unknown; from?: unknown }>;
  const at = new Date().toISOString();
  for (const [step, change] of Object.entries(asked).slice(0, 40)) {
    const raw = change?.days;
    const days = raw === null || raw === "" || raw === undefined ? null : Number(raw);
    const from = str(change?.from, 40);
    const problem = stepTargetProblem(stages, step, days, from);
    if (problem) return { error: "refused", detail: `${problem}:${step}` };
    targets = nextStepTargets(targets, step, { days, from }, at, ctx.actor);
  }

  const name = body.name === undefined ? previous.name : str(body.name, 120);
  const next: FlowTemplate = {
    ...previous,
    ...deriveFlowShape(stages, previous),
    id,
    name,
    stages,
    targets,
    isDefault: body.isDefault === true ? true : Boolean(previous.isDefault && body.isDefault !== false),
  };
  const problems = templateProblems(stepTypes(), [next]);
  if (problems.length) return { error: "refused", detail: problems.join("; ") };
  await saveFlowTemplate(ctx.studio.id, next);
  return { ok: true };
}

/**
 * A SECOND FLOW, copied from one of the studio's own or from a starter — a
 * studio that sells both installations and maintenance contracts walks two.
 * Targets are not copied: a number belongs to the flow it was set on.
 */
export async function addDealFlow(ctx: Ctx, body: Record<string, unknown>): Promise<{ ok: true; id: string } | FlowRefusal | Refusal> {
  const denied = requirePermission(ctx.access, "administration.settings.edit");
  if (denied) return denied;
  const source = (await listFlowTemplates(ctx.studio.id)).find((t) => t.id === str(body.from, 40));
  if (!source) return { error: "refused", detail: "no-flow" };
  const id = `F${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const name = str(body.name, 120) || source.name;
  const { targets: _t, isDefault: _d, ...rest } = source;
  await plantStarterFlow(ctx.studio.id);
  await saveFlowTemplate(ctx.studio.id, { ...rest, id, name, isDefault: false });
  return { ok: true, id };
}

/**
 * REMOVE A FLOW — refused while any deal walks it, and for the studio's last
 * flow: a deal must always have one to start on. Removing the default makes the
 * next flow the default, so new deals are never left without one.
 */
export async function removeDealFlow(ctx: Ctx, idRaw: unknown): Promise<{ ok: true } | FlowRefusal | Refusal> {
  const denied = requirePermission(ctx.access, "administration.settings.edit");
  if (denied) return denied;
  const id = str(idRaw, 40);
  const studioId = ctx.studio.id;
  const own = await plantStarterFlow(studioId);
  if (!own.some((t) => t.id === id)) return { error: "refused", detail: "no-flow" };
  if (own.length < 2) return { error: "refused", detail: "last-flow" };
  const [all, defaultId, scan] = await Promise.all([listFlowTemplates(studioId), studioDefaultFlowId(studioId, own), scanDeals(studioId)]);
  const walked = scan.roots.some((r) => r && pickTemplate(all, String(r.templateId || ""), defaultId)?.id === id);
  if (walked || scan.capped) return { error: "refused", detail: "in-use" };
  await deleteFlowTemplate(studioId, id);
  if (id === defaultId) {
    const heir = own.find((t) => t.id !== id);
    if (heir) await saveFlowTemplate(studioId, { ...heir, isDefault: true });
  }
  return { ok: true };
}

/**
 * MOVE ONE DEAL TO ANOTHER OF THE STUDIO'S FLOWS — how a deal "picks" its flow
 * when the studio has several. What it holds is kept: a stage the new flow does
 * not list is shown on the deal, never lost (setDealTemplate).
 */
export async function moveDealFlow(ctx: Ctx, dealIdRaw: unknown, flowIdRaw: unknown): Promise<{ ok: true } | FlowRefusal | Refusal> {
  const denied = requirePermission(ctx.access, "administration.settings.edit");
  if (denied) return denied;
  const own = await plantStarterFlow(ctx.studio.id);
  const flowId = str(flowIdRaw, 40);
  if (!own.some((t) => t.id === flowId)) return { error: "refused", detail: "no-flow" };
  const dealId = await resolveDealId(ctx.studio.id, str(dealIdRaw, 80));
  if (!dealId || !(await readEngagement(ctx.studio.id, dealId))) return { error: "refused", detail: "no-deal" };
  await setDealTemplate(ctx.studio.id, dealId, flowId);
  return { ok: true };
}

