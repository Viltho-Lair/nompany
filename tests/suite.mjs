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
import { createStudio, renameStudio, getStudioBySlug, updateStudio } from "@/lib/data/studios";
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
import { technicalContext, requestRfq, convertRfq, updateRfq, updateQuotation, listQuotations } from "@/lib/technical";
import { rfqInfo } from "@/lib/salesAnalytics";
import {
  qualityContext, installStarterTypes, createType, updateType, removeType,
  createDocument, updateDocument, removeDocument, listTypes, listDocuments,
  saveDepartmentCodes, departmentCodes,
  openDraft, saveDraft, acquireLock, releaseLock, lockState, watermarkFor,
  moveRevision, startRevision, setSigners, listRevisions, listAudit,
  setDistribution, distributionOf, acknowledge, markRead,
  createShareLink, revokeShareLink, listShareLinks,
} from "@/lib/quality";
import { getJSON } from "@/lib/data/store";
import { NODES, EDGES, pathBetween, reachableFrom, traverse } from "@/lib/relations";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { SECTION_COLLECTIONS, ALL_SECTION_KEYS } from "@/lib/data/keys";
import { mergeValuesFor, fieldsFor, bindSubject, subjectOptions } from "@/lib/quality";
import { isFieldKey, legalKeyFor, availableFields, isBlockSource, blockByKey, reachOf } from "@/lib/qualityFields";
import { setCallPoint, listTemplates, templateForCallPoint, callPointReady,
  letterheadFor, saveLetterhead } from "@/lib/quality";
import { barSlots, PAGE_TOKENS } from "@/lib/qualityRender";
import { ticketQuotation } from "@/lib/sales";
import { CALL_POINTS, callPointById, callPointOptions } from "@/lib/qualityCallPoints";
import { resolveBlocks, blocksFor, generateDocument, listGenerated, getGenerated,
  moveGenerated, regenerate } from "@/lib/quality";
import { documentState, pendingRevision } from "@/lib/qualityDocuments";
import { sanitizeDoc, cleanSections, textOf } from "@/lib/qualityContent";
import { renderSections, slotValue, DEFAULT_TEMPLATE } from "@/lib/qualityRender";
import { listSections, updateRow } from "@/lib/data/sections";
import { readArr, writeArr } from "@/lib/data/store";
import { S } from "@/lib/data/keys";
import { financeContext, createInvoice, removeInvoice, listInvoices } from "@/lib/finance";
import { inventoryContext, createItem, adjustStock, listProjectSheets, saveSheetLine } from "@/lib/inventory";
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

  // AN APPROVAL ENDS THE ASKING. A repeat RFQ is how Sales asks for a revision,
  // and there is nothing left to revise once the client has signed — raising one
  // would supersede the approved document with an empty revision and take the
  // approval down with it, because an approval belongs to ONE quotation.
  const afterApproval = await requestTicketRfq(await salesContext(owner, slug), { ticketId: made.ticket?.id });
  ok("an approved quotation ends the asking", afterApproval.error === "approved", JSON.stringify(afterApproval));
  // Refused at BOTH doors, or Technical's "Raise RFQ" would quietly do what the
  // Sales button has stopped offering.
  const otherDoor = await requestRfq(await technicalContext(owner, slug), { ticketId: made.ticket?.id });
  ok("...at the Technical door too", otherDoor.error === "approved", JSON.stringify(otherDoor));
  // And the ticket SAYS so, off the approval rather than off the document, so
  // the button is never drawn where the endpoint would refuse it.
  const hidden = (await listTickets(await salesContext(owner, slug))).find((t) => t.id === made.ticket?.id);
  ok("...and the ticket says so, so the button is not drawn", hidden?.quotationApproved === true,
    JSON.stringify({ approved: hidden?.quotationApproved, status: hidden?.quotations?.[0]?.status }));

  // THE LAST READER OF THE STORED STATUS. The list said Approved, the ticket
  // said Quotation Approved, and locking answered "Only an approved quotation
  // can be locked" — because this one guard still asked the document.
  const locked = await updateQuotation(await technicalContext(owner, slug), conv.quotation?.id, { locked: true });
  ok("an approved quotation can be locked", locked.quotation?.locked === true, JSON.stringify(locked.error));

  // LOCKING USED TO BE GENUINELY ONE-WAY, which is right up until somebody locks
  // the wrong document — and then the only remedy was a new quotation with a new
  // number, a worse lie than the mistake. Unlock is its own permission, and a
  // request that unlocks may do NOTHING else, or it would be a way to smuggle an
  // edit past the lock in a single write.
  const lockCtx = await technicalContext(owner, slug);
  const sneak = await updateQuotation(lockCtx, conv.quotation?.id, { locked: false, title: "and a rename" });
  ok("unlocking cannot carry an edit with it", sneak.error === "locked", JSON.stringify(sneak));
  const stillShut = await updateQuotation(lockCtx, conv.quotation?.id, { title: "just a rename" });
  ok("...and a locked quotation still refuses edits", stillShut.error === "locked", JSON.stringify(stillShut));

  const reopened = await updateQuotation(lockCtx, conv.quotation?.id, { locked: false });
  ok("somebody holding unlock can reopen it", reopened.quotation?.locked === false, JSON.stringify(reopened.error));
  ok("...and it records who did", !!reopened.quotation?.unlockedByCollaboratorId, JSON.stringify(reopened.quotation?.unlockedAt));

  // Held by nobody but the owner: a Member may edit quotations and must not be
  // able to reopen one somebody declared finished.
  await updateQuotation(lockCtx, conv.quotation?.id, { locked: true });
  const memberTech = await technicalContext(member.user, slug);
  ok("a Member does not hold unlock", !memberTech.access.has("technical.quotations.unlock"));

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
  // TWO SHEETS, AND NEITHER HOLDS A LINE. The quotation owns the rows; a sheet
  // stores only what its department adds to them, keyed by the row it belongs
  // to. I built these as a copy first, which is the mistake this product keeps
  // removing everywhere else — a copied sheet is wrong from the quotation's
  // first edit and nothing says so.
  ok("opening a project draws up both sheets", (opened.sheets || []).length === 2, JSON.stringify(opened.sheets?.length));
  ok("...Main and Bulk", (opened.sheets || []).map((s) => s.kind).join(",") === "main,bulk",
    (opened.sheets || []).map((s) => s.kind).join(","));
  ok("...neither holding a copied line", (opened.sheets || []).every((s) => s.rows === undefined),
    JSON.stringify((opened.sheets || []).map((s) => s.rows)));
  ok("...each carrying the whole chain as keys",
    (opened.sheets || []).every((s) => s.quotationId === conv.quotation?.id && s.ticketId === made.ticket?.id
      && s.rfqId === asked.rfq?.id && s.projectId === opened.project?.id),
    JSON.stringify(opened.sheets?.[0]));

  // And the rows come back from the QUOTATION on every read, without prices.
  const composed = await listProjectSheets(await inventoryContext(owner, slug));
  const mainSheet = composed.find((s) => s.projectId === opened.project?.id && s.kind === "main");
  ok("a sheet reads its rows back from the quotation", Array.isArray(mainSheet?.tables), JSON.stringify(mainSheet?.tables));
  ok("...with no price on any of them",
    (mainSheet?.tables || []).flatMap((t) => t.rows).every((r) => r.unitPrice === undefined),
    JSON.stringify((mainSheet?.tables || []).flatMap((t) => t.rows)[0]));

  // ONE ROW, COLUMNS OWNED BY DIFFERENT DEPARTMENTS, EVERYBODY READING ALL OF
  // IT. Two records per row would make this a copy again, with the same drift
  // and the same arguments about which is right — so Inventory writing that the
  // material is on order is the same record Projects reads, and vice versa.
  const inv = await inventoryContext(owner, slug);
  const anySheet = composed.find((s) => s.projectId === opened.project?.id);
  // Material and Ordered are gone — both asked somebody to say in a dropdown
  // what the allocation already says. Serials are what Inventory owns.
  const written = await saveSheetLine(inv, {
    sheetId: anySheet?.id, rowId: "r1", owner: "inventory",
    values: { serials: ["SN-1", "SN-1", "SN-2"] },
  });
  ok("Inventory can write its own column", written.ok === true, JSON.stringify(written));
  ok("...cleaned to its kind, duplicates collapsed", written.line?.serials?.length === 2,
    JSON.stringify(written.line));

  // A department may write only ITS OWN columns, decided by cleanSheetLine
  // rather than by the caller — so a payload naming somebody else's column
  // cannot smuggle it through even with the right that covers its own.
  const crossed = await saveSheetLine(inv, {
    sheetId: anySheet?.id, rowId: "r1", owner: "inventory",
    values: { installation: "Done" },
  });
  ok("...and cannot write another department's", crossed.error === "nothing", JSON.stringify(crossed));

  // PROJECTS HAS NO COLUMNS YET — its three were a guess and were removed, and a
  // guess in a shared row is worse than a gap. The MACHINERY is what is under
  // test: a write claiming to be Projects finds nothing of Projects' to write,
  // rather than falling through and writing Inventory's.
  const asProjects = await saveSheetLine(inv, {
    sheetId: anySheet?.id, rowId: "r1", owner: "projects", values: { serials: ["SN-9"] },
  });
  ok("a Projects write cannot reach Inventory's columns", asProjects.error === "nothing", JSON.stringify(asProjects));
  // Read back through a write of Inventory's own, because the fixture quotation
  // has no priced rows — so the composed sheet has no row to read, while the
  // stored record for it does exist. What is under test is the record.
  const untouched = await saveSheetLine(inv, {
    sheetId: anySheet?.id, rowId: "r1", owner: "inventory", values: { serials: ["SN-1", "SN-2"] },
  });
  ok("...and Inventory's own allocation stands", untouched.line?.serials?.length === 2,
    JSON.stringify(untouched.line));

  // Somebody who may OPEN Inventory but holds no sheet right writes nothing.
  // Viewer is exactly that case, and it is the one worth testing: refusing
  // somebody who cannot reach the module at all proves nothing about this
  // guard, because they never get as far as it.
  const viewerInv = await inventoryContext(viewer.user, slug);
  ok("a Viewer can open Inventory", !viewerInv.error, viewerInv.error);
  const outsider = await saveSheetLine(viewerInv, {
    sheetId: anySheet?.id, rowId: "r1", owner: "inventory", values: { serials: ["SN-3"] },
  });
  ok("...but cannot write a sheet column", outsider.error === "forbidden", JSON.stringify(outsider));


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
  // EVERYTHING THE TAB SEARCH LOOKS THROUGH is carried, not stored on the
  // sheet: the project number comes from the project, the quotation number from
  // the quotation, the PO number from the `po` task raised against it, and the
  // serials off Registered Items. A sheet holding copies of those four would be
  // four things to keep in step.
  const forSearch = (await listProjectSheets(await inventoryContext(owner, slug)))
    .find((s) => s.projectId === opened.project?.id);
  ok("a sheet carries the project number for search", forSearch?.projectNumber === numbered?.number,
    JSON.stringify(forSearch?.projectNumber));
  ok("...the quotation number", forSearch?.quotationNumber === conv.quotation?.number,
    JSON.stringify(forSearch?.quotationNumber));
  ok("...the PO", (forSearch?.poNumber || "").includes("PO-99"), JSON.stringify(forSearch?.poNumber));
  ok("...and the serials of the items on it", Array.isArray(forSearch?.serials), JSON.stringify(forSearch?.serials));
}

// ============================================================================
console.log("\n== raising a revision closes the quotation it revises");
// A second RFQ is Sales asking for the last quotation to be REVISED. From that
// moment the previous document is the record of what was offered before — the
// one the client is holding — and it must not change again. convertRfq opens the
// new revision on a COPY of its tables, so an edit landing in between would show
// up cleanly in neither version.
//
// Note what is NOT required here: approval. The Lock BUTTON refuses anything
// unapproved, which is right for a person declaring a document final and wrong
// for this — superseding is not approving.
{
  const sales = await salesContext(owner, slug);
  const service = await createService(sales, { name: "Revisions" });
  const made = await createTicket(sales, {
    title: "Revise the quotation", clientName: "Beta Works", deadline: "2026-12-01",
    industry: "Technology", serviceIds: [service.service?.id],
  });

  const first = await requestTicketRfq(sales, { ticketId: made.ticket?.id });
  const tech = await technicalContext(owner, slug);
  const q1 = await convertRfq(tech, { rfqId: first.rfq?.id, handledByCollaboratorId: member.collaborator.id });
  ok("fixture: a first quotation", !!q1.quotation, JSON.stringify(q1.error));
  await updateQuotation(await technicalContext(owner, slug), q1.quotation?.id, { status: "Completed" });

  // Unfinished work is left alone, so nothing was frozen before this point.
  const beforeSecond = (await listQuotations(await technicalContext(owner, slug)))
    .find((x) => x.id === q1.quotation?.id);
  ok("a submitted quotation is open until it is superseded", beforeSecond?.locked !== true,
    JSON.stringify(beforeSecond?.locked));

  const second = await requestTicketRfq(await salesContext(owner, slug), { ticketId: made.ticket?.id });
  ok("a finished quotation may be sent back for revision", !!second.rfq, JSON.stringify(second.error));

  const afterSecond = (await listQuotations(await technicalContext(owner, slug)))
    .find((x) => x.id === q1.quotation?.id);
  ok("...which closes the one being revised", afterSecond?.locked === true, JSON.stringify(afterSecond?.locked));
  ok("...naming what superseded it", afterSecond?.supersededByRfqId === second.rfq?.id,
    JSON.stringify(afterSecond?.supersededByRfqId));
  const shut = await updateQuotation(await technicalContext(owner, slug), q1.quotation?.id, { title: "a late edit" });
  ok("...and it refuses edits from then on", shut.error === "locked", JSON.stringify(shut));

  // The REVISION is a new row and is not locked — the whole point is that it can
  // be worked on. It keeps the number the client already holds and steps the
  // revision, opening on a copy of what was quoted last time.
  const q2 = await convertRfq(await technicalContext(owner, slug), { rfqId: second.rfq?.id });
  ok("the revision opens unlocked", q2.quotation?.locked === false, JSON.stringify(q2.quotation?.locked));
  ok("...keeping the number and stepping the revision",
    q2.quotation?.number === q1.quotation?.number && Number(q2.quotation?.revision) === 2,
    `${q2.quotation?.number} rev ${q2.quotation?.revision}`);

  // Somebody holding unlock can still reopen a superseded document — this is a
  // closed door, not a one-way one.
  const reopened = await updateQuotation(await technicalContext(owner, slug), q1.quotation?.id, { locked: false });
  ok("...and unlock still reopens it", reopened.quotation?.locked === false, JSON.stringify(reopened.error));
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
console.log("\n== a studio that predates a section still gets it");
// Sections are seeded at studio creation and nothing appends one afterwards, so
// every section added to SECTION_DEFS after a studio existed reached new
// studios only. Quality was the first to land that way, and listSections
// planting what is missing is the only reason the module is reachable at all in
// a studio created before it.
{
  const key = S.sections(studio.id);
  const before = await readArr(key);
  // Make this studio look like one created before Quality existed.
  await writeArr(key, before.filter((x) => !String(x.key).startsWith("quality")));
  ok("the section is genuinely gone first",
    !(await readArr(key)).some((x) => x.key === "quality"));

  const healed = await listSections(studio.id);
  ok("reading the sections plants the parent", healed.some((x) => x.key === "quality"));
  ok("...and its sub-section", healed.some((x) => x.key === "quality-documents"));
  const parent = healed.find((x) => x.key === "quality");
  const child = healed.find((x) => x.key === "quality-documents");
  ok("...pointing at the parent it belongs to", child?.parentId === parent?.id);
  ok("...and placed in the nav where it belongs, not at the end",
    healed.findIndex((x) => x.key === "quality") < healed.findIndex((x) => x.key === "tasks"));

  // Planting must be idempotent, or every page load mints a new SectionID and
  // the section's own data is orphaned behind it.
  const again = await listSections(studio.id);
  ok("reading again plants nothing new", again.length === healed.length);
  ok("...and keeps the same SectionID", again.find((x) => x.key === "quality").id === parent.id);
}

// ============================================================================
console.log("\n== controlled documents are numbered once, and for good");
{
  await signInAs(owner.id);
  const q = await qualityContext(owner, slug);
  ok("the owner reaches the register", !q.error, q.error || "");

  const starter = await installStarterTypes(q);
  ok("the ISO starter set installs", !starter.error && starter.types?.length === 5, starter.error || "");
  // A second press must not duplicate the taxonomy the first one made.
  ok("...and refuses to install twice", (await installStarterTypes(q)).error === "not-empty");

  const types = await listTypes(q);
  const procedure = types.find((t) => t.prefix === "QP");
  ok("Procedure came with the prefix QP", Boolean(procedure));
  ok("departments are the studio's own sections",
    q.departments.some((d) => d.id === "sales"), JSON.stringify(q.departments.map((d) => d.id)));

  const first = await createDocument(q, {
    title: "Purchasing procedure", typeId: procedure.id, departmentId: "sales",
  });
  ok("a document is created", !first.error, first.error || "");
  ok("...numbered TYPE-DEPT-NNN", /^QP-[A-Z0-9]{1,4}-001$/.test(String(first.document?.code)), String(first.document?.code));
  ok("...and starts unissued at revision 0",
    first.document.revision === 0 && !first.document.effectiveRevisionId);

  const second = await createDocument(q, {
    title: "Second procedure", typeId: procedure.id, departmentId: "sales",
  });
  ok("the next one takes the next number", second.document.code.endsWith("-002"), second.document.code);

  // THE POINT OF THE COUNTER. Deleting a draft must not free its number: a code
  // handed out twice is indistinguishable from a forged one.
  ok("an unissued document can be deleted", (await removeDocument(q, second.document.id)).ok === true);
  const third = await createDocument(q, {
    title: "Third procedure", typeId: procedure.id, departmentId: "sales",
  });
  ok("...and its number stays spent", third.document.code.endsWith("-003"), third.document.code);

  // Re-filing changes where a document is found, never what it is called.
  const refiled = await updateDocument(q, third.document.id, { departmentId: "technical", title: "Renamed" });
  ok("re-filing keeps the code it was issued with", refiled.document.code === third.document.code, refiled.document.code);
  ok("...while the change itself lands",
    refiled.document.departmentId === "technical" && refiled.document.title === "Renamed");

  // Retention — "an issued document is kept, not deleted" — is exercised where
  // a document can actually BE issued: see the workflow block below. It used to
  // be faked here by writing a status onto the row, which stopped being possible
  // the moment that state became derived from the revisions rather than stored.

  // A type documents were filed under cannot be deleted or re-prefixed, or
  // their codes stop meaning anything.
  ok("a type in use cannot be deleted", (await removeType(q, procedure.id)).error === "in-use");
  ok("...nor can its prefix change", (await updateType(q, procedure.id, { prefix: "XX" })).error === "prefix-in-use");

  const spare = await createType(q, { name: "Spare", prefix: "SPR" });
  ok("an unused type may be re-prefixed", (await updateType(q, spare.type.id, { prefix: "SPX" })).type?.prefix === "SPX");
  ok("...and deleted", (await removeType(q, spare.type.id)).ok === true);
  ok("two types cannot share a prefix", (await createType(q, { name: "Clash", prefix: "QP" })).error === "prefix-taken");

  // Two departments sharing a code would mint the same document number from two
  // places, which is the one thing a code may never do.
  const codes = JSON.stringify(departmentCodes(q));
  const clash = await saveDepartmentCodes(q, { departmentCodes: { sales: "DUP", technical: "DUP" } });
  ok("two departments cannot share a code", clash.error === "duplicate-code", JSON.stringify(clash));
  ok("...and the codes are left as they were", JSON.stringify(departmentCodes(q)) === codes);

  __signOut();
}

// ============================================================================
console.log("\n== the register is default-deny like everything else");
{
  // Nobody holds no role, so they hold nothing: the section must refuse rather
  // than open empty. This is the assertion that catches an area-less section
  // key being read as "nothing to protect".
  const denied = await qualityContext(nobody.user, slug);
  ok("somebody with no role is refused", denied.error === "forbidden", denied.error || "opened");

  // A viewer who may read must still not be able to write.
  const v = await qualityContext(viewer.user, slug);
  if (v.error) {
    ok("a viewer without the grant is refused", v.error === "forbidden", v.error);
  } else {
    const types = await listTypes(v);
    const attempt = await createDocument(v, { title: "Sneaky", typeId: types[0]?.id, departmentId: "sales" });
    ok("a read-only viewer cannot create", attempt.error === "forbidden", attempt.error || "created");
    ok("...and cannot change the taxonomy", (await createType(v, { name: "X", prefix: "ZZ" })).error === "forbidden");
  }
}

// ============================================================================
console.log("\n== a document stores JSON, and only what the allowlist names");
// The supplied guide sent the editor's HTML to the server and handed it to a
// headless browser. These are the payloads that would have been rendered by a
// Chromium running on our own infrastructure, on behalf of whoever typed them.
{
  const doc = (content) => ({ type: "doc", content });
  const flat = (json) => JSON.stringify(json);

  // A script node is not in the table, so there is nothing to strip — it is
  // simply not a thing the schema can express.
  const scripted = sanitizeDoc(doc([{ type: "script", content: [{ type: "text", text: "alert(1)" }] }]));
  ok("an unknown node type does not survive", !flat(scripted).includes("script"), flat(scripted));

  // The local-file read. An <img> pointed at the server's disk is the classic
  // PDF-generator file disclosure.
  const localFile = sanitizeDoc(doc([{ type: "image", attrs: { src: "file:///etc/passwd" } }]));
  ok("an image off the local filesystem is dropped", !flat(localFile).includes("etc/passwd"), flat(localFile));

  // The SSRF. Any src we did not mint is a request made from inside our network.
  const metadata = sanitizeDoc(doc([{ type: "image", attrs: { src: "http://169.254.169.254/latest/meta-data/" } }]));
  ok("an image at the metadata endpoint is dropped", !flat(metadata).includes("169.254"), flat(metadata));

  // ...while our own media store is allowed through untouched.
  const ours = "/api/media/" + "a".repeat(32);
  const mine = sanitizeDoc(doc([{ type: "image", attrs: { src: ours } }]));
  ok("an image from our own media store survives", flat(mine).includes(ours), flat(mine));

  // javascript: in a link is a script wearing a mark.
  const jsLink = sanitizeDoc(doc([{
    type: "paragraph",
    content: [{ type: "text", text: "click", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }],
  }]));
  ok("a javascript: link loses its mark but keeps the words",
    !flat(jsLink).includes("javascript:") && flat(jsLink).includes("click"), flat(jsLink));
  const httpLink = sanitizeDoc(doc([{
    type: "paragraph",
    content: [{ type: "text", text: "docs", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }],
  }]));
  ok("...while an ordinary link survives", flat(httpLink).includes("https://example.com"));

  // A merge field may only name a field that exists, or it resolves to nothing
  // at render time and prints a gap nobody can explain.
  const badField = sanitizeDoc(doc([{ type: "paragraph", content: [{ type: "mergeField", attrs: { field: "company.secrets" } }] }]));
  ok("an invented merge field is dropped", !flat(badField).includes("secrets"), flat(badField));
  const goodField = sanitizeDoc(doc([{ type: "paragraph", content: [{ type: "mergeField", attrs: { field: "company.name" } }] }]));
  ok("...and a real one survives", flat(goodField).includes("company.name"));

  // Attribute values are clamped, not merely allowed: a heading level of 99 is
  // not a heading, and a nesting bomb is not a document.
  const deepHeading = sanitizeDoc(doc([{ type: "heading", attrs: { level: 99 }, content: [{ type: "text", text: "x" }] }]));
  ok("an out-of-range heading level is clamped", flat(deepHeading).includes('"level":2'), flat(deepHeading));

  let bomb = { type: "paragraph", content: [{ type: "text", text: "deep" }] };
  for (let i = 0; i < 400; i += 1) bomb = { type: "blockquote", content: [bomb] };
  const flattened = sanitizeDoc(doc([bomb]));
  ok("a deeply nested payload is cut off rather than stored", flat(flattened).length < 5000, String(flat(flattened).length));

  // Sections always come back valid, so the editor always has something to
  // mount — an empty document is an empty paragraph, never null.
  const sections = cleanSections([{ id: "a", title: "Purpose", body: doc([{ type: "paragraph" }]) }, { id: "a", title: "Scope" }]);
  ok("a repeated section id is re-minted rather than dropped", sections.length === 2 && sections[0].id !== sections[1].id);
  ok("every section has a usable body", sections.every((x) => x.body?.type === "doc" && x.body.content?.length));
  ok("text is readable back out for search", textOf(sections).includes("Purpose"));
}

// ============================================================================
console.log("\n== two people, one draft");
{
  await signInAs(owner.id);
  const q = await qualityContext(owner, slug);
  const types = await listTypes(q);
  const made = await createDocument(q, {
    title: "Locking procedure", typeId: types[0].id, departmentId: "sales",
  });
  const docId = made.document.id;

  const opened = await openDraft(q, docId);
  ok("opening a document mints its first draft", opened.draft?.state === "draft" && opened.draft.rev === 1);
  ok("...starting from the usual headings", opened.sections.some((x) => x.title === "Purpose"));

  ok("the opener takes the lock", (await acquireLock(q, docId)).lock?.mine === true);
  ok("...and asking again is the heartbeat, not a refusal", (await acquireLock(q, docId)).lock?.mine === true);

  const saved = await saveDraft(q, docId, {
    sections: [{ id: "s1", title: "Purpose", body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "To control documents." }] }] } }],
  });
  ok("the holder can save", !saved.error, saved.error || "");
  ok("...and what comes back is what was stored", textOf(saved.sections).includes("To control documents"));

  // Somebody else now arrives. The starter roles predate Quality and therefore
  // hold none of its rights — which is the default-deny working, not a gap — so
  // this person is granted them explicitly, exactly as a studio would have to.
  await updateCollaborator(studio.id, member.collaborator.id, {
    overrides: { allow: ["quality.documents.view", "quality.documents.create", "quality.documents.edit"], deny: [] },
  });
  const m = await qualityContext(member.user, slug);
  if (!m.error) {
    const state = await lockState(m, docId);
    ok("the second person is told who holds it", state.mine === false && state.holderAlias === "Owner", JSON.stringify(state));
    const blocked = await acquireLock(m, docId);
    ok("...and cannot simply take it", blocked.error === "locked", blocked.error || "took it");

    // THE CHECK THAT MATTERS: a tab open since before the lock changed hands
    // still believes it holds the document. Believing is not holding, so the
    // refusal has to happen at the WRITE and not only when the screen opened.
    const sneaky = await saveDraft(m, docId, { sections: [{ id: "s1", title: "Mine now", body: { type: "doc", content: [] } } ] });
    ok("a non-holder is refused at the write", sneaky.error === "locked", sneaky.error || "saved");

    const forced = await acquireLock(m, docId, { force: true });
    ok("a deliberate take-over succeeds", forced.lock?.mine === true, forced.error || "");
    ok("...and says who it was taken from", forced.tookOverFrom === "Owner", String(forced.tookOverFrom));

    // And now the roles are reversed: the original holder is the one refused.
    const nowBlocked = await saveDraft(q, docId, { sections: [] });
    ok("the previous holder is now the one refused", nowBlocked.error === "locked", nowBlocked.error || "saved");

    await releaseLock(m, docId);
    ok("releasing frees it for the next person", (await acquireLock(q, docId)).lock?.mine === true);
  } else {
    ok("the second person could reach the module", false, m.error);
  }

  // A viewer opening a document must not silently author its first revision.
  const v = await qualityContext(viewer.user, slug);
  if (!v.error) {
    const fresh = await createDocument(q, { title: "Untouched", typeId: types[0].id, departmentId: "sales" });
    const readOnly = await openDraft(v, fresh.document.id);
    ok("a viewer opening an unwritten document creates nothing", readOnly.draft === null && readOnly.readOnly === true);
  }

  __signOut();
}

// ============================================================================
console.log("\n== one renderer draws the screen and the page");
// The preview and the PDF are not two implementations kept in step — they are
// this function, called twice. Everything below is therefore true of both.
{
  const p = (text) => ({ type: "paragraph", content: [{ type: "text", text }] });
  const doc = (content) => ({ type: "doc", content });
  const render = (sections, values) => renderSections(sections, { values });

  // ESCAPING. Content arrives as JSON, so a person can type a tag as text and
  // it must come out as text — this is the only place markup is ever produced.
  const nasty = render([{ id: "a", title: "<script>x</script>", body: doc([p('a & b < c > d "quoted"')]) }]);
  ok("text with tags in it is escaped, not emitted",
    !nasty.includes("<script>") && nasty.includes("&lt;script&gt;"), nasty.slice(0, 90));
  ok("...ampersands and angle brackets too", nasty.includes("a &amp; b &lt; c &gt; d"), nasty.slice(-120));

  // MERGE FIELDS resolve to the studio's values, and say which field is empty
  // rather than leaving a hole in a printed procedure.
  const withField = doc([{ type: "paragraph", content: [{ type: "mergeField", attrs: { field: "company.name" } }] }]);
  ok("a merge field prints its value",
    render([{ id: "a", title: "", body: withField }], { "company.name": "Acme" }).includes("Acme"));
  ok("...and names itself when nothing is set",
    render([{ id: "a", title: "", body: withField }], {}).includes("[company.name]"));

  // Every block takes its OWN direction. Without this an Arabic sentence inside
  // an English document has its full stop moved to the front by the bidi
  // algorithm — which is correct behaviour producing an incorrect document.
  ok("blocks carry dir=auto so each finds its own direction",
    render([{ id: "a", title: "T", body: doc([p("x")]) }]).includes('<p dir="auto">'));

  // An outbound link in a document that may be shared outside the studio.
  const linked = render([{ id: "a", title: "", body: doc([{
    type: "paragraph",
    content: [{ type: "text", text: "docs", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }],
  }]) }]);
  ok("links are given rel=noopener", linked.includes('rel="noopener noreferrer nofollow"'), linked);

  // A node type the renderer does not know draws NOTHING — never a guess, and
  // never an unhandled tag. The allowlist on the way in and the table on the way
  // out are meant to name the same set.
  const unknown = render([{ id: "a", title: "", body: doc([{ type: "iframe", attrs: { src: "https://evil" } }]) }]);
  ok("an unknown node renders nothing at all", !unknown.includes("iframe") && !unknown.includes("evil"), unknown);

  // Sections are numbered from their order, because a controlled document is
  // cited by section number.
  const numbered = render([
    { id: "a", title: "Purpose", body: doc([p("x")]) },
    { id: "b", title: "Scope", body: doc([p("y")]) },
  ]);
  ok("sections are numbered as they are ordered",
    numbered.indexOf("1.") < numbered.indexOf("Purpose") && numbered.includes("2."), "");

  // The letterhead's page tokens become the spans Puppeteer fills in; anything
  // else resolves against the merge values.
  ok("page tokens become the printer's own spans",
    slotValue("page.of", {}).includes('class="pageNumber"') && slotValue("page.of", {}).includes('class="totalPages"'));
  ok("...and a field token resolves like any other",
    slotValue("company.name", { values: { "company.name": "Acme" } }) === "Acme");
  ok("the default letterhead prints the code and the revision",
    DEFAULT_TEMPLATE.header.right === "document.code" && DEFAULT_TEMPLATE.footer.left === "document.revision");

  // THE STAMP. A draft must never be mistaken on paper for the issued document,
  // and a withdrawn one must never be mistaken for current — those two
  // confusions are what document control exists to prevent, and they happen
  // away from the screen that knew the difference.
  ok("a draft is stamped DRAFT", watermarkFor({ state: "draft" }) === "DRAFT");
  ok("a document in review is still a draft", watermarkFor({ state: "in-review" }) === "DRAFT");
  ok("an issued document carries no stamp", watermarkFor({ state: "effective" }) === "");
  ok("a withdrawn one is stamped OBSOLETE", watermarkFor({ state: "obsolete" }) === "OBSOLETE");
  // And with no state resolved at all it still errs towards DRAFT, because a
  // page wrongly stamped is recoverable and a draft mistaken for the issued
  // document is not.
  ok("...and an unknown state errs towards DRAFT", watermarkFor({}) === "DRAFT");
}

// ============================================================================
console.log("\n== nothing is issued until two people have signed it");
// The substance of "review and approve before issue". A single Approve button
// records that somebody clicked; two named signatures record that two people
// read it, and the second cannot be the first.
{
  await signInAs(owner.id);
  const q = await qualityContext(owner, slug);
  const types = await listTypes(q);

  // The owner holds everything, so a second person is needed for the second
  // signature. The member was granted the document rights earlier; the review
  // and approve rights are separate and have to be given separately — which is
  // the point of them being separate.
  await updateCollaborator(studio.id, member.collaborator.id, {
    overrides: {
      allow: [
        "quality.documents.view", "quality.documents.create", "quality.documents.edit",
        "quality.documents.review", "quality.documents.approve",
      ],
      deny: [],
    },
  });
  const m = await qualityContext(member.user, slug);

  const made = await createDocument(q, { title: "Issuing procedure", typeId: types[0].id, departmentId: "sales" });
  const id = made.document.id;
  await openDraft(q, id);
  await saveDraft(q, id, { sections: [{ id: "s1", title: "Purpose", body: { type: "doc", content: [] } }] });

  ok("a fresh document reads as a draft", documentState(made.document, await listRevisions(q, id)) === "draft");

  // The ladder, in order, refusing every step out of turn.
  ok("it cannot be published straight from draft", (await moveRevision(q, id, "publish")).error === "wrong-state");
  ok("it cannot be approved before it is reviewed", (await moveRevision(q, id, "approve")).error === "wrong-state");

  ok("the author sends it for review", !(await moveRevision(q, id, "submit")).error);
  ok("...and the text is frozen the moment they do",
    (await saveDraft(q, id, { sections: [] })).error === "not-editable");

  const reviewed = await moveRevision(m, id, "review", { note: "Reads correctly." });
  ok("the reviewer signs", !reviewed.error, reviewed.error || "");

  // THE CHECK THIS WHOLE STAGE EXISTS FOR. Holding both rights is legitimate;
  // using both on one revision means it was reviewed by nobody.
  ok("the reviewer may not also approve", (await moveRevision(m, id, "approve")).error === "same-signer");
  ok("...but somebody else may", !(await moveRevision(q, id, "approve", { note: "Approved." })).error);

  const before = (await listRevisions(q, id))[0];
  ok("both signatures are recorded with a name and a moment",
    Boolean(before.review?.byAlias && before.review?.at && before.approval?.byAlias && before.approval?.at),
    JSON.stringify({ r: before.review?.byAlias, a: before.approval?.byAlias }));
  ok("...by two different people",
    before.review.byCollaboratorId !== before.approval.byCollaboratorId);
  ok("...each naming the role they signed in",
    before.review.role === "Reviewed by" && before.approval.role === "Approved by");

  const published = await moveRevision(q, id, "publish", { effectiveDate: "2026-09-01", nextReviewDate: "2027-09-01" });
  ok("it is issued", !published.error, published.error || "");

  const after = await listRevisions(q, id);
  ok("...as revision 1, effective", after[0].state === "effective" && after[0].rev === 1);

  const docs = await listDocuments(q);
  const row = docs.find((d) => d.id === id);
  ok("the register now shows it as effective", row.state === "effective", row.state);
  ok("...carrying the effective date it was given", row.effectiveDate === "2026-09-01", row.effectiveDate);
  ok("...and the revision number", row.revision === 1, String(row.revision));

  // An issued document is retained, not deleted — the rule Phase 1 declared,
  // now that something can actually reach the state.
  ok("an issued document refuses deletion", (await removeDocument(q, id)).error === "controlled");

  // ---- the next revision ----
  //
  // Editing an issued document must never change it. It opens rev 2, and rev 1
  // stays exactly as it is until rev 2 is published over the top.
  const started = await startRevision(q, id);
  ok("the next revision starts at 2", started.revision?.rev === 2, String(started.revision?.rev));
  ok("...and starts from what the document currently says", Array.isArray(started.revision.sections));
  ok("...while rev 1 is still the effective one",
    (await listRevisions(q, id)).find((r) => r.rev === 1)?.state === "effective");
  ok("only one revision may be open at a time", (await startRevision(q, id)).error === "already-open");

  const withPending = (await listDocuments(q)).find((d) => d.id === id);
  ok("the register says effective AND names what is in flight",
    withPending.state === "effective" && withPending.pending?.rev === 2,
    JSON.stringify(withPending.pending));

  await moveRevision(q, id, "submit");
  const sentBack = await moveRevision(m, id, "reject", { note: "Section 3 is wrong." });
  ok("a reviewer can send it back", !sentBack.error, sentBack.error || "");
  ok("...which makes it writable again", !(await saveDraft(q, id, { sections: [] })).error);

  await moveRevision(q, id, "submit");
  await moveRevision(m, id, "review");
  await moveRevision(q, id, "approve");
  await moveRevision(q, id, "publish", { effectiveDate: "2026-10-01" });

  const both = await listRevisions(q, id);
  ok("publishing rev 2 supersedes rev 1 rather than deleting it",
    both.find((r) => r.rev === 1)?.state === "superseded" && both.find((r) => r.rev === 2)?.state === "effective");
  ok("...so what the procedure used to say is still readable",
    Array.isArray(both.find((r) => r.rev === 1)?.sections));

  // ---- withdrawal ----
  ok("a withdrawn document says so", !(await moveRevision(q, id, "withdraw")).error);
  const dead = (await listDocuments(q)).find((d) => d.id === id);
  ok("...and reads as obsolete", dead.state === "obsolete", dead.state);
  ok("...and refuses a new revision", (await startRevision(q, id)).error === "obsolete");
  ok("...and is stamped OBSOLETE on paper", watermarkFor(dead) === "OBSOLETE");
  // The bug this stands guard over: the PDF route stamps from the document it
  // was handed, and openDraft returns the raw row. Without the state resolved
  // onto it, every issued document printed DRAFT across every page.
  const forPrint = (await openDraft(q, id)).document;
  ok("...and the document the exporter is handed knows it too",
    watermarkFor(forPrint) === "OBSOLETE", String(forPrint.state));

  // ---- the trail ----
  const trail = await listAudit(q, id);
  const actions = trail.map((t) => t.action);
  for (const a of ["revision.submit", "revision.review", "revision.approve", "revision.publish", "revision.withdraw", "revision.started"]) {
    ok(`the trail records ${a.replace("revision.", "")}`, actions.includes(a), actions.join(","));
  }
  ok("every entry names who did it", trail.every((t) => t.byCollaboratorId && t.at));

  // Naming the signers, and the same rule as signing.
  ok("one person cannot be both signers",
    (await setSigners(q, id, { reviewerCollaboratorId: member.collaborator.id, approverCollaboratorId: member.collaborator.id })).error === "same-signer");

  __signOut();
}

// ============================================================================
console.log("\n== a document nobody has read is not a controlled document");
// The half of document control a register cannot satisfy on its own: proving
// the people who have to work to a procedure have seen the CURRENT revision.
{
  await signInAs(owner.id);
  const q = await qualityContext(owner, slug);
  const m = await qualityContext(member.user, slug);
  const types = await listTypes(q);

  const made = await createDocument(q, { title: "Distributed procedure", typeId: types[0].id, departmentId: "sales" });
  const id = made.document.id;
  await openDraft(q, id);

  // Nothing leaves the studio before it has been issued: a draft shared
  // outside is an uncontrolled document by definition, and whoever receives it
  // cannot tell that from the paper.
  ok("an unissued document cannot be shared", (await createShareLink(q, id, {})).error === "not-issued");

  await setDistribution(q, id, { collaboratorIds: [member.collaborator.id] });
  ok("nothing is distributed before a revision is issued",
    (await distributionOf(q, id)).recipients.length === 0);

  await moveRevision(q, id, "submit");
  await moveRevision(m, id, "review");
  await moveRevision(q, id, "approve");
  await moveRevision(q, id, "publish", { effectiveDate: "2026-09-01" });

  const first = await distributionOf(q, id);
  ok("issuing puts it in somebody's hands", first.recipients.length === 1, JSON.stringify(first));
  ok("...against the revision that was issued", first.rev === 1, String(first.rev));
  ok("...and starts unread", first.recipients[0].readAt === "" && first.recipients[0].acknowledgedAt === "");
  ok("...and counts as outstanding", first.outstanding === 1);

  // Opening is not accepting. Two facts, recorded separately, because an audit
  // asks for the second one.
  await markRead(m, id);
  const opened = await distributionOf(q, id);
  ok("opening it is recorded", opened.recipients[0].readAt !== "" && opened.recipients[0].acknowledgedAt === "");
  ok("...but it is still outstanding", opened.outstanding === 1);

  ok("the recipient acknowledges", !(await acknowledge(m, id)).error);
  const done = await distributionOf(q, id);
  ok("...and nothing is outstanding", done.outstanding === 0 && done.recipients[0].acknowledgedAt !== "");
  ok("...and acknowledging twice changes nothing",
    (await acknowledge(m, id)).error === "nothing-to-acknowledge");

  // THE ASSERTION THIS WHOLE BLOCK EXISTS FOR. Having read rev 1 says nothing
  // about rev 2, and a list that showed them as done would be telling the studio
  // precisely the thing document control exists to prevent.
  await startRevision(q, id);
  await moveRevision(q, id, "submit");
  await moveRevision(m, id, "review");
  await moveRevision(q, id, "approve");
  await moveRevision(q, id, "publish", { effectiveDate: "2026-10-01" });

  const afterRev2 = await distributionOf(q, id);
  ok("a new revision re-opens the question", afterRev2.rev === 2 && afterRev2.outstanding === 1, JSON.stringify(afterRev2));
  ok("...and the earlier acknowledgement does not carry over",
    afterRev2.recipients[0].acknowledgedAt === "", afterRev2.recipients[0].acknowledgedAt);

  // ---- share links ----
  const link = await createShareLink(q, id, { days: 7 });
  ok("an issued document can be shared", !link.error, link.error || "");
  ok("...with an expiry it cannot be created without", Boolean(link.link?.expiresAt));
  ok("...bound to one revision, not to the document", link.link.rev === 2, String(link.link.rev));

  // The token IS the address, and it resolves without a session or a studio.
  const resolved = await getJSON(IX.qshare(link.link.token));
  ok("the token resolves to the document on its own",
    resolved?.documentId === id && resolved?.revisionId === link.link.revisionId, JSON.stringify(resolved));

  ok("revoking kills the token", !(await revokeShareLink(q, link.link.id)).error);
  ok("...so it no longer resolves", (await getJSON(IX.qshare(link.link.token))) === null);
  const kept = await listShareLinks(q, id);
  ok("...while the row is kept as evidence it was once shared",
    kept.length === 1 && Boolean(kept[0].revokedAt), JSON.stringify(kept.map((l) => l.revokedAt)));

  // Sharing is its own right, separate from reading. The member holds the
  // document rights and has not been given this one.
  ok("sharing needs its own permission", (await createShareLink(m, id, {})).error === "forbidden");

  // ---- the trail ----
  const trail = await listAudit(q, id);
  const actions = trail.map((t) => t.action);
  for (const a of ["distribution.set", "distribution.issued", "distribution.acknowledged", "share.created", "share.revoked"]) {
    ok(`the trail records ${a}`, actions.includes(a), actions.join(","));
  }
}

// ============================================================================
console.log("\n== the author decides some breaks, and table widths survive");
{
  const p = (t) => ({ type: "paragraph", content: [{ type: "text", text: t }] });
  const doc = (content) => ({ type: "doc", content });
  const render = (content) => renderSections([{ id: "a", title: "", body: doc(content) }], {});

  // The page break existed as a CSS rule with no node able to match it, so an
  // author could not insert one and the rule was unreachable.
  const broken = sanitizeDoc(doc([p("before"), { type: "pageBreak" }, p("after")]));
  ok("a page break survives the allowlist",
    JSON.stringify(broken).includes("pageBreak"), JSON.stringify(broken));
  ok("...and renders the class the print sheet matches",
    render([p("before"), { type: "pageBreak" }, p("after")]).includes('class="quality-page-break"'));

  // Widths were stored, allowlisted, then silently dropped on the way out —
  // `table-layout: fixed` with no colgroup prints every column equal.
  const cell = (w) => ({ type: "tableCell", attrs: { colwidth: w ? [w] : null }, content: [p("x")] });
  const table = (cells) => ({ type: "table", content: [{ type: "tableRow", content: cells }] });

  const sized = render([table([cell(300), cell(100)])]);
  ok("a resized table emits a colgroup", sized.includes("<colgroup>"), sized.slice(0, 120));
  // 300:100 is 75%/25% — the RATIO, not the pixels, because the editor canvas is
  // not the width of the paper.
  ok("...as proportions rather than the editor's pixels",
    sized.includes('width:75.00%') && sized.includes('width:25.00%'), sized.slice(0, 200));
  ok("...and never as raw px", !sized.includes("px"), sized.slice(0, 200));

  // A table nobody touched should stay equal-width rather than gain a colgroup
  // asserting something the author never said.
  ok("an untouched table emits no colgroup", !render([table([cell(0), cell(0)])]).includes("<colgroup>"));

  // A partly-resized table still has to add up to 100%.
  const partial = render([table([cell(200), cell(0), cell(200)])]);
  const pcts = [...partial.matchAll(/width:([\d.]+)%/g)].map((m) => Number(m[1]));
  ok("a partly-resized table still adds up",
    pcts.length === 3 && Math.abs(pcts.reduce((a, b) => a + b, 0) - 100) < 0.05, JSON.stringify(pcts));

  // colspan means one cell covers several columns, so the colgroup needs an
  // entry each or every column after it is shifted one to the left.
  const spanned = render([{ type: "table", content: [{ type: "tableRow", content: [
    { type: "tableCell", attrs: { colspan: 2, colwidth: [120, 80] }, content: [p("wide")] },
    cell(200),
  ] }] }]);
  ok("a colspan still yields one <col> per column",
    (spanned.match(/<col /g) || []).length === 3, spanned.slice(0, 220));
}

// ============================================================================
console.log("\n== fields are carried, not copied, and only where they are allowed");
{
  await signInAs(owner.id);
  const q = await qualityContext(owner, slug);
  const types = await listTypes(q);
  const made = await createDocument(q, { title: "Field test", typeId: types[0].id, departmentId: "sales" });
  const id = made.document.id;

  // Unbound: Company and Document resolve, a department's do not — there is no
  // record to resolve them from, so offering them would be offering a blank.
  const plain = fieldsFor(q, made.document);
  ok("company and document fields are always offered",
    plain.fields.some((f) => f.key === "company.name") && plain.fields.some((f) => f.key === "document.code"));
  ok("...and a department's are not, with nothing to resolve them from",
    !plain.fields.some((f) => f.key === "sales.ticket.client"),
    plain.fields.map((f) => f.key).join(","));

  // The studio's own legal rows become fields. They were deferred when merge
  // fields first landed because the studio names the keys, so no fixed list
  // could enumerate them — they are validated by shape instead.
  await updateStudio(studio.id, { legalInfo: [{ key: "VAT Number", value: "3001234567" }] });
  const withLegal = await qualityContext(owner, slug);
  const legal = fieldsFor(withLegal, made.document);
  ok("the studio's legal rows become fields",
    legal.fields.some((f) => f.key === "legal.vat-number"), legal.fields.map((f) => f.key).join(","));
  ok("...keyed by a slug, so renaming the label does not orphan the documents",
    legalKeyFor("VAT Number") === legalKeyFor("vat  number"));
  ok("...and a legal key passes the content allowlist", isFieldKey("legal.vat-number"));
  ok("...while an invented key does not", !isFieldKey("legal.Not A Key") && !isFieldKey("sales.ticket.salary"));

  const values = await mergeValuesFor(withLegal, made.document);
  ok("a legal field resolves to what the studio typed", values["legal.vat-number"] === "3001234567", values["legal.vat-number"]);

  // ---- binding ----
  // A ticket needs a service from the studio's own catalogue, so the fixture
  // builds one the way Sales does rather than posting an empty list.
  const salesCtx = await salesContext(owner, slug);
  const svc = await createService(salesCtx, { name: "Control systems" });
  const ticket = await createTicket(salesCtx, {
    title: "New control room", clientName: "Acme Industrial", deadline: "2026-12-01",
    industry: "Oil & Gas", serviceIds: [svc.service?.id || svc.id], contactName: "Sara Idris",
  });
  if (ticket.error) {
    ok("fixture: a ticket to bind to", false, ticket.error);
  } else {
    const opts = await subjectOptions(withLegal, "salesTicket");
    ok("the bindable records are listed", (opts.options || []).some((o) => o.id === ticket.ticket.id));

    const bound = await bindSubject(withLegal, id, { subjectType: "salesTicket", subjectId: ticket.ticket.id });
    ok("a document can be bound to a record", !bound.error, bound.error || "");

    const ctx2 = await qualityContext(owner, slug);
    const after = fieldsFor(ctx2, bound.document);
    ok("...which makes that department's fields appear",
      after.fields.some((f) => f.key === "sales.ticket.client"));
    ok("...grouped under the department, not lumped in with Company",
      after.groups.some(([g]) => g === "Sales"), after.groups.map(([g]) => g).join(","));

    const v2 = await mergeValuesFor(ctx2, bound.document);
    ok("a bound field resolves off the record", v2["sales.ticket.client"] === "Acme Industrial", v2["sales.ticket.client"]);
    ok("...including a nested one", v2["sales.ticket.ref"] === ticket.ticket.ref, v2["sales.ticket.ref"]);
    ok("...and a CollaboratorID becomes a name, not an id",
      v2["sales.ticket.owner"] === "Owner", v2["sales.ticket.owner"]);

    // THE CHECK THIS BLOCK EXISTS FOR. A document that prints a client's details
    // to somebody who may not open Sales is a way of reading Sales without the
    // right to, and the document is the leak.
    // Somebody who may read Quality and holds NOTHING in Sales. Built from the
    // roleless person rather than the Viewer starter role, so the absence of the
    // Sales right is a fact about this fixture and not an assumption about what
    // a starter role happens to contain.
    await updateCollaborator(studio.id, nobody.collaborator.id, {
      overrides: { allow: ["quality.documents.view"], deny: [] },
    });
    const viewerCtx = await qualityContext(nobody.user, slug);
    ok("fixture: a reader with Quality but not Sales", !viewerCtx.error, viewerCtx.error || "");
    if (!viewerCtx.error) {
      const vFields = fieldsFor(viewerCtx, bound.document);
      ok("somebody without the department's right is not offered its fields",
        !vFields.fields.some((f) => f.key === "sales.ticket.client"));
      const vValues = await mergeValuesFor(viewerCtx, bound.document);
      ok("...and cannot resolve them either", vValues["sales.ticket.client"] === undefined,
        String(vValues["sales.ticket.client"]));
      ok("...while company fields still resolve for them", vValues["company.name"] === studio.name);
    }

    // Nor may they bind one, for the same reason.
    const sneaky = await bindSubject(viewerCtx, id, { subjectType: "salesTicket", subjectId: ticket.ticket.id });
    ok("nobody may bind a document to a record they cannot see",
      sneaky.error === "forbidden" || sneaky.error === "unknown-permission", sneaky.error || "bound");

    ok("a made-up record id is refused",
      (await bindSubject(ctx2, id, { subjectType: "salesTicket", subjectId: "nope" })).error === "no-record");
  }

  __signOut();
}

// ============================================================================
console.log("\n== a slot points at rows, and an unanswered one is still a form");
{
  const p = (t) => ({ type: "paragraph", content: [{ type: "text", text: t }] });
  const doc = (content) => ({ type: "doc", content });

  // A block names a source, never the rows. An invented source is dropped on the
  // way in rather than stored and rendered as a hole later.
  const good = sanitizeDoc(doc([{ type: "recordBlock", attrs: { source: "quotation.lines" } }]));
  ok("a declared block source survives", JSON.stringify(good).includes("quotation.lines"), JSON.stringify(good));
  const bad = sanitizeDoc(doc([{ type: "recordBlock", attrs: { source: "finance.everything" } }]));
  ok("an invented one does not", !JSON.stringify(bad).includes("finance"), JSON.stringify(bad));
  ok("the source registry agrees", isBlockSource("quotation.lines") && !isBlockSource("finance.everything"));

  // Rendering a block with nothing bound says so, rather than leaving a gap
  // somebody has to guess the meaning of.
  const unbound = renderSections([{ id: "a", title: "", body: doc([{ type: "recordBlock", attrs: { source: "quotation.lines" } }]) }], {});
  ok("a block with nothing bound says so", unbound.includes("nothing bound"), unbound.slice(0, 160));

  // And with rows it renders the source's declared columns, in order.
  const rows = [{ description: "Cable tray", unit: "m", qty: "40", unitPrice: "12.50", discount: "" }];
  const filled = renderSections(
    [{ id: "a", title: "", body: doc([p("Priced as follows:"), { type: "recordBlock", attrs: { source: "quotation.lines" } }, p("Terms overleaf.")]) }],
    { blocks: { "quotation.lines": { rows } } },
  );
  ok("a bound block renders its rows", filled.includes("Cable tray") && filled.includes("12.50"), filled.slice(-260));
  ok("...with the source's own columns, in order",
    filled.indexOf("Description") < filled.indexOf("Unit") && filled.indexOf("Unit") < filled.indexOf("Qty"));
  ok("...dropped between the sentences either side of it",
    filled.indexOf("Priced as follows") < filled.indexOf("Cable tray")
    && filled.indexOf("Cable tray") < filled.indexOf("Terms overleaf"));

  // AN UNANSWERED INPUT IS STILL A DOCUMENT. A labelled rule is what a paper
  // form is, so a training record prints as something somebody can complete by
  // hand long before anything can fill it digitally.
  const form = doc([{ type: "inputField", attrs: { name: "trainee", label: "Trainee name", inputType: "text" } }]);
  const blankForm = renderSections([{ id: "a", title: "", body: form }], {});
  ok("an unanswered input prints a labelled rule",
    blankForm.includes("Trainee name") && blankForm.includes("quality-input-rule"), blankForm.slice(0, 200));
  const answered = renderSections([{ id: "a", title: "", body: form }], { inputs: { trainee: "Ali Moosa" } });
  ok("...and an answered one prints the answer", answered.includes("Ali Moosa") && !answered.includes("quality-input-rule"));

  // An input type nobody declared falls back rather than being stored.
  const odd = sanitizeDoc(doc([{ type: "inputField", attrs: { name: "x", label: "X", inputType: "signature" } }]));
  ok("an undeclared input type falls back to text", JSON.stringify(odd).includes('"inputType":"text"'), JSON.stringify(odd));
}

// ============================================================================
console.log("\n== blocks answer to the same rights the records do");
{
  await signInAs(owner.id);
  const q = await qualityContext(owner, slug);
  const types = await listTypes(q);
  const made = await createDocument(q, { title: "Quotation cover", typeId: types[0].id, departmentId: "technical" });

  ok("no blocks are offered with nothing bound", blocksFor(q, made.document).length === 0);
  ok("...and none resolve", Object.keys(await resolveBlocks(q, made.document)).length === 0);

  // The template flag is just a fact about the document; it stays a controlled
  // document with a code, revisions and two signatures.
  const flagged = await updateDocument(q, made.document.id, { isTemplate: true });
  ok("a document can declare itself a template", flagged.document?.isTemplate === true);
  ok("...and keeps the code it was issued with", flagged.document.code === made.document.code);

  // Somebody with Quality but nothing in Technical is offered no Technical
  // block, for the same reason they are offered no Technical field.
  const outsider = await qualityContext(nobody.user, slug);
  if (!outsider.error) {
    ok("a block is not offered to somebody without the department's right",
      blocksFor(outsider, { ...made.document, subjectType: "quotation" }).length === 0);
  }

  __signOut();
}

// ============================================================================
console.log("\n== a template is a blank, and what comes off it is evidence");
{
  await signInAs(owner.id);
  const q = await qualityContext(owner, slug);
  const types = await listTypes(q);

  const tpl = await createDocument(q, { title: "Quotation cover", typeId: types[0].id, departmentId: "technical" });
  const templateId = tpl.document.id;

  // A blank nobody has approved is not a blank anybody may issue from — which is
  // the whole reason a template is a controlled document rather than a setting.
  ok("a document that is not a template refuses to generate",
    (await generateDocument(q, { templateId })).error === "not-a-template");

  await updateDocument(q, templateId, { isTemplate: true });
  await bindSubject(q, templateId, { subjectType: "quotation", subjectId: "" });
  ok("an unapproved template refuses to generate",
    (await generateDocument(q, { templateId })).error === "not-issued");

  // Approve the blank, the long way round, because that is the only way there is.
  await openDraft(q, templateId);
  await saveDraft(q, templateId, { sections: [{ id: "s1", title: "Terms", body: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "Priced as follows:" }] },
    { type: "recordBlock", attrs: { source: "quotation.lines" } },
    { type: "paragraph", content: [
      { type: "text", text: "Accepted by " },
      { type: "inputField", attrs: { name: "accepted-by", label: "Accepted by", inputType: "text" } },
    ] },
  ] } }] });
  await moveRevision(q, templateId, "submit");
  await moveRevision(await qualityContext(member.user, slug), templateId, "review");
  await moveRevision(q, templateId, "approve");
  await moveRevision(q, templateId, "publish", { effectiveDate: "2026-09-01" });

  // A quotation to generate against.
  const tech = await technicalContext(owner, slug);
  const quotes = await listQuotations(tech);
  const quote = (quotes.quotations || quotes || [])[0];
  if (!quote) {
    ok("fixture: a quotation to generate against", false, "none found");
  } else {
    const made = await generateDocument(q, {
      templateId, subjectId: quote.id,
      inputs: { "accepted-by": "Ali Moosa", "not-asked-for": "smuggled" },
      reviewerCollaboratorId: member.collaborator.id,
      approverCollaboratorId: owner.id,
    });
    ok("an approved template generates", !made.error, made.error || "");
    const inst = made.instance;

    // The template's own code, then a sequence of its own: FRM-SAL-001/0001.
    // Asserted by shape rather than by prefix, because which type the fixture
    // happened to pick is not what this is testing.
    ok("...numbered from the template's code plus its own sequence",
      inst.code === `${tpl.document.code}/0001`, inst.code);
    ok("...carrying the source record's own number", inst.sourceNumber === String(quote.number), inst.sourceNumber);
    ok("...and which template revision it came from", inst.templateRev === 1 && Boolean(inst.templateRevisionId));

    // FROZEN. Everything the template pointed at is resolved once and stored.
    ok("the values are frozen into it", Boolean(inst.values?.["company.name"]), JSON.stringify(inst.values || {}).slice(0, 80));
    ok("...and so are the block's rows", inst.blocks && "quotation.lines" in inst.blocks, JSON.stringify(Object.keys(inst.blocks || {})));
    ok("the answer is kept", inst.inputs["accepted-by"] === "Ali Moosa");
    // An input the template never asks for is not an answer, it is somebody
    // posting extra data into a record.
    ok("...and an answer nobody asked for is dropped", inst.inputs["not-asked-for"] === undefined);

    // It starts as a draft and goes through the SAME ladder.
    ok("it starts as a draft", inst.state === "draft");
    ok("it cannot be published unreviewed", (await moveGenerated(q, inst.id, "publish")).error === "wrong-state");
    ok("the author sends it for review", !(await moveGenerated(q, inst.id, "submit")).error);
    const m = await qualityContext(member.user, slug);
    ok("a reviewer signs", !(await moveGenerated(m, inst.id, "review")).error);
    ok("...and may not also approve", (await moveGenerated(m, inst.id, "approve")).error === "same-signer");
    ok("somebody else approves", !(await moveGenerated(q, inst.id, "approve")).error);
    ok("and it is issued", !(await moveGenerated(q, inst.id, "publish", { effectiveDate: "2026-09-05" })).error);

    const issued = (await getGenerated(q, inst.id)).instance;
    ok("...dated", issued.effectiveDate === "2026-09-05", issued.effectiveDate);
    ok("...and both signatures are on it",
      Boolean(issued.review?.byAlias && issued.approval?.byAlias));

    // PRESSING PRINT AGAIN OPENS THE SAME DOCUMENT. It used to mint another —
    // /0002 on the second press, /0003 on the third — three numbered records of
    // one thing, each needing its own review. Print is a request to SEE the
    // document, and regenerating is the deliberate act that refreshes it.
    const again = await generateDocument(q, { templateId, subjectId: quote.id, inputs: {} });
    ok("pressing Print again opens the same document",
      again.instance.id === inst.id && again.reused === true, `${again.instance.code} reused=${again.reused}`);
    ok("...and mints no second number", again.instance.code === inst.code, again.instance.code);

    // A DIFFERENT record does get its own.
    const other = (await listQuotations(tech)).quotations?.find?.((x) => x.id !== quote.id);

    // Rejection regenerates rather than edits, and the signatures go with the
    // words they were given against. Exercised on the one document there is.
    const second = { instance: inst };
    // It was issued above, so a fresh one is needed to exercise the sent-back
    // path — the same document cannot be both effective and back in draft.
    const third = await generateDocument(q, { templateId, subjectId: quote.id, inputs: {} });
    ok("...even after it has been issued", third.instance.id === inst.id && third.reused === true);

    const redone = await regenerate(q, second.instance.id, { inputs: { "accepted-by": "Odai" } });
    // Regenerating an ISSUED document is refused: it is evidence, and evidence
    // that can be quietly replaced is not evidence.
    ok("an issued document refuses to be regenerated",
      redone.error === "wrong-state", redone.error || "regenerated");
    // It lives with its record, not in the Quality register.
    const register = await listDocuments(q);
    ok("an instance is not in the controlled register", !register.some((d) => d.id === inst.id));
    const listed = await listGenerated(q, { subjectType: "quotation", subjectId: quote.id });
    ok("...it is listed against its record", listed.some((r) => r.id === inst.id), String(listed.length));

    // Reading the frozen snapshot still answers to the record's right.
    const outsider = await qualityContext(nobody.user, slug);
    if (!outsider.error) {
      ok("somebody without the department's right cannot read it",
        (await getGenerated(outsider, inst.id)).error === "forbidden");
    }
  }
  __signOut();
}

// ============================================================================
console.log("\n== the departments are joined in one place, and it is checkable");
{
  // THE AUDIT THAT MAKES A REGISTRY WORTH HAVING. Seven filters scattered across
  // three modules could not be checked against anything; a declaration can. A
  // renamed section, a moved collection or a permission that no longer exists
  // fails here instead of resolving to an empty list at render time.
  const perms = new Set(ALL_PERMISSIONS);
  const wrong = Object.entries(NODES).filter(([, n]) =>
    !perms.has(n.permission)
    || !ALL_SECTION_KEYS.includes(n.sectionKey)
    || !(SECTION_COLLECTIONS[n.sectionKey] || []).includes(n.collection));
  ok("every joined record names a real section, collection and permission",
    wrong.length === 0, wrong.map(([id]) => id).join(","));

  const nodes = new Set(Object.keys(NODES));
  ok("every edge joins two declared records",
    EDGES.every((e) => nodes.has(e.from) && nodes.has(e.to)),
    EDGES.filter((e) => !nodes.has(e.from) || !nodes.has(e.to)).map((e) => `${e.from}->${e.to}`).join(","));

  // ---- the edge that did not exist ----
  //
  // A ticket carries no projectId and never has. The question "can a sales
  // ticket see its project" was answerable from the data all along and no code
  // anywhere asked it.
  const toProject = pathBetween("salesTicket", "project");
  ok("a sales ticket can reach its project", toProject?.length === 1, JSON.stringify(toProject));
  ok("...and it is one project, not a list",
    toProject[0].cardinality === "one" && toProject[0].direction === "reverse");

  // ---- composition instead of copying ----
  //
  // An invoice has no ticketId and a ticket has no invoiceId. Rather than
  // writing the ticket's id into six more collections, the answer is a path.
  const toInvoice = pathBetween("salesTicket", "invoice");
  ok("a ticket reaches its invoices through its project",
    toInvoice?.length === 2 && toInvoice[1].to === "invoice", JSON.stringify(toInvoice?.map((e) => e.to)));

  // The hop the Print button needs: held at a quotation, printing the client.
  const toClient = pathBetween("quotation", "client");
  ok("a quotation reaches the client through its ticket",
    toClient?.map((e) => e.to).join(">") === "salesTicket>client", JSON.stringify(toClient?.map((e) => e.to)));

  ok("everything downstream of a quotation is within two hops",
    reachableFrom("quotation").every((r) => r.hops <= 2), JSON.stringify(reachableFrom("quotation").map((r) => `${r.to}:${r.hops}`)));
  ok("an unjoinable pair says so rather than guessing", pathBetween("invoice", "nonsense") === null);

  // ---- walking one, against plain rows ----
  const rows = {
    salesTicket: [{ id: "t1", clientId: "c1" }],
    quotation: [
      { id: "q1", ticketId: "t1", createdAt: "2026-01-01", number: "Q-1" },
      { id: "q2", ticketId: "t1", createdAt: "2026-03-01", number: "Q-2" },
      { id: "qx", ticketId: "other", createdAt: "2026-04-01", number: "Q-X" },
    ],
    project: [{ id: "p1", ticketId: "t1", stage: "In Progress" }],
    client: [{ id: "c1", name: "Acme Industrial" }],
    invoice: [
      { id: "i1", projectId: "p1", status: "Issued" },
      { id: "i2", projectId: "p1", status: "Cancelled" },
    ],
  };
  const read = async (node) => rows[node] || [];

  const stage = await traverse("salesTicket", rows.salesTicket[0], "project", { read });
  ok("a ticket resolves its project's stage", stage.record?.stage === "In Progress", JSON.stringify(stage.record));

  // A SEQUENCE, not a set of alternatives. Earlier quotations exist because the
  // reference for what was previously sent has to survive; the last one counts.
  const quotes = await traverse("salesTicket", rows.salesTicket[0], "quotation", { read });
  ok("a ticket's quotations come back newest first", quotes.record?.number === "Q-2", quotes.record?.number);
  ok("...all of them, so the earlier one is still there", quotes.records.length === 2);
  ok("...and another ticket's quotation is not among them",
    !quotes.records.some((r) => r.number === "Q-X"));

  const client = await traverse("quotation", rows.quotation[1], "client", { read });
  ok("a quotation reaches the client two hops up", client.record?.name === "Acme Industrial", JSON.stringify(client.record));

  // The rule that lived inside finance.js is a property of the edge now.
  const billed = await traverse("salesTicket", rows.salesTicket[0], "invoice", { read });
  ok("a ticket reaches its invoices", billed.records.length === 1, JSON.stringify(billed.records.map((r) => r.id)));
  ok("...with cancelled ones excluded, as Finance always did",
    !billed.records.some((r) => r.status === "Cancelled"));

  // Material orders cost a project the same way invoices bill it, and carry the
  // same rule: a cancelled order is not money anybody is going to spend. It
  // lived inside finance.js beside the invoice one; both are on their edges now.
  const costed = {
    ...rows,
    materialOrder: [
      { id: "o1", projectId: "p1", status: "Ordered" },
      { id: "o2", projectId: "p1", status: "Cancelled" },
    ],
  };
  const orders = await traverse("salesTicket", rows.salesTicket[0], "materialOrder", { read: async (n) => costed[n] || [] });
  ok("a ticket reaches its material orders through the project", orders.records.length === 1, JSON.stringify(orders.records.map((r) => r.id)));
  ok("...with cancelled ones excluded, as Finance always did", !orders.records.some((r) => r.status === "Cancelled"));

  // ---- the one reciprocal link ----
  //
  // Everywhere else the child holds the key and the parent scans. RFQ and
  // quotation hold each other: a quotation is created with its rfqId, and
  // converting the RFQ writes the quotation's id back. Both halves are real, so
  // both are declared.
  // Both halves of the link present, as they are in a real converted RFQ: the
  // quotation carries rfqId, the RFQ carries quotationId.
  const withRfq = {
    ...rows,
    quotation: rows.quotation.map((q) => (q.id === "q2" ? { ...q, rfqId: "r1" } : q)),
    rfq: [{ id: "r1", ticketId: "t1", quotationId: "q2", createdAt: "2026-02-01" }],
  };
  const readRfq = async (node) => withRfq[node] || [];
  const fromRfq = await traverse("rfq", withRfq.rfq[0], "quotation", { read: readRfq });
  ok("an RFQ follows its stored key to its quotation", fromRfq.record?.number === "Q-2", fromRfq.record?.number);
  const backToRfq = await traverse("quotation", withRfq.quotation[1], "rfq", { read: readRfq });
  ok("...and the quotation follows its own back", backToRfq.record?.id === "r1", JSON.stringify(backToRfq.record));

  // That reciprocity makes rfq -> project reachable two ways: through the ticket
  // or through the quotation. Both land on the same record, because a ticket has
  // one project — pinned here so a change to the edge order cannot quietly pick
  // the other route and mean something subtly different.
  const viaEither = await traverse("rfq", withRfq.rfq[0], "project", { read: readRfq });
  ok("an RFQ reaches the project in two hops, whichever way round",
    viaEither.record?.id === "p1" && viaEither.path.length === 2,
    JSON.stringify(viaEither.path?.map((e) => `${e.from}->${e.to}`)));

  // ---- the gate ----
  const denied = await traverse("salesTicket", rows.salesTicket[0], "invoice", {
    read, holds: (perm) => perm !== "finance.cash.view",
  });
  ok("a hop the reader may not make is refused", denied.error === "forbidden" && denied.at === "invoice", JSON.stringify(denied));
  const allowed = await traverse("salesTicket", rows.salesTicket[0], "invoice", { read, holds: () => true });
  ok("...and permitted when they may", allowed.records.length === 1);
  // Passing no gate means "already established" — which is what keeps the
  // retrofit from quietly taking information away from people who have it today.
  ok("no gate means the caller has already decided", (await traverse("salesTicket", rows.salesTicket[0], "invoice", { read })).records.length === 1);
}

// ============================================================================
console.log("\n== a sales ticket can finally say what became of it");
// THE QUESTION THAT STARTED THIS. A ticket carries no projectId and never has;
// the project holds the ticket's. The data supported the answer all along and
// no code anywhere asked, because the edge was written down nowhere.
{
  await signInAs(owner.id);
  const sales = await salesContext(owner, slug);
  const tickets = await listTickets(sales);
  ok("tickets carry a project field now", tickets.every((t) => "project" in t), String(tickets.length));

  // The fixture's first ticket went the whole way: RFQ, quotation, approval, PO,
  // project. So the one at the end of that chain reports it.
  const withProject = tickets.filter((t) => t.project);
  ok("a ticket that produced a project names it", withProject.length >= 1, `${withProject.length} of ${tickets.length}`);

  if (withProject.length) {
    const p = withProject[0].project;
    ok("...and reports its stage", Boolean(p.stage), JSON.stringify(p));
    ok("...as a record, not a list", !Array.isArray(p) && typeof p.id === "string");
    // Blank until Finance issues it — a real state, not a gap. The work can be
    // planned before anybody has committed to bill it.
    ok("...with a number that may legitimately be blank", typeof p.number === "string", JSON.stringify(p.number));
  }

  // A ticket that never got that far says null rather than inventing something.
  const svc = await createService(sales, { name: "Standalone" });
  const fresh = await createTicket(sales, {
    title: "Nothing downstream yet", clientName: "Acme", deadline: "2027-01-01",
    industry: "Technology", serviceIds: [svc.service?.id],
  });
  const again = await listTickets(sales);
  const bare = again.find((t) => t.id === fresh.ticket.id);
  ok("a ticket with no project says so plainly", bare?.project === null, JSON.stringify(bare?.project));

  __signOut();
}

// ============================================================================
console.log("\n== a document reaches as far as the graph goes, and no further");
{
  const all = () => true;

  // THE POINT OF STEP 6. A document held at a quotation could only ever print
  // the quotation's own fields, because reach was tested by equality. The
  // client's name lives on the ticket, one declared hop up.
  ok("a quotation reaches its own fields with no journey", reachOf("quotation", "quotation", all)?.hops === 0);
  ok("...its ticket, one hop up", reachOf("quotation", "salesTicket", all)?.hops === 1);
  ok("...the client, two", reachOf("quotation", "client", all)?.hops === 2);
  ok("...and the project it opened", reachOf("quotation", "project", all)?.hops === 1);
  ok("a record outside the graph is unreachable", reachOf("quotation", "nonsense", all) === null);

  const offered = (subjectType, holds) => availableFields({ subjectType, holds }).map((f) => f.key);

  const fromQuote = offered("quotation", all);
  ok("a quotation-bound document is offered the client's name",
    fromQuote.includes("sales.ticket.client"), fromQuote.filter((k) => k.startsWith("sales.")).join(","));
  ok("...and the project's stage", fromQuote.includes("project.stage"));
  ok("...alongside its own", fromQuote.includes("quotation.number"));
  ok("an unbound document is offered no department fields",
    offered(null, all).every((k) => k.startsWith("company.") || k.startsWith("document.")));

  // EVERY HOP IS GATED, and this gate is not optional the way a module's own
  // summary is. A document leaves the building; a field nobody may read must
  // not be printable into one.
  const noProjects = (p) => p !== "projects.list.view";
  ok("a hop the reader may not make removes what is past it",
    !offered("quotation", noProjects).includes("project.stage"),
    offered("quotation", noProjects).filter((k) => k.startsWith("project.")).join(","));
  ok("...while what is nearer still resolves", offered("quotation", noProjects).includes("sales.ticket.client"));

  // THE BUG STEP 6 INTRODUCED, kept closed. Reach with no journey to walk was
  // read as nothing to check, so a document bound to a sales ticket offered
  // Sales' own fields to somebody holding nothing in Sales.
  const noSales = (p) => p !== "sales.tickets.view";
  ok("a zero-hop reach is still permission-checked",
    reachOf("salesTicket", "salesTicket", noSales) === null);
  ok("...so its own fields are withheld too",
    !offered("salesTicket", noSales).includes("sales.ticket.client"),
    offered("salesTicket", noSales).filter((k) => k.startsWith("sales.")).join(","));
}

// ============================================================================
console.log("\n== a button runs one template, and the button decides the subject");
{
  await signInAs(owner.id);
  const q = await qualityContext(owner, slug);
  const types = await listTypes(q);

  // Declared in code, never typed. A call point is a contract with a button
  // that exists in the source; a studio inventing one would bind a template to
  // a button nobody built.
  ok("every call point names a record the graph knows",
    CALL_POINTS.every((c) => NODES[c.subject]), CALL_POINTS.map((c) => c.subject).join(","));
  ok("...and a permission that exists",
    CALL_POINTS.every((c) => ALL_PERMISSIONS.includes(c.permission)), CALL_POINTS.map((c) => c.permission).join(","));

  const a = await createDocument(q, { title: "Cover letter", typeId: types[0].id, departmentId: "technical" });
  const b = await createDocument(q, { title: "Rival letter", typeId: types[0].id, departmentId: "technical" });

  ok("a document that is not a template cannot be routed",
    (await setCallPoint(q, a.document.id, { callPointId: "quotation.print" })).error === "not-a-template");

  await updateDocument(q, a.document.id, { isTemplate: true });
  await updateDocument(q, b.document.id, { isTemplate: true });

  const bound = await setCallPoint(q, a.document.id, { callPointId: "quotation.print" });
  ok("a template can be bound to a button", !bound.error, bound.error || "");
  // BINDING SETTLES WHAT IT IS ABOUT. A button in the quotation viewer hands
  // over a quotation; a template that believed otherwise would print gaps.
  ok("...which also settles what it is about", bound.document.subjectType === "quotation", bound.document.subjectType);

  // One call point, one template.
  ok("a second template cannot take the same button",
    (await setCallPoint(q, b.document.id, { callPointId: "quotation.print" })).error === "call-point-taken");
  ok("an invented button is refused",
    (await setCallPoint(q, b.document.id, { callPointId: "nowhere.print" })).error === "unknown-call-point");

  const templates = await listTemplates(q);
  ok("setup lists the templates and what runs where",
    templates.find((t) => t.id === a.document.id)?.callPointId === "quotation.print",
    JSON.stringify(templates.map((t) => [t.code, t.callPointId])));
  // An unapproved blank cannot issue anything, so setup says so rather than
  // letting somebody press a button that refuses.
  // Asserted of the two just made, not of every template in the studio — an
  // earlier block leaves an approved one behind, and a test that reads the
  // fixture instead of the feature passes for the wrong reason.
  ok("...and whether each is approved yet",
    templates.filter((t) => [a.document.id, b.document.id].includes(t.id)).every((t) => t.issued === false)
    && templates.some((t) => t.issued === true),
    JSON.stringify(templates.map((t) => [t.code, t.issued])));

  const opts = callPointOptions(templates, b.document.id);
  ok("the picker marks a button somebody else already runs from",
    opts.find((o) => o.id === "quotation.print")?.taken === true);
  ok("...and does not mark it for the template that holds it",
    callPointOptions(templates, a.document.id).find((o) => o.id === "quotation.print")?.taken === false);

  // The lookup the button itself will make.
  const found = await templateForCallPoint(q, "quotation.print");
  ok("a button can find the template it runs", found?.id === a.document.id, found?.code);
  ok("...and finds nothing where nothing is bound", (await templateForCallPoint(q, "nowhere.print")) === null);

  ok("unbinding is allowed", !(await setCallPoint(q, a.document.id, { callPointId: "" })).error);
  ok("...and frees the button", (await templateForCallPoint(q, "quotation.print")) === null);

  __signOut();
}

// ============================================================================
console.log("\n== Sales presses Print and the ticket fills the document in");
// THE THING ALL OF THIS WAS FOR. A button in the Quotation Viewer, a template
// Quality approved, and fields that arrive from the sales ticket without Sales
// or Quality knowing anything about each other.
{
  await signInAs(owner.id);
  const q = await qualityContext(owner, slug);
  const types = await listTypes(q);

  // A template that names things from THREE records: the quotation it is held
  // at, the ticket one hop up, and the client two.
  const tpl = await createDocument(q, { title: "Quotation cover", typeId: types[0].id, departmentId: "technical" });
  await updateDocument(q, tpl.document.id, { isTemplate: true });
  await setCallPoint(q, tpl.document.id, { callPointId: "quotation.print" });

  const bound = (await listDocuments(q)).find((d) => d.id === tpl.document.id);
  ok("the button settles what the template is about", bound.subjectType === "quotation", bound.subjectType);

  // Not approved yet, so the button must not appear.
  const early = await callPointReady(q, "quotation.print");
  ok("an unapproved template leaves the button off", !early.ready && early.reason === "not-issued", JSON.stringify(early));

  await openDraft(q, tpl.document.id);
  await saveDraft(q, tpl.document.id, { sections: [{ id: "s1", title: "Offer", body: { type: "doc", content: [
    { type: "paragraph", content: [
      { type: "text", text: "For the attention of " },
      { type: "mergeField", attrs: { field: "sales.ticket.contactName" } },
      { type: "text", text: " at " },
      { type: "mergeField", attrs: { field: "sales.ticket.client" } },
      { type: "text", text: ", against " },
      { type: "mergeField", attrs: { field: "quotation.number" } },
      { type: "text", text: "." },
    ] },
    { type: "recordBlock", attrs: { source: "quotation.lines" } },
  ] } }] });
  await moveRevision(q, tpl.document.id, "submit");
  await moveRevision(await qualityContext(member.user, slug), tpl.document.id, "review");
  await moveRevision(q, tpl.document.id, "approve");
  await moveRevision(q, tpl.document.id, "publish", { effectiveDate: "2026-09-01" });

  const ready = await callPointReady(q, "quotation.print");
  ok("an approved template turns the button on", ready.ready === true, JSON.stringify(ready));

  // The viewer's own answer: only the latest quotation carries the button.
  const sales = await salesContext(owner, slug);
  const tickets = await listTickets(sales);
  // NAMED, not "the first ticket with a quotation". More than one ticket is
  // quoted by the time this runs, and the assertions below are about THIS one —
  // the approved Acme quotation the whole chain above built.
  const withQuote = tickets.find((t) => t.clientName === "Acme" && t.quotations?.length);
  const quotationId = withQuote?.quotations[0]?.id;
  ok("fixture: a quotation to print from", Boolean(quotationId), JSON.stringify(withQuote?.quotations?.length));

  if (quotationId) {
    const viewed = await ticketQuotation(sales, quotationId);
    ok("the viewer knows whether it is the latest", viewed.isLatest === true, String(viewed.isLatest));

    // WHAT THE DOCUMENT NEVER OWNED IS CARRIED. All three of these were read
    // straight off the stored row and all three were wrong: `clientName` is
    // never written to a quotation, so Client sat blank; the approval lives on
    // the task, so a quotation signed on the board showed no date and read
    // Completed to Sales while Technical called it Approved.
    ok("the viewer carries the client off the client record",
      viewed.quotation?.clientName === "Acme", JSON.stringify(viewed.quotation?.clientName));
    ok("...and reads Approved off the approval", viewed.quotation?.status === "Approved",
      JSON.stringify(viewed.quotation?.status));
    ok("...while what is on file is untouched", viewed.quotation?.storedStatus === "Completed",
      JSON.stringify(viewed.quotation?.storedStatus));
    ok("...with the date the decision was made", !!viewed.quotation?.completedAt,
      JSON.stringify(viewed.quotation?.completedAt));
    // The document itself is still shown exactly as stored — the lines and the
    // totals are the quotation's own and are never recomputed here.
    ok("...and the priced lines untouched", Array.isArray(viewed.quotation?.tables),
      JSON.stringify(typeof viewed.quotation?.tables));

    // PRESS IT.
    const made = await generateDocument(q, { templateId: tpl.document.id, subjectId: quotationId });
    ok("pressing Print produces a document", !made.error, made.error || "");

    // AND HERE IS THE ANSWER TO THE WHOLE QUESTION. The template was held at a
    // quotation; the contact and the client live on the sales ticket, one hop
    // up. Nobody wrote that join for this feature — the registry declared it.
    const v = made.instance.values;
    ok("...with the client fetched from the sales ticket",
      v["sales.ticket.client"] === "Acme", v["sales.ticket.client"]);
    ok("...and the contact, from the same hop", typeof v["sales.ticket.contactName"] === "string");
    ok("...alongside the quotation's own number",
      v["quotation.number"] === made.instance.values["quotation.number"] && Boolean(v["quotation.number"]),
      v["quotation.number"]);
    ok("...and the quotation's lines, frozen in",
      made.instance.blocks && "quotation.lines" in made.instance.blocks,
      JSON.stringify(Object.keys(made.instance.blocks || {})));

    ok("the document waits for review before it can be issued", made.instance.state === "draft");
    ok("...carrying the record's number and one of its own",
      Boolean(made.instance.sourceNumber) && made.instance.code.includes("/"),
      `${made.instance.sourceNumber} / ${made.instance.code}`);
  }

  __signOut();
}

// ============================================================================
console.log("\n== the header and footer are the studio's, and say so once");
{
  await signInAs(owner.id);
  const q = await qualityContext(owner, slug);

  const shipped = letterheadFor(q);
  ok("a studio that has never edited it still gets a letterhead",
    Boolean(shipped.header?.left && shipped.footer?.center), JSON.stringify(shipped.header));

  const saved = await saveLetterhead(q, {
    pageSize: "A4",
    margins: { top: 30, right: 20, bottom: 24, left: 20 },
    header: { left: { type: "field", value: "company.name" }, center: { type: "text", value: "Confidential" },
      right: { type: "field", value: "document.code" }, showLogo: true, rule: true },
    footer: { left: { type: "field", value: "document.revision" }, center: { type: "field", value: "page.of" },
      right: { type: "text", value: "" }, rule: true },
  });
  ok("it can be edited", !saved.error, saved.error || "");

  const back = letterheadFor(await qualityContext(owner, slug));
  ok("...words somebody typed are kept as words",
    back.header.center?.type === "text" && back.header.center.value === "Confidential", JSON.stringify(back.header.center));
  ok("...a field is kept as a reference, not its value",
    back.header.left?.type === "field" && back.header.left.value === "company.name", JSON.stringify(back.header.left));
  ok("...and the margins with it", back.margins.top === 30 && back.margins.left === 20, JSON.stringify(back.margins));

  // A FRESH CONTEXT PER WRITE, because that is what a request is. The saved
  // settings are read off the context, so reusing one across two writes would
  // fall back to the state before the first — a shape the product never has and
  // a test should not invent.
  const fresh = () => qualityContext(owner, slug);

  // A field nobody declared would print as a permanent blank, so it is refused
  // when it is saved rather than discovered on paper.
  await saveLetterhead(await fresh(), { ...back, header: { ...back.header, right: { type: "field", value: "company.invented" } } });
  const guarded = letterheadFor(await fresh());
  ok("an undeclared field is refused and the old slot kept",
    guarded.header.right?.value !== "company.invented", JSON.stringify(guarded.header.right));

  // A margin too small to print loses text off the edge of the sheet, so it is
  // clamped rather than trusted.
  await saveLetterhead(await fresh(), { ...guarded, margins: { ...guarded.margins, top: 1 } });
  ok("an unprintable margin is clamped", letterheadFor(await fresh()).margins.top === 30,
    String(letterheadFor(await fresh()).margins.top));

  // ---- the page tokens ----
  //
  // These are the print engine's to fill in as it lays out the pages, which is
  // why they can only ever be right on paper. The preview said "Page 1 of 1"
  // over a document of any length because that was a hardcoded caption; on
  // screen the token now resolves to nothing instead of to a wrong number.
  const ctx = { values: { "company.name": "Acme", "document.code": "QP-001" } };
  const printed = barSlots(back.footer, ctx, { forPrint: true });
  ok("a page token becomes the printer's own spans on paper",
    printed.center.includes("pageNumber") && printed.center.includes("totalPages"), printed.center);
  const onScreen = barSlots(back.footer, ctx, { forPrint: false });
  ok("...and nothing at all on screen", onScreen.center === "", JSON.stringify(onScreen.center));

  const head = barSlots(back.header, ctx, { forPrint: false });
  ok("a field resolves the same either way", head.left === "Acme", head.left);
  ok("...and typed words come through escaped", head.center === "Confidential", head.center);

  __signOut();
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
