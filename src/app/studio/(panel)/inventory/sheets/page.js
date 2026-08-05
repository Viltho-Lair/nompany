import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";
import InventoryProjectSheets from "@/components/studio/InventoryProjectSheets";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("inventory-sheets");
  if (!actor) redirect("/studio");
  return <InventoryProjectSheets />;
}
