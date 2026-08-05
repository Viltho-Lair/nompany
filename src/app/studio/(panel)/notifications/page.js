import NotificationsCenter from "@/components/studio/NotificationsCenter";
import { currentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications" };

// Every signed-in user has their own notifications — no section gate.
export default async function Page() {
  const actor = await currentUser();
  if (!actor) redirect("/studio/login");
  return <NotificationsCenter />;
}
