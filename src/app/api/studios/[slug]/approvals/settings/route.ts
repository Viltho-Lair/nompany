import { route, refused } from "@/platform/http/route";
import { approvalsContext, approvalSettingsView, saveApprovalSetting } from "@/modules/approvals/approvals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: approvalsContext, body: true, name: "approvals/settings" };

// Every requestable type with its steps, and the studio's people to name on
// them. `approvals.settings.view`, asked inside the service.
export const GET = route({ ...spec, body: false }, async (a) => approvalSettingsView(a));

// One type's steps, replaced whole: { type, setting: { steps } }. A refused
// setting answers `setting` with every problem, each naming its step, so the
// screen can point at the step that is wrong.
export const PUT = route(spec, async (a) => {
  const result = await saveApprovalSetting(a, a.body);
  if (refused(result)) return result;
  return { ok: true, ...result };
});
