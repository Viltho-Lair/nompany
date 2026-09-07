import { route, refused } from "@/platform/http/route";
import { moduleContext } from "@/modules/context";
import {
  listRecords, createRecord, editRecord, moveRecord, removeRecord,
} from "@/platform/engine/records";
import type { ModuleContext } from "@/modules/context";
import type { Section } from "@/platform/db/sections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * WHAT THE ENGINE'S SERVICE NEEDS, and it is Administration's context because
 * that is where the two engine collections live: `recordTypes` and
 * `engineRecords` sit under `administration-settings` (keys.ts), so one scope
 * serves a type declaration and every instance of it.
 *
 * The section here is STORAGE, not the screen. A type's own sub-section is
 * planted under whatever parent it declares — `engineering-docs` for the
 * built-in — and the right that opens it is `engine.<typeKey>.view`, asked in
 * the service. This context resolves where the rows are; it decides nothing
 * about who may read them.
 */
type EngineContext = ModuleContext & { settingsSection: Section };

// ONE ROUTE FOR EVERY DECLARED TYPE. The type comes from the URL segment and
// never from the body, which is what makes `engine.<typeKey>.<verb>` mean
// something: a request cannot name a type it is not addressed to.
const engineContext = moduleContext<EngineContext>({
  root: "administration",
  sub: { settings: "administration-settings" },
});

const spec = { auth: "studio", context: engineContext, body: true, name: "records" };

// THE SEGMENT NEXT ALREADY RESOLVED, not the URL parsed a second time. `params`
// is on every handler's argument (the wrapper awaits it before anything else),
// and re-deriving the same segment from `request.url` would be a second answer
// to a question that already has one — the pattern `c.params.projectId` and
// `c.params.planId` follow.
const typeKeyOf = (params: Record<string, string> | undefined): string =>
  String(params?.typeKey || "");

export const GET = route<EngineContext>({ ...spec, body: false }, async (engine) => {
  const result = await listRecords(engine, typeKeyOf(engine.params));
  if (refused(result)) return result;
  return {
    ok: true,
    // THE DECLARATION TRAVELS WITH THE ROWS. The screen is generic, so it has
    // no other way to know what columns to draw or what moves to offer.
    type: result.type,
    records: result.records,
    canCreate: result.canCreate,
    canEdit: result.canEdit,
    canDelete: result.canDelete,
  };
});

export const POST = route<EngineContext>(spec, async (engine) => {
  const result = await createRecord(engine, typeKeyOf(engine.params), engine.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, record: result.record } };
});

export const PUT = route<EngineContext>(spec, async (engine) => {
  if (!engine.body.id) return { error: "missing" };
  const typeKey = typeKeyOf(engine.params);
  const id = String(engine.body.id);

  // MOVING IS ITS OWN BRANCH AND ITS OWN ACT, never a status written through
  // the edit path. `editRecord` takes the declared FIELDS off the body and
  // nothing else, so a status cannot arrive that way even if somebody sends
  // one — the branch is what makes the rule visible rather than incidental.
  if (engine.body.action === "move") {
    const moved = await moveRecord(engine, typeKey, id, String(engine.body.to || ""));
    if (refused(moved)) return moved;
    return { ok: true, record: moved.record };
  }

  const result = await editRecord(engine, typeKey, id, engine.body);
  if (refused(result)) return result;
  return { ok: true, record: result.record };
});

export const DELETE = route<EngineContext>(spec, async (engine) => {
  if (!engine.body.id) return { error: "missing" };
  const result = await removeRecord(engine, typeKeyOf(engine.params), String(engine.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
