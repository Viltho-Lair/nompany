import StudioSettingsManager from "@/components/studio/StudioSettingsManager";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("settings");
  if (!actor) redirect("/studio");
  return <StudioSettingsManager />;
}
