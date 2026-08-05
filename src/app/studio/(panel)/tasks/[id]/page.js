import TaskDetail from "@/components/studio/TaskDetail";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({ params }) {
  const actor = await requireSection("tasks");
  if (!actor) redirect("/studio");
  const { id } = await params;
  return <TaskDetail taskId={id} />;
}
