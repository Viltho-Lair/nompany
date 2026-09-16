import { route } from "@/platform/http/route";
import { listQuestionnaires, createQuestionnaireDef, duplicateQuestionnaireDef } from "@/lib/data/questionnaires";
import { listResponses } from "@/lib/data/questionnaireResponses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Questionnaire DEFINITIONS. Console-only: every route here runs on a valid
// super-admin session, the same claim the console shell verifies.
const spec = { auth: "super", name: "super/questionnaires" };

// A questionnaire's pages arrive off a stored row, so they are unknown until
// read. Named once here rather than cast on each of the two lines below.
const pagesOf = (q: { pages?: unknown }): { questions?: unknown[] }[] =>
  (Array.isArray(q.pages) ? q.pages : []) as { questions?: unknown[] }[];

export const GET = route(spec, async () => {
  // The list screen wants a summary per row, not every question in every form.
  //
  // THE RESPONSE COUNT IS COUNTED, not read off the row. It used to be read off
  // the row, where it was written as 0 at creation and moved by nothing ever —
  // so this column showed "-" for every questionnaire the platform has ever
  // published, including ones hundreds of people had answered. One read per
  // form, on a console screen a handful of people open: the cheapest possible
  // fix and the only one that cannot go stale.
  const rows = await listQuestionnaires();
  const questionnaires = await Promise.all(rows.map(async (q) => {
    const responses = (await listResponses(String(q.id))).length;
    return {
      id: q.id, name: q.name, route: q.route || "", status: q.status || "draft",
      pages: pagesOf(q).length,
      questions: pagesOf(q).reduce((n, p) => n + (p.questions || []).length, 0),
      // Equal today by construction: the flow posts once, at the end, so a
      // response that exists is one that finished. They stay two fields for the
      // day a half-answered survey can be stored.
      responses, completed: responses,
      createdAt: q.createdAt, updatedAt: q.updatedAt,
    };
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
