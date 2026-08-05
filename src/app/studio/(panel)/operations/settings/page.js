import OperationsSettings from "@/components/studio/OperationsSettings";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("operations-settings");
  if (!actor) redirect("/studio");
  return <OperationsSettings />;
}
