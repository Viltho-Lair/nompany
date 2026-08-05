import { currentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import EmployeeSelfProfile from "@/components/studio/EmployeeSelfProfile";

export const dynamic = "force-dynamic";

// Every signed-in user can reach their own profile — no section gate. A single
// box: their employee profile (self-editable fields) with a Reset-password
// button, or a minimal account card if they have no employee record.
export default async function Page() {
  const actor = await currentUser();
  if (!actor) redirect("/studio/login");
  return <EmployeeSelfProfile />;
}
