// MACHINES — each machine's reliability record over the last year.
//
// READ ONLY. The figures are derived from the work orders every time they are
// asked for; nothing here writes, and there is nothing to write.
import { route, refused } from "@/platform/http/route";
import { maintenanceContext, listMachines } from "@/modules/maintenance/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "studio", context: maintenanceContext, name: "maintenance-assets" }, async (m) => {
  const result = await listMachines(m);
  if (refused(result)) return result;
  return { ok: true, ...result };
});
