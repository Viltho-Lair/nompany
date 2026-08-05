import QuotationsManager from "@/components/studio/QuotationsManager";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("technical-quotations");
  if (!actor) redirect("/studio");
  return <QuotationsManager />;
}
