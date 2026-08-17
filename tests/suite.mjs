// INTEGRATION SUITE — the tests.
//
// WHAT THIS EXISTS FOR. Every serious bug found in the August audit lived in
// WIRING, not in logic: a context that resolved `access` and forgot to return
// it, a route that read an assignment from the wrong level of the body, a guard
// placed above the branch it was written for. The unit suite could not see any
// of them, because each one is correct in isolation and wrong only once
// connected. So these tests connect things: real repositories, real Redis, real
// route handlers, and one assertion per bug that actually happened.
//
// Each block names the defect it stands guard over, so nobody deletes it later
// wondering what it was for.

import { KEY_PREFIX, IX } from "@/lib/data/keys";
import { delPrefix, getIndex } from "@/lib/data/store";
import { getRedisClient } from "@/lib/data/redis";
import { createUser, mintSession } from "@/lib/data/users";
import { createStudio, renameStudio, getStudioBySlug } from "@/lib/data/studios";
import { addCollaborator, updateCollaborator, getCollaboratorByUser } from "@/lib/data/collaborators";
import { listRoles } from "@/lib/data/roles";
import { ADMIN_ROLE_ID } from "@/lib/permissions";
import { SESSION_COOKIE } from "@/lib/identity";
import { studioContext, canAdminister } from "@/lib/studios";
import { explain } from "@/lib/access";
import { tasksContext, createTask, updateTask, removeTask, decideTask } from "@/lib/tasks";
import { TASK_TYPE_AUTHORITIES } from "@/lib/taskRouting";
import {
  salesContext, createService, createTicket, requestTicketRfq, listTickets, sendTicketForApproval,
  submitTicketPo,
} from "@/lib/sales";
import { projectsContext, openProject, listProjects } from "@/lib/projects";
import { technicalContext, convertRfq, updateRfq, updateQuotation, listQuotations } from "@/lib/technical";
import { rfqInfo } from "@/lib/salesAnalytics";
import { financeContext, createInvoice, removeInvoice, listInvoices } from "@/lib/finance";
import { inventoryContext, createItem, adjustStock } from "@/lib/inventory";
import {
  hrContext, requestVacation, decideVacation,
  listDepartments, listHrRoles, createHrRole, editHrRole, removeHrRole,
  listEmployees, saveEmployment,
} from "@/lib/hr";
import { updateProfile } from "@/lib/data/users";
import { __signIn, __signOut } from "./nextHeaders.mjs";

import { seedSuperAdmin, loginSuper, SUPER_COOKIE } from "@/lib/superAuth";

const PUT_COLLABORATORS = (await import("@/app/api/studios/[slug]/collaborators/route.js")).PUT;
const TASKS_ROUTE = await import("@/app/api/studios/[slug]/tasks/route.js");
const EXPORT_CSV = (await import("@/app/api/super/site-analytics/export/route.js")).GET;
const YEAR_ROLLOVER = (await import("@/app/api/cron/year-rollover/route.js")).GET;

// ---- harness ---------------------------------------------------------------
let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? `  — ${extra}` : ""}`);
};
const rand = () => Math.random().toString(36).slice(2, 8);

// A signed-in caller, the way a browser is one: a real session token in the
// cookie jar, looked up against Redis by the real currentUser().
async function signInAs(userId) {
  __signIn(SESSION_COOKIE, await mintSession(userId, 600));
}
const params = (slug) => Promise.resolve({ slug });
const jsonReq = (body) =>
  new Request("http://localhost/test", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

console.log(`\nintegration suite — namespace "${KEY_PREFIX}"\n`);

// ---- fixture ---------------------------------------------------------------
// One studio, four people: its owner, and three collaborators holding the
// starter roles the product ships with. Built once, because every block below
// is a read or a write against the same studio, exactly as a real one is.
const slug = `t-${rand()}${rand()}`;
const owner = (await createUser({ email: `owner-${rand()}@test.invalid`, passwordHash: "x" })).user;
const created = await createStudio({ ownerUserId: owner.id, name: "Test Studio", slug, ownerAlias: "Owner" });
if (created.error) { console.error("fixture failed:", created.error); process.exit(1); }
const studio = created.studio;

const roles = await listRoles(studio.id);            // seeds the starter roles
const roleId = (name) => roles.find((r) => r.name === name)?.id;

async function person(alias, roleName) {
  const user = (await createUser({ email: `${alias}-${rand()}@test.invalid`, passwordHash: "x" })).user;
  await addCollaborator(studio.id, {
    userId: user.id, alias, role: "member",
    roleIds: roleName ? [roleId(roleName)] : [],
  });
  return { user, collaborator: await getCollaboratorByUser(studio.id, user.id) };
}

const member = await person("Member", "Member");
const viewer = await person("Viewer", "Viewer");
const nobody = await person("Nobody", null);

// ============================================================================
console.log("== tasks: the board writes at all");
// REGRESSION: tasksContext resolved `access` and left it out of the object it
// returned, so requirePermission(undefined, …) refused every write in the
// module — creating, editing, deleting, appointing — for everybody including
// the owner. The build passed, the unit suite passed, and the board was dead.
{
  const ctx = await tasksContext(owner, slug);
  ok("owner can open Tasks", !ctx.error, ctx.error);
  ok("the context carries access", ctx.access instanceof Set);

  const made = await createTask(ctx, { title: "Ship the thing", assigneeCollaboratorId: viewer.collaborator.id });
  ok("owner can create a task", !!made.task, made.error);

  const edited = await updateTask(ctx, made.task?.id, { title: "Ship the thing, renamed" });
  ok("owner can edit a task", edited.task?.title === "Ship the thing, renamed", edited.error);

  // A task is assigned by somebody authorised and COMPLETED by the person it
  // was given to — so finishing your own work cannot need a board right.
  const viewerCtx = await tasksContext(viewer.user, slug);
  const moved = await updateTask(viewerCtx, made.task?.id, { status: "Done" });
  ok("the assignee can finish their own task without a board right", moved.task?.status === "Done", moved.error);

  const overreach = await updateTask(viewerCtx, made.task?.id, { title: "not mine to rename" });
  ok("...but cannot rewrite what was asked of them", overreach.error === "forbidden", JSON.stringify(overreach));

  const gone = await removeTask(ctx, made.task?.id);
  ok("owner can delete a task", gone.ok === true, gone.error);

  const shut = await tasksContext(nobody.user, slug);
  ok("somebody with no role cannot open Tasks", shut.error === "forbidden", shut.error);
}

// ============================================================================
console.log("\n== tasks: the board's own buttons, end to end");
// The service functions were already covered above and passed, which is exactly
// why "I cannot edit or delete a task" needed testing ONE LAYER OUT: through the
// route handlers the screen actually calls, with a real session, the real body
// shape the form sends, and the real method on each button.
{
  await signInAs(owner.id);
  const req = (method, body) => new Request("http://localhost/test", {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });

  const made = await TASKS_ROUTE.POST(req("POST", { title: "Wire check" }), { params: params(slug) });
  ok("the New task button creates one", made.status === 201, `got ${made.status}`);
  const id = (await made.json()).task?.id;

  // THE FORM'S WHOLE PAYLOAD, not a minimal one — it sends every field it holds,
  // including `type` on a task that already has one, and the route has to cope
  // with all of them rather than with the tidy subset a unit test would send.
  const edited = await TASKS_ROUTE.PUT(req("PUT", {
    id, title: "Wire check, renamed", type: "", description: "why",
    assigneeCollaboratorId: "", projectId: "", priority: "High", dueDate: "", checklist: [],
  }), { params: params(slug) });
  const editedBody = await edited.json();
  ok("the Edit button saves", edited.status === 200, `got ${edited.status} ${JSON.stringify(editedBody)}`);
  ok("...and the change really landed", editedBody.task?.title === "Wire check, renamed",
    JSON.stringify(editedBody.task?.title));

  const gone = await TASKS_ROUTE.DELETE(req("DELETE", { id }), { params: params(slug) });
  ok("the Delete button deletes", gone.status === 200, `got ${gone.status} ${JSON.stringify(await gone.json())}`);

  // A TYPED TASK IS A DECISION, NOT A TO-DO. Editing one would change what the
  // approvers think they are agreeing to — possibly after some have agreed —
  // and deleting one destroys the record of who signed while the quotation goes
  // on being approved. Both are refused at the service, not merely hidden.
  const decision = await createTask(await tasksContext(owner, slug), { title: "Approve something", type: "approval" });
  ok("a typed task can still be raised", decision.task?.type === "approval", JSON.stringify(decision.error));
  const reword = await TASKS_ROUTE.PUT(req("PUT", { id: decision.task?.id, title: "Approve something else" }), { params: params(slug) });
  ok("...but cannot be edited", reword.status === 409, `got ${reword.status}`);
  const erase = await TASKS_ROUTE.DELETE(req("DELETE", { id: decision.task?.id }), { params: params(slug) });
  ok("...nor deleted", erase.status === 409, `got ${erase.status}`);
  // Its own verb still works: a decision is made by deciding it.
  const signed = await decideTask(await tasksContext(owner, slug), decision.task?.id, { authority: "sales", approved: true });
  ok("...while deciding it still works", signed.task?.approvals?.sales?.approved === true, JSON.stringify(signed.error));

  // The Delete BUTTON asks about delete, not about "holds any write" — a Member
  // holds tasks.board.edit and not delete, and used to be shown a button that
  // always came back "That didn't save."
  const board = await tasksContext(member.user, slug);
  ok("a Member may run the board", board.canManage === true);
  ok("...but does not hold delete", !board.access.has("tasks.board.delete"));
  __signOut();
}

// ============================================================================
console.log("\n== the handler is carried, never copied");
// REGRESSION, two of them, both invisible to a unit test because each half was
// correct on its own:
//
//   1. Converting an RFQ wrote the handler to the RFQ under
//      `handledByCollaboratorId` and to the quotation under `handledBy` — a
//      field the convert form never sends. So /technical-quotations read an
//      empty column on every converted row, and the handler leaderboard filed
//      them all under "Unassigned".
//   2. The name under the ticket's Send-for-Approval button was a COPY taken at
//      conversion. Reassign the RFQ and it still named whoever used to have it;
//      submit the quotation and it still named the appointment rather than the
//      person who actually finished the document.
{
  const sales = await salesContext(owner, slug);
  ok("owner can open Sales", !sales.error, sales.error);

  const service = await createService(sales, { name: "Integration" });
  const made = await createTicket(sales, {
    title: "Carry the handler", clientName: "Acme", deadline: "2026-12-01",
    industry: "Technology", serviceIds: [service.service?.id],
  });
  ok("a ticket can be raised", !!made.ticket, JSON.stringify(made.error));

  const asked = await requestTicketRfq(sales, { ticketId: made.ticket?.id });
  ok("...and handed to Technical", !!asked.rfq, JSON.stringify(asked.error));

  // Converted to MEMBER, then reassigned to VIEWER. The second half is the one
  // that catches a copy: a copy keeps naming Member forever.
  const tech = await technicalContext(owner, slug);
  const conv = await convertRfq(tech, { rfqId: asked.rfq?.id, handledByCollaboratorId: member.collaborator.id });
  ok("an RFQ converts to a quotation", !!conv.quotation, JSON.stringify(conv.error));

  const afterConvert = await listQuotations(tech);
  const row = afterConvert.find((q) => q.id === conv.quotation?.id);
  ok("the quotations list names its handler", row?.handledBy === member.collaborator.id,
    `handledBy is ${JSON.stringify(row?.handledBy)}`);

  await updateRfq(tech, asked.rfq?.id, { handledByCollaboratorId: viewer.collaborator.id });
  const reassigned = (await listQuotations(tech)).find((q) => q.id === conv.quotation?.id);
  ok("...and follows the RFQ when it is reassigned", reassigned?.handledBy === viewer.collaborator.id,
    `handledBy is ${JSON.stringify(reassigned?.handledBy)}`);

  // Before submission the ticket names the APPOINTMENT — and the live one.
  const beforeSubmit = (await listTickets(sales)).find((t) => t.id === made.ticket?.id);
  ok("the ticket names whoever the RFQ is assigned to",
    beforeSubmit?.rfq?.handledByCollaboratorId === viewer.collaborator.id,
    JSON.stringify(beforeSubmit?.rfq));
  ok("...and says so", rfqInfo(beforeSubmit, { [viewer.collaborator.id]: "Viewer" }).text === "Handled by Viewer",
    rfqInfo(beforeSubmit, { [viewer.collaborator.id]: "Viewer" }).text);

  // Submitted by the OWNER, who is neither the appointment nor the original
  // handler — which is the whole point: work gets picked up and covered for.
  const done = await updateQuotation(tech, conv.quotation?.id, { status: "Completed" });
  ok("submitting stamps who finished it", done.quotation?.submittedByCollaboratorId === tech.collaborator.id,
    JSON.stringify(done.quotation?.submittedByCollaboratorId));

  const afterSubmit = (await listTickets(sales)).find((t) => t.id === made.ticket?.id);
  ok("the ticket carries the submitter once there is one",
    afterSubmit?.rfq?.completedByCollaboratorId === tech.collaborator.id,
    JSON.stringify(afterSubmit?.rfq));
  const line = rfqInfo(afterSubmit, { [tech.collaborator.id]: "Owner" });
  ok("...and reads as completed, not handled", line.text === "Completed by Owner", line.text);
  ok("...beside the quotation, not the RFQ", line.ref === conv.quotation?.number,
    `${line.ref} vs ${conv.quotation?.number}`);

  // And the whole point of the button: ONE task, needing BOTH authorities.
  const sent = await sendTicketForApproval(await salesContext(owner, slug), { ticketId: made.ticket?.id });
  ok("sending for approval raises an approval task", sent.task?.type === "approval", JSON.stringify(sent.error));
  ok("...routed to Sales and Management",
    JSON.stringify(TASK_TYPE_AUTHORITIES.approval) === JSON.stringify(["sales", "mng"]),
    JSON.stringify(TASK_TYPE_AUTHORITIES.approval));
  ok("...and says so when nobody is appointed to either",
    JSON.stringify(sent.unrouted) === JSON.stringify(["Sales", "Management"]),
    JSON.stringify(sent.unrouted));

  const twice = await sendTicketForApproval(await salesContext(owner, slug), { ticketId: made.ticket?.id });
  ok("...once per quotation, not once per press", twice.error === "already", JSON.stringify(twice));

  // ---- the rest of the chain: PO -> project -> number ----------------------
  // A PO cannot be booked against a quotation nobody signed off, and cannot be
  // booked with no evidence at all.
  const salesCtx = await salesContext(owner, slug);
  const early = await submitTicketPo(salesCtx, { ticketId: made.ticket?.id, description: "PO-1" });
  ok("a PO needs an approved quotation", early.error === "not-approved", JSON.stringify(early));

  // APPROVED IS CARRIED FROM THE APPROVAL TASK, not written onto the quotation.
  // Nothing wrote it back, so a quotation Sales and Management had both signed
  // still read "Completed" — and openProject, asked from the very screen that
  // had just approved it, answered "That quotation is not approved".
  const approvalTask = sent.task;
  await decideTask(await tasksContext(owner, slug), approvalTask?.id, { authority: "sales", approved: true });
  await decideTask(await tasksContext(owner, slug), approvalTask?.id, { authority: "mng", approved: true });

  const listed = (await listQuotations(await technicalContext(owner, slug)))
    .find((q) => q.id === conv.quotation?.id);
  ok("the quotations list reads Approved once both have signed", listed?.status === "Approved", listed?.status);
  ok("...while what is on file is untouched", listed?.storedStatus === "Completed", listed?.storedStatus);
  // The DATE of the decision comes from the task that made it. Stamped only on
  // a hand-set status, it was blank on every board-approved quotation — and it
  // is what the dashboard measures turnaround from.
  ok("...and carries when it was approved", !!listed?.completedAt, JSON.stringify(listed?.completedAt));

  // THE LAST READER OF THE STORED STATUS. The list said Approved, the ticket
  // said Quotation Approved, and locking answered "Only an approved quotation
  // can be locked" — because this one guard still asked the document.
  const locked = await updateQuotation(await technicalContext(owner, slug), conv.quotation?.id, { locked: true });
  ok("an approved quotation can be locked", locked.quotation?.locked === true, JSON.stringify(locked.error));

  const empty = await submitTicketPo(await salesContext(owner, slug), { ticketId: made.ticket?.id });
  ok("...and evidence: neither a file nor a description is refused", empty.error === "evidence", JSON.stringify(empty));

  const po = await submitTicketPo(await salesContext(owner, slug), {
    ticketId: made.ticket?.id, description: "PO-99 signed by the client",
  });
  ok("a described PO goes to Finance", po.task?.type === "po", JSON.stringify(po.error));
  ok("...carrying keys, not copies",
    po.task?.ticketId === made.ticket?.id && po.task?.quotationId === conv.quotation?.id,
    JSON.stringify({ ticketId: po.task?.ticketId, quotationId: po.task?.quotationId }));
  const poTwice = await submitTicketPo(await salesContext(owner, slug), { ticketId: made.ticket?.id, description: "again" });
  ok("...once per quotation", poTwice.error === "already", JSON.stringify(poTwice));

  // THE PROJECT IS OPENED WITHOUT A NUMBER. It exists, it has a handler, and
  // its sheet is drawn from the quotation — but the number is Finance's to
  // issue, and it has not been issued yet.
  const proj = await projectsContext(owner, slug);
  const opened = await openProject(proj, {
    quotationId: conv.quotation?.id, managerCollaboratorId: member.collaborator.id,
  });
  ok("an approved quotation opens a project", !!opened.project, JSON.stringify(opened.error));
  ok("...with a BLANK number until Finance issues one", opened.project?.number === "",
    JSON.stringify(opened.project?.number));
  ok("...carrying the whole chain of keys",
    opened.project?.ticketId === made.ticket?.id
    && opened.project?.quotationId === conv.quotation?.id
    && opened.project?.rfqId === asked.rfq?.id,
    JSON.stringify({ t: opened.project?.ticketId, q: opened.project?.quotationId, r: opened.project?.rfqId }));
  ok("...and its sheet drawn up from the quotation", Array.isArray(opened.sheet?.rows), JSON.stringify(opened.sheet));

  // FINANCE SIGNING IS WHAT ISSUES THE NUMBER. Both authorities have to sign,
  // so the first one alone leaves it blank.
  const tctx = await tasksContext(owner, slug);
  await decideTask(tctx, po.task?.id, { authority: "mng", approved: true });
  const halfWay = (await listProjects(proj)).find((p) => p.id === opened.project?.id);
  ok("one authority is not enough to issue a number", halfWay?.number === "", JSON.stringify(halfWay?.number));

  const finished = await decideTask(await tasksContext(owner, slug), po.task?.id, { authority: "fin", approved: true });
  ok("the second signature completes the PO", finished.task?.status === "Done", JSON.stringify(finished.error));
  ok("...and issues the project number", /^PRJ-\d+$/.test(finished.numberIssued || ""), JSON.stringify(finished.numberIssued));
  const numbered = (await listProjects(proj)).find((p) => p.id === opened.project?.id);
  ok("...which really landed on the project", numbered?.number === finished.numberIssued, JSON.stringify(numbered?.number));

  // Withdrawing and re-approving must not mint a second number: the first one
  // is already on documents the client is holding.
  await decideTask(await tasksContext(owner, slug), po.task?.id, { authority: "fin", approved: false });
  const again = await decideTask(await tasksContext(owner, slug), po.task?.id, { authority: "fin", approved: true });
  ok("re-approving does not issue a second number", again.numberIssued === numbered?.number,
    JSON.stringify({ again: again.numberIssued, was: numbered?.number }));
}

// ============================================================================
console.log("\n== people: assignment cannot escalate");
// REGRESSION: the route read the assignment from the top level of the body
// while the screen sent it under `patch`, so cleanAssignment saw nothing, the
// escalation check never ran, and `patch` was written to the row verbatim —
// anyone who could edit people could hand themselves the Admin wildcard, or
// `role: "owner"`, and hold every permission in the studio.
{
  // Somebody who may edit people and nothing else — the case the check exists
  // for. An owner or an Admin already holds everything and can never trip it.
  await updateCollaborator(studio.id, member.collaborator.id, {
    overrides: { allow: ["people.members.edit"], deny: [] },
  });

  await signInAs(member.user.id);
  const grab = await PUT_COLLABORATORS(
    jsonReq({ collaboratorId: member.collaborator.id, patch: { roleIds: [ADMIN_ROLE_ID] } }),
    { params: params(slug) },
  );
  ok("cannot give yourself the Admin role", grab.status === 403, `got ${grab.status}`);

  const seize = await PUT_COLLABORATORS(
    jsonReq({ collaboratorId: member.collaborator.id, patch: { role: "owner" } }),
    { params: params(slug) },
  );
  const after = await getCollaboratorByUser(studio.id, member.user.id);
  ok("cannot write yourself `role: owner`", after.role !== "owner", `role is ${after.role} (${seize.status})`);

  const rename = await PUT_COLLABORATORS(
    jsonReq({ collaboratorId: member.collaborator.id, patch: { alias: "Renamed" } }),
    { params: params(slug) },
  );
  ok("...but may still do the job they hold", rename.status === 200, `got ${rename.status}`);

  await signInAs(owner.id);
  const granted = await PUT_COLLABORATORS(
    jsonReq({ collaboratorId: viewer.collaborator.id, patch: { roleIds: [ADMIN_ROLE_ID] } }),
    { params: params(slug) },
  );
  ok("an owner may hand out Admin", granted.status === 200, `got ${granted.status}`);
  __signOut();
}

// ============================================================================
console.log("\n== admin is a role, not a flag");
// REGRESSION: `isAdmin` was a second answer to a question roleIds already
// answered, and canAdminister read the flag rather than the permission set.
{
  const adminCtx = await studioContext(viewer.user, slug);      // holds Admin from above
  ok("holding the Admin role administers the studio", canAdminister(adminCtx.access));
  ok("...and resolves to every permission", adminCtx.access.has("finance.cash.delete"));

  const plainCtx = await studioContext(nobody.user, slug);
  ok("holding nothing does not", !canAdminister(plainCtx.access));

  const row = await getCollaboratorByUser(studio.id, viewer.user.id);
  ok("no isAdmin flag is stored", row.isAdmin === undefined, JSON.stringify(row.isAdmin));
}

// ============================================================================
console.log("\n== references survive a deletion");
// REGRESSION: six collections numbered themselves `rows.length + 1`, which is
// counting rather than numbering. Delete one and the next create reuses its
// reference — two invoices bearing INV-0002 is not a cosmetic problem.
{
  const fin = await financeContext(owner, slug);
  const lines = [{ description: "Work", qty: 1, unitPrice: 100 }];
  const a = await createInvoice(fin, { clientName: "Acme", lines });
  const b = await createInvoice(fin, { clientName: "Acme", lines });
  ok("two invoices get two references", a.invoice.reference !== b.invoice.reference,
    `${a.invoice.reference} vs ${b.invoice.reference}`);

  await removeInvoice(fin, b.invoice.id);                       // a draft, so removable
  const c = await createInvoice(fin, { clientName: "Acme", lines });
  ok("the deleted reference is not reissued", c.invoice.reference !== b.invoice.reference,
    `reused ${c.invoice.reference}`);

  const all = (await listInvoices(fin)).map((i) => i.reference);
  ok("every reference on file is unique", new Set(all).size === all.length, all.join(", "));
}

// ============================================================================
console.log("\n== the stock ledger is guarded");
// REGRESSION: adjustStock was the one write in Inventory with no permission
// check of its own, and the route in front of it asked only the coarse
// section-wide question — true for somebody granted nothing but vendors.
{
  const inv = await inventoryContext(owner, slug);
  const item = await createItem(inv, { name: "Widget" });
  ok("owner can register an item", !!item.item, item.error);

  const moved = await adjustStock(inv, { itemId: item.item.id, qty: 5 });
  ok("owner can adjust stock", !!moved.movement, moved.error);

  const viewerInv = await inventoryContext(viewer.user, slug);
  // The Admin role was handed to Viewer above, so take it back first — this
  // block is about somebody who may SEE inventory and not move it.
  await updateCollaborator(studio.id, viewer.collaborator.id, { roleIds: [roleId("Viewer")] });
  const refused = await adjustStock(await inventoryContext(viewer.user, slug), { itemId: item.item.id, qty: -1 });
  ok("a viewer cannot move the ledger", refused.error === "forbidden", JSON.stringify(refused));
  ok("the viewer could still open Inventory", !viewerInv.error, viewerInv.error);
}

// ============================================================================
console.log("\n== leave: taking back your own request");
// REGRESSION: the hr.vacations.approve guard sat above the self-cancel branch
// it was written for, so withdrawing your own pending request required the
// right to decide other people's — and nobody without it could ever withdraw.
{
  const hr = await hrContext(member.user, slug);
  ok("a member can open HR", !hr.error, hr.error);
  ok("...and does NOT hold approve", !hr.access.has("hr.vacations.approve"));

  const asked = await requestVacation(hr, { from: "2026-09-01", to: "2026-09-03", type: "Annual" });
  ok("a member can request their own leave", asked.vacation?.status === "Pending", JSON.stringify(asked));

  const withdrawn = await decideVacation(hr, asked.vacation?.id, "Cancelled");
  ok("...and can cancel it without the approve right", withdrawn.vacation?.status === "Cancelled",
    JSON.stringify(withdrawn));
}

// ============================================================================
console.log("\n== HR: departments are sections, positions are roles");
// Three lists became one apiece, and each collapse is a place a copy used to
// live:
//   • departments  — an HR collection somebody typed, beside the sections the
//                    studio was already divided into. Derived now.
//   • positions    — a job title beside the ROLE that decided what the job may
//                    do. One list now, and it is the roles list.
//   • photo        — a copy on the studio-local row of a picture that belongs
//                    to the account, frozen on the day somebody joined.
//
// And the rule that makes merging positions into roles safe at all: HR may NAME
// a job, but putting somebody in one is handing out permissions, so it answers
// to the access permission and the escalation check — not to an HR grant.
{
  const hr = await hrContext(owner, slug);
  ok("owner can open HR", !hr.error, hr.error);

  const departments = listDepartments(hr);
  ok("departments come from the section list", departments.length > 0, JSON.stringify(departments));
  ok("...identified by section key, not a row id", departments.every((d) => /^[a-z-]+$/.test(d.id)),
    departments.map((d) => d.id).join(", "));
  ok("...and Main is not one of them", !departments.some((d) => d.id === "main"));
  ok("...Sales is", departments.some((d) => d.id === "sales"), departments.map((d) => d.id).join(", "));

  // The starter roles the studio ships with. Admin is the built-in wildcard —
  // not something anybody created, and not HR's to rename or delete.
  const hrRoles = await listHrRoles(hr);
  const named = hrRoles.map((r) => r.name);
  for (const want of ["Admin", "Manager", "Team Lead", "Member", "Viewer"]) {
    ok(`the studio ships with ${want}`, named.includes(want), named.join(", "));
  }
  ok("Admin is the wildcard", hrRoles.find((r) => r.name === "Admin")?.wildcard === true);

  const made = await createHrRole(hr, { name: `Sales Engineer ${rand()}`, description: "Raises and works tickets." });
  ok("HR can name a new job", !!made.role, JSON.stringify(made.error));
  // The whole reason naming is allowed on an HR grant: it hands out nothing.
  ok("...and it starts with no access at all", (made.role?.permissions || []).length === 0,
    JSON.stringify(made.role?.permissions));

  const renamed = await editHrRole(hr, ADMIN_ROLE_ID, { name: "Not Admin" });
  ok("Admin cannot be renamed from HR", renamed.error === "protected", JSON.stringify(renamed));
  const undeletable = await removeHrRole(hr, ADMIN_ROLE_ID);
  ok("...nor deleted", undeletable.error === "protected", JSON.stringify(undeletable));

  // A department is checked against the SECTIONS now, so a made-up one is
  // refused where an HR row id used to be looked up.
  const placed = await saveEmployment(hr, member.collaborator.id, { departmentId: "sales" });
  ok("somebody can be placed in a section", placed.ok === true, JSON.stringify(placed));
  const nonsense = await saveEmployment(hr, member.collaborator.id, { departmentId: "not-a-section" });
  ok("...but not in one that does not exist", nonsense.error === "department", JSON.stringify(nonsense));

  // THE GUARD THAT MATTERS. Somebody holding HR and nothing else must not be
  // able to hand out access through the employee editor — that would make
  // hr.employees.edit a second door onto the whole permission model.
  await updateCollaborator(studio.id, nobody.collaborator.id, {
    overrides: { allow: ["hr.employees.view", "hr.employees.edit", "hr.employees.create", "hr.employees.delete"], deny: [] },
  });
  const hrOnly = await hrContext(nobody.user, slug);
  ok("an HR-only user can open HR", !hrOnly.error, hrOnly.error);
  ok("...and is not offered role assignment", hrOnly.canAssignRoles === false);
  const grab = await saveEmployment(hrOnly, member.collaborator.id, { roleIds: [ADMIN_ROLE_ID] });
  ok("...and cannot put anybody in a role", grab.error === "role-forbidden", JSON.stringify(grab));
  const stillPlain = await getCollaboratorByUser(studio.id, member.user.id);
  ok("...so nothing was written", !(stillPlain.roleIds || []).includes(ADMIN_ROLE_ID),
    JSON.stringify(stillPlain.roleIds));
  ok("...while the ordinary HR fields still save",
    (await saveEmployment(hrOnly, member.collaborator.id, { mobile: "0500000000" })).ok === true);

  // The owner may, because the owner holds everything.
  const given = await saveEmployment(hr, member.collaborator.id, { roleIds: [ADMIN_ROLE_ID] });
  ok("an owner can put somebody in a role from HR", given.ok === true, JSON.stringify(given));

  // DELETING A ROLE DELETES ITS ACCESS, and takes the reference off everybody
  // holding it. It used to refuse instead, which made a job title undeletable
  // until every holder had been hand-edited — guarding against a stale pointer
  // that the delete should simply remove.
  const doomed = await createHrRole(hr, { name: `Doomed ${rand()}` });
  await saveEmployment(hr, viewer.collaborator.id, { roleIds: [doomed.role?.id] });
  const goodbye = await removeHrRole(hr, doomed.role?.id);
  ok("a held role can be deleted", goodbye.ok === true, JSON.stringify(goodbye));
  ok("...and says how many people lost it", goodbye.stripped === 1, JSON.stringify(goodbye.stripped));
  const orphaned = await getCollaboratorByUser(studio.id, viewer.user.id);
  ok("...leaving nobody pointing at it", !(orphaned.roleIds || []).includes(doomed.role?.id),
    JSON.stringify(orphaned.roleIds));
  ok("...and gone from the list", !(await listHrRoles(hr)).some((r) => r.id === doomed.role?.id));

  // Taking access AWAY is an access act too, so a held role is not HR's alone
  // to delete — without this, an HR grant would strip every manager in the
  // studio. A role nobody holds changes nobody's access and stays HR's.
  const hrOnlyAgain = await hrContext(nobody.user, slug);
  const spare = await createHrRole(hr, { name: `Spare ${rand()}` });
  await saveEmployment(hr, viewer.collaborator.id, { roleIds: [spare.role?.id] });
  const blocked = await removeHrRole(hrOnlyAgain, spare.role?.id);
  ok("HR alone cannot delete a role people hold", blocked.error === "role-forbidden", JSON.stringify(blocked));
  await saveEmployment(hr, viewer.collaborator.id, { roleIds: [] });
  const allowed = await removeHrRole(hrOnlyAgain, spare.role?.id);
  ok("...but can delete one nobody holds", allowed.ok === true, JSON.stringify(allowed));

  // The explainer follows the roles that RESOLVED, so a row still carrying a
  // dead id from before the cascade existed reads as "no role yet" rather than
  // the meaningless "holds no role, which does not include this".
  const ghost = { collaborator: { alias: "Ghost", roleIds: ["role_gone_for_good"] }, roles: await listRoles(studio.id) };
  const said = explain(ghost, "sales.tickets.view");
  ok("a dead role id explains as having no role", said.allowed === false && said.reason.includes("no role yet"), said.reason);

  const freeToGo = await removeHrRole(hr, made.role?.id);
  ok("a role nobody ever held deletes cleanly", freeToGo.ok === true, JSON.stringify(freeToGo));

  // THE FACE IS CARRIED. Set it on the ACCOUNT and HR shows it, without HR ever
  // having written a photo field of its own.
  await updateProfile(member.user.id, { photo: "https://example.invalid/face.png" });
  const staff = await listEmployees(hr, owner.id);
  const row = staff.find((e) => e.id === member.collaborator.id);
  ok("the employee photo is read off the account", row?.photo === "https://example.invalid/face.png",
    JSON.stringify(row?.photo));
  ok("...and the row carries no photo of its own",
    (await getCollaboratorByUser(studio.id, member.user.id)).photo === undefined,
    JSON.stringify((await getCollaboratorByUser(studio.id, member.user.id)).photo));
  ok("...and names roles rather than a position", Array.isArray(row?.roleNames) && row.positionTitle === undefined,
    JSON.stringify({ roleNames: row?.roleNames, positionTitle: row?.positionTitle }));

  // Put Member back the way the later blocks expect to find them.
  await updateCollaborator(studio.id, member.collaborator.id, { roleIds: [roleId("Member")] });
  await updateCollaborator(studio.id, nobody.collaborator.id, { overrides: { allow: [], deny: [] } });
}

// ============================================================================
console.log("\n== renaming happens now, not at midnight");
// A studio's name and address used to be stored as a request and applied by a
// cron at 00:00. They apply on save. The address is the half that matters: the
// new one has to resolve immediately and the old one has to stop, or a rename
// leaves two live addresses for one studio.
{
  const ownerB = (await createUser({ email: `own2-${rand()}@test.invalid`, passwordHash: "x" })).user;
  const first = `t-${rand()}${rand()}`;
  const made = await createStudio({ ownerUserId: ownerB.id, name: "Before", slug: first });
  ok("fixture studio created", !made.error, made.error);

  const renamed = `t-${rand()}${rand()}`;
  const out = await renameStudio(made.studio.id, { name: "After", slug: renamed });
  ok("the rename reports a change", out.changed === true, JSON.stringify(out.error));
  ok("the name changed on the row", out.studio.name === "After", out.studio.name);

  ok("the new address resolves", (await getStudioBySlug(renamed))?.id === made.studio.id);
  ok("the old address does not", (await getStudioBySlug(first)) === null);

  // The old slug must be RELEASED, not merely unused — otherwise it stays
  // claimed forever and nobody can ever take it.
  ok("the old address is free to claim again", (await getIndex(IX.slug(first))) === null);

  // Two studios cannot share an address, whichever order they ask in.
  const clash = await renameStudio(studio.id, { slug: renamed });
  ok("a taken address is refused", clash.error === "slug-taken", JSON.stringify(clash));
  ok("...and the refused studio keeps its own", (await getStudioBySlug(slug))?.id === studio.id);

  const noop = await renameStudio(made.studio.id, { name: "After", slug: renamed });
  ok("renaming to what it already is changes nothing", noop.changed === false, JSON.stringify(noop));
}

// ============================================================================
console.log("\n== the traffic export");
// The annual email was the only way this data ever left the database, and it is
// gone. So the download that replaced it has to work, and has to be owner-only
// — it answers with every page anyone has visited.
{
  const seeded = await seedSuperAdmin({ email: `sup-${rand()}@test.invalid`, password: "irrelevant-here" });
  ok("a console owner exists to test with", !!seeded.admin, seeded.error);

  __signOut();
  const shut = await EXPORT_CSV(new Request("http://localhost/x"));
  ok("a stranger is refused", shut.status === 401, `got ${shut.status}`);

  const signedIn = await loginSuper(seeded.admin.email, "irrelevant-here");
  ok("the owner can sign in", !!signedIn?.token);
  __signIn(SUPER_COOKIE, signedIn.token);

  const res = await EXPORT_CSV(new Request("http://localhost/x?days=7"));
  ok("the owner gets a file", res.status === 200, `got ${res.status}`);
  ok("...served as CSV", (res.headers.get("content-type") || "").includes("text/csv"));
  ok("...with a filename the browser will save",
    (res.headers.get("content-disposition") || "").includes("attachment; filename="),
    res.headers.get("content-disposition") || "");

  const body = await res.text();
  const blocks = ["date,sessions,page views", "page,views", "continent,visits", "device,visits", "totals,"];
  for (const b of blocks) ok(`...containing the "${b.split(",")[0]}" block`, body.includes(b));
  // The shapes readContinents/readDevices actually return differ from each
  // other; reading either one wrong shows up as a column of blanks rather than
  // an error, so the file is checked for real values and not just headings.
  ok("...with continents filled in, not blank", /\n[A-Za-z][^,\n]*,\d+/.test(body.split("continent,visits")[1] || ""));
  __signOut();
}

// ============================================================================
console.log("\n== cron jobs check who is calling");
// The check used to read `secret && auth !== …`, so an unset CRON_SECRET did not
// tighten it — it deleted it, leaving jobs that delete keys open to anyone who
// knew the path. It fails closed now, and both halves are worth holding: a
// missing secret must refuse, and a present one must still turn strangers away.
{
  const before = process.env.CRON_SECRET;
  const call = (headers) => YEAR_ROLLOVER(new Request("http://localhost/x", { headers }));

  process.env.CRON_SECRET = "";
  ok("no secret configured → refuses", (await call({})).status === 503);

  process.env.CRON_SECRET = "s3cr3t-for-this-test";
  ok("secret set, no credentials → refuses", (await call({})).status === 401);
  ok("...a wrong secret → refuses", (await call({ authorization: "Bearer nope" })).status === 401);
  ok("...the right secret → runs", (await call({ authorization: "Bearer s3cr3t-for-this-test" })).status === 200);
  // Vercel's edge strips inbound x-vercel-* headers, so this is trustworthy
  // where it appears — it is a second door, never a replacement for the secret.
  ok("...Vercel's own cron header → runs", (await call({ "x-vercel-cron": "1" })).status === 200);

  // It reports, it does not destroy: on any day but 1 January it records the
  // snapshot and says so.
  const ran = await (await call({ "x-vercel-cron": "1" })).json();
  ok("a normal day records the snapshot and stops there", ran.skipped === "not new year", JSON.stringify(ran));
  ok("...and counts the active users", typeof ran.active === "number", JSON.stringify(ran.active));

  if (before === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = before;
}

// ============================================================================
// Everything this suite wrote lives under the namespace, so cleanup is one
// prefix deletion. Runs whatever happened above — a failed assertion must not
// leave keys behind.
const swept = await delPrefix(KEY_PREFIX);
console.log(`\nswept ${swept} keys from "${KEY_PREFIX}"`);
await (await getRedisClient()).quit();

console.log(fails ? `\n${fails} FAILURES\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
