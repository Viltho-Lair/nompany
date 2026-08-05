import SalesClients from "@/components/studio/SalesClients";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("sales-clients");
  if (!actor) redirect("/studio");
  return <SalesClients />;
}
