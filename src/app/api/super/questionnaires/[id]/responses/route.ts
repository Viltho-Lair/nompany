import { route } from "@/platform/http/route";
import { getQuestionnaireById } from "@/lib/data/questionnaires";
import { listResponses } from "@/lib/data/questionnaireResponses";
import { summariseResponses, responsesToCsv } from "@/lib/questionnaireSummary";
import type { LogicPage } from "@/lib/questionnaireLogic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHAT PEOPLE ANSWERED. Console-only, on a valid super-admin session — the same
// claim every other route in this folder makes.
//
// A response carries an email address, which is the one thing here that is
// somebody's personal data rather than the platform's own. That is why there is
// no tenant-facing counterpart to this route and no public one: the questions
// are nompany's, and so is the only door onto the answers.
const spec = { auth: "super", name: "super/questionnaires/[id]/responses" };

// How many raw responses ride along with the summary. The summary is computed
// over ALL of them — it is a tally, so its size does not depend on the number
// of rows — while the table beneath it is paged by this. A form answered by ten
// thousand people must not put ten thousand rows through JSON.stringify to show
// somebody the most recent fifty.
const PAGE = 200;

export const GET = route({ ...spec, body: false }, async ({ request, params }) => {
  const def = await getQuestionnaireById(params.id);
  if (!def) return { error: "notfound" };
  const pages = (Array.isArray(def.pages) ? def.pages : []) as LogicPage[];
  const responses = await listResponses(params.id);

  // THE EXPORT IS THE POINT OF THE FEATURE, not a convenience on top of it: the
  // screen answers the questions somebody already thought to ask, and a
  // spreadsheet answers the rest. Every response goes into it, never the page.
  if (new URL(request.url).searchParams.get("format") === "csv") {
    const name = String(def.name || "questionnaire").replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 60);
    return new Response(responsesToCsv(responses, pages), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name || "questionnaire"}-responses.csv"`,
      },
    });
  }

  return {
    questionnaire: {
      id: def.id,
      name: def.name,
      route: def.route || "",
      status: def.status || "draft",
      updatedAt: def.updatedAt,
    },
    summary: summariseResponses(responses, pages),
    // Newest first — `recordResponse` prepends, so this is already the order
    // they arrived in and no sort is spent restating it.
    responses: responses.slice(0, PAGE).map((r) => ({
      id: r.id,
      email: r.email,
      answers: r.answers,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      // Has the form been edited since this was answered? The screen says so
      // rather than quietly showing old answers under new questions.
      stale: Boolean(r.definitionUpdatedAt && def.updatedAt && r.definitionUpdatedAt !== def.updatedAt),
    })),
    shown: Math.min(responses.length, PAGE),
  };
});
