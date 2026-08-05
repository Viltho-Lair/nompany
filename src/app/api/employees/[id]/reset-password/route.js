import { getCollection, updateItem } from "@/lib/db";
import { requireManage, forbidden } from "@/lib/session";
import { hashPassword, generatePassword } from "@/lib/passwords";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reset the password of the login account linked to this employee. HR/admin
// action (gated by the employees section). Returns the new plaintext once and
// clears any active session so the old password stops working.
export async function POST(request, { params }) {
  const actor = await requireManage("employees");
  if (!actor) return forbidden();
  const { id } = await params;
  const employees = await getCollection("employees");
  const emp = employees.find((e) => e.id === id);
  if (!emp) return Response.json({ error: "Not found" }, { status: 404 });
  if (!emp.userId) return Response.json({ error: "This employee has no login account." }, { status: 400 });

  const password = generatePassword(16);
  await updateItem("users", emp.userId, {
    passwordHash: await hashPassword(password),
    passwordSetAt: new Date().toISOString(),
    sessionToken: "",
    sessionTokens: [],
  });
  logActivity({ actor, verb: "updated", sectionKey: "employees", entityType: "employees", entityId: id, label: `Password reset for ${emp.fullName || "an employee"}`, href: "/studio/employees" }).catch(() => {});
  return Response.json({ password });
}
