import crypto from "crypto";
import { getCollection, updateItem, deleteItem } from "@/lib/db";
import { currentUser, requireManage, forbidden, unauthorized } from "@/lib/session";
import { ADMIN_TAG, SALES_TAG, canSeeAllIn } from "@/lib/authConstants";
import { TICKET_STATUSES, TICKET_URGENCIES, canEditTicket, canSetUrgency, canSeeTicket, normaliseProbability } from "@/lib/tickets";
import { REQUIREMENTS, projectSizeFromValue } from "@/lib/projectKpis";
import { logActivity } from "@/lib/activity";
import { notifyUsers, notifyMentions } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Owner (assignedTo) intentionally excluded — locked to the creator by spec.
// Client name is not editable post-creation either, since it drives the
// ticketRef; users can create a new ticket if the client changes.
const EDITABLE = ["title", "contactName", "contactEmail", "contactPhone", "contactPosition", "description", "deadline", "industry"];

async function loadTicket(id) {
  const rows = await getCollection("salesTickets");
  return rows.find((t) => t.id === id) || null;
}

// Single ticket — avoids the detail page having to fetch the whole collection.
export async function GET(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const tags = Array.isArray(actor.tags) ? actor.tags : [];
  if (!tags.includes(ADMIN_TAG) && !tags.includes(SALES_TAG)) return forbidden();
  const { id } = await params;
  const t = await loadTicket(id);
  if (!t) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canSeeAllIn(actor, SALES_TAG) && !canSeeTicket(actor, t)) return forbidden();
  return Response.json(t);
}

export async function PUT(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const { id } = await params;
  const existing = await loadTicket(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canEditTicket(actor, existing)) return forbidden();
  if (!(await requireManage("sales-list"))) return forbidden(); // view-only can't edit

  const body = await request.json();
  const patch = { updatedAt: new Date().toISOString() };

  for (const f of EDITABLE) {
    if (f in body) patch[f] = String(body[f] ?? "").trim();
  }
  // Deadline can't be blanked out post-create; drop the update rather than
  // let the ticket end up in an invalid state.
  if ("deadline" in patch && !patch.deadline) delete patch.deadline;
  // Same rule for industry — required at creation, so a blank edit is dropped
  // rather than allowed to erase it.
  if ("industry" in patch && !patch.industry) delete patch.industry;

  if (Array.isArray(body.requirements)) {
    patch.requirements = body.requirements.filter((r) => REQUIREMENTS.includes(r));
  }
  // projectSize is derived from the value, never set by hand.
  if (Array.isArray(body.serviceIds)) {
    const serviceIds = [...new Set(body.serviceIds.map((s) => String(s)))];
    if (serviceIds.length > 0) patch.serviceIds = serviceIds;
  }
  // Ticket location (name / city / link) — carried to the client + the project.
  if (body.location && typeof body.location === "object") {
    patch.location = { name: String(body.location.name || "").trim(), city: String(body.location.city || "").trim(), url: String(body.location.url || "").trim() };
  }
  // Per-service requirement selections (Without Installation/Programming).
  if (body.serviceRequirements && typeof body.serviceRequirements === "object") {
    const ids = patch.serviceIds || (Array.isArray(existing.serviceIds) ? existing.serviceIds : []);
    const raw = body.serviceRequirements;
    const sr = {};
    for (const id of ids) {
      const e = raw[id] || {};
      sr[id] = { withoutInstallation: !!e.withoutInstallation, withoutProgramming: !!e.withoutProgramming };
    }
    patch.serviceRequirements = sr;
  }

  // Client Budget — manual reference figure (optional; null clears it).
  if ("clientBudget" in body) {
    const raw = body.clientBudget;
    if (raw === "" || raw == null) {
      patch.clientBudget = null;
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        return Response.json({ error: "Client Budget must be a non-negative number" }, { status: 400 });
      }
      patch.clientBudget = n;
    }
  }

  // The auto Value (set from completed quotations) may still be written directly
  // by internal flows, but is no longer a manually-edited field.
  if ("value" in body) {
    const n = Number(body.value);
    if (!Number.isFinite(n) || n < 0) {
      return Response.json({ error: "Value must be a non-negative number" }, { status: 400 });
    }
    patch.value = n;
    // Project size follows the value automatically (cascades to RFQ/quotation).
    patch.projectSize = n > 0 ? projectSizeFromValue(n) : "";
  }

  if ("probability" in body) {
    patch.probability = normaliseProbability(body.probability, existing.probability || 0);
  }

  if (typeof body.status === "string" && body.status !== existing.status) {
    if (!TICKET_STATUSES.includes(body.status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status;
  }

  // Urgency is Sales-Leader-only. Silently drop the change for anyone else
  // rather than fail the whole request — lets a non-leader save other edits
  // (e.g. a comment) in the same PUT without the leader-only field blocking it.
  if (typeof body.urgency === "string" && body.urgency !== existing.urgency) {
    if (!TICKET_URGENCIES.includes(body.urgency)) {
      return Response.json({ error: "Invalid urgency" }, { status: 400 });
    }
    if (canSetUrgency(actor)) patch.urgency = body.urgency;
  }

  if (typeof body.newComment === "string" && body.newComment.trim()) {
    const comments = Array.isArray(existing.comments) ? existing.comments : [];
    patch.comments = [
      ...comments,
      {
        id: crypto.randomUUID(),
        text: body.newComment.trim(),
        authorId: actor.id,
        authorUserId: actor.userId,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  // Change log on the ticket itself — so Sales/Leaders can see the history of
  // edits, status moves and comments (drives the per-ticket "updates" badge).
  const changes = [];
  if (patch.status) changes.push(`Status → ${patch.status}`);
  if ("clientBudget" in patch) changes.push("Client Budget updated");
  if ("value" in patch) changes.push("Value updated");
  if ("probability" in patch) changes.push(`Probability → ${patch.probability}%`);
  if (patch.urgency) changes.push(`Urgency → ${patch.urgency}`);
  if (EDITABLE.some((f) => f in patch)) changes.push("Details updated");
  if ("requirements" in patch || "serviceRequirements" in patch) changes.push("Requirements updated");
  if ("projectSize" in patch) changes.push("Project size updated");
  if ("serviceIds" in patch) changes.push("Services updated");
  if (patch.comments) changes.push("New comment added");
  if (changes.length) {
    const prevLog = Array.isArray(existing.log) ? existing.log : [];
    const at = new Date().toISOString();
    const by = actor.fullName || actor.userId || "";
    patch.log = [...prevLog, ...changes.map((desc, i) => ({ id: `${Date.now()}-${i}`, desc, at, by, byId: actor.id }))];
  }

  const updated = await updateItem("salesTickets", id, patch);

  // Sync the (possibly changed) contact position + location back onto the client
  // record — re-selecting a position or editing the location updates the client.
  if (updated.clientId && ("contactPosition" in patch || "contactName" in patch || "location" in patch)) {
    try {
      const clients = await getCollection("salesClients");
      const client = clients.find((c) => c.id === updated.clientId);
      if (client) {
        const cPatch = {};
        const name = String(updated.contactName || "").trim();
        if (name) {
          const norm = name.toLowerCase().replace(/\s+/g, " ");
          const contacts = Array.isArray(client.contacts) ? [...client.contacts] : [];
          const idx = contacts.findIndex((c) => String(c.name || "").trim().toLowerCase().replace(/\s+/g, " ") === norm);
          const pos = String(updated.contactPosition || "").trim();
          if (idx >= 0) contacts[idx] = { ...contacts[idx], email: updated.contactEmail || contacts[idx].email, phone: updated.contactPhone || contacts[idx].phone, position: pos || contacts[idx].position || "" };
          else contacts.push({ id: crypto.randomUUID(), name, email: updated.contactEmail || "", phone: updated.contactPhone || "", position: pos });
          cPatch.contacts = contacts;
        }
        const loc = updated.location;
        if (loc && (loc.name || loc.city || loc.url)) {
          const norm = String(loc.name || "").trim().toLowerCase().replace(/\s+/g, " ");
          const locations = Array.isArray(client.locations) ? [...client.locations] : [];
          const idx = norm ? locations.findIndex((l) => String(l.name || "").trim().toLowerCase().replace(/\s+/g, " ") === norm) : -1;
          if (idx >= 0) locations[idx] = { ...locations[idx], name: loc.name || locations[idx].name, city: loc.city || locations[idx].city, url: loc.url || locations[idx].url };
          else locations.push({ id: crypto.randomUUID(), name: loc.name || "", city: loc.city || "", url: loc.url || "" });
          cPatch.locations = locations;
        }
        if (Object.keys(cPatch).length) await updateItem("salesClients", client.id, cPatch);
      }
    } catch { /* best-effort client sync */ }
  }

  // Sales-owned fields (urgency, industry, services) are carried onto any
  // RFQ/Quotation this ticket has already spawned as live-synced values, not
  // one-time snapshots — Sales editing them here must be reflected wherever
  // they already propagated (Technical can only read them). Awaited
  // sequentially (one updateItem at a time) to avoid racing read-modify-write
  // cycles on the shared JSON document.
  const cascade = {};
  if (patch.urgency) cascade.urgency = patch.urgency;
  if ("industry" in patch) cascade.industry = patch.industry;
  if ("serviceIds" in patch) cascade.serviceIds = patch.serviceIds;
  if ("requirements" in patch) cascade.requirements = patch.requirements;
  if ("serviceRequirements" in patch) cascade.serviceRequirements = patch.serviceRequirements;
  if ("projectSize" in patch) cascade.projectSize = patch.projectSize;
  if (Object.keys(cascade).length > 0) {
    const [linkedRfqs, linkedQuotations] = await Promise.all([
      getCollection("rfqs"),
      getCollection("quotations"),
    ]);
    for (const r of linkedRfqs.filter((r) => r.sourceTicketId === id)) {
      await updateItem("rfqs", r.id, cascade);
    }
    for (const q of linkedQuotations.filter((q) => q.fromTicketId === id)) {
      await updateItem("quotations", q.id, cascade);
    }
  }

  // Awaited sequentially — see convert-to-quotation/route.js for why.
  if (patch.status) {
    await logActivity({ actor, verb: "status", sectionKey: "sales-list", entityType: "salesTickets", entityId: id, label: `${updated.title} is now ${patch.status}`, href: "/studio/sales/tickets" }).catch(() => {});
  }
  if (patch.comments) {
    await logActivity({ actor, verb: "commented", sectionKey: "sales-list", entityType: "salesTickets", entityId: id, label: `New comment on ${updated.title}`, href: "/studio/sales/tickets" }).catch(() => {});
    const mentions = Array.isArray(body.mentions) ? body.mentions.map(String) : [];
    const owners = [updated.createdBy, updated.assignedTo].filter(Boolean).filter((uid) => !mentions.includes(uid));
    const href = `/studio/sales/tickets/${id}`;
    await notifyUsers({ actor, userIds: owners, kind: "comment", entityType: "salesTickets", entityId: id, label: `New comment on ${updated.title}`, href }).catch(() => {});
    await notifyMentions({ actor, mentions, sectionKey: "sales-list", entityType: "salesTickets", entityId: id, label: `You were mentioned on ${updated.title}`, href }).catch(() => {});
  }

  return Response.json(updated);
}

// Only admin can hard-delete a ticket. Sales should reassign or mark as
// Opportunity rather than delete.
export async function DELETE(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const tags = Array.isArray(actor.tags) ? actor.tags : [];
  if (!tags.includes(ADMIN_TAG)) return forbidden();
  const { id } = await params;
  const ok = await deleteItem("salesTickets", id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
