import ProjectsSettings from "@/components/studio/ProjectsSettings";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("projects-settings");
  if (!actor) redirect("/studio");
  return <ProjectsSettings />;
}
