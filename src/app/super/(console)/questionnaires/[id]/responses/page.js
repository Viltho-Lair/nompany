import { redirect, notFound } from "next/navigation";
import { currentSuperAdmin } from "@/platform/auth/superAuth";
import { getQuestionnaireById } from "@/lib/data/questionnaires";
import QuestionnaireResponses from "@/components/super/QuestionnaireResponses";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const q = await getQuestionnaireById(id);
  return { title: q ? `${q.name} · Responses` : "Responses" };
}

// WHAT PEOPLE ANSWERED, beside the builder that asked them. The questionnaire
// had a Responses column from the day it shipped and nothing behind it — the
// answers were never recorded at all, so there was no screen to write.
export default async function QuestionnaireResponsesPage({ params }) {
  const admin = await currentSuperAdmin();
  if (!admin) redirect("/super");
  const { id } = await params;
  // Resolved server-side so a bad id is a 404 rather than a screen that spins,
  // the same way the builder beside it does.
  if (!(await getQuestionnaireById(id))) notFound();
  return <QuestionnaireResponses id={id} />;
}
