import OvertimeSection from "@/components/studio/OvertimeSection";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("projects-overtimes");
  if (!actor) redirect("/studio");
  return <OvertimeSection />;
}
