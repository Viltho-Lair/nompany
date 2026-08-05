import { getCollection, createItem, updateItem, getSettings } from "@/lib/db";
import { currentUser, unauthorized, forbidden } from "@/lib/session";
import { ADMIN_TAG, SALES_TAG } from "@/lib/authConstants";
import { canSeeTask, enrichTask, resolveTaskAssignees, isProjectLocked, APPROVAL_DEPARTMENTS, APPROVER_DEPARTMENTS } from "@/lib/tasks";
import { logActivity } from "@/lib/activity";
import { notifyUsers } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hasTag = (u, t) => Array.isArray(u?.tags) && u.tags.includes(t);

// GET — the current user's visible tasks, newest first.
export async function GET() {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const [tasks, settings] = await Promise.all([getCollection("tasks"), getSettings()]);
  // Refresh each task's assignees from CURRENT Task settings before deciding
  // visibility, so appointing someone immediately reveals existing tasks to them.
  const visible = tasks
    .map((t) => enrichTask(t, settings))
    .filter((t) => canSeeTask(actor, t))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return Response.json(visible);
}

// POST — create a task. Only the "approval" type is wired for now: raised from a
// Sales ticket once its quotation is Completed, and sent to the Sales/Finance/
// Management leaders for sign-off.
export async function POST(request) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const body = await request.json();

  // --- PO approval task: Sales submits the client PO after project creation,
  // Management approves it, revises the quotation and issues a project number. ---
  if (body.type === "po") {
    if (!hasTag(actor, ADMIN_TAG) && !hasTag(actor, SALES_TAG)) return forbidden();
    const projectId = String(body.projectId || "");
    const projects = await getCollection("projects");
    const project = projects.find((p) => p.id === projectId);
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

    // One open PO task per project at a time.
    const tasks = await getCollection("tasks");
    if (tasks.some((t) => t.type === "po" && t.projectId === projectId && !t.done)) {
      return Response.json({ error: "A PO approval is already pending for this project." }, { status: 409 });
    }

    const poSettings = await getSettings();
    // PO approval goes to Management, and a specific handler must be assigned in
    // Task Management (Tasks → settings) — the task can't be raised without one.
    const assigneeIds = (poSettings.taskManagers?.po || []).filter(Boolean);
    if (!assigneeIds.length) return Response.json({ error: "No user is assigned to PO approval. Set the handler in Tasks → settings first." }, { status: 400 });

    const now = new Date().toISOString();
    const task = await createItem("tasks", {
      type: "po",
      name: `PO approval · ${project.title_en || project.quotationNumber || "project"}`,
      departments: ["Management"],
      assigneeIds,
      projectId,
      ticketId: project.fromTicketId || "",
      quotationId: project.quotationId || "",
      quotationNumber: project.quotationNumber || "",
      clientName: project.clientName || "",
      projectName: project.title_en || "",
      poDescription: String(body.poDescription || "").slice(0, 4000),
      poFileUrl: String(body.poFileUrl || ""),
      done: false,
      createdBy: actor.id,
      createdByLabel: actor.fullName || actor.userId,
      createdAt: now,
    });
    // Reflect the pending state on the project so the Sales-ticket button can
    // show "PO Pending Approval".
    await updateItem("projects", projectId, { poState: "pending", poTaskId: task.id });
    await notifyUsers({ actor, userIds: assigneeIds, kind: "po-awaiting", entityType: "tasks", entityId: task.id, label: `PO approval requested for ${task.projectName || task.clientName}`, href: "/studio/tasks" }).catch(() => {});
    return Response.json(task, { status: 201 });
  }

  // --- Delivery request: a Project Manager selects items from the quotation
  // viewer, sets a quantity per item, and sends a release request to the
  // admin-picked logistics team. ---
  if (body.type === "delivery") {
    const quotationId = String(body.quotationId || "");
    let items = (Array.isArray(body.items) ? body.items : [])
      .map((it) => ({ itemId: String(it.itemId || ""), name: String(it.name || ""), model: String(it.model || ""), qty: Math.max(1, parseInt(it.qty, 10) || 1) }))
      .filter((it) => it.itemId && it.qty > 0);
    if (!items.length) return Response.json({ error: "Select at least one item to request." }, { status: 400 });

    const settings = await getSettings();
    const assigneeIds = ((settings.taskManagers && settings.taskManagers.delivery) || settings.logisticsUserIds || []).filter(Boolean);
    if (!assigneeIds.length) return Response.json({ error: "No users are assigned to manage delivery requests. Set them in Tasks → settings." }, { status: 400 });

    const projects = await getCollection("projects");
    const project = projects.find((p) => p.quotationId === quotationId) || null;
    // No deliveries while the project is frozen pending PO approval.
    if (isProjectLocked(project)) return Response.json({ error: "This project is locked pending PO approval." }, { status: 403 });
    const quotations = await getCollection("quotations");
    const quotation = quotations.find((q) => q.id === quotationId) || null;

    // An item that's already inside an open (not-released) delivery request can't
    // be requested again until that request is closed.
    const allTasks = await getCollection("tasks");
    const openReqItemIds = new Set(
      allTasks
        .filter((t) => t.type === "delivery" && !t.done && t.quotationId === quotationId)
        .flatMap((t) => (t.items || []).map((it) => it.itemId))
    );
    const blocked = items.filter((it) => openReqItemIds.has(it.itemId));
    if (blocked.length) {
      return Response.json({ error: `${blocked.length === 1 ? "An item is" : "Some items are"} already in an open delivery request — close it before requesting again.` }, { status: 409 });
    }

    // Cap each requested quantity at what's still outstanding (ordered − net
    // delivered) so a request can never exceed the remaining balance.
    const deliveries = await getCollection("deliveries");
    const netDelivered = {};
    for (const d of deliveries) {
      if (d.quotationId !== quotationId) continue;
      for (const it of d.items || []) netDelivered[it.itemId] = (netDelivered[it.itemId] || 0) + (Number(it.qty) || 0);
      for (const r of d.returns || []) netDelivered[r.itemId] = (netDelivered[r.itemId] || 0) - ((r.serials || []).length);
    }
    const orderedByItem = {};
    for (const t of quotation?.sheet?.tables || []) for (const r of t.rows || []) {
      if (r.itemId) orderedByItem[r.itemId] = (orderedByItem[r.itemId] || 0) + (Number(r.qty) || 0);
    }
    items = items
      .map((it) => {
        const remaining = (orderedByItem[it.itemId] ?? it.qty) - (netDelivered[it.itemId] || 0);
        return { ...it, qty: Math.min(it.qty, Math.max(0, remaining)) };
      })
      .filter((it) => it.qty > 0);
    if (!items.length) return Response.json({ error: "The selected items have already been fully delivered." }, { status: 400 });

    const now = new Date().toISOString();
    const task = await createItem("tasks", {
      type: "delivery",
      name: `Delivery request · ${project?.title_en || quotation?.title || quotation?.number || "project"}`,
      departments: [],
      assigneeIds,
      projectId: project?.id || "",
      projectNumber: project?.projectNumber || "",
      quotationId,
      quotationNumber: quotation?.number || project?.quotationNumber || "",
      clientName: project?.clientName || quotation?.clientName || "",
      projectName: project?.title_en || quotation?.title || "",
      items,
      done: false,
      createdBy: actor.id,
      createdByLabel: actor.fullName || actor.userId,
      createdAt: now,
    });
    // Record the request on the project's own log too.
    if (project) {
      const plog = Array.isArray(project.log) ? project.log : [];
      const n = items.reduce((a, it) => a + (Number(it.qty) || 0), 0);
      await updateItem("projects", project.id, { log: [...plog, { id: `${Date.now()}-dr`, desc: `Delivery requested (${items.length} item${items.length === 1 ? "" : "s"}, ${n} unit${n === 1 ? "" : "s"})`, at: now, by: actor.fullName || actor.userId }] });
    }
    logActivity({ actor, verb: "created", sectionKey: "tasks", entityType: "tasks", entityId: task.id, label: `Delivery requested for ${task.projectName || task.clientName}`, href: "/studio/tasks" }).catch(() => {});
    await notifyUsers({ actor, userIds: assigneeIds, kind: "delivery-request", entityType: "tasks", entityId: task.id, label: `Delivery request · ${task.projectName || task.clientName}`, href: "/studio/tasks" }).catch(() => {});
    return Response.json(task, { status: 201 });
  }

  // --- Permit request: raised from a project's Client → Permits box when the
  // permit matching the project's city is expiring (<7 days) or missing. Sent to
  // the Permit team configured in Task settings. ---
  if (body.type === "permit-request") {
    const projectId = String(body.projectId || "");
    const projects = await getCollection("projects");
    const project = projects.find((p) => p.id === projectId);
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

    const settings = await getSettings();
    const assigneeIds = (settings.taskManagers?.["permit-request"] || []).filter(Boolean);
    if (!assigneeIds.length) return Response.json({ error: "No user is assigned to permit requests. Set the handler in Tasks → settings first." }, { status: 400 });

    // One open permit request per project at a time.
    const tasks = await getCollection("tasks");
    if (tasks.some((t) => t.type === "permit-request" && t.projectId === projectId && !t.done)) {
      return Response.json({ error: "A permit request is already pending for this project." }, { status: 409 });
    }

    const contact = body.permitContact && typeof body.permitContact === "object" ? body.permitContact : {};
    const now = new Date().toISOString();
    const task = await createItem("tasks", {
      type: "permit-request",
      name: `Permit request · ${project.title_en || project.projectNumber || "project"}`,
      departments: [],
      assigneeIds,
      projectId,
      projectNumber: project.projectNumber || "",
      projectName: project.title_en || "",
      clientName: project.clientName || "",
      city: project.locationCity || "",
      locationName: project.location_en || "",
      locationUrl: project.locationUrl || "",
      permitContact: {
        name: String(contact.name || "").slice(0, 200),
        email: String(contact.email || "").slice(0, 200),
        phone: String(contact.phone || "").slice(0, 60),
      },
      note: String(body.note || "").slice(0, 2000),
      done: false,
      createdBy: actor.id,
      createdByLabel: actor.fullName || actor.userId,
      createdAt: now,
    });
    logActivity({ actor, verb: "created", sectionKey: "tasks", entityType: "tasks", entityId: task.id, label: `Permit requested for ${task.projectName || task.clientName}`, href: "/studio/tasks" }).catch(() => {});
    await notifyUsers({ actor, userIds: assigneeIds, kind: "permit-request", entityType: "tasks", entityId: task.id, label: `Permit request · ${task.projectName || task.clientName}`, href: "/studio/tasks" }).catch(() => {});
    return Response.json(task, { status: 201 });
  }

  if (body.type !== "approval") {
    return Response.json({ error: "Unsupported task type" }, { status: 400 });
  }
  // Sales (or admin) raises the approval request.
  if (!hasTag(actor, ADMIN_TAG) && !hasTag(actor, SALES_TAG)) return forbidden();

  const ticketId = String(body.ticketId || "");
  const tickets = await getCollection("salesTickets");
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return Response.json({ error: "Ticket not found" }, { status: 404 });

  // Must have a Completed quotation to approve.
  const quotations = await getCollection("quotations");
  const completed = quotations
    .filter((q) => q.fromTicketId === ticketId && q.status === "Completed")
    .sort((a, b) => (b.completedAt || b.createdAt || "").localeCompare(a.completedAt || a.createdAt || ""));
  const quotation = completed[0];
  if (!quotation) return Response.json({ error: "This ticket has no completed quotation to approve." }, { status: 400 });

  // Cooldown + duplicate guards.
  if (ticket.approvalTaskId) {
    return Response.json({ error: "An approval request is already active for this ticket." }, { status: 409 });
  }
  if (ticket.approvalCooldownUntil && new Date(ticket.approvalCooldownUntil).getTime() > Date.now()) {
    return Response.json({ error: "This ticket is in an approval cooldown. Please wait before sending again." }, { status: 429 });
  }

  const users = await getCollection("users");
  const nameOf = (id) => { const u = users.find((x) => x.id === id); return u ? (u.fullName || u.userId) : ""; };

  const salesOwner = ticket.assignedTo || ticket.createdBy || "";
  const approvals = {};
  for (const d of APPROVER_DEPARTMENTS) approvals[d] = { approved: false, by: "", byLabel: "", at: "" };
  const apprSettings = await getSettings();
  // Per-department approvers come from Task settings (Sales person approves for
  // Sales, Management person for Management). Reads re-resolve this live, but we
  // snapshot it on the record too.
  const { assigneeIds: apprAssignees, approverAssignees } = resolveTaskAssignees({ type: "approval" }, apprSettings);

  const task = await createItem("tasks", {
    type: "approval",
    name: `Approval for Quotation ${quotation.number}${Number(quotation.revision) > 1 ? ` Rev ${quotation.revision}` : ""}`,
    departments: APPROVAL_DEPARTMENTS,
    // Assigned approvers from Task settings (per department + a flat union).
    assigneeIds: apprAssignees,
    approverAssignees,
    approvals,
    ticketId,
    ticketRef: ticket.ticketRef || "",
    quotationId: quotation.id,
    quotationNumber: quotation.number || "",
    quotationRevision: quotation.revision || 1,
    clientName: ticket.clientName || quotation.clientName || "",
    projectName: ticket.title || quotation.title || "",
    contactName: ticket.contactName || "",
    contactEmail: ticket.contactEmail || "",
    contactPhone: ticket.contactPhone || "",
    handledBySales: salesOwner,
    handledBySalesLabel: nameOf(salesOwner),
    handledByTechnical: quotation.handledBy || "",
    handledByTechnicalLabel: nameOf(quotation.handledBy),
    sentToProjects: false,
    projectId: "",
    createdBy: actor.id,
    createdByLabel: actor.fullName || actor.userId,
    createdAt: new Date().toISOString(),
  });

  await updateItem("salesTickets", ticketId, { approvalTaskId: task.id, approvalState: "pending", approvalCooldownUntil: "", updatedAt: new Date().toISOString() });
  // Notify the assigned Sales & Management approvers (personal notifications).
  await notifyUsers({ actor, userIds: apprAssignees, kind: "approval-awaiting", entityType: "tasks", entityId: task.id, label: task.name, href: "/studio/tasks" }).catch(() => {});
  return Response.json(task, { status: 201 });
}
