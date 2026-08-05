// Bridges the Employees module into the rest of the app's authorization.
// Access is driven by DEPARTMENT CODE (an employee's linked department + any
// extra access codes), granted to sections in Section Access. Rather than
// rewrite every tag check across Tasks/Quotations/Tickets/RFQs, we PROJECT the
// user's resolved codes into the same `user.tags` array those checks read.
//
// On top of the raw codes we also DERIVE the canonical capability tags
// ("Technical", "Sales", "HR") from section access: if a user's codes let them
// reach the Technical section, they get the "Technical" capability — no matter
// what their department is named. That's what makes literal checks like
// `tags.includes(TECHNICAL_TAG)` (the "Handled by" dropdown, cost columns,
// see-all scope, badge counts) work with an arbitrarily-named department such
// as "tech". Because DEFAULT_SECTION_ACCESS no longer lists any canonical tag,
// injecting these derived tags can never itself grant a section (no over-grant).
// The only tag genuinely STORED on a user is the "admin" super-flag.
import { getCollection } from "@/lib/db";
import { getSectionAccess } from "@/lib/sectionAccess";
import { canAccessSection } from "@/lib/sectionAccessConstants";
import { ADMIN_TAG, TECHNICAL_TAG, SALES_TAG, HR_TAG, FINANCE_TAG } from "@/lib/authConstants";

// Canonical capability → the sections that confer it. Access to ANY listed
// section (directly or via a granted parent) grants the capability.
const CAPABILITY_SECTIONS = {
  [TECHNICAL_TAG]: ["technical", "technical-quotations", "technical-rfq"],
  [SALES_TAG]: ["sales", "sales-list"],
  [HR_TAG]: ["employees"],
  [FINANCE_TAG]: ["finance"],
};

function buildLookups(employees, departments) {
  const employeesByUserId = new Map(employees.filter((e) => e.userId).map((e) => [e.userId, e]));
  const departmentsById = new Map(departments.map((d) => [d.id, d]));
  return { employeesByUserId, departmentsById };
}

function withEffectiveTags(user, employeesByUserId, departmentsById, accessMap) {
  const stored = Array.isArray(user?.tags) ? user.tags.filter((t) => t === ADMIN_TAG) : [];
  const emp = employeesByUserId.get(user.id);
  const dept = emp ? departmentsById.get(emp.departmentId) : null;
  // Raw codes = home department code + extra access codes.
  const codes = [];
  if (dept?.code) codes.push(dept.code);
  if (Array.isArray(emp?.codes)) codes.push(...emp.codes.filter(Boolean));
  let tags = [...new Set([...stored, ...codes])];

  // Derive canonical capability tags from what these codes can reach.
  const probe = { tags };
  const derived = [];
  for (const [cap, sections] of Object.entries(CAPABILITY_SECTIONS)) {
    if (tags.includes(cap)) continue;
    if (sections.some((s) => canAccessSection(probe, s, accessMap))) derived.push(cap);
  }
  tags = [...new Set([...tags, ...derived])];

  return {
    ...user,
    // The person's name lives on their Employee record now — surface it as the
    // user's display name so every existing `fullName || userId` label shows a
    // real name without storing it on the account.
    fullName: emp?.fullName || user.fullName || "",
    // The employee's photo is the person's picture — surface it as the avatar so
    // the header profile icon (and anywhere using avatarUrl) shows it. Falls back
    // to the account's own avatar for accounts without a linked employee.
    avatarUrl: emp?.photo || user.avatarUrl || "",
    tags,
    departmentCode: dept?.code || "",
    accessCodes: Array.isArray(emp?.codes) ? emp.codes.filter(Boolean) : [],
    employeeId: emp?.id || "",
  };
}

// Enrich a single user (adds effective tags + resolved department info). Does
// its own DB reads — use enrichUsers() when enriching a whole list.
export async function enrichUser(user) {
  if (!user) return user;
  const [employees, departments, accessMap] = await Promise.all([
    getCollection("employees"),
    getCollection("departments"),
    getSectionAccess(),
  ]);
  const { employeesByUserId, departmentsById } = buildLookups(employees, departments);
  return withEffectiveTags(user, employeesByUserId, departmentsById, accessMap);
}

// Enrich many users with one shared DB read — for list endpoints (e.g. the
// user directory powering "handled by" dropdowns and Users management).
export async function enrichUsers(users) {
  const [employees, departments, accessMap] = await Promise.all([
    getCollection("employees"),
    getCollection("departments"),
    getSectionAccess(),
  ]);
  const { employeesByUserId, departmentsById } = buildLookups(employees, departments);
  return users.map((u) => withEffectiveTags(u, employeesByUserId, departmentsById, accessMap));
}
