// THE RECORD ENGINE'S SERVICE. One implementation for every declared type.
//
// THE PERMISSION IS THE TYPE'S OWN, and the type comes from the URL rather than
// the body: `engine.<typeKey>.<verb>`. A grant for one type opens exactly that
// type, and a grant naming a type that does not exist opens nothing.
//
// THE RULES ARE IN ./types, which is pure. Nothing is decided here.
import { requirePermission, engineSectionKey } from "@/platform/access";
import type { Area } from "@/platform/access";
import { sectionName } from "@/shared/studio/sections";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { listCollaborators } from "@/platform/auth/collaborators";
import { notifyHolders, notifyNewlyAssigned } from "@/modules/people/holders";
import { NOTIFY } from "@/platform/notify/notifications";
import { transitionProblem, applyMove, coerceRecord, mergeRecord, recordProblem } from "./types";
import { rulesFiredBy, newRecordValues, alreadyRaised, raisedEarlierByAnother } from "./rules";
import { seedBuiltinTypes } from "./builtins";
import type { RecordType, EngineRecord } from "./schema";
import type { Row } from "@/platform/db/store";
import type { PermissionSet } from "@/platform/access";
import type { StudioRef, CollaboratorRef } from "@/modules/context";
import { sectionsAsStored } from "@/platform/db/sections";
import type { Section } from "@/platform/db/sections";

const Types = repo<RecordType>("recordTypes");
const Records = repo<EngineRecord>("engineRecords");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** What the attempt the compare-and-set KEPT decided — see `applyMove`. */
type MoveOutcome = { row: Row; moved: boolean; problem: string | null; from: string };
const now = () => new Date().toISOString();

/**
 * The four letters a type's references carry: TRA-0001 for `transmittal`.
 *
 * TWO KEYS SHARING THREE LEADING LETTERS COLLIDE — `transmittal` and
 * `transfer` both mint `TRA-` — and this is tolerated for phase 1 because
 * only one built-in type exists, so the collision cannot happen yet. Once it
 * does, the two types' numbers interleave in one counter rather than either
 * reissuing a number already given out (invariant 10 still holds), so the
 * failure mode is a confusing shared prefix, not a repeated reference. A
 * second type sharing a prefix with an existing one is the trigger to give
 * the type row its own stored prefix instead of deriving one from the key.
 */
const prefixOf = (typeKey: string) => typeKey.slice(0, 3).toUpperCase();

/**
 * TYPES WHOSE RECORDS ARE CANCELLED, NEVER DELETED. The engine permit declared
 * that rule in a comment and `removeRecord` hard-deleted anyway (record-engine
 * .md admitted it). Enforced by key because the type is no longer declared
 * (tier 5) and a stored row carries no such flag — so it answers here, where
 * the delete is, and the register draws no Delete button for it.
 */
const NEVER_DELETED = new Set(["permit"]);

/**
 * WHAT THIS SERVICE NEEDS FROM A MODULE CONTEXT, AND NO MORE.
 *
 * `ModuleContext`'s index signature does not name `settingsSection` — that
 * field is produced by `engineContext` (`platform/engine/context.ts`), which
 * resolves where the engine's two collections live and replaced the
 * `moduleContext({ sub: { settings: "administration-settings" } })` call this
 * comment used to name. It is typed here STRUCTURALLY rather than against that
 * context, so the service names what it needs and nothing more: the shared
 * `ModuleContext` is not widened for every module that has no such field, and
 * this file does not import the route's context to describe its own argument.
 */
export type EngineCallerContext = {
  studio: StudioRef;
  collaborator: CollaboratorRef;
  access: PermissionSet;
  settingsSection: Section;
  /** Every section the studio has, so a type's own section can be found by key. */
  sections: Section[];
};

/**
 * THE TYPE, AND THE SECTION ITS ROWS LIVE IN — WHICH ARE NOT THE SAME SECTION.
 *
 * The DECLARATION is studio configuration and sits under administration-settings
 * beside the flow templates. The RECORDS sit under the type's OWN section, the
 * one `plantTypeSection` mints, and they used to sit beside the declaration.
 *
 * WHY THEY MOVED, and it is a permission bug rather than tidiness. Every write
 * publishes an event carrying the SECTION IT WAS WRITTEN UNDER, and the stream
 * route decides who hears it with `sectionViewable(access, section.key)`.
 * `administration-settings` answers from `administration.settings` — so a member
 * holding exactly `engine.transmittal.view`, the whole audience this engine was
 * built for, received no event at all and their screen silently never updated;
 * and the converse leaked, because a settings-holder with no engine right DID
 * receive `{collection: "engineRecords", rowId}` for records they may not read.
 * `sectionViewable` already answers `engine-<typeKey>` from `engine.<typeKey>
 * .view`, so putting the rows where the permission is makes both true at once,
 * with nothing special-cased in a route that must stay generic.
 *
 * A MISSING SECTION IS `no-section`, NOT AN EMPTY LIST. `plantTypeSection` runs
 * in the same write as the type row precisely so this cannot happen; if it has
 * happened anyway the rows cannot be addressed, and answering "no records"
 * would report an unaddressable collection as an empty one.
 */
async function typeFor(ctx: EngineCallerContext, typeKey: string) {
  const types = await Types.find({ studio: ctx.studio, section: ctx.settingsSection });
  const type = types.find((t) => t.key === typeKey) || null;
  const section = type
    ? ctx.sections.find((x) => x.key === engineSectionKey(String(type.key))) || null
    : null;
  return { scope: section && { studio: ctx.studio, section }, type };
}

/**
 * THE STUDIO'S OWN RECORD TYPES, for expanding an archetype's `engineSections`.
 *
 * A library role's permissions are a COPY taken at the moment it is added (the
 * BOQ rate rule), so this is read once per seeding rather than resolved later:
 * changing an archetype must reprice nothing already created.
 *
 * ABSENT SECTION MEANS NO TYPES, NOT AN ERROR. A studio short of
 * `administration-settings` has no engine storage at all, and a role that
 * arrives with its ordinary areas and none of its registers is a truthful
 * degradation — the alternative is refusing to seed a department's roles over
 * a register nobody has asked for yet.
 */
export async function studioTypesForGrants(
  studioId: string,
): Promise<{ key: string; parentSectionKey: string }[]> {
  // CAUGHT UP FIRST, so a department seeded today gets its roles' registers
  // expanded against every built-in type, including one shipped this morning.
  // Free when nothing is behind — see `seedBuiltinTypes`.
  const sections = await seedBuiltinTypes(studioId, await sectionsAsStored(studioId));
  const settings = sections.find((s) => s.key === "administration-settings");
  if (!settings) return [];
  const studio = { id: studioId } as Parameters<typeof Types.find>[0]["studio"];
  const rows = await Types.find({ studio, section: settings });
  return rows.map((r) => ({ key: String(r.key), parentSectionKey: String(r.parentSectionKey) }));
}

/**
 * MOVE A RECORD'S STATUS WITH THE STUDIO'S AUTHORITY, not the caller's.
 *
 * WHY THE ACTOR'S RIGHTS ARE THE WRONG QUESTION HERE, and it is the same
 * argument `rules.ts` makes for a rule firing: the technician who starts a work
 * order holds `maintenance.orders.edit` and has no reason to hold
 * `engine.equipment.edit` over the Assets register. Asking for the actor's right
 * would mean the machine's status moved for planners and silently did not for
 * the people who actually start the work — a field that is right sometimes,
 * which is worse than one that is never written.
 *
 * IT STILL ASKS THE DECLARATION. `transitionProblem` is put the studio's OWN
 * STORED type, never the built-in: a studio that has edited `equipment` and
 * dropped "Under repair" is REFUSED rather than having a record written to a
 * status nothing can move it out of (the stranding this engine's own header
 * warns about). The refusal is a returned token, so the caller can carry on —
 * a machine whose type no longer declares the status must never block the work
 * order that tried to move it.
 *
 * IT DELIBERATELY FIRES NO RULES. `moveRecord` runs `runRulesForMove`, because
 * a person moving a record is the thing rules exist to respond to. A status
 * this function sets is a CONSEQUENCE of work happening elsewhere, and letting
 * it trigger a second consequence would raise records nobody asked for, one per
 * repair, with no screen showing why.
 */
export async function moveRecordAsStudio(
  studioId: string, typeKey: string, id: string, to: string,
): Promise<{ moved: boolean; problem?: string }> {
  const sections = await sectionsAsStored(studioId);
  const settings = sections.find((s) => s.key === "administration-settings");
  if (!settings) return { moved: false, problem: "no-section" };
  const studio = { id: studioId } as Parameters<typeof Types.find>[0]["studio"];
  const types = await Types.find({ studio, section: settings });
  const type = types.find((t) => t.key === typeKey) || null;
  if (!type) return { moved: false, problem: "notfound" };

  const section = sections.find((x) => x.key === engineSectionKey(String(type.key))) || null;
  if (!section) return { moved: false, problem: "no-section" };
  const scope = { studio, section };

  const existing = await Records.byId(scope, id);
  if (!existing || existing.typeKey !== typeKey) return { moved: false, problem: "notfound" };
  // ALREADY THERE IS NOT A FAILURE. Two orders open on one machine both ask for
  // "Under repair", and the second asking is not a problem to report.
  if (String(existing.status || "") === to) return { moved: false };

  const problem = transitionProblem(type, existing.status, to);
  if (problem) return { moved: false, problem };

  // RE-ASKED INSIDE THE PATCH (invariant 8), for the reason `applyMove` gives:
  // the answer above is about a row somebody else may have moved since. The
  // LAST invocation is the attempt the compare-and-set kept, so `outcome` is
  // what actually landed, never what an abandoned round decided.
  const at = now();
  let outcome: MoveOutcome = { row: existing, moved: false, problem: null, from: "" };
  const written = await Records.update(scope, id, (row) => {
    outcome = applyMove(type, row, to, { updatedAt: at });
    return outcome.row;
  });
  if (!written) return { moved: false, problem: "notfound" };
  // Arriving where somebody else already put it is still "already there".
  if (!outcome.moved) return outcome.problem ? { moved: false, problem: outcome.problem } : { moved: false };
  return { moved: true };
}

/**
 * THE STUDIO'S RECORD TYPES, AS GRANTABLE AREAS.
 *
 * TWENTY-TWO REGISTERS THAT ONLY THE OWNER COULD OPEN. `StudioRoles` draws its
 * permission grid from `AREAS`, which is compile-time; an engine key is minted
 * from a ROW, so it can never be in that list and the screen could not offer
 * one. No archetype holds an `engine.*` key either. So every register the engine
 * has ever planted — transmittals, RFIs, submittals, NCRs, audits, incidents,
 * permits, toolbox talks, equipment, maintenance, calibration, service orders,
 * maintenance contracts, PM plans, installed base, deliveries, trips, vehicles,
 * work orders, BOMs, work stations, production batches — was reachable by the
 * owner and Admin and by nobody else, in six sections. A right nothing can
 * grant is the same bug as a right nothing can exercise (invariant 16), one
 * step further out.
 *
 * PROJECTED, NOT DECLARED. These are `Area`-shaped at runtime and are NEVER
 * added to `ALL_PERMISSIONS`: that list is a closed compile-time set and
 * `isEnginePermission` is the one place it stops being closed. The screen
 * renders whatever `areas` it is handed, so nothing there needed to learn a
 * second shape.
 *
 * UNFILTERED, UNLIKE `listRecordTypes`. That reader hands back only the types
 * the CALLER may view, which is right for a catalogue somebody is browsing and
 * exactly wrong here: the point of this screen is to grant a right nobody holds
 * yet, so filtering by what the granter already holds would make a type
 * ungrantable until somebody had already been granted it. What is exposed is a
 * type's LABEL and its section — studio configuration, no records — read on the
 * same terms as the role and department names this route already returns, and
 * `escalates()` still refuses a granter handing out what they do not hold.
 */
export async function grantableTypeAreas(
  ctx: { studio: StudioRef; sections: Section[] },
  locale: string,
  // WHICH SECTIONS ARE SWITCHED ON. A register under a department the studio
  // has switched off is left out, as that department's own areas are.
  on: (sectionKey: string) => boolean = () => true,
): Promise<Area[]> {
  // CAUGHT UP FIRST: the Access screen is where a new register becomes
  // grantable, and it must not wait for somebody to open an engine screen.
  const sections = await seedBuiltinTypes(String(ctx.studio.id), ctx.sections);
  const settingsSection = sections.find((s) => s.key === "administration-settings");
  if (!settingsSection) return [];

  const types = await Types.find({ studio: ctx.studio, section: settingsSection });
  return types
    .filter((t) => on(t.parentSectionKey) && (!t.sectionKey || on(t.sectionKey)))
    .map((t) => {
    // GROUPED UNDER THE SECTION THE REGISTER LIVES IN, so a studio finds NCRs
    // beside the rest of Quality & HSE rather than in a bucket called "Engine".
    // The stored section name is the fallback, and `sectionName` translates the
    // seeded keys — the same call every other surface makes.
    const parent = sections.find((s) => s.key === t.parentSectionKey);
    return {
      key: `engine.${t.key}`,
      group: sectionName(t.parentSectionKey, parent?.name || t.parentSectionKey, locale),
      // A TYPE'S LABEL IS WHAT THE STUDIO TYPED, so it is NOT translated —
      // the same rule section names, client names and service actions follow.
      label: t.label,
      verbs: ["view", "create", "edit", "delete"],
    } as Area;
  });
}

export async function listRecordTypes(ctx: EngineCallerContext) {
  const scope = { studio: ctx.studio, section: ctx.settingsSection };
  const types = await Types.find(scope);
  // FILTERED, NOT REFUSED. The catalogue is studio configuration — labels,
  // fields, transitions, section keys — so a caller sees only the types they
  // hold `engine.<key>.view` for. Someone with no engine right at all is not
  // an error case: an empty catalogue is the truthful answer for a reader
  // entitled to nothing, the same way a list route hands back no rows rather
  // than a refusal to someone who may see none of them.
  return { types: types.filter((t) => !requirePermission(ctx.access, `engine.${t.key}.view`)) };
}

/**
 * WHAT THE `reference` FIELDS ON THESE ROWS ARE POINTING AT.
 *
 * A `reference` field has been a declared field kind since the engine shipped —
 * `refType` names the type it points at, and `typeProblem` refuses a declaration
 * without one. NOTHING EVER READ IT. The server returned the stored string and
 * the register drew it in a text box, so a link between two records was a
 * hand-typed id that nobody could follow and nothing could check. This is the
 * half that was missing.
 *
 * ONE READ PER REFERENCED TYPE, not one per row. A register of two hundred NCRs
 * each naming an inspection is one read of the inspection register, not two
 * hundred — the same argument `clientNameById` makes in the engagement list.
 *
 * THE READER'S OWN RIGHTS DECIDE WHAT COMES BACK, and this is the part that
 * matters. Somebody may hold `engine.ncr.view` and not `engine.inspection.view`;
 * resolving the title anyway would leak the contents of a register they were
 * refused, through a field on one they were allowed. So a type the reader cannot
 * open is not read at all — it costs no round trip either — and its targets come
 * back `{ readable: false }`. The screen shows that a link exists without saying
 * what is on the other end, which is the truth rather than a blank.
 *
 * A DANGLING TARGET IS NOT AN ERROR. The record it named may have been deleted,
 * and nothing stops that: validating on write would not help, because deletion
 * happens afterwards. Containment lives in the reader — the same posture
 * `projectBilling` takes towards a milestone id it does not recognise — so an
 * id that resolves to nothing comes back `{ found: false }` and the screen says
 * so instead of rendering a link to a page that is not there.
 */
async function resolveReferences(
  ctx: EngineCallerContext,
  type: { fields?: unknown },
  rows: readonly Row[],
): Promise<Record<string, { reference: string; title: string; found: boolean; readable: boolean }>> {
  const fields = (Array.isArray(type.fields) ? type.fields : []) as { key?: unknown; kind?: unknown; refType?: unknown }[];
  const refFields = fields.filter((f) => String(f?.kind) === "reference" && String(f?.refType || ""));
  if (!refFields.length) return {};

  // Which ids are wanted, grouped by the type they point at. A field whose
  // every row is blank asks for nothing.
  const wanted = new Map<string, Set<string>>();
  for (const f of refFields) {
    const target = String(f.refType);
    for (const row of rows) {
      const id = String((row.values as Record<string, unknown> | undefined)?.[String(f.key)] ?? "").trim();
      if (!id) continue;
      if (!wanted.has(target)) wanted.set(target, new Set());
      wanted.get(target)!.add(id);
    }
  }
  if (!wanted.size) return {};

  const out: Record<string, { reference: string; title: string; found: boolean; readable: boolean }> = {};
  for (const [targetKey, ids] of wanted) {
    // ASKED BEFORE READ. A refusal here is not an error — it is the answer.
    if (requirePermission(ctx.access, `engine.${targetKey}.view`)) {
      for (const id of ids) out[id] = { reference: "", title: "", found: false, readable: false };
      continue;
    }
    const { scope } = await typeFor(ctx, targetKey);
    if (!scope) {
      for (const id of ids) out[id] = { reference: "", title: "", found: false, readable: true };
      continue;
    }
    const targetRows = await Records.find(scope, { where: { typeKey: targetKey } });
    const byId = new Map(targetRows.map((r) => [String(r.id), r]));
    for (const id of ids) {
      const hit = byId.get(id);
      out[id] = hit
        ? { reference: String(hit.reference || ""), title: titleOf(hit), found: true, readable: true }
        : { reference: "", title: "", found: false, readable: true };
    }
  }
  return out;
}

/**
 * WHAT A REGISTER TELLS PEOPLE, after a write has landed (28/09/2026).
 *
 * TWO THINGS, both declared on the TYPE rather than coded per register, so a
 * studio's own register gets them the day it declares the field or the flag:
 *
 *   A PERSON FIELD (`collaborator`) naming somebody new tells them — the NCR's
 *   owner, the incident's investigator. Gated on `engine.<type>.view`: a person
 *   named on a register they may not read is told nothing.
 *
 *   `announce: true` on the type tells everyone who may EDIT the register that a
 *   record was raised — an incident reported, an NCR raised by hand or by a rule
 *   off a failed test. Not the person who raised it; they know.
 *
 * AFTER THE WRITE AND NEVER INSIDE A PATCH, for runRulesForMove's reason: a
 * patch function may run more than once, and a notice would go once per run.
 * Best-effort, like every notice — both helpers swallow their own failures.
 */
async function announceRecord(
  ctx: EngineCallerContext, type: RecordType, record: Row, before: Record<string, unknown> | null,
) {
  const values = (record.values || {}) as Record<string, unknown>;
  const reference = String(record.reference || "");
  const title = titleOf(record);
  const register = String(type.label || type.key);
  const facts = { register, reference, title };
  const body = [register, reference, title].filter(Boolean).join(" · ");
  const href = String(type.sectionKey || engineSectionKey(type.key));

  for (const f of (type.fields || []).filter((x) => x.kind === "collaborator")) {
    await notifyNewlyAssigned(ctx.studio.id, {
      before: before ? [before[f.key]] : [],
      after: [values[f.key]],
      actorId: ctx.collaborator.id,
      right: `engine.${type.key}.view`,
      notice: { type: NOTIFY.recordAssigned, title: "A record was assigned to you", body, params: facts, href, tone: "primary" },
    });
  }
  if (!before && (type as { announce?: boolean }).announce) {
    await notifyHolders(ctx.studio.id, `engine.${type.key}.edit`, {
      type: NOTIFY.recordRaised, title: "A record was raised", body, params: facts, href, tone: "warning",
    }, [ctx.collaborator.id]);
  }
}

/**
 * A ROW IN ONE LINE, for the far end of a link.
 *
 * The FIRST text-ish value the row carries, because a record type is a studio's
 * own declaration and there is no field the engine can insist on being the
 * title. Falling back to the reference alone would make every link in a register
 * read "NCR-0007" with nothing to tell them apart.
 */
function titleOf(row: Row): string {
  const values = (row.values || {}) as Record<string, unknown>;
  for (const v of Object.values(values)) {
    const text = String(v ?? "").trim();
    if (text && text.length <= 120) return text;
  }
  return "";
}

export async function listRecords(ctx: EngineCallerContext, typeKey: string) {
  const { scope, type } = await typeFor(ctx, typeKey);
  // NOTFOUND BEFORE FORBIDDEN, deliberately — AND NOT FOR THE REASON THIS ONCE
  // GAVE. It said answering "forbidden" would hide which type keys exist; the
  // ordering does the opposite, and the inverted claim is corrected rather than
  // deleted. A member holding no engine right gets 404 for an absent type and
  // 403 for a present one, so the two answers together enumerate the studio's
  // types. That costs nothing: MEMBERSHIP is the boundary (invariant 2), and a
  // member is already handed the studio's section list with every engine
  // sub-section in it.
  //
  // WHAT THE ORDER IS FOR: a type that does not exist is not a permission
  // question. `forbidden` would send the caller to ask for a right that would
  // not have helped — the fix is the URL, not a grant. `context.ts` carries the
  // long version, beside the guard it justifies removing.
  if (!type) return { error: "notfound" as const };

  const denied = requirePermission(ctx.access, `engine.${typeKey}.view`);
  if (denied) return denied;
  if (!scope) return { error: "no-section" as const };

  const [rows, people] = await Promise.all([
    Records.find(scope, { where: { typeKey } }),
    listCollaborators(ctx.studio.id),
  ]);
  const aliasOf = new Map(
    (people as { id?: unknown; alias?: unknown }[])
      .map((c) => [String(c?.id ?? ""), String(c?.alias ?? "")] as const),
  );

  // AFTER the rows, because it is derived from them, and awaited separately
  // rather than joined into the Promise.all above: it needs `rows` to know which
  // ids to ask for at all.
  const references = await resolveReferences(ctx, type, rows);

  // THE PEOPLE A PERSON FIELD MAY NAME, for its picker — sent only when the type
  // has one. `collaborator` was a text box for a hand-typed id until 28/09/2026,
  // which nobody could fill and nothing could notify. Names only, the same
  // `alias` `createdByAlias` already shows every reader of this register.
  const hasPersonField = (type.fields || []).some((f) => f.kind === "collaborator");
  const pickable = hasPersonField
    ? (people as { id?: unknown; alias?: unknown }[])
      .map((c) => ({ id: String(c?.id ?? ""), name: String(c?.alias ?? "") }))
      .filter((p) => p.id)
    : undefined;

  return {
    type,
    references,
    ...(pickable ? { people: pickable } : {}),
    records: [...rows]
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .map((r) => ({
        ...r,
        // READ THROUGH THE TYPE AS IT IS NOW. A field the type no longer
        // declares is not returned and not deleted.
        values: coerceRecord(type, r.values || {}),
        createdByAlias: aliasOf.get(String(r.createdByCollaboratorId || "")) || "",
      })),
    canCreate: !requirePermission(ctx.access, `engine.${typeKey}.create`),
    canEdit: !requirePermission(ctx.access, `engine.${typeKey}.edit`),
    canDelete: !NEVER_DELETED.has(typeKey) && !requirePermission(ctx.access, `engine.${typeKey}.delete`),
  };
}

/** The values half of a write body, before the declaration is applied to it. */
const valuesIn = (body: Record<string, unknown>) =>
  (body?.values || {}) as Record<string, unknown>;

export async function createRecord(
  ctx: EngineCallerContext, typeKey: string, body: Record<string, unknown>,
) {
  const { scope, type } = await typeFor(ctx, typeKey);
  if (!type) return { error: "notfound" as const };

  const denied = requirePermission(ctx.access, `engine.${typeKey}.create`);
  if (denied) return denied;
  if (!scope) return { error: "no-section" as const };

  // REFUSED BEFORE A REFERENCE IS MINTED. `nextReference` only moves forward
  // (invariant 10), so a create that fails validation after taking a number
  // burns one — and a client holding TRA-0002 with no TRA-0001 anywhere is a
  // question nobody can answer.
  const values = mergeRecord(type, {}, valuesIn(body));
  const problem = recordProblem(type, values);
  if (problem) return { error: problem };

  const rows = await Records.find(scope, { where: { typeKey } });
  const at = now();
  const record = await Records.create(scope, {
    reference: await nextReference(ctx.studio.id, {
      rows, field: "reference", prefix: prefixOf(typeKey),
    }),
    typeKey,
    typeVersion: type.version,
    // THE FIRST DECLARED STATUS. A record born outside the chain could never
    // move, because every transition names a `from`.
    status: (type.statuses || [])[0] || "",
    // NOTHING IS STORED YET, so this is the declaration's own keys and no
    // more — `mergeRecord` with an empty left-hand side is `coerceRecord`.
    values,
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: at,
    updatedAt: at,
  });
  await announceRecord(ctx, type, record as Row, null);
  return { record };
}

export async function editRecord(
  ctx: EngineCallerContext, typeKey: string, id: string, body: Record<string, unknown>,
) {
  const { scope, type } = await typeFor(ctx, typeKey);
  if (!type) return { error: "notfound" as const };

  const denied = requirePermission(ctx.access, `engine.${typeKey}.edit`);
  if (denied) return denied;
  if (!scope) return { error: "no-section" as const };

  const existing = await Records.byId(scope, id);
  if (!existing || existing.typeKey !== typeKey) return { error: "notfound" as const };

  // ASKED OF WHAT THE EDIT WOULD PRODUCE, not of the body: a required field the
  // caller left out of the body is still filled if the row already holds it,
  // and only a merge knows that. Asked against `existing` rather than inside
  // the patch because a refusal must be an answer, and a patch function's job
  // is to return a row — it has nowhere to put a refusal.
  const problem = recordProblem(
    type, mergeRecord(type, (existing.values || {}) as Record<string, unknown>, valuesIn(body)),
  );
  if (problem) return { error: problem };

  // READ ONCE, OUTSIDE THE PATCH. A patch FUNCTION may run more than once — once
  // per contended round, and once per store under NOMPANY_DB=parity — so a fresh
  // `new Date()` inside it produces a different answer on each invocation. Under
  // parity that is a hard failure: `updateRow` compared the two representations
  // and found them two milliseconds apart, which is what "parity: updateRow
  // disagreed" was. Same rule and same reason as `chase.ts`, which states it.
  const at = now();

  const record = await Records.update(scope, id, (row) => ({
      ...row,
      // MERGED ONTO WHAT IS STORED, not rebuilt from the declaration. A field
      // the type has since dropped survives the edit; `mergeRecord` carries the
      // argument, and `coerceRecord` on the read is its other half.
      //
      // MERGED INSIDE THE PATCH FUNCTION, off `row` rather than off `existing`
      // above — invariant 8. `existing` is read to answer "does this record
      // exist and is it this type", which is a question a later write cannot
      // falsify; what a merge lays its values over must be the row the
      // compare-and-set actually won, or the merge is a read-then-write race
      // that loses whatever landed in between.
      values: mergeRecord(type, (row.values || {}) as Record<string, unknown>, valuesIn(body)),
      // RE-STAMPED ON WRITE. The row now conforms to the type as it is, which
      // is what the version means: what it was written under.
      typeVersion: type.version,
      updatedAt: at,
    }));
  // Told against the row as it was READ: somebody put on the record by this
  // edit hears about it; somebody already on it does not.
  if (record) await announceRecord(ctx, type, record as Row, (existing.values || {}) as Record<string, unknown>);
  return { record };
}

/**
 * A STATUS MOVE, and it is its own act rather than a field on the edit — the
 * shape that let a rejected change order approve itself was an answer routed
 * through a generic write.
 */
/**
 * THE CONSEQUENCES OF A MOVE, RUN AFTER IT LANDS.
 *
 * ------------------------------------------------------------------------
 * WHOSE AUTHORITY A RULE RUNS WITH, which is the only hard question here
 * ------------------------------------------------------------------------
 * The inspector who rejects a test holds `engine.testreport.edit`. They almost
 * certainly do NOT hold `engine.ncr.create` — raising a nonconformance is a
 * quality manager's act. If the rule needed the actor's right it would never
 * fire for the people who actually trigger it, which is the whole feature.
 *
 * So a rule runs with the STUDIO's authority, not the actor's, and the
 * justification is that the rule is the studio's act: somebody holding
 * `administration.settings.edit` declared that a rejected test raises an NCR,
 * and the actor merely supplied the trigger. It is the same shape as the
 * notification a write sends or the aggregate it bumps — a consequence the
 * writer did not individually authorise and did not individually choose.
 *
 * THE ESCALATION IS CLOSED AT THE OTHER DOOR. Declaring a rule that creates in a
 * register must require the right to create there — invariant 5's shape, asked
 * of the person writing the rule rather than of everyone who later trips it.
 * There is no such door yet: `Types.create` has exactly one caller,
 * `seedBuiltinTypes`, so every rule in the product today is one this repository
 * declared. When the type editor lands, `ruleProblem` is where its refusal goes
 * and this comment is the reason it must.
 *
 * A FAILED CONSEQUENCE DOES NOT UNDO THE MOVE. The test really was rejected;
 * refusing the move because the NCR could not be made would lose the fact that
 * matters to keep the one derived from it. So this returns what it did and what
 * it could not do, and the caller reports both.
 */
async function runRulesForMove(
  ctx: EngineCallerContext,
  type: RecordType,
  source: Row,
  from: string,
  to: string,
): Promise<{ raised: { typeKey: string; reference: string }[] }> {
  const fired = rulesFiredBy(type as unknown as { rules?: unknown }, from, to);
  const raised: { typeKey: string; reference: string }[] = [];

  for (const rule of fired) {
    const targetKey = String(rule?.then?.create?.typeKey ?? "");
    const { scope: targetScope, type: targetType } = await typeFor(ctx, targetKey);
    // A TARGET THE STUDIO DOES NOT HOLD IS NOT AN ERROR HERE. A studio may have
    // the inspection register and not the NCR register — `seedBuiltinTypes`
    // seeds what is missing and a studio can be short of either — and a rule
    // that cannot fire is quieter than a move that refuses.
    if (!targetType || !targetScope) continue;

    const existing = await Records.find(targetScope, { where: { typeKey: targetKey } });
    if (alreadyRaised(rule, String(source.id), existing)) continue;

    const values = coerceRecord(targetType, newRecordValues(rule, source));
    // ASKED BEFORE WRITTEN, the same order `createRecord` uses: `nextReference`
    // only moves forward (invariant 10), so a create that fails validation after
    // taking a number burns one.
    if (recordProblem(targetType, values)) continue;

    const at = now();
    const made = await Records.create(targetScope, {
      reference: await nextReference(ctx.studio.id, {
        rows: existing, field: "reference", prefix: prefixOf(targetKey),
      }),
      typeKey: targetKey,
      typeVersion: targetType.version,
      status: (targetType.statuses || [])[0] || "",
      values,
      // THE PERSON WHO TRIPPED IT, not a system id. They caused it, the record
      // is about their work, and an audit trail naming "the system" answers
      // nobody's question about who to ask.
      createdByCollaboratorId: ctx.collaborator.id,
      createdAt: at,
      updatedAt: at,
    });

    // CHECKED AGAIN AFTER THE CREATE, because the read above and the create are
    // two steps the store cannot make one. `raisedEarlierByAnother` says why,
    // and what window is still open. A withdrawn record has taken a reference
    // number that is not reissued (invariant 10): a gap in NCR numbers is the
    // honest trace of two writers racing, and a duplicate NCR is not.
    const after = await Records.find(targetScope, { where: { typeKey: targetKey } });
    if (raisedEarlierByAnother(rule, String(source.id), made, after)) {
      await Records.remove(targetScope, String(made.id));
      continue;
    }
    // A RECORD A RULE RAISED IS ANNOUNCED LIKE ONE RAISED BY HAND — the failed
    // test's NCR used to appear in the register with nobody told it was there.
    // Only after the race check above, so a withdrawn duplicate rings nobody.
    await announceRecord(ctx, targetType, made as Row, null);
    raised.push({ typeKey: targetKey, reference: String(made.reference || "") });
  }
  return { raised };
}

export async function moveRecord(
  ctx: EngineCallerContext, typeKey: string, id: string, to: string,
) {
  const { scope, type } = await typeFor(ctx, typeKey);
  if (!type) return { error: "notfound" as const };

  const denied = requirePermission(ctx.access, `engine.${typeKey}.edit`);
  if (denied) return denied;
  if (!scope) return { error: "no-section" as const };

  const existing = await Records.byId(scope, id);
  if (!existing || existing.typeKey !== typeKey) return { error: "notfound" as const };

  const problem = transitionProblem(type, existing.status, to);
  if (problem) return { error: problem };

  // Read once, outside the patch — see the note in editRecord above.
  const at = now();

  // THE TRANSITION IS ASKED AGAIN INSIDE THE PATCH (invariant 8). The check
  // above answers for the row as it was read, and a second move landing in
  // between used to be overwritten by this one whether or not the move still
  // held — `applyMove` carries the whole story. `outcome` is set by every
  // invocation and the LAST is the attempt the compare-and-set kept.
  let outcome: MoveOutcome = { row: existing, moved: false, problem: null, from: "" };
  const record = await Records.update(scope, id, (row) => {
    outcome = applyMove(type, row, to, { updatedAt: at });
    return outcome.row;
  });
  if (!record) return { error: "notfound" as const };

  if (!outcome.moved) {
    // SOMEBODY ELSE ALREADY PUT IT WHERE THIS CALLER ASKED — a double submit,
    // or two people agreeing. The status they wanted holds, so it is not an
    // error; but THIS call changed nothing, so it fires nothing either.
    if (!outcome.problem) return { record, raised: [] };
    // THE RECORD MOVED UNDERNEATH THE CALLER to a status this move does not
    // leave from. `wrong-state` (409) rather than the declaration's own
    // `not-allowed`: the request was fine when it was made, and re-reading the
    // record is the whole repair.
    return { error: "wrong-state" as const };
  }

  // AFTER THE MOVE, NEVER INSIDE THE PATCH. `Records.update` takes a FUNCTION
  // and may run it more than once — once per contended round (invariant 8) —
  // so a rule fired from inside would raise one NCR per attempt. And ONLY for a
  // write that changed the status, from the status it really left: a second
  // caller whose move turned out to be a no-op must not raise a second NCR.
  const { raised } = await runRulesForMove(ctx, type, record as Row, outcome.from, str(to, 60));

  return { record, raised };
}

export async function removeRecord(ctx: EngineCallerContext, typeKey: string, id: string) {
  const { scope, type } = await typeFor(ctx, typeKey);
  if (!type) return { error: "notfound" as const };

  const denied = requirePermission(ctx.access, `engine.${typeKey}.delete`);
  if (denied) return denied;
  if (!scope) return { error: "no-section" as const };

  const existing = await Records.byId(scope, id);
  if (!existing || existing.typeKey !== typeKey) return { error: "notfound" as const };
  if (NEVER_DELETED.has(typeKey)) return { error: "controlled" as const };

  await Records.remove(scope, id);
  return { removed: id };
}
