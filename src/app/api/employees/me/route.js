import { getCollection, updateItem } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/session";
import { employeeToClient } from "../route";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fields an employee may change on their own profile. Everything else (code,
// department, position, lead status, join date, certifications, ID/passport
// numbers) is HR-only.
const SELF_FIELDS = ["fullName", "email", "mobile", "photo", "idImage", "passportImage"];

async function load(actorId) {
  const [rows, users, departments] = await Promise.all([getCollection("employees"), getCollection("users"), getCollection("departments")]);
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
  const departmentsById = Object.fromEntries(departments.map((d) => [d.id, d]));
  return { mine: rows.find((e) => e.userId === actorId) || null, usersById, departmentsById };
}

export async function GET() {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const { mine, usersById, departmentsById } = await load(actor.id);
  return Response.json(mine ? employeeToClient(mine, usersById, departmentsById) : null);
}

export async function PUT(request) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const { mine } = await load(actor.id);
  if (!mine) return Response.json({ error: "No employee profile is linked to your account." }, { status: 404 });

  const body = await request.json();
  const patch = {};
  for (const f of SELF_FIELDS) if (f in body) patch[f] = String(body[f] || "").slice(0, 400);

  const updated = await updateItem("employees", mine.id, patch);
  logActivity({ actor, verb: "updated", sectionKey: "employees", entityType: "employees", entityId: mine.id, label: `${updated.fullName || "An employee"} updated their profile`, href: "/studio/employees" }).catch(() => {});
  const { usersById, departmentsById } = await load(actor.id);
  return Response.json(employeeToClient(updated, usersById, departmentsById));
}
