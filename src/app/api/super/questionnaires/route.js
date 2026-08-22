import { route } from "@/platform/http/route";
import { listQuestionnaires, createQuestionnaireDef, duplicateQuestionnaireDef } from "@/lib/data/questionnaires";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Questionnaire DEFINITIONS. Console-only: every route here runs on a valid
// super-admin session, the same claim the console shell verifies.
const spec = { auth: "super", name: "super/questionnaires" };

export const GET = route(spec, async () => {
  // The list screen wants a summary per row, not every question in every form.
  const questionnaires = (await listQuestionnaires()).map((q) => ({
    id: q.id, name: q.name, route: q.route || "", status: q.status || "draft",
    pages: (q.pages || []).length,
    questions: (q.pages || []).reduce((n, p) => n + (p.questions || []).length, 0),
    responses: q.responses || 0, completed: q.completed || 0,
    createdAt: q.createdAt, updatedAt: q.updatedAt,
  }));
  return { questionnaires };
});

export const POST = route({ ...spec, body: true }, async ({ admin, body }) => {
  if (body.duplicateOf) {
    const copy = await duplicateQuestionnaireDef(String(body.duplicateOf), admin.id);
    if (!copy) return { error: "notfound" };
    return { status: 201, body: { ok: true, questionnaire: copy } };
  }

  const created = await createQuestionnaireDef({ name: body.name, route: body.route, createdBy: admin.id });
  return { status: 201, body: { ok: true, questionnaire: created } };
});
