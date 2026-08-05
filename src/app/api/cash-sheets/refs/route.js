import { getCollection, getSettings } from "@/lib/db";
import { requireSection, forbidden } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight reference data for the Cash sheets: the employee list (Paid By),
// the project list (Projects column — with owner so the client can filter to the
// user's own projects), and the configured categories. Gated by the Cash section
// so a Finance/Cash user needn't have Employees/Projects access.
export async function GET() {
  const actor = await requireSection("cash");
  if (!actor) return forbidden();
  const [employees, projects, users, settings] = await Promise.all([
    getCollection("employees"),
    getCollection("projects"),
    getCollection("users"),
    getSettings(),
  ]);
  const loginById = Object.fromEntries(users.map((u) => [u.id, u.userId || ""]));
  const emp = employees
    .map((e) => ({ id: e.id, name: e.fullName || "", username: loginById[e.userId] || "" }))
    .filter((e) => e.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  const proj = projects
    .map((p) => ({ id: p.id, code: p.projectNumber || "", name: p.title_en || p.title_ar || "Untitled", ownerId: p.ownerId || "" }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const categories = Array.isArray(settings.cashCategories) ? settings.cashCategories : [];
  return Response.json({ employees: emp, projects: proj, categories });
}
