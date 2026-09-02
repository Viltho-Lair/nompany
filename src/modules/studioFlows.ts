// THE AUTHORISED DOOR ONTO A STUDIO'S FLOW TEMPLATES AND INDUSTRIES (Law 2).
//
// `platform/db/flows.ts` is the store: it merges seeds with a tenant's
// overrides and REFUSES a template that could not work. This file is what a
// route may call — it checks the right first, and it turns a refusal into an
// answer instead of an exception.
//
// WHY THE TRANSLATION IS THE POINT. flows.ts throws, deliberately: a store that
// returned `{ error }` for a structurally impossible template would let a
// careless caller persist one by ignoring the result. But a thrown Error is a
// 500 to anyone on the other side of HTTP, and a 500 tells a studio nothing
// about the edit they just made. The reasons flows.ts produces are the whole
// value of validating on write — "statusChain names 'project', which it does
// not use" is actionable, "Internal Server Error" is not — so they are carried
// through to the caller rather than swallowed or reduced to a code.
//
// It sits at the modules root beside studioServiceActions.ts rather than in a
// department folder, for the same reason that one does: this is a studio-wide
// setting, owned by no department, and every department reads its result.
import { requirePermission } from "@/platform/access";
import type { PermissionSet, Refusal } from "@/platform/access";
import {
  listFlowTemplates, saveFlowTemplate, deleteFlowTemplate,
  listIndustries, saveIndustry, deleteIndustry,
  pickTemplate, industryKeyOf,
} from "@/platform/db/flows";
import { ENG } from "@/platform/db/keys";
import { SLOT_TYPE } from "@/platform/db/engagement";
import { zRange, getJSONMany, sMembers } from "@/platform/db/store";
import type { FlowTemplate, BillingTrigger } from "@/platform/engagement/templates";
import type { IndustryEntry } from "@/platform/engagement/industries";

/** What a refused edit tells the studio: the reason flows.ts gave, verbatim. */
export type FlowRefusal = { error: "refused"; detail: string };

type Ctx = { studioId: string; access: PermissionSet };

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const strs = (v: unknown, max: number, cap = 40) =>
  (Array.isArray(v) ? v : []).slice(0, cap).map((s) => str(s, max)).filter(Boolean);

/**
 * Run a store write, turning its refusal into a value.
 *
 * ONLY THE REFUSALS ARE CAUGHT. flows.ts marks them with a known prefix, so a
 * genuine fault — a dropped connection mid-write — still throws and still
 * reaches the error handler as the 500 it is. Catching everything here would
 * report a database outage to the studio as "your template is invalid", which
 * is the kind of wrong answer somebody acts on.
 */
async function refusable(run: () => Promise<void>): Promise<FlowRefusal | null> {
  try {
    await run();
    return null;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.startsWith("flow-template-refused:") || message.startsWith("industry-refused:")
      || message.startsWith("flow-template:") || message.startsWith("industry:")) {
      return { error: "refused", detail: message.replace(/^[a-z-]+:\s*/, "") };
    }
    throw e;
  }
}

// ---- reading ----------------------------------------------------------------

export async function readFlows(ctx: Ctx): Promise<
  { templates: FlowTemplate[]; industries: IndustryEntry[]; usage: FlowUsage | null; canManage: boolean }
  | Refusal
> {
  const denied = requirePermission(ctx.access, "administration.settings.view");
  if (denied) return denied;
  // The screen draws the same list either way and only hides the controls, so a
  // viewer sees WHAT their studio's flows are without being offered edits that
  // would be refused at the door.
  const canManage = !requirePermission(ctx.access, "administration.settings.edit");

  return {
    templates: await listFlowTemplates(ctx.studioId),
    industries: await listIndustries(ctx.studioId),
    // USAGE IS MANAGER-ONLY, for both of the reasons the sibling settings route
    // gives about its own: it exists to warn somebody who is about to change a
    // flow, and a viewer who cannot change one is offered no warning to read.
    // Skipping it also saves a viewer the whole engagement scan on every GET —
    // and, less obviously, avoids handing somebody with no deal rights a count
    // of how much work the studio has.
    usage: canManage ? await flowUsage(ctx) : null,
    canManage,
  };
}

// ---- who is already walking these flows -------------------------------------

/**
 * HOW MANY DEALS THIS SCAN WILL LOOK AT.
 *
 * The warning's job is "this edit reaches work that already exists", not a
 * census. A studio with forty thousand deals does not need an exact number to
 * decide, and reading forty thousand roots to produce one would make opening
 * Settings the most expensive page in the product.
 *
 * Newest first, so the cap keeps the deals most likely to still be moving.
 */
const USAGE_SCAN_CAP = 500;

export type FlowUsage = {
  /** templateId → how many of the scanned deals walk it. */
  deals: Record<string, number>;
  /**
   * templateId → stage type → how many of that flow's deals already hold one.
   *
   * This is the number that tells somebody whether a particular removal
   * matters: "14 deals walk this flow" does not, "9 of them have a quotation
   * you are about to drop from it" does.
   */
  stages: Record<string, Record<string, number>>;
  /**
   * FALSE WHEN THE COUNTS ABOVE CANNOT BE TRUSTED, and it is not a nicety.
   *
   * `ENG.hasStage` was written by attachRecord and never by applyDescriptor, so
   * until the backfill is re-run a studio's older deals are in no set at all.
   * The counts would then read "0 of them have a quotation" for a flow where
   * nine do — and a confident zero is worse than an absent number, because
   * somebody acts on it. When this is false the screen shows no per-stage
   * figures at all.
   */
  stagesComplete: boolean;
  scanned: number;
  /** True when the studio has more deals than the scan looked at. */
  capped: boolean;
};

/**
 * WHICH FLOWS ALREADY HAVE WORK ON THEM.
 *
 * Editing a template is not like editing a setting: it changes what every deal
 * on that flow shows, which stages it invites, and what may attach to it. The
 * screen next door (Service Actions) has warned "N items use this action" since
 * the day removing one could silently drop a ticket's scope; the flow editor
 * has the more consequential edit and had nothing.
 *
 * DERIVED FROM THE ROOTS, not from ENG.hasStage. That index looks like exactly
 * what this wants — a set of deal ids per stage — but it is written only by
 * attachRecord and promote, NOT by applyDescriptor, which is the path every
 * ticket-minted deal takes. It is also read by nothing. Counting from it would
 * report most of a studio's deals as not existing.
 *
 * ONE BATCHED READ FOR THE ROOTS. `getJSONMany` is one statement for many keys —
 * the same shape getProfile's N+1 was collapsed into — so this costs three
 * round trips whatever the cap: the index, the roots, the industries.
 */
export async function flowUsage(ctx: Ctx): Promise<FlowUsage> {
  const [templates, industries] = await Promise.all([
    listFlowTemplates(ctx.studioId),
    listIndustries(ctx.studioId),
  ]);
  const primaryOf = new Map(industries.map((i) => [i.key, i.primary]));

  const ids = await zRange(ENG.index(ctx.studioId), 0, USAGE_SCAN_CAP, { rev: true });
  const scanned = Math.min(ids.length, USAGE_SCAN_CAP);
  const roots = scanned
    ? await getJSONMany<{
        templateId?: string;
        context?: Record<string, unknown>;
        singletons?: Record<string, string | null>;
      }>(
        ids.slice(0, scanned).map((id) => ENG.root(ctx.studioId, id)),
      )
    : [];

  const deals: Record<string, number> = {};
  const dealsByTemplate = new Map<string, Set<string>>();
  /** [dealId, stageType] pairs the index is REQUIRED to contain. */
  const expected: Array<[string, string]> = [];
  roots.forEach((root, i) => {
    if (!root) return;
    // The SAME precedence the deal screen resolves with — pickTemplate, shared,
    // so the number here can never disagree with the flow a deal actually walks.
    const industryKey = industryKeyOf(root.context);
    const chosen = pickTemplate(templates, String(root.templateId || ""), primaryOf.get(industryKey) || "");
    if (!chosen) return;
    deals[chosen.id] = (deals[chosen.id] ?? 0) + 1;
    const set = dealsByTemplate.get(chosen.id) || new Set<string>();
    set.add(ids[i]);
    dealsByTemplate.set(chosen.id, set);

    // WHAT THE INDEX MUST ALREADY KNOW ABOUT THIS DEAL, taken from the root
    // rather than from the index being checked. A filled singleton slot is a
    // stage the deal demonstrably has, so its membership is not a guess — it is
    // a fact the root states and the index must agree with.
    //
    // SLOT_TYPE, not the slot: `approvedQuotation` is a slot naming a record
    // whose TYPE is `quotation`, and the index is keyed by type.
    for (const [slot, recId] of Object.entries(root.singletons || {})) {
      if (recId) expected.push([ids[i], SLOT_TYPE[slot] || slot]);
    }
  });

  // ---- per stage, for the flows that actually have deals --------------------
  //
  // Only the stages of flows somebody is walking are read. A studio using one
  // template pays for that template's stages, not for all twenty types across
  // seven flows it has never touched.
  const wanted = new Set<string>();
  for (const id of dealsByTemplate.keys()) {
    for (const st of templates.find((t) => t.id === id)?.stages || []) wanted.add(st);
  }
  const held = new Map<string, Set<string>>();
  await Promise.all([...wanted].map(async (type) => {
    held.set(type, new Set(await sMembers(ENG.hasStage(ctx.studioId, type))));
  }));

  // COMPLETENESS IS CHECKED AGAINST THE ROOTS, one membership at a time.
  //
  // The first version of this asked whether a scanned deal appeared in AT LEAST
  // ONE set. That passes a PARTIALLY indexed deal, and partial is exactly the
  // state this index was in: attachRecord wrote a contract's membership while
  // applyDescriptor never wrote the ticket the deal was opened with. The sandbox
  // duly reported `stagesComplete: true` alongside `{contract: 2}` and no
  // tickets — a confident number that was missing half its subject, which is
  // the failure the flag exists to prevent rather than one it was catching.
  //
  // Each filled singleton on a root is a membership the index MUST hold. A type
  // whose set was not read (its flow has no deals) is skipped rather than
  // counted as missing — absent from `held` means unexamined, not absent from
  // the index.
  const missing = expected.filter(([dealId, type]) => held.has(type) && !held.get(type)?.has(dealId));

  const stages: Record<string, Record<string, number>> = {};
  for (const [templateId, dealIds] of dealsByTemplate) {
    const perStage: Record<string, number> = {};
    for (const type of templates.find((t) => t.id === templateId)?.stages || []) {
      const set = held.get(type);
      if (!set) continue;
      let n = 0;
      for (const dealId of dealIds) if (set.has(dealId)) n += 1;
      if (n) perStage[type] = n;
    }
    stages[templateId] = perStage;
  }

  // `ids` is read one past the cap precisely so this can tell the truth about
  // there being more, rather than reporting a round number as if it were all.
  return {
    deals, stages,
    stagesComplete: missing.length === 0,
    scanned,
    capped: ids.length > USAGE_SCAN_CAP,
  };
}

// ---- templates --------------------------------------------------------------

/**
 * Normalise a template from an HTTP body.
 *
 * NOTHING IS VALIDATED HERE — `saveFlowTemplate` owns that, and a second copy
 * of the rules in front of it is a second copy free to disagree. This only
 * bounds the strings and shapes so a hostile body cannot arrive as an object
 * where an array belongs.
 */
function templateFrom(body: Record<string, unknown>): FlowTemplate {
  const overrides = (body.cardinalityOverrides && typeof body.cardinalityOverrides === "object"
    ? body.cardinalityOverrides : {}) as Record<string, unknown>;
  const cardinalityOverrides: Record<string, "one" | "many"> = {};
  for (const [stage, value] of Object.entries(overrides).slice(0, 40)) {
    // Anything that is not one of the two words is DROPPED rather than
    // defaulted: a typo silently meaning "many" would change what a deal
    // accepts, and the studio would never be told which of their words did it.
    if (value === "one" || value === "many") cardinalityOverrides[str(stage, 40)] = value;
  }
  const trigger = str(body.billingTrigger, 20);
  return {
    id: str(body.id, 40),
    name: str(body.name, 120),
    stages: strs(body.stages, 40),
    heads: strs(body.heads, 40),
    statusChain: strs(body.statusChain, 40),
    // PASSED THROUGH UNCHECKED, DELIBERATELY. templateProblems is the validator
    // and it names the offending value back to the studio — so blanking an
    // unrecognised word here would have made its message read `billingTrigger
    // "" is not one of …` to somebody who typed "whenever". The cast is the
    // honest shape of that: this function bounds strings, it does not judge
    // them, and the door downstream refuses what it should.
    billingTrigger: trigger as BillingTrigger,
    costDrivers: strs(body.costDrivers, 40),
    cardinalityOverrides,
  };
}

export async function writeFlowTemplate(
  ctx: Ctx, body: Record<string, unknown>,
): Promise<{ ok: true } | FlowRefusal | Refusal> {
  const denied = requirePermission(ctx.access, "administration.settings.edit");
  if (denied) return denied;
  const refused = await refusable(() => saveFlowTemplate(ctx.studioId, templateFrom(body)));
  return refused || { ok: true };
}

/**
 * Drop a studio's override.
 *
 * REVERT AND DELETE ARE THE SAME OPERATION, and which one happened depends only
 * on whether a seed exists underneath — see deleteFlowTemplate's own comment.
 * `existed: false` therefore means "there was no override", not "no such
 * template": a built-in nobody has edited is already in its original state, so
 * asking to revert it is a no-op rather than an error.
 */
export async function dropFlowTemplate(
  ctx: Ctx, id: string,
): Promise<{ ok: true; existed: boolean } | Refusal> {
  const denied = requirePermission(ctx.access, "administration.settings.edit");
  if (denied) return denied;
  return { ok: true, existed: await deleteFlowTemplate(ctx.studioId, str(id, 40)) };
}

// ---- industries -------------------------------------------------------------

function industryFrom(body: Record<string, unknown>): IndustryEntry {
  return {
    key: str(body.key, 80),
    name: str(body.name, 120),
    primary: str(body.primary, 40),
    secondary: str(body.secondary, 40),
    note: str(body.note, 400),
  };
}

export async function writeIndustry(
  ctx: Ctx, body: Record<string, unknown>,
): Promise<{ ok: true } | FlowRefusal | Refusal> {
  const denied = requirePermission(ctx.access, "administration.settings.edit");
  if (denied) return denied;
  const refused = await refusable(() => saveIndustry(ctx.studioId, industryFrom(body)));
  return refused || { ok: true };
}

export async function dropIndustry(
  ctx: Ctx, key: string,
): Promise<{ ok: true; existed: boolean } | Refusal> {
  const denied = requirePermission(ctx.access, "administration.settings.edit");
  if (denied) return denied;
  return { ok: true, existed: await deleteIndustry(ctx.studioId, str(key, 80)) };
}
