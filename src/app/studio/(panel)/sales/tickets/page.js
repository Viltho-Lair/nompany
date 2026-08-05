import SalesList from "@/components/studio/SalesList";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("sales-list");
  if (!actor) redirect("/studio");
  return <SalesList />;
}
