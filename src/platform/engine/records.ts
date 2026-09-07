// THE RECORD ENGINE'S SERVICE. One implementation for every declared type.
//
// THE PERMISSION IS THE TYPE'S OWN, and the type comes from the URL rather than
// the body: `engine.<typeKey>.<verb>`. A grant for one type opens exactly that
// type, and a grant naming a type that does not exist opens nothing.
//
// THE RULES ARE IN ./types, which is pure. Nothing is decided here.
import { requirePermission, engineSectionKey } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { listCollaborators } from "@/platform/auth/collaborators";
import { transitionProblem, coerceRecord, mergeRecord, recordProblem } from "./types";
import type { RecordType, EngineRecord } from "./schema";
import type { PermissionSet } from "@/platform/access";
import type { StudioRef, CollaboratorRef } from "@/modules/context";
import type { Section } from "@/platform/db/sections";

const Types = repo<RecordType>("recordTypes");
const Records = repo<EngineRecord>("engineRecords");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
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

  return {
    type,
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
    canDelete: !requirePermission(ctx.access, `engine.${typeKey}.delete`),
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
  return {
    record: await Records.create(scope, {
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
    }),
  };
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

  return {
    record: await Records.update(scope, id, (row) => ({
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
    })),
  };
}

/**
 * A STATUS MOVE, and it is its own act rather than a field on the edit — the
 * shape that let a rejected change order approve itself was an answer routed
 * through a generic write.
 */
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

  return {
    record: await Records.update(scope, id, (row) => ({
      ...row, status: str(to, 60), updatedAt: at,
    })),
  };
}

export async function removeRecord(ctx: EngineCallerContext, typeKey: string, id: string) {
  const { scope, type } = await typeFor(ctx, typeKey);
  if (!type) return { error: "notfound" as const };

  const denied = requirePermission(ctx.access, `engine.${typeKey}.delete`);
  if (denied) return denied;
  if (!scope) return { error: "no-section" as const };

  const existing = await Records.byId(scope, id);
  if (!existing || existing.typeKey !== typeKey) return { error: "notfound" as const };

  await Records.remove(scope, id);
  return { removed: id };
}
