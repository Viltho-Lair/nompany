import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";
import AwbTracking from "@/components/studio/AwbTracking";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("inventory-awb");
  if (!actor) redirect("/studio");
  return <AwbTracking />;
}
