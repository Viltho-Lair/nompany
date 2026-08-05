import FinanceProjects from "@/components/studio/FinanceProjects";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("finance");
  if (!actor) redirect("/studio");
  return <FinanceProjects />;
}
