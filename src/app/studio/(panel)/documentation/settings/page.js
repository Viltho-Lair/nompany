import DocumentationSettings from "@/components/studio/DocumentationSettings";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("documentation-settings");
  if (!actor) redirect("/studio");
  return <DocumentationSettings />;
}
