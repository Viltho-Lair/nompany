import { getCollection, updateItem, createItem, getSettings } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { notifyUsers } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["in-progress", "completed", "partially-completed", "rejected"];

export async function GET(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const { id } = await params;
  const row = (await getCollection("deliveries")).find((d) => d.id === id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
}

// Project Manager sets the delivery status. "Partially completed" also carries
// the returned items/serials — which spins up a return task to the logistics
// team (they confirm receipt, which reassigns the serials to stock).
export async function PUT(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const { id } = await params;
  const deliveries = await getCollection("deliveries");
  const delivery = deliveries.find((d) => d.id === id);
  if (!delivery) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const status = String(body.status || "");
  if (!STATUSES.includes(status)) return Response.json({ error: "Invalid status" }, { status: 400 });

  const now = new Date().toISOString();
  const patch = { status, statusAt: now, statusBy: actor.fullName || actor.userId };

  // Client signature confirmation (recorded when the PM marks a delivery
  // Delivered after confirming the client signed for it).
  if (body.clientSignatureConfirmed === true) {
    patch.clientSignatureConfirmed = true;
    patch.signatureAt = now;
    patch.signatureBy = actor.fullName || actor.userId;
  }

  // Partial → PM picks returned serials; Rejected → the whole delivery comes
  // back. Both send a material-return task to the users who manage returns,
  // which reassigns the serials to stock on receipt.
  if (status === "partially-completed" || status === "rejected") {
    let returns;
    if (status === "rejected") {
      returns = (delivery.items || []).map((it) => ({ itemId: it.itemId, serials: [...(it.serials || [])] })).filter((r) => r.itemId && r.serials.length);
    } else {
      const allowed = {};
      for (const it of delivery.items || []) allowed[it.itemId] = new Set(it.serials || []);
      returns = (Array.isArray(body.returns) ? body.returns : [])
        .map((r) => ({ itemId: String(r.itemId || ""), serials: (Array.isArray(r.serials) ? r.serials : []).map(String).filter((sn) => allowed[String(r.itemId || "")]?.has(sn)) }))
        .filter((r) => r.itemId && r.serials.length);
      if (!returns.length) return Response.json({ error: "Select at least one returned serial number." }, { status: 400 });
    }

    if (returns.length) {
      const settings = await getSettings();
      const assigneeIds = ((settings.taskManagers && settings.taskManagers["delivery-return"]) || settings.logisticsUserIds || []).filter(Boolean);
      if (assigneeIds.length) {
        const task = await createItem("tasks", {
          type: "delivery-return",
          name: `Material return · ${delivery.ref}${status === "rejected" ? " (rejected)" : ""}`,
          departments: [],
          assigneeIds,
          deliveryId: id,
          deliveryRef: delivery.ref,
          projectId: delivery.projectId || "",
          quotationId: delivery.quotationId || "",
          quotationNumber: delivery.quotationNumber || "",
          clientName: delivery.clientName || "",
          projectName: delivery.projectName || "",
          returns,
          done: false,
          createdBy: actor.id,
          createdByLabel: actor.fullName || actor.userId,
          createdAt: now,
        });
        patch.returnTaskId = task.id;
        logActivity({ actor, verb: "created", sectionKey: "tasks", entityType: "tasks", entityId: task.id, label: `Return requested for ${delivery.ref}`, href: "/studio/tasks" }).catch(() => {});
        await notifyUsers({ actor, userIds: assigneeIds, kind: "delivery-request", entityType: "tasks", entityId: task.id, label: `Material return · ${delivery.ref}`, href: "/studio/tasks", settings }).catch(() => {});
      }
      patch.returns = returns;
    }
  }

  const updated = await updateItem("deliveries", id, patch);

  // A delivered/partial delivery is real project progress — move the project off
  // "Received" (never auto-completes; that's the manual handover action).
  if ((status === "completed" || status === "partially-completed") && delivery.projectId) {
    const projects = await getCollection("projects");
    const proj = projects.find((p) => p.id === delivery.projectId);
    if (proj && (proj.stage || "Received") === "Received") {
      const plog = Array.isArray(proj.log) ? proj.log : [];
      await updateItem("projects", proj.id, { stage: "In Progress", log: [...plog, { id: `${Date.now()}-st`, desc: "Status → In Progress", at: now }] });
    }
  }
  logActivity({ actor, verb: "status", sectionKey: "projects-list", entityType: "deliveries", entityId: id, label: `Delivery ${delivery.ref} → ${status}`, href: "/studio/projects/list" }).catch(() => {});
  return Response.json(updated);
}
