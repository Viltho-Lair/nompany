import { route, refused } from "@/platform/http/route";
import { financeContext, setCommercials } from "@/modules/finance/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The PO number and the project number — Finance's own fields, stored on the
// project. Nothing else about the project can be reached from here.
export const PUT = route(
  { auth: "studio", context: financeContext, body: true, name: "finance/projects" },
  async (fin) => {
    if (!fin.canManage) return { error: "read-only" };
    if (!fin.body.id) return { error: "missing" };

    const result = await setCommercials(fin, fin.body.id, fin.body);
    if (refused(result)) return result;
    return { ok: true, project: result.project };
  },
);
