import { currentSuperAdmin } from "@/lib/superAuth";
import {
  getQuestionnaireById, updateQuestionnaireDef, deleteQuestionnaireDef,
} from "@/lib/data/questionnaires";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function gate() {
  const admin = await currentSuperAdmin();
  return admin || null;
}

export async function GET(request, ctx) {
  if (!(await gate())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const row = await getQuestionnaireById(id);
  return row ? Response.json({ questionnaire: row }) : Response.json({ error: "notfound" }, { status: 404 });
}

export async function PUT(request, ctx) {
  if (!(await gate())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  // Pages arrive whole from the builder — it holds the document and saves it in
  // one piece, so there is no partial-page merge to get wrong.
  const patch = {};
  if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 120);
  if (typeof body.route === "string") patch.route = body.route.trim().slice(0, 200);
  if (typeof body.status === "string") patch.status = body.status === "live" ? "live" : "draft";
  if (Array.isArray(body.pages)) patch.pages = body.pages;
  if (Object.keys(patch).length === 0) return Response.json({ error: "nothing" }, { status: 400 });

  const updated = await updateQuestionnaireDef(id, patch);
  return updated ? Response.json({ ok: true, questionnaire: updated }) : Response.json({ error: "notfound" }, { status: 404 });
}

export async function DELETE(request, ctx) {
  if (!(await gate())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const gone = await deleteQuestionnaireDef(id);
  return gone ? Response.json({ ok: true }) : Response.json({ error: "notfound" }, { status: 404 });
}
