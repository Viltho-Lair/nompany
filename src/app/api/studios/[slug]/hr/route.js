import {
  hrGuard, listDepartments, listHrRoles, listCertifications, listEmployees,
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

  // Departments are DERIVED from the section list the context already carries,
  // so there is nothing to await for them.
  const departments = listDepartments(g);
  const [roles, certifications, employees, vacations] = await Promise.all([
    listHrRoles(g), listCertifications(g),
    listEmployees(g, g.collaborator.id),
    listVacations(g, { meId: g.collaborator.id }),
  ]);

  return Response.json({
    canManage: g.canManage,
    // Whether the module's OWN screen may be opened. The dashboard summarises
    // everything underneath it, so it is withheld on a right of its own.
    canViewDashboard: g.canViewDashboard,
    // Whether this viewer may put somebody IN a role, which is an access right
    // and not an HR one — the screen hides the control rather than offering it
    // and being refused.
    canAssignRoles: g.canAssignRoles,
    nav: g.nav,
    // Manage per section key, so each screen can ask about itself rather
    // than being handed the parent section's answer.
    manage: g.manage,
    me: { collaboratorId: g.collaborator.id },
    departments, roles, certifications, employees, vacations,
    expiring: expiringDocuments(employees),
    headcount: headcount(employees, departments),
    vocabulary: { leaveTypes: LEAVE_TYPES, leaveStatuses: LEAVE_STATUSES, expiryWindowDays: EXPIRY_WINDOW_DAYS },
  });
}
