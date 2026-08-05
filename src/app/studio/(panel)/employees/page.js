import EmployeesManager from "@/components/studio/EmployeesManager";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("employees");
  if (!actor) redirect("/studio");
  return <EmployeesManager />;
}
