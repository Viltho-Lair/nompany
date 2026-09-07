// THE RECORD ENGINE'S SERVICE. One implementation for every declared type.
//
// THE PERMISSION IS THE TYPE'S OWN, and the type comes from the URL rather than
// the body: `engine.<typeKey>.<verb>`. A grant for one type opens exactly that
// type, and a grant naming a type that does not exist opens nothing.
//
// THE RULES ARE IN ./types, which is pure. Nothing is decided here.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { listCollaborators } from "@/platform/auth/collaborators";
import { transitionProblem, coerceRecord, coerceValue } from "./types";
import type { RecordType, EngineRecord, FieldDecl } from "./schema";
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
};

/**
 * THE TYPE, AND THE SECTION ITS ROWS LIVE IN. Both collections sit under the
 * studio-settings section, so one scope serves types and instances alike.
 */
async function typeFor(ctx: EngineCallerContext, typeKey: string) {
  const scope = { studio: ctx.studio, section: ctx.settingsSection };
  const types = await Types.find(scope);
  return { scope, type: types.find((t) => t.key === typeKey) || null };
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

/** Every declared field, taken from the body and nothing else carried through. */
function valuesFrom(type: RecordType, body: Record<string, unknown>) {
  const raw = (body?.values || {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const f of (type.fields || []) as FieldDecl[]) {
    out[f.key] = coerceValue(f, raw[f.key]);
  }
  return out;
}

export async function createRecord(
  ctx: EngineCallerContext, typeKey: string, body: Record<string, unknown>,
) {
  const { scope, type } = await typeFor(ctx, typeKey);
  if (!type) return { error: "notfound" as const };

  const denied = requirePermission(ctx.access, `engine.${typeKey}.create`);
  if (denied) return denied;

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
      values: valuesFrom(type, body),
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

  const existing = await Records.byId(scope, id);
  if (!existing || existing.typeKey !== typeKey) return { error: "notfound" as const };

  return {
    record: await Records.update(scope, id, (row) => ({
      ...row,
      values: valuesFrom(type, body),
      // RE-STAMPED ON WRITE. The row now conforms to the type as it is, which
      // is what the version means: what it was written under.
      typeVersion: type.version,
      updatedAt: now(),
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

  const existing = await Records.byId(scope, id);
  if (!existing || existing.typeKey !== typeKey) return { error: "notfound" as const };

  const problem = transitionProblem(type, existing.status, to);
  if (problem) return { error: problem };

  return {
    record: await Records.update(scope, id, (row) => ({
      ...row, status: str(to, 60), updatedAt: now(),
    })),
  };
}

export async function removeRecord(ctx: EngineCallerContext, typeKey: string, id: string) {
  const { scope, type } = await typeFor(ctx, typeKey);
  if (!type) return { error: "notfound" as const };

  const denied = requirePermission(ctx.access, `engine.${typeKey}.delete`);
  if (denied) return denied;

  const existing = await Records.byId(scope, id);
  if (!existing || existing.typeKey !== typeKey) return { error: "notfound" as const };

  await Records.remove(scope, id);
  return { removed: id };
}
