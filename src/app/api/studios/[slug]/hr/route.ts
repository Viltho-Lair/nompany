import { route } from "@/platform/http/route";
import {
  hrContext, listDepartments, listHrRoles, listCertifications, listEmployees,
  listVacations, expiringDocuments, headcount,
  LEAVE_TYPES, LEAVE_STATUSES, EXPIRY_WINDOW_DAYS,
} from "@/modules/hr/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole HR screen. ID and passport numbers are decrypted only
// when the viewer can manage HR — a view-only grant sees that a document is on
// file and when it expires, never the number itself.
export const GET = route(
  { auth: "studio", context: hrContext, name: "hr" },
  async (g) => {
  // Departments are STORED now — Master data's collection, read through this
  // module's foreign section. They join the other four reads rather than
  // preceding them, so the screen costs the same round trips it did when the
  // list was derived from sections already in hand.
  const [departments, roles, certifications, employees, vacations] = await Promise.all([
    listDepartments(g), listHrRoles(g), listCertifications(g),
    listEmployees(g, g.collaborator.id),
    listVacations(g, { meId: g.collaborator.id }),
  ]);

  return {
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
  };
});
