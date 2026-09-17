import { route, refused } from "@/platform/http/route";
import { hrContext } from "@/modules/hr/hr";
import { settlementFor } from "@/modules/hr/lifecycleService";
import type { HrContext } from "@/modules/hr/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHAT SOMEBODY WOULD BE OWED IF THEY LEFT ON A GIVEN DAY.
//
// A GET, DELIBERATELY: it writes nothing, and the offboarding screen asks it
// again on every change of the date so the figure moves as the last working day
// does. The STORED copy is the snapshot the exit writes onto its own event —
// this endpoint is the preview, and a preview that persisted would be a
// settlement nobody had decided on.
export const GET = route(
  { auth: "studio", context: hrContext, name: "hr/lifecycle/settlement" },
  async (c) => {
    const url = new URL(c.request.url);
    const result = await settlementFor(c as HrContext, {
      collaboratorId: url.searchParams.get("collaboratorId") || "",
      lastWorkingDay: url.searchParams.get("lastWorkingDay") || "",
      reason: url.searchParams.get("reason") || "",
      deductions: url.searchParams.get("deductions") || "",
    });
    return refused(result) ? result : { ok: true, ...result };
  },
);
