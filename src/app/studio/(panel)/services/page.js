import StudioCollectionManager from "@/components/studio/StudioCollectionManager";
import { collectionSchemas } from "@/lib/adminSchemas";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("services");
  if (!actor) redirect("/studio");
  return <StudioCollectionManager collection="services" schema={collectionSchemas["services"]} />;
}
