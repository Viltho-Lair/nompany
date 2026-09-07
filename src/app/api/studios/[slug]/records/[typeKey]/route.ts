import { route, refused } from "@/platform/http/route";
import { engineContext } from "@/platform/engine/context";
import {
  listRecords, createRecord, editRecord, moveRecord, removeRecord,
} from "@/platform/engine/records";
import type { EngineContext } from "@/platform/engine/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE ROUTE FOR EVERY DECLARED TYPE. The type comes from the URL segment and
// never from the body, which is what makes `engine.<typeKey>.<verb>` mean
// something: a request cannot name a type it is not addressed to.
//
// THE ENGINE'S OWN CONTEXT, NOT ADMINISTRATION'S, and the reason is written on
// `platform/engine/context.ts`: `moduleContext`'s section guard refused anybody
// holding only `engine.<typeKey>.view`, which is every reader this route
// exists for. It resolves where the rows live and guards nothing else — the
// per-type gate is in `records.ts`, and a second gate here would be free to
// disagree with it.
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
