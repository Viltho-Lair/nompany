import { getCollection, updateItem, deleteItem } from "@/lib/db";
import { requireSection, requireManage, forbidden } from "@/lib/session";
import { encryptField } from "@/lib/fieldCrypto";
import { employeeToClient } from "../route";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET_FIELDS = ["idNumber", "passportNumber"];
const PLAIN_FIELDS = ["fullName", "employeeCode", "departmentId", "positionId", "dateOfJoin", "mobile", "email", "photo", "idImage", "passportImage", "userId", "idExpiry", "passportExpiry"];

async function lookups() {
  const [users, departments] = await Promise.all([getCollection("users"), getCollection("departments")]);
  return {
    usersById: Object.fromEntries(users.map((u) => [u.id, u])),
    departmentsById: Object.fromEntries(departments.map((d) => [d.id, d])),
  };
}

// HR / admin update — may change any field (gated by the employees section).
export async function PUT(request, { params }) {
  const actor = await requireManage("employees");
  if (!actor) return forbidden();
  const { id } = await params;
  const body = await request.json();

  const patch = {};
  for (const f of PLAIN_FIELDS) if (f in body) patch[f] = String(body[f] || "").slice(0, 400);
  if ("certificationIds" in body) patch.certificationIds = Array.isArray(body.certificationIds) ? body.certificationIds.filter(Boolean).slice(0, 3) : [];
  // Extra access codes (department-code pool, admin/HR only).
  if ("codes" in body) patch.codes = Array.isArray(body.codes) ? [...new Set(body.codes.filter((c) => typeof c === "string" && c.trim()))] : [];
  // Only re-encrypt a secret field when it's present in the patch, so an edit
  // that doesn't touch it leaves the stored ciphertext intact.
  for (const f of SECRET_FIELDS) if (f in body) patch[f] = encryptField(String(body[f] || "").slice(0, 120));

  const updated = await updateItem("employees", id, patch);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });

  // Administrator flag is the one thing stored on the login account itself.
  if ("isAdmin" in body && updated.userId) {
    const users = await getCollection("users");
    const u = users.find((x) => x.id === updated.userId);
    if (u) {
      const isAdmin = Array.isArray(u.tags) && u.tags.includes("admin");
      if (body.isAdmin && !isAdmin) await updateItem("users", u.id, { tags: [...(u.tags || []), "admin"] });
      if (!body.isAdmin && isAdmin) await updateItem("users", u.id, { tags: (u.tags || []).filter((t) => t !== "admin") });
    }
  }

  logActivity({ actor, verb: "updated", sectionKey: "employees", entityType: "employees", entityId: id, label: `Employee ${updated.fullName || ""} updated`.trim(), href: "/studio/employees" }).catch(() => {});
  const { usersById, departmentsById } = await lookups();
  return Response.json(employeeToClient(updated, usersById, departmentsById));
}

export async function DELETE(request, { params }) {
  const actor = await requireManage("employees");
  if (!actor) return forbidden();
  const { id } = await params;
  const ok = await deleteItem("employees", id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  logActivity({ actor, verb: "deleted", sectionKey: "employees", entityType: "employees", entityId: id, label: "An employee was removed", href: "/studio/employees" }).catch(() => {});
  return Response.json({ ok: true });
}

export async function GET(request, { params }) {
  const actor = await requireSection("employees");
  if (!actor) return forbidden();
  const { id } = await params;
  const rows = await getCollection("employees");
  const row = rows.find((r) => r.id === id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  const { usersById, departmentsById } = await lookups();
  return Response.json(employeeToClient(row, usersById, departmentsById));
}
