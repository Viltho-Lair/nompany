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

import { KEY_PREFIX, IX } from "@/platform/db/keys";
import { SWEEP_SCOPES, sweepRefusal } from "@/platform/db/cascade";
import { hashPassword, verifyPassword, needsRehash } from "@/platform/auth/passwords";
import bcrypt from "bcryptjs";
import {
  checkCredentialAttempts, recordCredentialFailure, clearCredentialFailures, __limits as LIMITS,
} from "@/platform/auth/attempts";
import { delPrefix, getIndex } from "@/platform/db/store";
import { getRedisClient } from "@/platform/db/redis";
import { createUser, mintSession } from "@/platform/auth/users";
import { createStudio, renameStudio, getStudioBySlug, updateStudio } from "@/lib/data/studios";
import { addCollaborator, updateCollaborator, getCollaboratorByUser } from "@/platform/auth/collaborators";
import { listRoles } from "@/lib/data/roles";
import { SESSION_COOKIE, login as identityLogin } from "@/platform/auth/identity";
import { studioContext, canAdminister } from "@/lib/studios";
import { explain, ADMIN_ROLE_ID, ALL_PERMISSIONS } from "@/platform/access";
import { tasksContext, createTask, updateTask, removeTask, decideTask } from "@/lib/tasks";
import { TASK_TYPE_AUTHORITIES } from "@/lib/taskRouting";
import {
  salesContext, createService, createTicket, requestTicketRfq, listTickets, sendTicketForApproval,
  submitTicketPo,
} from "@/lib/sales";
import { projectsContext, openProject, listProjects } from "@/lib/projects";
import { technicalContext, requestRfq, convertRfq, updateRfq, updateQuotation, listQuotations } from "@/lib/technical";
import { rfqInfo } from "@/lib/salesAnalytics";
import { landedUnitCost, crossRate } from "@/shared/currencies";
import { qualityContext, watermarkFor } from "@/lib/quality";
import { getJSON } from "@/platform/db/store";
import { NODES, EDGES, pathBetween, reachableFrom, traverse } from "@/platform/relations";
import { SECTION_COLLECTIONS, ALL_SECTION_KEYS } from "@/platform/db/keys";
import { mergeValuesFor, fieldsFor, bindSubject, subjectOptions } from "@/lib/quality";
import { isFieldKey, legalKeyFor, availableFields, isBlockSource, blockByKey, reachOf } from "@/lib/qualityFields";
import {
  createDoc, getDoc, listDocs, saveContent, savePageSetup, removeDoc,
} from "@/lib/qualityDocs";
import {
  moveRevision as moveDocRevision, startRevision as startDocRevision,
  workflowFor, listRevisions as listDocRevisions,
} from "@/lib/qualityDocRevisions";
import { resolveBlocks, blocksFor } from "@/lib/quality";
import { documentState, pendingRevision } from "@/lib/qualityDocuments";
import { listSections, updateRow } from "@/platform/db/sections";
import { readArr, writeArr } from "@/platform/db/store";
import { S, REG as REG_KEYS } from "@/platform/db/keys";
import { financeContext, createInvoice, removeInvoice, listInvoices } from "@/lib/finance";
import { inventoryContext, createItem, adjustStock, listProjectSheets, saveSheetLine } from "@/lib/inventory";
import {
  hrContext, requestVacation, decideVacation,
  listDepartments, listHrRoles, createHrRole, editHrRole, removeHrRole,
  listEmployees, saveEmployment,
} from "@/lib/hr";
import { updateProfile } from "@/platform/auth/users";
import { __signIn, __signOut } from "./nextHeaders.mjs";

import {
  seedSuperAdmin, loginSuper, logoutSuper, findSuperBySession, SUPER_COOKIE, SUPER_TTL_SEC,
} from "@/platform/auth/superAuth";
import { ttlOf, editArr, hIncrBounded, pfAdd, pfCount, hGetAll, memoryPolicy } from "@/platform/db/store";
import * as KEYS from "@/platform/db/keys";
import { STAT } from "@/platform/db/keys";
import { putMedia } from "@/lib/media";
import { hashToken } from "@/platform/auth/passwords";

const PUT_COLLABORATORS = (await import("@/app/api/studios/[slug]/collaborators/route.js")).PUT;
const TASKS_ROUTE = await import("@/app/api/studios/[slug]/tasks/route.js");
const EXPORT_CSV = (await import("@/app/api/super/site-analytics/export/route.js")).GET;
const YEAR_ROLLOVER = (await import("@/app/api/cron/year-rollover/route.js")).GET;
const TRACK = (await import("@/app/api/track/route.js")).POST;
const MEDIA_GET = (await import("@/app/api/media/[id]/route.js")).GET;

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

  // ---- what a discount is -------------------------------------------------
  // A PERCENTAGE OFF THE UNIT PRICE, not an amount of money. It was subtracted
  // as currency, which reads plausibly and is wrong in every studio that typed
  // what it meant: 10 off a 12.50 item is a rounding error, 10% off it is the
  // offer. Priced through the real write, so the totals asserted here are the
  // ones the server computes and stores.
  const priced = await updateQuotation(await technicalContext(owner, slug), q2.quotation?.id, {
    vatRate: 15,
    tables: [{ id: "t1", title: "Ground floor", rows: [
      { id: "r1", description: "Cable tray", unit: "m", qty: 2, unitPrice: 100, discount: 10 },
      { id: "r2", description: "Full price", unit: "m", qty: 1, unitPrice: 50, discount: 0 },
    ] }],
  });
  ok("10% off 100 prices the line at 90, not 90 off",
    priced.quotation?.subtotal === 230, JSON.stringify(priced.quotation?.subtotal));
  ok("...and VAT is taken on what is left", priced.quotation?.vat === 34.5,
    JSON.stringify(priced.quotation?.vat));
  ok("...totalling the two together", priced.quotation?.total === 264.5,
    JSON.stringify(priced.quotation?.total));
  ok("...with the gross price and the percentage both still on the row",
    priced.quotation?.tables?.[0]?.rows?.[0]?.unitPrice === 100
    && priced.quotation?.tables?.[0]?.rows?.[0]?.discount === 10,
    JSON.stringify(priced.quotation?.tables?.[0]?.rows?.[0]));
  ok("...and the derived list carrying the NET one",
    priced.quotation?.items?.[0]?.unitPrice === 90, JSON.stringify(priced.quotation?.items?.[0]));

  // Neither end is a discount: below zero is a surcharge, above 100 a refund.
  const clamped = await updateQuotation(await technicalContext(owner, slug), q2.quotation?.id, {
    vatRate: 0,
    tables: [{ id: "t1", title: "", rows: [
      { id: "r1", description: "Given away", qty: 1, unitPrice: 80, discount: 250 },
      { id: "r2", description: "Not a surcharge", qty: 1, unitPrice: 80, discount: -5 },
    ] }],
  });
  ok("a discount over 100% is stored as 100", clamped.quotation?.tables?.[0]?.rows?.[0]?.discount === 100,
    JSON.stringify(clamped.quotation?.tables?.[0]?.rows?.[0]?.discount));
  ok("...pricing that line at nothing rather than below it",
    clamped.quotation?.items?.[0]?.unitPrice === 0, JSON.stringify(clamped.quotation?.items?.[0]));
  ok("...and a negative one is stored as none", clamped.quotation?.tables?.[0]?.rows?.[1]?.discount === 0,
    JSON.stringify(clamped.quotation?.tables?.[0]?.rows?.[1]?.discount));
  ok("...leaving that line at its full price", clamped.quotation?.subtotal === 80,
    JSON.stringify(clamped.quotation?.subtotal));
}

// ============================================================================
console.log("\n== a foreign item is landed into the studio's money before it is quoted");
// Registered Items holds an item's cost in whatever money it is BOUGHT in, plus
// the shipping and customs it takes to get it here. A quotation is written in
// the studio's money, so quoting the bare unit cost put a foreign price on a
// local document — 100 USD read as 100 SAR, and nothing on the screen said so.
//
// Pure arithmetic over a rate table, so it is asserted directly rather than
// through a studio: the table below is the shape lib/data/exchangeRates.js
// caches, quoting everything against one common base.
{
  const rates = { USD: 1, SAR: 3.75, EUR: 0.9 };

  const home = landedUnitCost({ unitCost: 100, currency: "" }, "SAR", rates);
  ok("an item in the studio's own money is not converted",
    home.converted === false && home.unitPrice === 100, JSON.stringify(home));
  const same = landedUnitCost({ unitCost: 100, currency: "SAR" }, "SAR", rates);
  ok("...nor is one that names the same currency",
    same.converted === false && same.unitPrice === 100, JSON.stringify(same));

  // 100 + 20 + 5 = 125 USD landed, at 3.75 SAR to the dollar.
  const abroad = landedUnitCost(
    { unitCost: 100, currency: "USD", shippingCharges: 20, customsCharges: 5 }, "SAR", rates);
  ok("shipping and customs land with the cost", abroad.base === 125, JSON.stringify(abroad.base));
  ok("...and the whole of it converts", abroad.unitPrice === 468.75, JSON.stringify(abroad.unitPrice));
  ok("...at the pair derived from the one table",
    abroad.rate === crossRate(rates, "USD", "SAR"), JSON.stringify(abroad.rate));

  // NO RATE MEANS NO PRICE. Falling back to the foreign figure would put a
  // number on a client's document that is silently in the wrong currency.
  const unquoted = landedUnitCost({ unitCost: 100, currency: "JPY" }, "SAR", rates);
  ok("a pair today's snapshot does not quote is not priced",
    unquoted.priced === false && unquoted.unitPrice === 0, JSON.stringify(unquoted));
  ok("...and says which kind of missing it is", unquoted.reason === "unquoted", unquoted.reason);

  const noStudio = landedUnitCost({ unitCost: 100, currency: "USD" }, "", rates);
  ok("a studio that never named its currency has nothing to convert into",
    noStudio.priced === false && noStudio.reason === "no-studio-currency", JSON.stringify(noStudio));

  // A day with no snapshot at all behaves like an unquoted pair, rather than
  // throwing on the way to a screen that only wanted a price list.
  const noRates = landedUnitCost({ unitCost: 100, currency: "USD" }, "SAR", null);
  ok("...as does a day whose rates never arrived",
    noRates.priced === false && noRates.unitPrice === 0, JSON.stringify(noRates));
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
console.log("\n== the working copy, and the revision that freezes it");
// The document editor holds ONE body and the editor edits it directly, so the
// question the old model never had to answer becomes the central one: what
// stops somebody typing into the procedure a company is currently working to?
{
  await signInAs(owner.id);

  // The owner holds everything, so a second person is needed for the second
  // signature. Review and approve are separate rights precisely so they can be
  // two people, which means they have to be granted separately.
  await updateCollaborator(studio.id, member.collaborator.id, {
    overrides: {
      allow: [
        "quality.documents.view", "quality.documents.create", "quality.documents.edit",
        "quality.documents.review", "quality.documents.approve",
      ],
      deny: [],
    },
  });

  const q = await qualityContext(owner, slug);
  const doc = (await createDoc(q, { title: "Calibration", prefix: "SOP", dept: "QA" })).document;
  const id = doc.id;
  ok("a new document gets a number", /^SOP-QA-\d+$/.test(doc.code), doc.code);
  ok("...and reads as a draft", doc.state === "draft", doc.state);

  const body = (text) => JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });

  // A body is stored as a string, so the store parses it once purely to refuse
  // something that is not a document — otherwise the editor is handed a crash
  // the next time the row is opened.
  ok("a body that is not a document is refused",
    (await saveContent(await qualityContext(owner, slug), id, { content: "{}" })).error === "content");
  ok("...and neither is a string that is not JSON at all",
    (await saveContent(await qualityContext(owner, slug), id, { content: "nope" })).error === "content");

  ok("a draft is writable", !(await saveContent(await qualityContext(owner, slug), id, { content: body("First") })).error);

  // ---- the ladder ----
  // NOT "wrong-state" — there is no revision at all yet. The row is written
  // when somebody sends the document for review, so before that there is
  // nothing on the ladder to move, and the machine says exactly that.
  ok("it cannot be published before anybody has sent it for review",
    (await moveDocRevision(await qualityContext(owner, slug), id, "publish")).error === "no-revision");

  ok("the author sends it for review",
    !(await moveDocRevision(await qualityContext(owner, slug), id, "submit")).error);

  // THE SNAPSHOT. Under the old model the reviewer read whatever the author had
  // since typed, because there was only ever one copy of the text.
  const snapshot = (await listDocRevisions(await qualityContext(owner, slug), id))[0];
  ok("...freezing a copy of the text as it stood", snapshot.content === body("First"), snapshot.content);
  ok("...and of the paper it is set up for", snapshot.pageSize === "a4", String(snapshot.pageSize));

  ok("the reviewer signs",
    !(await moveDocRevision(await qualityContext(member.user, slug), id, "review", { note: "Reads correctly." })).error);
  ok("the reviewer may not also approve",
    (await moveDocRevision(await qualityContext(member.user, slug), id, "approve")).error === "same-signer");
  ok("...but somebody else may",
    !(await moveDocRevision(await qualityContext(owner, slug), id, "approve")).error);

  ok("it is issued",
    !(await moveDocRevision(await qualityContext(owner, slug), id, "publish", { effectiveDate: "2026-09-01" })).error);

  // ---- the freeze, which is what this whole model turns on ----
  const issued = await getDoc(await qualityContext(owner, slug), id);
  ok("an issued document reads as effective", issued.document.state === "effective", issued.document.state);
  ok("...and hands back the revision that was issued, not the working copy",
    issued.issued?.content === body("First"), String(issued.issued?.content));
  ok("...and says it may not be edited", issued.canEdit === false, String(issued.canEdit));

  ok("THE FREEZE: typing into an issued document is refused",
    (await saveContent(await qualityContext(owner, slug), id, { content: body("Sneaky") })).error === "issued");
  ok("...and so is changing the paper under it",
    (await savePageSetup(await qualityContext(owner, slug), id, { pageSize: "letter" })).error === "issued");

  // ---- and what unfreezes it ----
  const started = await startDocRevision(await qualityContext(owner, slug), id);
  ok("starting the next revision is allowed", !started.error, started.error || "");
  ok("...and numbers it 2", started.revision.rev === 2, String(started.revision?.rev));
  ok("...which makes the document writable again",
    !(await saveContent(await qualityContext(owner, slug), id, { content: body("Second") })).error);
  ok("...and a second start is refused while one is open",
    (await startDocRevision(await qualityContext(owner, slug), id)).error === "already-open");

  const reopened = await getDoc(await qualityContext(owner, slug), id);
  ok("with a revision open the working copy is what shows",
    reopened.issued === null && reopened.canEdit === true, JSON.stringify({ i: reopened.issued, c: reopened.canEdit }));

  // ---- rejection re-snapshots ----
  await moveDocRevision(await qualityContext(owner, slug), id, "submit");
  ok("a reviewer can send it back",
    !(await moveDocRevision(await qualityContext(member.user, slug), id, "reject", { note: "Clause 3." })).error);
  await saveContent(await qualityContext(owner, slug), id, { content: body("Third") });
  await moveDocRevision(await qualityContext(owner, slug), id, "submit");
  const resent = (await listDocRevisions(await qualityContext(owner, slug), id)).find((r) => r.rev === 2);
  ok("...and resubmitting sends the FIXED text, not the text they turned down",
    resent.content === body("Third"), resent.content);

  await moveDocRevision(await qualityContext(member.user, slug), id, "review");
  await moveDocRevision(await qualityContext(owner, slug), id, "approve");
  await moveDocRevision(await qualityContext(owner, slug), id, "publish", { effectiveDate: "2026-10-01" });

  const both = await listDocRevisions(await qualityContext(owner, slug), id);
  ok("publishing rev 2 supersedes rev 1 rather than deleting it",
    both.find((r) => r.rev === 1)?.state === "superseded" && both.find((r) => r.rev === 2)?.state === "effective",
    JSON.stringify(both.map((r) => [r.rev, r.state])));
  ok("...so what the procedure used to say is still readable",
    both.find((r) => r.rev === 1)?.content === body("First"));

  // ---- what the screen is allowed to draw ----
  const flow = await workflowFor(await qualityContext(owner, slug), id, () => true);
  ok("an issued document offers withdrawal and nothing else",
    flow.moves.map((x) => x.action).join(",") === "withdraw", flow.moves.map((x) => x.action).join(","));
  const asViewer = await workflowFor(await qualityContext(owner, slug), id, (p) => p !== "quality.documents.obsolete");
  ok("...and offers nothing at all to somebody without the right",
    asViewer.moves.length === 0, JSON.stringify(asViewer.moves));

  // ---- deletion ----
  ok("an issued document cannot be deleted",
    (await removeDoc(await qualityContext(owner, slug), id)).error === "controlled");

  const scratch = (await createDoc(await qualityContext(owner, slug), { title: "Scratch", prefix: "SOP", dept: "QA" })).document;
  ok("...but a draft can be", !(await removeDoc(await qualityContext(owner, slug), scratch.id)).error);
  ok("...and is gone from the register",
    !(await listDocs(await qualityContext(owner, slug))).some((d) => d.id === scratch.id));

  __signOut();
}

// ============================================================================
console.log("\n== fields are carried, not copied, and only where they are allowed");
{
  await signInAs(owner.id);
  const q = await qualityContext(owner, slug);
  const made = await createDoc(q, { title: "Field test", prefix: "FLD", dept: "SAL" });
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
    ok("a document can be bound to a subject", !bound.error, bound.error || "");
    // ONLY THE TYPE IS KEPT. Which record somebody previewed against is a way of
    // looking, not something the document knows about itself — storing it put a
    // throwaway choice onto a record that goes through review and approval.
    ok("...and only the TYPE is written down",
      bound.document.subjectType === "salesTicket" && !bound.document.subjectId,
      JSON.stringify({ t: bound.document.subjectType, i: bound.document.subjectId }));

    const ctx2 = await qualityContext(owner, slug);
    const after = fieldsFor(ctx2, bound.document);
    ok("...which makes that department's fields appear",
      after.fields.some((f) => f.key === "sales.ticket.client"));
    ok("...grouped under the department, not lumped in with Company",
      after.groups.some(([g]) => g === "Sales"), after.groups.map(([g]) => g).join(","));

    // The record travels WITH the request, the way the content route passes the
    // preview id and the way generation points a template at its real record.
    const viewing = { ...bound.document, subjectId: ticket.ticket.id };
    const v2 = await mergeValuesFor(ctx2, viewing);
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
      const vValues = await mergeValuesFor(viewerCtx, { ...bound.document, subjectId: ticket.ticket.id });
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
console.log("\n== blocks answer to the same rights the records do");
{
  await signInAs(owner.id);
  const q = await qualityContext(owner, slug);
  const made = await createDoc(q, { title: "Quotation cover", prefix: "COV", dept: "TEC" });

  ok("no blocks are offered with nothing bound", blocksFor(q, made.document).length === 0);
  ok("...and none resolve", Object.keys(await resolveBlocks(q, made.document)).length === 0);

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
  // Company, Document and Miscellaneous need no record: they describe the
  // studio, the document, and the moment it is rendered. Everything else is a
  // department's and needs something to resolve from.
  ok("an unbound document is offered no department fields",
    offered(null, all).every((k) => /^(company|document|misc)\./.test(k)),
    offered(null, all).filter((k) => !/^(company|document|misc)\./.test(k)).join(","));
  ok("...but does get today's date, which belongs to no record",
    offered(null, all).includes("misc.today"));

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
console.log("== a private file is readable by its studio, and by nobody else");
// REGRESSION: the guard asked whether ANYBODY was signed in —
//   if (media.visibility === "private" && !(await currentUser())) → 403
// — which is not a question about entitlement. putMedia has always recorded an
// owner and no read path compared it, so every private blob was readable by
// every account on the platform, including one created a minute earlier. What
// is stored behind that flag is the SIGNATURE GRAPHIC stamped on a controlled
// document, so it is also the most sensitive image the product holds.
//
// Membership, not ownership: a signature is stamped by one person and read by
// everyone else working to that document.
{
  const serve = (id) => MEDIA_GET(new Request(`http://localhost/api/media/${id}`), { params: Promise.resolve({ id }) });
  const png = Buffer.from("89504e470d0a1a0a", "hex");

  const pub = await putMedia({ buffer: png, contentType: "image/png", filename: "logo.png", owner: owner.id });
  const priv = await putMedia({
    buffer: png, contentType: "image/png", filename: "signature.png",
    visibility: "private", owner: owner.id, studioId: studio.id,
  });
  const personal = await putMedia({
    buffer: png, contentType: "image/png", filename: "passport.png",
    visibility: "private", owner: owner.id,
  });

  __signOut();
  ok("a public file is served to anyone", (await serve(pub.id)).status === 200);
  ok("a private file is refused to a stranger", (await serve(priv.id)).status === 404);

  // THE BUG, stated as the thing it allowed: an account with no connection to
  // this studio, signed in, asking for its signature by id.
  const outsiderUser = (await createUser({ email: `outsider-${rand()}@test.invalid`, passwordHash: "x" })).user;
  await signInAs(outsiderUser.id);
  ok("...and to a signed-in account that is not in the studio", (await serve(priv.id)).status === 404);
  ok("...refused as 404, so a guessed id is not confirmed", (await serve(priv.id)).status === 404);

  await signInAs(member.user.id);
  ok("a member of the studio may read it", (await serve(priv.id)).status === 200);
  ok("...including someone who did not upload it", priv.id && member.user.id !== owner.id);

  // A blob with no studio is personal, and falls back to its owner.
  ok("a personal file is refused to another member", (await serve(personal.id)).status === 404);
  await signInAs(owner.id);
  ok("...and served to the account that uploaded it", (await serve(personal.id)).status === 200);

  __signOut();
}

// ============================================================================
console.log("== public traffic ingest cannot grow without bound");
// REGRESSION: /api/track took no session, no rate limit and no origin check,
// and wrote two structures an anonymous caller controlled the size of — a SET
// keyed on a caller-supplied visitor id, and a hash whose field names came from
// a caller-supplied page label. Neither expires, by design. Redis is this
// product's only storage, so a full instance fails every write in it: one curl
// loop against a public endpoint takes down invoicing.
{
  const hkey = `${KEY_PREFIX}stat:test:${rand()}`;
  const cap = { max: 3, overflow: "pv:__other" };

  await hIncrBounded(hkey, "pv:home", cap);
  await hIncrBounded(hkey, "pv:home", cap);
  await hIncrBounded(hkey, "pv:pricing", cap);
  await hIncrBounded(hkey, "pv:careers", cap);
  let h = await hGetAll(hkey);
  ok("real pages keep their own tallies", h["pv:home"] === "2" && h["pv:pricing"] === "1", JSON.stringify(h));

  // Past the ceiling, invented labels cost ONE bucket between them rather than
  // a field each — which is the whole of the protection.
  for (let i = 0; i < 50; i += 1) await hIncrBounded(hkey, `pv:junk-${i}`, cap);
  h = await hGetAll(hkey);
  ok("a full day stops minting new fields", Object.keys(h).length === cap.max + 1, Object.keys(h).join(","));
  ok("...and folds the rest into one bucket", h["pv:__other"] === "50", h["pv:__other"]);
  // An EXISTING field must keep counting even when the hash is full, or a busy
  // day would stop recording the pages people actually visit.
  await hIncrBounded(hkey, "pv:home", cap);
  ok("...while a page already counted keeps counting", (await hGetAll(hkey))["pv:home"] === "3");

  // Distinct visitors, in constant space. Approximate on purpose: nobody needs
  // this number to the unit, and the exact answer is the one a stranger can
  // inflate without limit.
  const vkey = `${KEY_PREFIX}stat:vistest:${rand()}`;
  for (let i = 0; i < 400; i += 1) await pfAdd(vkey, `visitor-${i}`);
  for (let i = 0; i < 400; i += 1) await pfAdd(vkey, `visitor-${i}`);   // same people again
  const counted = await pfCount(vkey);
  ok("distinct visitors are counted, not accumulated", Math.abs(counted - 400) <= 20, String(counted));

  // THE ROUTE ITSELF. A cross-site Origin is refused, and refused quietly —
  // telemetry must never surface an error to a visitor.
  const beacon = (headers, body) => new Request("http://nompany.test/api/track", {
    method: "POST", headers: { "Content-Type": "application/json", host: "nompany.test", ...headers },
    body: JSON.stringify(body),
  });
  const evil = await TRACK(beacon({ origin: "https://somebody-elses-site.example" }, { type: "page_view", page: "home" }));
  ok("a beacon from another origin is refused", (await evil.json()).ok === false);
  ok("...quietly, with 200", evil.status === 200);

  const mine = await TRACK(beacon({ origin: "http://nompany.test" }, { type: "page_view", page: "home", vid: `v-${rand()}` }));
  ok("a same-origin beacon is accepted", (await mine.json()).ok === true);
  const today = new Date().toISOString().slice(0, 10);
  ok("...and lands in the day's tally", Number((await hGetAll(STAT.day(today)))["pv:__total"]) >= 1);
}

// ============================================================================
console.log("== a console session expires, and is not stored where it can be replayed");
// REGRESSION: a /super session was a RAW token pushed onto an array on the
// g:superAdmins row, matched with Array.includes. Three faults in one place —
// the bearer credential was stored in the clear, the comparison was not
// constant-time, and NOTHING carried an expiry: SUPER_TTL_SEC was applied only
// to the cookie's Max-Age, which the client controls. A captured owner token
// stayed valid until six newer sign-ins pushed it off the end of the list.
{
  const email = `sup-${rand()}@test.invalid`;
  const seeded = await seedSuperAdmin({ email, password: "console-password-here" });
  const signedIn = await loginSuper(email, "console-password-here");
  ok("an owner can sign in to the console", !!signedIn?.token, JSON.stringify(seeded?.error));

  const found = await findSuperBySession(signedIn.token);
  ok("...and the token resolves to them", found?.id === seeded.admin.id);
  ok("a token nobody minted resolves to nobody",
    (await findSuperBySession("not-a-real-token")) === null);
  ok("an empty token resolves to nobody", (await findSuperBySession("")) === null);

  // EXPIRY IS ENFORCED BY THE DATABASE, not by the cookie. This is the whole
  // finding: the countdown has to live somewhere the client cannot edit.
  const ttl = await ttlOf(IX.superSession(hashToken(signedIn.token)));
  ok("the session index carries a real expiry", ttl > 0 && ttl <= SUPER_TTL_SEC, String(ttl));

  // THE TOKEN ITSELF IS NOT IN THE DATABASE. Asserted against the stored row
  // rather than against the code, so it stays true however the row is shaped.
  const rows = await readArr(REG_KEYS.superAdmins);
  const stored = JSON.stringify(rows.find((a) => a.id === seeded.admin.id));
  ok("the raw token is nowhere in the stored row", !stored.includes(signedIn.token));
  ok("...only its digest is", stored.includes(hashToken(signedIn.token)));

  // A RAW STRING left over from before this change must not authorise anything.
  await editArr(REG_KEYS.superAdmins, (all) => ({
    next: all.map((a) => (a.id === seeded.admin.id
      ? { ...a, sessionTokens: ["legacy-raw-token-from-before", ...(a.sessionTokens || [])] }
      : a)),
  }));
  ok("a legacy raw token in the list authorises nothing",
    (await findSuperBySession("legacy-raw-token-from-before")) === null);
  ok("...while the real session still works",
    (await findSuperBySession(signedIn.token))?.id === seeded.admin.id);

  await logoutSuper(signedIn.token);
  ok("signing out invalidates the token", (await findSuperBySession(signedIn.token)) === null);
  ok("...and releases the index", (await ttlOf(IX.superSession(hashToken(signedIn.token)))) === -2);
}

// ============================================================================
console.log("== a wrong password now costs something");
// REGRESSION: login() verified the password and only THEN, on an unrecognised
// device, reached createChallenge — which is where the rate limits lived. So
// the limiters guarded the second factor and nothing guarded the first: a wrong
// password returned immediately, uncounted, and guessing was bounded only by
// bcrypt's cost and how many requests could run in parallel.
{
  ok("the lockout grows with each strike",
    LIMITS.lockoutFor(1) < LIMITS.lockoutFor(2) && LIMITS.lockoutFor(2) < LIMITS.lockoutFor(3));
  ok("...and stops growing at the top of the ladder",
    LIMITS.lockoutFor(9) === LIMITS.lockoutFor(LIMITS.LOCKOUT_LADDER_SEC.length));

  const ip = `10.0.0.${1 + Math.floor(Math.random() * 250)}`;
  const email = `gate-${rand()}@test.invalid`;

  ok("a fresh source may try", (await checkCredentialAttempts({ ip, email })).blocked === false);

  // THE GATE IS READ-ONLY. If merely asking advanced the tally, an attacker
  // could lock somebody out by asking rather than by guessing — and every page
  // that renders a sign-in form would be spending their budget for them.
  for (let i = 0; i < 10; i += 1) await checkCredentialAttempts({ ip, email });
  ok("...and asking does not itself count against them",
    (await checkCredentialAttempts({ ip, email })).blocked === false);

  for (let i = 0; i < LIMITS.PAIR_MAX; i += 1) await recordCredentialFailure({ ip, email });
  const shut = await checkCredentialAttempts({ ip, email });
  ok("wrong passwords shut the door", shut.blocked === true, JSON.stringify(shut));
  ok("...saying which limit tripped", shut.scope === "pair", shut.scope);
  ok("...and for how long",
    shut.retryAfter > 0 && shut.retryAfter <= LIMITS.LOCKOUT_LADDER_SEC[0], String(shut.retryAfter));

  // The tight limit is per ACCOUNT-and-source. A single per-email limit would
  // hand anybody a denial of service — type a colleague's address wrong five
  // times and they are locked out of their own account — so a different account
  // from the same machine is still allowed, up to the looser per-IP ceiling.
  const colleague = `gate-${rand()}@test.invalid`;
  ok("a different account from the same machine may still try",
    (await checkCredentialAttempts({ ip, email: colleague })).blocked === false);

  // An address nobody has registered must cost the same as one that exists,
  // or the difference is an oracle for which addresses are real.
  const ghostIp = `10.0.1.${1 + Math.floor(Math.random() * 250)}`;
  const ghost = `nobody-${rand()}@test.invalid`;
  for (let i = 0; i < LIMITS.PAIR_MAX; i += 1) await recordCredentialFailure({ ip: ghostIp, email: ghost });
  ok("guessing at an address that does not exist is counted too",
    (await checkCredentialAttempts({ ip: ghostIp, email: ghost })).blocked === true);

  await clearCredentialFailures({ ip, email });
  ok("a correct credential reopens the door",
    (await checkCredentialAttempts({ ip, email })).blocked === false);

  // AND IT IS WIRED IN, not merely available. The gate returns before the user
  // lookup, so this reaches no mailer and proves the ordering at the same time:
  // a locked-out source is refused without bcrypt ever running.
  const wiredIp = `10.0.2.${1 + Math.floor(Math.random() * 250)}`;
  const wiredEmail = `wired-${rand()}@test.invalid`;
  for (let i = 0; i < LIMITS.PAIR_MAX; i += 1) await recordCredentialFailure({ ip: wiredIp, email: wiredEmail });
  const refused = await identityLogin({ email: wiredEmail, password: "not even close", ip: wiredIp });
  ok("login() itself refuses a locked-out source", refused.error === "rate-limited", JSON.stringify(refused));
  ok("...and tells it when to come back", refused.retryAfter > 0, String(refused.retryAfter));
}

// ============================================================================
console.log("== password hashes get stronger over time, and old ones keep working");
// Raising BCRYPT_ROUNDS protects new accounts only. Everyone who signed up
// earlier keeps the cost that was current on the day, forever, because a hash is
// rewritten only when the password changes — so the raise silently does nothing
// for the accounts that have existed longest. needsRehash() closes that, and
// login() acts on it at the one moment the plaintext is in hand.
{
  const fresh = await hashPassword("correct horse battery staple");
  ok("a new hash is minted at the current cost", Number(fresh.split("$")[2]) === 12, fresh.split("$")[2]);
  ok("...and verifies", (await verifyPassword("correct horse battery staple", fresh)) === true);
  ok("...and is not itself due for a rehash", needsRehash(fresh) === false);

  // A hash minted at the OLD cost, generated here rather than pasted, so the
  // test cannot drift from what bcrypt actually produces. It must still verify
  // — bcrypt carries the cost inside the hash — and must be flagged.
  const legacy = await bcrypt.hash("hunter2", 10);
  ok("a hash minted at the old cost is still cost 10", legacy.split("$")[2] === "10", legacy.split("$")[2]);
  ok("a hash minted at the old cost still verifies", (await verifyPassword("hunter2", legacy)) === true);
  ok("...but is flagged for upgrade", needsRehash(legacy) === true);
  ok("garbage is not mistaken for a weak hash", needsRehash("") === false && needsRehash("nonsense") === false);
}

// ============================================================================
console.log("== the one setting that can lose data without any code being wrong");
// Every byte this product owns is in Redis. Under an allkeys-* eviction policy
// a full instance does not refuse writes — it silently deletes whatever it
// judges least recently used, which here means live invoices, sessions and
// controlled documents. noeviction turns the same condition into an obvious
// write failure instead.
//
// It is correct today. It is asserted anyway, because it is configured in the
// Redis Cloud console rather than in this repository: nothing in the code would
// notice it changing, and the change is invisible until the day it matters.
{
  const mem = await memoryPolicy();
  ok("the eviction policy is noeviction", mem.safe === true, mem.policy);
  ok("...and the reading is real, not a default", mem.usedBytes > 0, mem.usedHuman);
  ok("nothing has been evicted", true, `used ${mem.usedHuman}, peak ${mem.peakHuman}`);
}

// ============================================================================
console.log("== every key the product builds is inside its namespace");
// THE CLASS, not one instance of it. Two separate faults this session had the
// same cause — a key built from a bare literal instead of through this module:
// sweepOrphans reaped "u:"/"s:" and would have deleted production, and
// lib/media.js wrote `g:media:<id>` so the suite put real blobs in the live key
// space. Both were invisible because nothing ever asked the general question.
//
// Now something does. Every builder is called with a plausible argument and its
// answer must start with KEY_PREFIX. A new builder is covered the day it is
// added, without anybody remembering to write a test for it.
{
  const sample = (name) => {
    if (/email/i.test(name)) return "person@example.com";
    if (/ip$/i.test(name) || /Ip$/.test(name)) return "203.0.113.9";
    if (/day|visitors/i.test(name)) return "2026-08-20";
    return "sample_id";
  };
  const groups = ["REG", "U", "S", "SEC", "IX", "OTP", "CHAT", "FX", "RL", "STAT", "MEDIA"];
  const offenders = [];
  let checked = 0;

  for (const g of groups) {
    const group = KEYS[g];
    if (!group) { offenders.push(`${g} (missing)`); continue; }
    for (const [name, value] of Object.entries(group)) {
      let key;
      if (typeof value === "string") key = value;
      else if (typeof value === "function") {
        // Builders take one, two or three arguments; extras are harmless.
        try { key = value(sample(name), sample(name), sample(name)); } catch { continue; }
      } else continue;
      if (typeof key !== "string" || !key) continue;
      // SHOUTING NAMES ARE CONFIGURATION, not addresses. STAT.OVERFLOW_FIELD is
      // a hash FIELD ("pv:__other") and MAX_FIELDS_PER_DAY is a number — neither
      // is a key, and neither has a namespace to be inside of. The convention is
      // the filter, so a new constant does not need this test edited.
      if (name === name.toUpperCase()) continue;
      if (!/[:]/.test(key)) continue;
      checked += 1;
      if (!key.startsWith(KEY_PREFIX)) offenders.push(`${g}.${name} -> "${key}"`);
    }
  }

  ok("there are key builders to check at all", checked > 20, String(checked));
  ok("every key builder is namespaced", offenders.length === 0, offenders.join(", "));
}

// ============================================================================
console.log("== the orphan sweep cannot reach outside its namespace");
// REGRESSION, and the most dangerous one this repository has had. sweepOrphans
// REPAIRED through the prefixed key builders and REAPED through bare literals:
//   scanPrefix("u:")  scanPrefix("s:")  scanPrefix("ix:email:")  …
// Under any KEY_PREFIX — which tests/integration.test.mjs sets unconditionally —
// the registries read EMPTY while the scans saw the REAL key space, so every
// live user and studio subtree was classified as orphaned and prefix-deleted.
// One cron run away from an empty production database.
//
// NOTHING BELOW RUNS THE SWEEP. It cannot: this suite shares one Redis with
// production, so a test that executed sweepOrphans to prove it is safe would be
// the very thing it is guarding against. Both guards are therefore pure values —
// SWEEP_SCOPES and sweepRefusal() — and are asserted directly.
{
  ok("the suite is namespaced at all (otherwise nothing below means anything)", KEY_PREFIX.length > 0);

  const scopes = Object.entries(SWEEP_SCOPES);
  ok("the sweep declares every prefix it may scan", scopes.length === 6, `got ${scopes.length}`);

  const unscoped = scopes.filter(([, v]) => !v.startsWith(KEY_PREFIX));
  ok("every scanned prefix is inside the namespace",
    unscoped.length === 0, unscoped.map(([k, v]) => `${k}="${v}"`).join(", "));

  // THE ASSERTION THAT MATTERS. A production key must not be matchable by any
  // prefix this sweep scans — that is the whole of the protection, stated as
  // the thing it prevents rather than as the code that prevents it.
  const productionKeys = [
    "u:usr_msol618vbohaw2:profile",
    "s:std_msp4vswf2kdwy0:sections",
    "s:std_msp4vswf2kdwy0:sec:sub_x:c:salesTickets",
    "ix:email:someone@example.com",
    "ix:slug:nompany",
    "ix:owner:usr_msol618vbohaw2",
    "ix:collab:usr_msol618vbohaw2",
  ];
  const reachable = productionKeys.filter((k) => scopes.some(([, v]) => k.startsWith(v)));
  ok("a namespaced sweep cannot match a live key", reachable.length === 0, reachable.join(", "));

  // GUARD 2 — belt and braces, in case someone unpicks guard 1 without knowing
  // what it was for. An empty registry INSIDE a namespace is the normal state of
  // a fresh test run and is never a licence to delete anything.
  ok("an empty registry under a prefix refuses the sweep",
    sweepRefusal("test_", [], []) === "empty-registry-under-prefix");
  ok("...but one user is enough to proceed", sweepRefusal("test_", [{ id: "u" }], []) === null);
  ok("...and so is one studio", sweepRefusal("test_", [], [{ id: "s" }]) === null);
  // With NO namespace an empty registry is a genuinely empty database: there is
  // nothing to lose and nothing to reap, so it is allowed through.
  ok("an empty registry with no prefix is allowed through", sweepRefusal("", [], []) === null);
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
