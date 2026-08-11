import { redirect } from "next/navigation";
import { currentUser } from "@/lib/identity";
import { getQuestionnaire } from "@/lib/data/users";
import { isPackageKey } from "@/lib/questionnaire";
import QuestionnaireFlow from "@/components/public/QuestionnaireFlow";

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
  return <QuestionnaireFlow locale={locale} initialPackage={isPackageKey(requested) ? requested : ""} />;
}
