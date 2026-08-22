import { redirect, notFound } from "next/navigation";
import { currentSuperAdmin } from "@/platform/auth/superAuth";
import { getQuestionnaireById } from "@/lib/data/questionnaires";
import QuestionnaireBuilder from "@/components/super/QuestionnaireBuilder";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const q = await getQuestionnaireById(id);
  return { title: q ? `${q.name} · Questionnaires` : "Questionnaires" };
}

export default async function QuestionnaireBuilderPage({ params }) {
  const admin = await currentSuperAdmin();
  if (!admin) redirect("/super");
  const { id } = await params;
  // Resolved server-side so a bad id is a 404 rather than a builder that spins.
  if (!(await getQuestionnaireById(id))) notFound();
  return <QuestionnaireBuilder id={id} />;
}
