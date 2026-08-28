import { redirect } from "next/navigation";
import { currentUser } from "@/platform/auth/identity";
import { getQuestionnaire } from "@/platform/auth/users";
import { isPackageKey, QUESTION_PAGES, REGISTRATION_NAME, REGISTRATION_ROUTE } from "@/lib/questionnaire";
import { ensureQuestionnaireForRoute } from "@/lib/data/questionnaires";
import QuestionnaireFlow from "@/components/public/QuestionnaireFlow";
import { getDict } from "@/shared/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set up your account", robots: { index: false, follow: false } };

// The one-time survey between finishing registration and reaching the account.
// It is a GATE: everyone lands here after verifying, and anyone who has already
// answered is passed straight through, so returning users never see it twice.
export default async function QuestionnairePage({ params, searchParams }) {
  const { locale } = await params;
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);

  const answers = await getQuestionnaire(user.id);
  if (answers?.completedAt) redirect(`/${locale}/account`);

  // A package chosen on the pricing page rides along on ?package=.
  const sp = await searchParams;
  const requested = String(sp?.package || "");
  // The questions come from the BUILDER, not from this file. The definition is
  // planted on first use and read every time after, so editing "Registration
  // questionnaire" in /super changes what someone registering actually sees.
  // The built-in definition is the seed and the fallback — if the registry can
  // not be reached, registration must not become a dead end.
  let def = null;
  try { def = await ensureQuestionnaireForRoute({ route: REGISTRATION_ROUTE, name: REGISTRATION_NAME, pages: QUESTION_PAGES }); } catch { def = null; }
  const pages = def?.pages?.length ? def.pages : QUESTION_PAGES;

  return (
    <QuestionnaireFlow
      locale={locale}
      // Resolved on the server like every other locale-addressed page, so the
      // survey's frame is in the right language before the first paint and the
      // dictionaries never reach the client bundle.
      dict={getDict(locale)}
      email={user.email}
      pages={pages}
      questionnaireId={def?.id || ""}
      initialPackage={isPackageKey(requested) ? requested : ""}
    />
  );
}
