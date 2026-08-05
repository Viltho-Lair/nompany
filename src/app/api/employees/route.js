import { getCollection, createItem } from "@/lib/db";
import { requireSection, requireManage, forbidden } from "@/lib/session";
import { encryptField, decryptField } from "@/lib/fieldCrypto";
import { hashPassword, generatePassword } from "@/lib/passwords";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fields encrypted at rest and decrypted only for authorized viewers.
const SECRET_FIELDS = ["idNumber", "passportNumber"];
// Plain scalar fields stored verbatim. idImage/passportImage hold a private
// media URL; photo a public one; userId links to a login account.
const PLAIN_FIELDS = ["fullName", "employeeCode", "departmentId", "positionId", "dateOfJoin", "mobile", "email", "photo", "idImage", "passportImage", "userId", "idExpiry", "passportExpiry"];

export function employeeToClient(row, usersById, departmentsById) {
  const out = { ...row };
  for (const f of SECRET_FIELDS) out[f] = decryptField(row[f]);
  const u = usersById[row.userId];
  out.username = u?.userId || "";
  out.isAdmin = Array.isArray(u?.tags) && u.tags.includes("admin");
  // The department this employee is IN (drives their studio section access).
  out.departmentCode = departmentsById?.[row.departmentId]?.code || "";
  out.codes = Array.isArray(row.codes) ? row.codes : [];
  return out;
}

export function employeeFromClient(body) {
  const rec = {};
  for (const f of PLAIN_FIELDS) rec[f] = String(body[f] || "").slice(0, 400);
  rec.certificationIds = Array.isArray(body.certificationIds) ? body.certificationIds.filter(Boolean).slice(0, 3) : [];
  // Extra access codes (chosen from the department-code pool, admin/HR only) —
  // added on top of the home department's own code. "Leader" lives here too.
  rec.codes = Array.isArray(body.codes) ? [...new Set(body.codes.filter((c) => typeof c === "string" && c.trim()))] : [];
  for (const f of SECRET_FIELDS) rec[f] = encryptField(String(body[f] || "").slice(0, 120));
  return rec;
}

async function lookups() {
  const [users, departments] = await Promise.all([getCollection("users"), getCollection("departments")]);
  return {
    usersById: Object.fromEntries(users.map((u) => [u.id, u])),
    departmentsById: Object.fromEntries(departments.map((d) => [d.id, d])),
  };
}

export async function GET() {
  const actor = await requireSection("employees");
  if (!actor) return forbidden();
  const rows = await getCollection("employees");
  const { usersById, departmentsById } = await lookups();
  return Response.json(rows.map((r) => employeeToClient(r, usersById, departmentsById)));
}

// Create an employee. If a `username` is given, a login account is created for
// them at the same time (no full name — the name lives on the employee) and a
// random password is generated and returned ONCE for the admin/HR to hand over.
export async function POST(request) {
  const actor = await requireManage("employees");
  if (!actor) return forbidden();
  const body = await request.json();
  if (!String(body.fullName || "").trim()) {
    return Response.json({ error: "Employee name is required." }, { status: 400 });
  }

  const rec = employeeFromClient(body);
  const username = String(body.username || "").trim();
  let password = "";
  if (username) {
    const users = await getCollection("users");
    if (users.some((u) => (u.userId || "").toLowerCase() === username.toLowerCase())) {
      return Response.json({ error: `The username "${username}" is already taken.` }, { status: 409 });
    }
    password = generatePassword(16);
    const user = await createItem("users", {
      userId: username,
      tags: body.isAdmin ? ["admin"] : [],
      passwordHash: await hashPassword(password),
      sessionToken: "",
      createdAt: new Date().toISOString(),
      passwordSetAt: new Date().toISOString(),
    });
    rec.userId = user.id;
  }

  const record = await createItem("employees", { ...rec, createdAt: new Date().toISOString(), createdBy: actor.id });
  logActivity({ actor, verb: "created", sectionKey: "employees", entityType: "employees", entityId: record.id, label: `Employee ${record.fullName} added`, href: "/studio/employees" }).catch(() => {});
  const { usersById, departmentsById } = await lookups();
  return Response.json({ ...employeeToClient(record, usersById, departmentsById), password }, { status: 201 });
}
