import NotificationSettings from "@/components/studio/NotificationSettings";
import { currentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notification settings" };

export default async function Page() {
  const actor = await currentUser();
  if (!actor) redirect("/studio/login");
  return <NotificationSettings />;
}
