import LiveChat from "@/components/studio/LiveChat";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live Chat" };

export default async function Page() {
  const actor = await requireSection("chat");
  if (!actor) redirect("/studio");
  return <LiveChat />;
}
