import { redirect } from "next/navigation";
import { currentSuperAdmin } from "@/platform/auth/superAuth";
import QuestionnaireList from "@/components/super/QuestionnaireList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Questionnaires" };

// A FULL-PAGE app: it lives under (full), so it gets the console's tokens but
// none of its sidebar or header — the builder needs the whole window.
//
// (full) has no gate of its own, unlike (shell), so the session is checked here.
// The edge only knows whether the cookie exists; this is where the claim is
// actually verified.
export default async function QuestionnairesPage() {
  const admin = await currentSuperAdmin();
  if (!admin) redirect("/super");
  return <QuestionnaireList />;
}
