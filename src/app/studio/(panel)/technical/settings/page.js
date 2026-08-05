import QuotationCopySettings from "@/components/studio/QuotationCopySettings";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("technical-settings");
  if (!actor) redirect("/studio");
  return <QuotationCopySettings />;
}
