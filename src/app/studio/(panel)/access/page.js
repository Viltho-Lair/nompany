import AccessControlManager from "@/components/studio/AccessControlManager";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("access");
  if (!actor) redirect("/studio");
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-800 text-slate-900 dark:text-white">Access Control</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Grant sections and functionalities to departments or individual users.</p>
      </div>
      <AccessControlManager />
    </div>
  );
}
