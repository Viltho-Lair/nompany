import { route } from "@/platform/http/route";
import {
  getQuestionnaireById, updateQuestionnaireDef, deleteQuestionnaireDef,
} from "@/lib/data/questionnaires";
import { deleteResponsesFor } from "@/lib/data/questionnaireResponses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "super", body: true, name: "super/questionnaires/[id]" };

export const GET = route({ ...spec, body: false }, async ({ params }) => {
  const row = await getQuestionnaireById(params.id);
  if (!row) return { error: "notfound" };
  return { questionnaire: row };
});

export const PUT = route(spec, async ({ params, body }) => {
  // Pages arrive whole from the builder — it holds the document and saves it in
  // one piece, so there is no partial-page merge to get wrong.
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 120);
  if (typeof body.route === "string") patch.route = body.route.trim().slice(0, 200);
  if (typeof body.status === "string") patch.status = body.status === "live" ? "live" : "draft";
  if (Array.isArray(body.pages)) patch.pages = body.pages;
  if (Object.keys(patch).length === 0) return { error: "nothing" };

  const updated = await updateQuestionnaireDef(params.id, patch);
  if (!updated) return { error: "notfound" };
  return { ok: true, questionnaire: updated };
});

// CHILDREN FIRST, THEN THE ROW (invariant 11), so a cascade that dies halfway
// is idempotent on a re-run. The other order would leave q:<id>:responses with
// nothing naming it: a response key is reachable only FROM a questionnaire id,
// and the user cascade walks the registry to find which ones exist — so a form
// deleted before its answers takes the only route to them with it and strands
// the rows permanently, unreadable and undeletable both.
export const DELETE = route({ ...spec, body: false }, async ({ params }) => {
  if (!(await getQuestionnaireById(params.id))) return { error: "notfound" };
  await deleteResponsesFor(params.id);
  const gone = await deleteQuestionnaireDef(params.id);
  if (!gone) return { error: "notfound" };
  return { ok: true };
});
