import ProjectsManager from "@/components/studio/ProjectsManager";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("projects-list");
  if (!actor) redirect("/studio");
  return <ProjectsManager />;
}
