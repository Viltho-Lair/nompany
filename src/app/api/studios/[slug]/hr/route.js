import {
  hrGuard, listDepartments, listPositions, listCertifications, listEmployees,
  listVacations, expiringDocuments, headcount,
  LEAVE_TYPES, LEAVE_STATUSES, EXPIRY_WINDOW_DAYS,
} from "@/lib/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole HR screen. ID and passport numbers are decrypted only
// when the viewer can manage HR — a view-only grant sees that a document is on
// file and when it expires, never the number itself.
export async function GET(request, ctx) {
  const g = await hrGuard(ctx.params);
  if (g.fail) return g.fail;

  const [departments, positions, certifications, employees, vacations] = await Promise.all([
    listDepartments(g), listPositions(g), listCertifications(g),
    listEmployees(g, g.canManage),
    listVacations(g, { meId: g.collaborator.id }),
  ]);

  return Response.json({
    canManage: g.canManage,
    nav: g.nav,
    // Manage per section key, so each screen can ask about itself rather
    // than being handed the parent section's answer.
    manage: g.manage,
    me: { collaboratorId: g.collaborator.id },
    departments, positions, certifications, employees, vacations,
    expiring: expiringDocuments(employees),
    headcount: headcount(employees, departments),
    vocabulary: { leaveTypes: LEAVE_TYPES, leaveStatuses: LEAVE_STATUSES, expiryWindowDays: EXPIRY_WINDOW_DAYS },
  });
}
