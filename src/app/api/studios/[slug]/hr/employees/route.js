import { route } from "@/lib/route";
import { hrContext, saveEmployment } from "@/lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The employee record IS the collaborator row, so there is nothing to create or
// delete here — people arrive by joining the studio and leave by being removed
// from it. HR only fills in the employment fields on the row that already exists.
//
// ASSIGNING A ROLE IS AN ACCESS ACT, and both ways it can be turned down — not
// holding the right, or handing out more than you hold yourself — are 403s a
// client should be able to tell from "you sent nonsense". An `escalation`
// refusal carries `keys`, the rights you tried to grant beyond your own.
export const PUT = route(
  { auth: "studio", context: hrContext, body: true, name: "hr/employees" },
  async (hr) => {
    if (!hr.canManage) return { error: "read-only" };
    if (!hr.body.collaboratorId) return { error: "missing" };

    const result = await saveEmployment(hr, hr.body.collaboratorId, hr.body.patch || {});
    if (result.error) return result;
    return { ok: true };
  },
);
