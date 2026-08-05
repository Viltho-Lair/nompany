import StockManager from "@/components/studio/StockManager";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("inventory-stock");
  if (!actor) redirect("/studio");
  return <StockManager />;
}
