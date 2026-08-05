import { getCollection, updateItem, deleteItem } from "@/lib/db";
import { requireManage, forbidden } from "@/lib/session";
import { hhmmToHours } from "@/lib/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hoursBetween(from, to) {
  const a = hhmmToHours(from, NaN), b = hhmmToHours(to, NaN);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return Math.round((b - a) * 100) / 100;
}

export async function PUT(request, { params }) {
  const actor = await requireManage("projects-overtimes");
  if (!actor) return forbidden();
  const { id } = await params;
  const rows = await getCollection("overtimes");
  const existing = rows.find((r) => r.id === id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch = {};
  if ("date" in body) { const d = String(body.date || "").trim(); if (!d) return Response.json({ error: "A date is required." }, { status: 400 }); patch.date = d; }
  if ("from" in body) patch.from = String(body.from || "").trim();
  if ("to" in body) patch.to = String(body.to || "").trim();

  if ("projectId" in body && body.projectId && body.projectId !== existing.projectId) {
    const project = (await getCollection("projects")).find((p) => p.id === body.projectId);
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
    patch.projectId = project.id;
    patch.projectName = project.title_en || project.title_ar || "Untitled";
  }
  if ("userId" in body && body.userId && body.userId !== existing.userId) {
    const [employees, departments] = await Promise.all([getCollection("employees"), getCollection("departments")]);
    const emp = employees.find((e) => e.id === body.userId);
    if (!emp) return Response.json({ error: "User not found." }, { status: 404 });
    const deptName = Object.fromEntries(departments.map((d) => [d.id, d.name || ""]));
    patch.userId = emp.id; patch.userName = emp.fullName || "—";
    patch.departmentId = emp.departmentId || ""; patch.department = deptName[emp.departmentId] || "";
  }

  const from = patch.from ?? existing.from, to = patch.to ?? existing.to;
  const hours = hoursBetween(from, to);
  if (hours <= 0) return Response.json({ error: "End time must be after start time." }, { status: 400 });
  patch.hours = hours;

  const updated = await updateItem("overtimes", id, patch);
  return Response.json(updated);
}

export async function DELETE(request, { params }) {
  const actor = await requireManage("projects-overtimes");
  if (!actor) return forbidden();
  const { id } = await params;
  const ok = await deleteItem("overtimes", id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
