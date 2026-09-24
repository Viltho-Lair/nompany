import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { currentUser } from "@/platform/auth/identity";
import { getQuestionnaire } from "@/platform/auth/users";
import { QUESTION_PAGES, REGISTRATION_NAME, REGISTRATION_ROUTE, RETIRED_FROM_REGISTRATION } from "@/lib/questionnaire";
import { ensureQuestionnaireForRoute, retireFromQuestionnaire } from "@/lib/data/questionnaires";
import { listCatalog } from "@/lib/data/catalog";
import { INTENT_COOKIE, openIntent, intentLabel } from "@/platform/auth/purchaseIntent";
import QuestionnaireFlow from "@/components/public/QuestionnaireFlow";
import { getDict } from "@/shared/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set up your account", robots: { index: false, follow: false } };

// The one-time survey between finishing registration and reaching the account.
// It is a GATE: everyone lands here after verifying, and anyone who has already
// answered is passed straight through, so returning users never see it twice.
export default async function QuestionnairePage({ params }) {
  const { locale } = await params;
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);

  const answers = await getQuestionnaire(user.id);
  if (answers?.completedAt) redirect(`/${locale}/account`);

  // THE PACKAGE THEY ARE HEADING FOR, named in the header. It comes from the
  // signed cookie the pricing page set (platform/auth/purchaseIntent) and the
  // catalogue as it is now; this page only SHOWS it — studio creation is where
  // it is used. `?package=` is no longer read: nothing ever arrived on it.
  const intent = openIntent((await cookies()).get(INTENT_COOKIE)?.value);
  let packageName = "";
  try { packageName = intentLabel(intent, await listCatalog("packages"), locale); } catch { packageName = ""; }
  // The questions come from the BUILDER, not from this file. The definition is
  // planted on first use and read every time after, so editing "Registration
  // questionnaire" in /super changes what someone registering actually sees.
  // The built-in definition is the seed and the fallback — if the registry can
  // not be reached, registration must not become a dead end.
  let def = null;
  try {
    def = await ensureQuestionnaireForRoute({ route: REGISTRATION_ROUTE, name: REGISTRATION_NAME, pages: QUESTION_PAGES });
    // The company questions moved to studio creation (lib/questionnaire says
    // why); a form planted before that still carries them, and this takes them
    // out of it once.
    def = (await retireFromQuestionnaire(REGISTRATION_ROUTE, RETIRED_FROM_REGISTRATION)) || def;
  } catch { def = def || null; }
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
      packageName={packageName}
    />
  );
}
