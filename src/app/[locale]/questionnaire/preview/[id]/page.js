import { notFound } from "next/navigation";
import { currentSuperAdmin } from "@/platform/auth/superAuth";
import { getQuestionnaireById } from "@/lib/data/questionnaires";
import QuestionnaireFlow from "@/components/public/QuestionnaireFlow";
import { getDict } from "@/shared/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Questionnaire preview", robots: { index: false, follow: false } };

// THE TESTING ROUTE. An author walks their own form exactly as somebody
// registering would, and nothing is written.
//
// IT LIVES UNDER `/[locale]/questionnaire`, NOT UNDER `/super`, and that is the
// whole reason it is worth having. A preview inside the console would inherit
// the console's chrome, the console's theme and the console's width — so it
// would answer "do my rules work" and quietly fail to answer "what does this
// actually look like", which is half of what somebody opens a preview for. Here
// it is the same segment, the same layout and the same component the real
// survey uses; the only difference is the band across the top and the fact that
// the end of the run is a report instead of a write.
//
// AND IT IS THE ANSWER TO "an author can break registration". They still can —
// that is correct, and the owner's call: a form structured wrongly should be
// allowed to be wrong while it is being built. What must not happen is that
// nobody finds out until a stranger is stuck on it. The builder says whether a
// clear path EXISTS (`registrationProblems`); this proves a particular path
// works by walking it.
//
// SUPER-ADMIN ONLY, and a 404 rather than a redirect for everybody else: an
// unpublished questionnaire is nompany's own draft, and a signed-out stranger
// should not learn that an id exists, let alone read the questions on it.
export default async function QuestionnairePreviewPage({ params }) {
  const admin = await currentSuperAdmin();
  if (!admin) notFound();

  const { locale, id } = await params;
  const def = await getQuestionnaireById(id);
  if (!def) notFound();

  return (
    <QuestionnaireFlow
      preview
      locale={locale}
      dict={getDict(locale)}
      // The admin's own address, so the header is not blank. It is a label on
      // the screen and nothing else — a preview writes no answer, so there is
      // nobody for this to be recorded against.
      email={admin.email || ""}
      pages={Array.isArray(def.pages) ? def.pages : []}
    />
  );
}
