import OperationsReport from "@/components/studio/OperationsReport";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("operations");
  if (!actor) redirect("/studio");
  return <OperationsReport />;
}
