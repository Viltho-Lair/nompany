import { route, refused } from "@/platform/http/route";
import { hrContext } from "@/modules/hr/hr";
import { saveContract } from "@/modules/hr/lifecycleService";
import type { HrContext } from "@/modules/hr/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SIGN A CONTRACT, OR AMEND ONE. There is no PUT and no DELETE, and that is the
// record shape rather than an omission: an amendment is a new row naming the
// one it supersedes, so editing is how the history would be lost and deleting
// is how a superseded row would be left pointing at nothing.
export const POST = route(
  { auth: "studio", context: hrContext, body: true, name: "hr/lifecycle/contracts" },
  async (c) => {
    const result = await saveContract(c as HrContext, c.body);
    if (refused(result)) return result;
    return { status: 201, body: { ok: true, contract: result.contract } };
  },
);
