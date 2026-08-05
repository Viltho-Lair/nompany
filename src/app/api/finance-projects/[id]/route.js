import { updateItem } from "@/lib/db";
import { requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Finance-gated edit of a project's finance fields (PO number, project number).
// Kept separate from the generic /api/projects route so Finance can maintain
// these without needing the Projects section.
const FIELDS = ["poNumber", "projectNumber"];

export async function PUT(request, { params }) {
  const actor = await requireManage("finance");
  if (!actor) return forbidden();
  const { id } = await params;
  const body = await request.json();
  const patch = {};
  for (const f of FIELDS) if (f in body) patch[f] = String(body[f] || "").slice(0, 120);
  const updated = await updateItem("projects", id, patch);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  logActivity({ actor, verb: "updated", sectionKey: "finance", entityType: "projects", entityId: id, label: `Finance updated ${updated.title_en || "a project"}`, href: "/studio/finance" }).catch(() => {});
  return Response.json(updated);
}
