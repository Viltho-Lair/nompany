import LiveView from "@/components/studio/LiveView";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live tickets" };

export default async function Page() {
  const actor = await requireSection("sales-live");
  if (!actor) redirect("/studio");
  return <LiveView variant="sales" />;
}
