import UsersManager from "@/components/studio/UsersManager";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("users");
  if (!actor) redirect("/studio");
  return <UsersManager />;
}
