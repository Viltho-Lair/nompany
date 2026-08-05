import TasksList from "@/components/studio/TasksList";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("tasks");
  if (!actor) redirect("/studio");
  return <TasksList />;
}
