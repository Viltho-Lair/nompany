import StatisticsSection from "@/components/studio/StatisticsSection";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("content-statistics");
  if (!actor) redirect("/studio");
  return <StatisticsSection />;
}
