import { updateSettings } from "@/lib/db";
import { currentUser, forbidden } from "@/lib/session";
import { getSectionAccess } from "@/lib/sectionAccess";
import { canManageSection } from "@/lib/sectionAccessConstants";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Operations-scoped settings save — the work schedule, the calendar legend
// (work-task types + colours), and the "show only working hours" default. Kept
// separate from /api/settings (which needs the Settings section) so Operations
// users can save these without full Company-Info access. Only these keys are
// touched. Read via the public /api/settings GET.
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function PUT(request) {
  // Writable by managers of Operations OR the Operations → Settings sub-section
  // (the sub-section page saves the work schedule + legend from here).
  const actor = await currentUser();
  if (!actor) return forbidden();
  const grants = await getSectionAccess();
  if (!canManageSection(actor, "operations", grants) && !canManageSection(actor, "operations-settings", grants)) return forbidden();
  const body = await request.json().catch(() => ({}));
  const patch = {};

  if (body.workSchedule && typeof body.workSchedule === "object") {
    const ws = {};
    for (const d of DAYS) {
      const v = body.workSchedule[d] || {};
      ws[d] = { on: !!v.on, from: String(v.from || "").slice(0, 5), to: String(v.to || "").slice(0, 5) };
    }
    patch.workSchedule = ws;
  }

  if (Array.isArray(body.operationsLegend)) {
    patch.operationsLegend = body.operationsLegend
      .map((t) => ({ id: String(t.id || "").slice(0, 40) || `t_${Math.random().toString(36).slice(2, 8)}`, label: String(t.label || "").slice(0, 60), color: String(t.color || "").slice(0, 20) }))
      .filter((t) => t.label)
      .slice(0, 30);
  }

  if ("operationsShowWorkingHoursOnly" in body) patch.operationsShowWorkingHoursOnly = !!body.operationsShowWorkingHoursOnly;
  if ("operationsShowOvertimes" in body) patch.operationsShowOvertimes = !!body.operationsShowOvertimes;

  if ("operationsRosterPrefix" in body) patch.operationsRosterPrefix = String(body.operationsRosterPrefix || "").slice(0, 500);

  if (body.operationsSheetNames && typeof body.operationsSheetNames === "object") {
    patch.operationsSheetNames = {
      employees: String(body.operationsSheetNames.employees || "").slice(0, 60),
      permits: String(body.operationsSheetNames.permits || "").slice(0, 60),
    };
  }

  if (!Object.keys(patch).length) return Response.json({ error: "Nothing to save." }, { status: 400 });
  const updated = await updateSettings(patch);
  logActivity({ actor, verb: "updated", sectionKey: "operations", entityType: "settings", entityId: "operations", label: "Operations settings updated", href: "/studio/operations" }).catch(() => {});
  return Response.json(updated);
}
