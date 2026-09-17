import { route } from "@/platform/http/route";
import { can } from "@/platform/access";
import { valuesFor } from "@/modules/administration/taxonomy";
import {
  hrContext, listDepartments, listHrRoles, listCertifications, listEmployees,
  listVacations, expiringDocuments, headcount, leaveView,
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
  //
  // HUMAN RESOURCES → EMPLOYEES IS WHERE ALL BUT ONE OF THESE ARE SHOWN: its
  // people, roles, certifications and leave tabs, and the dashboard's headcount
  // and expiring-document figures. With it switched off only leave is read —
  // it is kept on the HR root, and the dashboard's leave charts draw from it.
  const employeesOn = g.on("hr-employees");
  const none = Promise.resolve([]);
  const [departments, roles, certifications, employees, vacations] = await Promise.all([
    employeesOn ? listDepartments(g) : none,
    employeesOn ? listHrRoles(g) : none,
    employeesOn ? listCertifications(g) : none,
    employeesOn ? listEmployees(g, g.collaborator.id) : none,
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
    // Whether this viewer may see, and so change, the picture of somebody's
    // identity document. The picture is withheld from everybody else.
    canSeeDocumentImages: can(g.access, "hr.employees.salary"),
    nav: g.nav,
    // Manage per section key, so each screen can ask about itself rather
    // than being handed the parent section's answer.
    manage: g.manage,
    me: { collaboratorId: g.collaborator.id },
    departments, roles, certifications, employees, vacations,
    expiring: expiringDocuments(employees),
    headcount: headcount(employees, departments),
    // THE STUDIO'S LEAVE RULES AND EACH VISIBLE PERSON'S BALANCE this year,
    // computed from the two scoped lists above — no extra read.
    leave: leaveView(g, employees, vacations),
    // WHAT THIS STUDIO ADMITS, not what the product ships. Serving the
    // shipped list would let the service accept a leave type no picker on
    // the screen could ever offer.
    vocabulary: { leaveTypes: valuesFor("leaveTypes", g.studio.taxonomies), leaveStatuses: LEAVE_STATUSES, expiryWindowDays: EXPIRY_WINDOW_DAYS },
  };
});
