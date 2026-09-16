import { currentUser, saveQuestionnaire, getQuestionnaire } from "@/platform/auth/identity";
import { getQuestionnaireByRoute } from "@/lib/data/questionnaires";
import { recordResponse } from "@/lib/data/questionnaireResponses";
import { REGISTRATION_ROUTE, fieldOf } from "@/lib/questionnaire";
import { allQuestions, prunedAnswers, visibleIds } from "@/lib/questionnaireLogic";
import type { LogicPage } from "@/lib/questionnaireLogic";
import { log } from "@/platform/http/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The user's personal questionnaire — 1:1, stored under u:<UserID>:questionnaire
// and reachable by nobody else.
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json((await getQuestionnaire(user.id)) || {});
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }

  // WHICH FORM THIS ANSWERS, resolved on the SERVER from the route it was asked
  // at — never taken from the body. A client-named questionnaire id would let
  // anybody file a reply against any form on the platform, which is a made-up
  // row in somebody else's analysis for the cost of one fetch.
  //
  // `ensureQuestionnaireForRoute` is the page's job, not this one: by the time
  // anything is submitted the form has been rendered, so it exists. A lookup
  // here plants nothing and answers null if it somehow does not, which costs
  // the response record and saves the registration.
  const def = await getQuestionnaireByRoute(REGISTRATION_ROUTE);
  const authored = def?.pages;
  const pages = (Array.isArray(authored) ? authored : []) as LogicPage[];

  // BRANCHING IS PRUNED SERVER-SIDE TOO, not merely on the screen. The flow
  // already drops answers to questions a later change hid, and re-doing it here
  // is not distrust of the browser so much as the same rule applied where the
  // record is actually written — a body posted by anything other than the flow
  // gets the same treatment.
  const answers = pages.length ? prunedAnswers(pages, body) : body;
  // Computed once — `visibleIds` walks every rule to a fixed point, and calling
  // it per question inside a filter would make one submission quadratic in the
  // size of the form.
  const visible = visibleIds(pages, answers);
  const shown = allQuestions(pages).filter((q) => q.id && visible.has(String(q.id)));

  const result = await saveQuestionnaire(user.id, answers, { questionnaireId: String(def?.id || "") });
  if (result.error) return Response.json({ error: result.error }, { status: 400 });

  // THE ANALYSIS COPY. Filed under the form so somebody can ask what people
  // said to question three — the thing a questionnaire is for, and the thing
  // nothing in this product could do until now.
  //
  // FAILING TO RECORD IT MUST NOT FAIL THE REGISTRATION. The person's own
  // answers are already saved and the onboarding gate is already open; losing
  // the analysis row is a reporting gap, and taking somebody's account hostage
  // to it would be the wrong trade in both directions. Logged loudly, because
  // the alternative — a silent drop — is the exact bug this whole change exists
  // to fix.
  if (def?.id) {
    try {
      await recordResponse({
        questionnaireId: String(def.id),
        userId: user.id,
        email: user.email,
        answers: result.questionnaire?.answers || {},
        // The questions AS ASKED, so a reply survives the form being reworded
        // or the question being deleted. Only the ones actually SHOWN — by
        // visibility, not by whether a value came back: a question somebody
        // was put and left blank was still put to them, and a question the
        // branching hid was not. Deriving it from the answer keys would
        // conflate the two and call an unanswered question one that was never
        // asked, which is the exact distinction the summary screen reports.
        asked: shown
          .map((q) => ({ field: fieldOf(q), label: String(q.label || ""), type: String(q.type || "") })),
        definitionUpdatedAt: String(def.updatedAt || ""),
      });
    } catch (e) {
      log.error(`[questionnaire] response not recorded for ${user.id}: ${(e as Error).message}`);
    }
  }

  return Response.json({ ok: true, questionnaire: result.questionnaire });
}
