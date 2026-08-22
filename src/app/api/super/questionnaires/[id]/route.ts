import { route } from "@/platform/http/route";
import {
  getQuestionnaireById, updateQuestionnaireDef, deleteQuestionnaireDef,
} from "@/lib/data/questionnaires";

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

export const DELETE = route({ ...spec, body: false }, async ({ params }) => {
  const gone = await deleteQuestionnaireDef(params.id);
  if (!gone) return { error: "notfound" };
  return { ok: true };
});
