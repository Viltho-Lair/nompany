import { getCollection, updateItem, deleteItem, createItem, getSettings } from "@/lib/db";
import { currentUser, unauthorized, forbidden } from "@/lib/session";
import { ADMIN_TAG, SALES_TAG } from "@/lib/authConstants";
import { canSeeTask, canApprove, bothApproved, canSendToProjects, isLeader, isAssignee, canApprovePo, canEnterProjectNumber, poFullyApproved, canApproveMaterial, materialBothApproved, enrichTask, APPROVAL_COOLDOWN_MS } from "@/lib/tasks";
import { deriveRequirements } from "@/lib/projectKpis";
import { logActivity } from "@/lib/activity";
import { notifyUsers } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hasTag = (u, t) => Array.isArray(u?.tags) && u.tags.includes(t);

// Load a task with its assignees refreshed from CURRENT Task settings, so every
// permission check (see / approve / act) reflects the latest appointments.
async function load(id) {
  const [tasks, settings] = await Promise.all([getCollection("tasks"), getSettings()]);
  const t = tasks.find((x) => x.id === id) || null;
  return t ? enrichTask(t, settings) : null;
}

export async function GET(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const { id } = await params;
  const task = await load(id);
  if (!task) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canSeeTask(actor, task)) return forbidden();
  return Response.json(task);
}

// DELETE — cancel an approval request. The Sales sender (or admin) may cancel;
// the ticket enters a cooldown before another request can be sent.
export async function DELETE(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const { id } = await params;
  const task = await load(id);
  if (!task) return Response.json({ error: "Not found" }, { status: 404 });

  // Cancel a delivery request / return task — the requester, an assignee, or an
  // admin may cancel while it's still pending; it's logged on the project.
  if (task.type === "delivery" || task.type === "delivery-return") {
    if (!canSeeTask(actor, task)) return forbidden();
    if (task.done) return Response.json({ error: "This request has already been processed and can't be cancelled." }, { status: 409 });
    if (task.projectId) {
      const projects = await getCollection("projects");
      const proj = projects.find((p) => p.id === task.projectId);
      if (proj) {
        const n = (task.items || []).length;
        const desc = task.type === "delivery"
          ? `Delivery request rejected (${n} item${n === 1 ? "" : "s"})`
          : `Material-return request cancelled${task.deliveryRef ? ` for ${task.deliveryRef}` : ""}`;
        const plog = Array.isArray(proj.log) ? proj.log : [];
        await updateItem("projects", proj.id, { log: [...plog, { id: `${Date.now()}-cx`, desc, at: new Date().toISOString(), by: actor.fullName || actor.userId }] });
      }
    }
    await deleteItem("tasks", id);
    await logActivity({ actor, verb: "deleted", sectionKey: "tasks", entityType: "tasks", entityId: id, label: `${task.name || "Delivery request"} ${task.type === "delivery" ? "rejected" : "cancelled"}`, href: "/studio/tasks" }).catch(() => {});
    return Response.json({ ok: true });
  }

  if (!hasTag(actor, ADMIN_TAG) && !hasTag(actor, SALES_TAG) && task.createdBy !== actor.id) return forbidden();

  // Only an approval task's cancellation resets the ticket's approval state.
  if (task.type !== "po" && task.ticketId) {
    await updateItem("salesTickets", task.ticketId, {
      approvalTaskId: "",
      approvalState: "",
      approvalCooldownUntil: new Date(Date.now() + APPROVAL_COOLDOWN_MS).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  // Cancelling a pending PO approval clears the project's PO state so the
  // Sales-ticket button reverts to "Submit PO".
  if (task.type === "po" && task.projectId && !task.done) {
    await updateItem("projects", task.projectId, { poState: "", poTaskId: "" });
  }
  await deleteItem("tasks", id);
  return Response.json({ ok: true });
}

export async function PUT(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const { id } = await params;
  const task = await load(id);
  if (!task) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canSeeTask(actor, task)) return forbidden();

  const body = await request.json();
  const now = new Date().toISOString();

  // --- Assign the project manager (leader only) ----------------------------
  if (body.action === "set-manager") {
    if (!isLeader(actor) && !isAssignee(actor, task)) return forbidden();
    if (task.sentToProjects) return Response.json({ error: "Already sent to Projects." }, { status: 409 });
    const userId = String(body.userId || "");
    const users = await getCollection("users");
    const u = users.find((x) => x.id === userId);
    const updated = await updateItem("tasks", id, { projectManagerId: userId, projectManagerLabel: u ? (u.fullName || u.userId) : "" });
    if (userId) await notifyUsers({ actor, userIds: [userId], kind: "pm-assigned", entityType: "tasks", entityId: id, label: `You were assigned as project manager for ${task.projectName || task.clientName || task.name}`, href: "/studio/tasks" }).catch(() => {});
    return Response.json(updated);
  }

  // --- Approve a department ------------------------------------------------
  if (body.action === "approve") {
    const dept = String(body.department || "");
    if (!canApprove(actor, dept, task)) return forbidden();
    // Management can't approve until a project manager (project owner) is set.
    if (dept === "Management" && !task.projectManagerId) {
      return Response.json({ error: "A project manager must be assigned before Management can approve." }, { status: 400 });
    }
    const approvals = { ...(task.approvals || {}) };
    approvals[dept] = { approved: true, by: actor.id, byLabel: actor.fullName || actor.userId, at: now };
    const updated = await updateItem("tasks", id, { approvals });
    // Once both required departments have approved, mark the ticket approved
    // (default status → Commit) AND mark the quotation itself approved.
    if (bothApproved(updated)) {
      if (task.ticketId) await updateItem("salesTickets", task.ticketId, { approvalState: "approved", status: "Commit", updatedAt: now });
      if (task.quotationId) await updateItem("quotations", task.quotationId, { approved: true, approvedAt: now });
    }
    logActivity({ actor, verb: "status", sectionKey: "tasks", entityType: "tasks", entityId: id, label: `${dept} approved ${task.name}`, href: "/studio/tasks" }).catch(() => {});
    return Response.json(updated);
  }

  // --- Un-approve (toggle off) --------------------------------------------
  if (body.action === "unapprove") {
    const dept = String(body.department || "");
    if (!canApprove(actor, dept, task)) return forbidden();
    if (task.sentToProjects) return Response.json({ error: "Already sent to Projects." }, { status: 409 });
    const approvals = { ...(task.approvals || {}) };
    approvals[dept] = { approved: false, by: "", byLabel: "", at: "" };
    const updated = await updateItem("tasks", id, { approvals });
    return Response.json(updated);
  }

  // --- Send to Projects ----------------------------------------------------
  if (body.action === "send-to-projects") {
    if (task.sentToProjects) return Response.json({ error: "Already sent to Projects." }, { status: 409 });
    if (!bothApproved(task)) return Response.json({ error: "Both approvals are required first." }, { status: 400 });
    if (!canSendToProjects(actor, task)) return forbidden();

    const quotations = await getCollection("quotations");
    const quotation = quotations.find((q) => q.id === task.quotationId) || null;
    const tickets = await getCollection("salesTickets");
    const ticket = tickets.find((t) => t.id === task.ticketId) || null;
    const services = await getCollection("services");
    // Project's KPI service = the ticket's first selected service (its title).
    const firstServiceId = Array.isArray(ticket?.serviceIds) ? ticket.serviceIds[0] : null;
    const firstService = firstServiceId ? services.find((s) => s.id === firstServiceId) : null;

    // Resolve the quotation's items to derive the project requirements: Delivery
    // + Handover always; Installation/Programming from the item scope minus the
    // per-service "Without …" exclusions carried on the ticket.
    const invItems = await getCollection("inventoryItems");
    const invById = Object.fromEntries(invItems.map((i) => [i.id, i]));
    const qTables = Array.isArray(quotation?.sheet?.tables) ? quotation.sheet.tables : [];
    const quotationItems = [];
    for (const t of qTables) for (const r of (t.rows || [])) { const it = invById[r.itemId]; if (it) quotationItems.push(it); }
    const derivedRequirements = deriveRequirements({
      services,
      serviceIds: Array.isArray(ticket?.serviceIds) ? ticket.serviceIds : [],
      serviceRequirements: ticket?.serviceRequirements || {},
      items: quotationItems,
    });

    const project = await createItem("projects", {
      title_en: task.projectName || quotation?.title || task.name,
      title_ar: "",
      // Location carried from the sales ticket (name / city / link).
      location_en: ticket?.location?.name || "",
      location_ar: "",
      locationCity: ticket?.location?.city || "",
      locationUrl: ticket?.location?.url || "",
      year: String(new Date().getFullYear()),
      category: firstService?.title_en || "",
      desc_en: quotation?.description || ticket?.description || "",
      desc_ar: "",
      image: "",
      stage: "Received",
      // Project owner = the manager assigned on the approval task.
      ownerId: task.projectManagerId || "",
      ownerLabel: task.projectManagerLabel || "",
      // All the info we can carry from the Sales ticket.
      clientId: ticket?.clientId || "",
      clientName: task.clientName || ticket?.clientName || "",
      contactName: ticket?.contactName || "",
      contactEmail: ticket?.contactEmail || "",
      contactPhone: ticket?.contactPhone || "",
      industry: ticket?.industry || "",
      urgency: ticket?.urgency || "",
      serviceIds: Array.isArray(ticket?.serviceIds) ? ticket.serviceIds : [],
      requirements: derivedRequirements,
      serviceRequirements: ticket?.serviceRequirements || {},
      projectSize: quotation?.projectSize || ticket?.projectSize || "",
      dealValue: ticket?.value ?? "",
      deadline: ticket?.deadline || "",
      ticketRef: ticket?.ticketRef || "",
      // Trace back to the approved quotation so the project page can link to
      // its itemised list.
      quotationId: task.quotationId || "",
      quotationNumber: task.quotationNumber || "",
      // Received date = the day this quotation approval was sent to Projects.
      receivedDate: now.slice(0, 10),
      // Finance fields — filled once Finance processes the submitted PO.
      poNumber: "",
      projectNumber: "",
      // Passed-down dates for the Finance list / audit trail.
      ticketCreatedAt: ticket?.createdAt || "",
      quotationCreatedAt: quotation?.createdAt || "",
      quotationCompletedAt: quotation?.completedAt || "",
      approvedAt: now,
      dealValueLabel: ticket?.value ?? "",
      fromTaskId: task.id,
      fromTicketId: task.ticketId || "",
      gallery: [],
      comments: [],
      kpiProgress: {},
      log: [
        { id: `${Date.now()}-c`, desc: "Project created", at: now },
        { id: `${Date.now()}-q`, desc: `Quotation ${task.quotationNumber || ""} added`.trim(), at: now },
      ],
    });

    // Mirror the approved quotation's items into an Inventory Project Sheet —
    // a read-only image/model/qty snapshot with an editable serial-numbers
    // column, keyed to the quotation reference. The item install/program flags
    // are snapshotted onto each row so completion KPIs can read them directly.
    await createItem("projectSheets", {
      projectId: project.id,
      projectTitle: project.title_en || "",
      quotationId: quotation?.id || "",
      quotationNumber: quotation?.number || "",
      clientName: project.clientName || "",
      tables: qTables.map((t) => ({
        id: t.id,
        title: t.title || "",
        rows: (Array.isArray(t.rows) ? t.rows : []).map((r) => {
          const it = invById[r.itemId] || {};
          return { id: r.id, itemId: r.itemId || "", name: it.name || "", model: it.modelNumber || "", image: it.image || "", qty: Number(r.qty) || 0, needsInstallation: !!it.needsInstallation, needsProgramming: !!it.needsProgramming, serials: "" };
        }),
      })),
      createdAt: now,
    });

    if (task.ticketId) await updateItem("salesTickets", task.ticketId, { approvalState: "completed", projectId: project.id, updatedAt: now });
    // Forward-link the quotation to its project too, so Technical/Sales can reach
    // the project in one hop instead of scanning all projects.
    if (task.quotationId) await updateItem("quotations", task.quotationId, { projectId: project.id });
    // Sending to Projects completes the approval task — it leaves the open queue.
    const updated = await updateItem("tasks", id, { sentToProjects: true, done: true, doneAt: now, doneBy: actor.fullName || actor.userId, projectId: project.id, sentToProjectsAt: now, sentToProjectsBy: actor.id });
    await logActivity({ actor, verb: "created", sectionKey: "projects-list", entityType: "projects", entityId: project.id, label: `Project created from ${task.name}`, href: "/studio/projects/list" }).catch(() => {});
    return Response.json({ ...updated, project });
  }

  // --- PO approval is two-party. Management approves the PO + enters the PO
  // number; Finance enters the project number. Once BOTH are in, the project is
  // unlocked (poState → approved) with its numbers, and the ticket is completed
  // (Closed Won). Either action can land first. -----------------------------
  if (body.action === "po-approve" || body.action === "po-project-number") {
    if (task.type !== "po") return Response.json({ error: "Not a PO task." }, { status: 400 });
    if (task.done) return Response.json({ error: "Already completed." }, { status: 409 });

    const patch = {};
    if (body.action === "po-approve") {
      if (!canApprovePo(actor, task)) return forbidden();
      const poNumber = String(body.poNumber || "").trim();
      if (!poNumber) return Response.json({ error: "A PO number is required." }, { status: 400 });
      patch.poNumber = poNumber;
      patch.poApproved = true;
      patch.poApprovedBy = actor.fullName || actor.userId;
      patch.poApprovedAt = now;
    } else {
      if (!canEnterProjectNumber(actor, task)) return forbidden();
      const projectNumber = String(body.projectNumber || "").trim();
      if (!projectNumber) return Response.json({ error: "A project number is required." }, { status: 400 });
      patch.projectNumber = projectNumber;
      patch.projectNumberBy = actor.fullName || actor.userId;
      patch.projectNumberAt = now;
    }

    let updated = await updateItem("tasks", id, patch);

    if (poFullyApproved(updated)) {
      if (task.projectId) {
        await updateItem("projects", task.projectId, {
          poNumber: updated.poNumber || "",
          projectNumber: updated.projectNumber || "",
          poFileUrl: task.poFileUrl || "",
          poDescription: task.poDescription || "",
          poState: "approved",
          poApprovedAt: updated.poApprovedAt || now,
          poApprovedBy: updated.poApprovedBy || "",
          financeConfirmedAt: now,
          financeConfirmedBy: updated.projectNumberBy || (actor.fullName || actor.userId),
        });
      }
      // Carry the numbers back to the ticket + quotation; the ticket is now a
      // completed sale (Closed Won).
      if (task.ticketId) await updateItem("salesTickets", task.ticketId, { poNumber: updated.poNumber || "", projectNumber: updated.projectNumber || "", status: "Closed Won", updatedAt: now });
      if (task.quotationId) await updateItem("quotations", task.quotationId, { poNumber: updated.poNumber || "", projectNumber: updated.projectNumber || "" });
      updated = await updateItem("tasks", id, { done: true, doneAt: now, doneBy: actor.fullName || actor.userId });
      await logActivity({ actor, verb: "status", sectionKey: "projects-list", entityType: "projects", entityId: task.projectId, label: `PO ${updated.poNumber} approved · project number ${updated.projectNumber} issued for ${task.projectName || task.clientName}`, href: "/studio/projects/list" }).catch(() => {});
    } else {
      await logActivity({ actor, verb: "status", sectionKey: "tasks", entityType: "tasks", entityId: id, label: body.action === "po-approve" ? `PO approved for ${task.projectName || task.clientName}` : `Project number entered for ${task.projectName || task.clientName}`, href: "/studio/tasks" }).catch(() => {});
    }
    return Response.json(updated);
  }

  // --- Vendor material-PO approval — Finance + Management each approve; when
  // both are in, the task is done and the linked material order is approved. --
  if (body.action === "material-approve") {
    if (task.type !== "material-po") return Response.json({ error: "Not a material-PO task." }, { status: 400 });
    if (task.done) return Response.json({ error: "Already completed." }, { status: 409 });
    const dept = String(body.department || "");
    if (!canApproveMaterial(actor, dept, task)) return forbidden();
    const approvals = { ...(task.approvals || {}) };
    approvals[dept] = { approved: true, by: actor.id, byLabel: actor.fullName || actor.userId, at: now };
    let updated = await updateItem("tasks", id, { approvals });
    if (materialBothApproved(updated)) {
      if (task.orderId) await updateItem("materialOrders", task.orderId, { status: "approved", approvedAt: now }).catch(() => {});
      updated = await updateItem("tasks", id, { done: true, doneAt: now, doneBy: actor.fullName || actor.userId });
      await logActivity({ actor, verb: "status", sectionKey: "inventory-tracking", entityType: "materialOrders", entityId: task.orderId, label: `Vendor PO approved for ${task.vendorName || "a vendor"}`, href: "/studio/inventory/tracking" }).catch(() => {});
    } else {
      await logActivity({ actor, verb: "status", sectionKey: "tasks", entityType: "tasks", entityId: id, label: `${dept} approved vendor PO for ${task.vendorName || "a vendor"}`, href: "/studio/tasks" }).catch(() => {});
    }
    return Response.json(updated);
  }

  // --- The requester (PM) proposes new quantities on an open delivery request.
  // Stored as a pending change on the same task; Logistics approves/rejects. ---
  if (body.action === "request-qty-change") {
    if (task.type !== "delivery") return Response.json({ error: "Not a delivery task." }, { status: 400 });
    if (task.done) return Response.json({ error: "This request has already been processed." }, { status: 409 });
    const cur = Array.isArray(task.items) ? task.items : [];
    const byId = Object.fromEntries(cur.map((it) => [it.itemId, it]));
    const items = (Array.isArray(body.items) ? body.items : [])
      .filter((it) => byId[String(it.itemId || "")])
      .map((it) => {
        const base = byId[String(it.itemId)];
        return { itemId: base.itemId, name: base.name, model: base.model || "", qty: Math.max(0, parseInt(it.qty, 10) || 0) };
      });
    if (!items.length) return Response.json({ error: "Nothing to change." }, { status: 400 });
    const changed = items.some((it) => (Number(it.qty) || 0) !== (Number(byId[it.itemId]?.qty) || 0));
    if (!changed) return Response.json({ error: "No quantity was changed." }, { status: 400 });
    const qtyChange = { items, by: actor.id, byLabel: actor.fullName || actor.userId, at: now, status: "pending" };
    const updated = await updateItem("tasks", id, { qtyChange });
    if (Array.isArray(task.assigneeIds) && task.assigneeIds.length) {
      await notifyUsers({ actor, userIds: task.assigneeIds, kind: "delivery-request", entityType: "tasks", entityId: id, label: `Quantity change requested · ${task.projectName || task.name}`, href: "/studio/tasks" }).catch(() => {});
    }
    await logActivity({ actor, verb: "status", sectionKey: "tasks", entityType: "tasks", entityId: id, label: `Quantity change requested on ${task.name}`, href: "/studio/tasks" }).catch(() => {});
    return Response.json(updated);
  }

  // --- Logistics approves / rejects a requested quantity change. Approving
  // applies it to the request's items (an item set to 0 is dropped; if none
  // remain the whole request is cancelled). ---
  if (body.action === "approve-qty-change" || body.action === "reject-qty-change") {
    if (task.type !== "delivery") return Response.json({ error: "Not a delivery task." }, { status: 400 });
    if (task.done) return Response.json({ error: "Already processed." }, { status: 409 });
    if (!(isAssignee(actor, task) || hasTag(actor, ADMIN_TAG))) return forbidden();
    if (task.qtyChange?.status !== "pending") return Response.json({ error: "No pending change." }, { status: 400 });
    const requesterId = task.qtyChange.by;

    if (body.action === "reject-qty-change") {
      const updated = await updateItem("tasks", id, { qtyChange: { ...task.qtyChange, status: "rejected", decidedBy: actor.fullName || actor.userId, decidedAt: now } });
      if (requesterId) await notifyUsers({ actor, userIds: [requesterId], kind: "delivery-request", entityType: "tasks", entityId: id, label: `Quantity change rejected · ${task.projectName || task.name}`, href: "/studio/tasks" }).catch(() => {});
      return Response.json(updated);
    }

    const nextItems = (task.qtyChange.items || []).filter((it) => (Number(it.qty) || 0) > 0);
    if (!nextItems.length) {
      // All items dropped → cancel the request entirely.
      if (task.projectId) {
        const projects = await getCollection("projects");
        const proj = projects.find((p) => p.id === task.projectId);
        if (proj) {
          const plog = Array.isArray(proj.log) ? proj.log : [];
          await updateItem("projects", proj.id, { log: [...plog, { id: `${Date.now()}-qc`, desc: `Delivery request ${task.name} cancelled (quantities set to 0)`, at: now, by: actor.fullName || actor.userId }] });
        }
      }
      const updated = await updateItem("tasks", id, { items: [], qtyChange: { ...task.qtyChange, status: "approved", decidedBy: actor.fullName || actor.userId, decidedAt: now }, done: true, doneAt: now, doneBy: actor.fullName || actor.userId, cancelledByQtyChange: true });
      if (requesterId) await notifyUsers({ actor, userIds: [requesterId], kind: "delivery-request", entityType: "tasks", entityId: id, label: `Delivery request cancelled (quantities set to 0) · ${task.projectName || task.name}`, href: "/studio/tasks" }).catch(() => {});
      await logActivity({ actor, verb: "status", sectionKey: "tasks", entityType: "tasks", entityId: id, label: `Delivery request cancelled via quantity change`, href: "/studio/tasks" }).catch(() => {});
      return Response.json(updated);
    }

    const updated = await updateItem("tasks", id, { items: nextItems, qtyChange: { ...task.qtyChange, status: "approved", decidedBy: actor.fullName || actor.userId, decidedAt: now } });
    if (requesterId) await notifyUsers({ actor, userIds: [requesterId], kind: "delivery-request", entityType: "tasks", entityId: id, label: `Quantity change approved · ${task.projectName || task.name}`, href: "/studio/tasks" }).catch(() => {});
    await logActivity({ actor, verb: "status", sectionKey: "tasks", entityType: "tasks", entityId: id, label: `Quantity change approved on ${task.name}`, href: "/studio/tasks" }).catch(() => {});
    return Response.json(updated);
  }

  // --- Logistics confirms release of a delivery request → creates a delivery
  // note (DN-<project#>-<n>, status In-progress) under the quotation, with the
  // requested items aggregated (qty summed per item+model) and the booked
  // serial numbers gathered from the project sheet. ---
  if (body.action === "confirm-delivery-release") {
    if (task.type !== "delivery") return Response.json({ error: "Not a delivery task." }, { status: 400 });
    if (task.done) return Response.json({ error: "Already released." }, { status: 409 });

    // Booked serials per item, from this project's sheet.
    const sheets = await getCollection("projectSheets");
    const sheet = sheets.find((s) => s.projectId === task.projectId) || sheets.find((s) => s.quotationId === task.quotationId) || null;
    const serialsByItem = {};
    if (sheet) {
      for (const t of sheet.tables || []) for (const r of t.rows || []) {
        if (!r.itemId) continue;
        const arr = Array.isArray(r.serials) ? r.serials : [];
        serialsByItem[r.itemId] = [...(serialsByItem[r.itemId] || []), ...arr];
      }
    }
    // Serials already handed out on earlier deliveries for this project can't be
    // assigned again to this release.
    const deliveries = await getCollection("deliveries");
    const usedSerials = new Set();
    for (const d of deliveries) {
      if (d.projectId !== task.projectId && d.quotationId !== task.quotationId) continue;
      for (const it of d.items || []) for (const sn of it.serials || []) usedSerials.add(sn);
    }
    // Aggregate requested items by itemId+model.
    const agg = {};
    for (const it of task.items || []) {
      const key = `${it.itemId}__${it.model || ""}`;
      if (!agg[key]) agg[key] = { itemId: it.itemId, name: it.name, model: it.model || "", qty: 0, serials: [] };
      agg[key].qty += Number(it.qty) || 0;
    }
    // Assign from booked serials NOT already delivered. If any item is short,
    // block release and point the user to Project Sheets to book serials.
    const short = [];
    for (const key of Object.keys(agg)) {
      const a = agg[key];
      const pool = [...new Set(serialsByItem[a.itemId] || [])].filter((sn) => !usedSerials.has(sn));
      if (pool.length < a.qty) short.push({ name: a.name || a.itemId, need: a.qty, have: pool.length });
      a.serials = pool.slice(0, a.qty);
    }
    if (short.length) {
      const detail = short.map((s) => `${s.name} (${s.have}/${s.need})`).join(", ");
      return Response.json({ error: `Not enough serial numbers booked. Assign them in Inventory → Project Sheets, then release: ${detail}.`, needSerials: true, short }, { status: 400 });
    }
    const items = Object.values(agg);

    // Delivery reference: DN-<CLIENTNOSPACECAPS>-<SERVICECODE>-<n>.
    const projects = await getCollection("projects");
    const services = await getCollection("services");
    const project = projects.find((p) => p.id === task.projectId) || null;
    const svc = (project?.serviceIds?.[0] && services.find((s) => s.id === project.serviceIds[0]))
      || services.find((s) => String(s.title_en || "").trim().toLowerCase() === String(project?.category || "").trim().toLowerCase())
      || null;
    const clientPart = String(task.clientName || project?.clientName || "").replace(/\s+/g, "").toUpperCase() || "CLIENT";
    const servicePart = String(svc?.code || "").replace(/\s+/g, "").toUpperCase() || "SVC";
    const n = deliveries.filter((d) => d.projectId === task.projectId).length + 1;
    const ref = `DN-${clientPart}-${servicePart}-${String(n).padStart(2, "0")}`;

    const delivery = await createItem("deliveries", {
      ref,
      projectId: task.projectId || "",
      quotationId: task.quotationId || "",
      quotationNumber: task.quotationNumber || "",
      clientName: task.clientName || "",
      projectName: task.projectName || "",
      status: "in-progress",
      items,
      taskId: id,
      requestedBy: task.createdByLabel || "",
      releasedBy: actor.fullName || actor.userId,
      createdAt: now,
    });
    await updateItem("tasks", id, { done: true, doneAt: now, doneBy: actor.fullName || actor.userId, deliveryId: delivery.id, deliveryRef: ref });
    // Log the delivery on the project's own activity log.
    if (project) {
      const plog = Array.isArray(project.log) ? project.log : [];
      await updateItem("projects", project.id, { log: [...plog, { id: `${Date.now()}-dl`, desc: `Delivery ${ref} released (${items.length} item${items.length === 1 ? "" : "s"})`, at: now, by: actor.fullName || actor.userId }] });
    }
    await logActivity({ actor, verb: "created", sectionKey: "projects-list", entityType: "deliveries", entityId: delivery.id, label: `Delivery ${ref} released for ${task.projectName || task.clientName}`, href: "/studio/projects/list" }).catch(() => {});
    return Response.json({ ok: true, delivery });
  }

  // --- Logistics confirms receipt of RETURNED material → returned serials move
  // from the item's `booked` list back to available `serials`, and are un-booked
  // from the project sheet row. ---
  if (body.action === "confirm-return-receipt") {
    if (task.type !== "delivery-return") return Response.json({ error: "Not a return task." }, { status: 400 });
    if (task.done) return Response.json({ error: "Already received." }, { status: 409 });

    const returns = Array.isArray(task.returns) ? task.returns : [];
    const returnedByItem = {};
    for (const r of returns) returnedByItem[r.itemId] = new Set(r.serials || []);

    // 1) Stock: booked → available for each returned serial.
    const stockAll = await getCollection("inventoryStock");
    for (const r of returns) {
      const st = stockAll.find((s) => s.itemId === r.itemId);
      if (!st) continue;
      const serials = Array.isArray(st.serials) ? [...st.serials] : [];
      let booked = Array.isArray(st.booked) ? [...st.booked] : [];
      for (const sn of r.serials) {
        const bi = booked.findIndex((b) => b.serial === sn);
        if (bi >= 0) booked.splice(bi, 1);
        if (!serials.includes(sn)) serials.push(sn);
      }
      await updateItem("inventoryStock", st.id, { serials, booked });
    }

    // 2) Project sheet: drop returned serials from their booked rows.
    const sheets = await getCollection("projectSheets");
    const sheet = sheets.find((s) => s.projectId === task.projectId) || sheets.find((s) => s.quotationId === task.quotationId);
    if (sheet) {
      const tables = (sheet.tables || []).map((t) => ({
        ...t,
        rows: (t.rows || []).map((r) => {
          const ret = returnedByItem[r.itemId];
          if (!ret || !Array.isArray(r.serials)) return r;
          return { ...r, serials: r.serials.filter((sn) => !ret.has(sn)) };
        }),
      }));
      await updateItem("projectSheets", sheet.id, { tables });
    }

    // 3) Mark the return task done + note it on the delivery + project log.
    await updateItem("tasks", id, { done: true, doneAt: now, doneBy: actor.fullName || actor.userId });
    if (task.deliveryId) await updateItem("deliveries", task.deliveryId, { returnsReceivedAt: now, returnsReceivedBy: actor.fullName || actor.userId });
    if (task.projectId) {
      const projects = await getCollection("projects");
      const proj = projects.find((p) => p.id === task.projectId);
      if (proj) {
        const returnedCount = returns.reduce((a, r) => a + (r.serials || []).length, 0);
        const plog = Array.isArray(proj.log) ? proj.log : [];
        // Returned serials are no longer installed/programmed — drop their marks
        // so the completion % can't count units that left the project.
        const returnedSet = new Set(returns.flatMap((r) => r.serials || []));
        const cleanMap = (m) => {
          if (!m || typeof m !== "object") return m;
          const out = {};
          for (const [k, v] of Object.entries(m)) if (!returnedSet.has(k)) out[k] = v;
          return out;
        };
        await updateItem("projects", proj.id, {
          installedSerials: cleanMap(proj.installedSerials),
          programmedSerials: cleanMap(proj.programmedSerials),
          log: [...plog, { id: `${Date.now()}-rr`, desc: `Returned material received for ${task.deliveryRef || "a delivery"} (${returnedCount} serial${returnedCount === 1 ? "" : "s"}) — reassigned to stock`, at: now, by: actor.fullName || actor.userId }],
        });
      }
    }
    await logActivity({ actor, verb: "status", sectionKey: "projects-list", entityType: "deliveries", entityId: task.deliveryId || "", label: `Returned material received for ${task.deliveryRef || "a delivery"} — reassigned to stock`, href: "/studio/inventory/stock" }).catch(() => {});
    return Response.json({ ok: true });
  }

  // --- Confirm an information update: the assigned handler enters the
  // employee's new ID expiry date; it's written to the employee and the task is
  // closed. The new expiry date is mandatory. ---
  if (body.action === "confirm-id-update") {
    if (task.type !== "id-update") return Response.json({ error: "Not an information-update task." }, { status: 400 });
    if (task.done) return Response.json({ error: "Already completed." }, { status: 409 });
    const idExpiry = String(body.idExpiry || "").trim();
    if (!idExpiry) return Response.json({ error: "A new ID expiry date is required." }, { status: 400 });

    if (task.employeeId) {
      const employees = await getCollection("employees");
      const emp = employees.find((e) => e.id === task.employeeId);
      if (!emp) return Response.json({ error: "The employee no longer exists." }, { status: 404 });
      await updateItem("employees", task.employeeId, { idExpiry });
    }
    const updated = await updateItem("tasks", id, { done: true, doneAt: now, doneBy: actor.fullName || actor.userId, newIdExpiry: idExpiry });
    await logActivity({ actor, verb: "status", sectionKey: "employees", entityType: "employees", entityId: task.employeeId || "", label: `ID expiry updated for ${task.employeeName || "an employee"}`, href: "/studio/employees" }).catch(() => {});
    return Response.json(updated);
  }

  // --- The permit team marks a permit-request done once the permit has been
  // issued. An optional note (e.g. the new permit number) is recorded. ---
  if (body.action === "complete-permit") {
    if (task.type !== "permit-request") return Response.json({ error: "Not a permit-request task." }, { status: 400 });
    if (task.done) return Response.json({ error: "Already completed." }, { status: 409 });
    if (!(isAssignee(actor, task) || hasTag(actor, ADMIN_TAG))) return forbidden();
    const resolution = String(body.resolution || "").slice(0, 2000);
    const updated = await updateItem("tasks", id, { done: true, doneAt: now, doneBy: actor.fullName || actor.userId, resolution });
    if (task.projectId) {
      const projects = await getCollection("projects");
      const proj = projects.find((p) => p.id === task.projectId);
      if (proj) {
        const plog = Array.isArray(proj.log) ? proj.log : [];
        await updateItem("projects", proj.id, { log: [...plog, { id: `${Date.now()}-pm`, desc: `Permit issued${resolution ? ` — ${resolution}` : ""}`, at: now, by: actor.fullName || actor.userId }] });
      }
    }
    await logActivity({ actor, verb: "status", sectionKey: "tasks", entityType: "tasks", entityId: id, label: `Permit issued for ${task.projectName || task.clientName}`, href: "/studio/tasks" }).catch(() => {});
    return Response.json(updated);
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
