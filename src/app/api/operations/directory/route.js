import { getCollection } from "@/lib/db";
import { requireSection, forbidden } from "@/lib/session";
import { decryptField } from "@/lib/fieldCrypto";
import { ADMIN_TAG } from "@/lib/authConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight directory for the Operations page — employees (name, photo, ID
// number + expiries, passport expiry) and a minimal project list — so Operations
// users can build the calendar and expiry reports without needing Employees or
// Projects section access. Gated by the Operations section.
export async function GET() {
  const actor = await requireSection("operations");
  if (!actor) return forbidden();
  const [employees, projects, departments, users, overtimes, salesClients] = await Promise.all([
    getCollection("employees"),
    getCollection("projects"),
    getCollection("departments"),
    getCollection("users"),
    getCollection("overtimes"),
    getCollection("salesClients"),
  ]);
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
  // Only admins get the (decrypted) ID numbers — the Employees sheet is admin-only.
  const isAdmin = Array.isArray(actor.tags) && actor.tags.includes(ADMIN_TAG);
  const emp = employees.map((e) => ({
    id: e.id,
    fullName: e.fullName || "",
    username: usersById[e.userId]?.userId || "",
    photo: e.photo || "",
    departmentId: e.departmentId || "",
    idNumber: isAdmin ? (decryptField(e.idNumber) || "") : "",
    idExpiry: e.idExpiry || "",
    passportExpiry: e.passportExpiry || "",
  }));
  emp.sort((a, b) => a.fullName.localeCompare(b.fullName));
  const proj = projects
    .map((p) => ({ id: p.id, title: p.title_en || p.title_ar || "Untitled", projectNumber: p.projectNumber || "" }))
    .sort((a, b) => a.title.localeCompare(b.title));
  const depts = departments
    .map((d) => ({ id: d.id, name: d.name || "" }))
    .sort((a, b) => a.name.localeCompare(b.name));
  // Overtime entries for the Work Calendar (drawn as OT blocks when "Show
  // overtimes" is on).
  const ot = overtimes.map((o) => ({ id: o.id, projectName: o.projectName || "", userName: o.userName || "", date: o.date || "", from: o.from || "", to: o.to || "", hours: o.hours || 0 }));
  // Clients + their saved locations, for the permit Add form (client + location).
  const clients = salesClients
    .map((c) => ({ id: c.id, name: c.name || "", locations: Array.isArray(c.locations) ? c.locations : [] }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return Response.json({ employees: emp, projects: proj, departments: depts, overtimes: ot, clients });
}
