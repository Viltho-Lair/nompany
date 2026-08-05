import SalesDashboard from "@/components/studio/SalesDashboard";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("sales");
  if (!actor) redirect("/studio");
  return <SalesDashboard />;
}
