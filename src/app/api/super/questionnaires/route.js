import { currentSuperAdmin } from "@/lib/superAuth";
import { listQuestionnaires, createQuestionnaireDef, duplicateQuestionnaireDef } from "@/lib/data/questionnaires";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Questionnaire DEFINITIONS. Console-only: every route here is gated on a valid
// super-admin session, the same claim the console shell verifies.
async function gate() {
  const admin = await currentSuperAdmin();
  return admin || null;
}

export async function GET() {
  const admin = await gate();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  // The list screen wants a summary per row, not every question in every form.
  const rows = (await listQuestionnaires()).map((q) => ({
    id: q.id, name: q.name, route: q.route || "", status: q.status || "draft",
    pages: (q.pages || []).length,
    questions: (q.pages || []).reduce((n, p) => n + (p.questions || []).length, 0),
    responses: q.responses || 0, completed: q.completed || 0,
    createdAt: q.createdAt, updatedAt: q.updatedAt,
  }));
  return Response.json({ questionnaires: rows });
}

export async function POST(request) {
  const admin = await gate();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  if (body.duplicateOf) {
    const copy = await duplicateQuestionnaireDef(String(body.duplicateOf), admin.id);
    return copy
      ? Response.json({ ok: true, questionnaire: copy }, { status: 201 })
      : Response.json({ error: "notfound" }, { status: 404 });
  }
  const created = await createQuestionnaireDef({ name: body.name, route: body.route, createdBy: admin.id });
  return Response.json({ ok: true, questionnaire: created }, { status: 201 });
}
