import SalesSettings from "@/components/studio/SalesSettings";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("sales-settings");
  if (!actor) redirect("/studio");
  return <SalesSettings />;
}
