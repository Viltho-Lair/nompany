import ProjectPlanBuilder from "@/components/studio/ProjectPlanBuilder";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({ params }) {
  const actor = await requireSection("projects-list");
  if (!actor) redirect("/studio");
  const { id } = await params;
  return <ProjectPlanBuilder projectId={id} />;
}
