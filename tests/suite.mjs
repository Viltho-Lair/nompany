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
import { delPrefix, getIndex, delKeys } from "@/platform/db/store";
import { createUser, mintSession } from "@/platform/auth/users";
import { createStudio, renameStudio, getStudioBySlug, updateStudio } from "@/modules/main/studios";
import { studioLocale, dirFor, preferredLocale, UI_LANG_COOKIE } from "@/shared/locale";
import { compile, serialize, middleware, stringify, prefixer } from "stylis";
// RESOLVED THE WAY THE BUNDLER RESOLVES IT. stylis-plugin-rtl ships both
// builds and declares no "exports": bundlers take the `module` field, whose
// ESM build has a clean `export default`, while Node ignores `module` and
// loads the CJS `main` — where the default import is the module object, not
// the plugin. Unwrapped here so this asserts what the app actually runs.
import * as rtlModule from "stylis-plugin-rtl";
const rtlPlugin = rtlModule.default?.default ?? rtlModule.default ?? rtlModule;
import * as SETTINGS from "@/app/api/studios/[slug]/settings/route.ts";
import { addCollaborator, updateCollaborator, getCollaboratorByUser } from "@/platform/auth/collaborators";
import { listRoles, createRole } from "@/modules/people/roles";
import { SESSION_COOKIE, login as identityLogin } from "@/platform/auth/identity";
import { studioContext, canAdminister } from "@/lib/studios";
import { explain, ADMIN_ROLE_ID, ALL_PERMISSIONS } from "@/platform/access";
import { tasksContext, createTask, updateTask, removeTask, decideTask } from "@/modules/tasks/tasks";
import { listForCollaborator, NOTIFY } from "@/platform/notify/notifications";
import { TASK_TYPE_AUTHORITIES } from "@/modules/tasks/taskRouting";
import {
  salesContext, createTicket, requestTicketRfq, listTickets, sendTicketForApproval,
  submitTicketPo, editClient, listClients,
} from "@/modules/sales/sales";
import { resolveClientFor, normaliseClientName, clientSlug } from "@/modules/sales/salesClients";
import { projectsContext, openProject, listProjects, approvedQuotations, removeProject } from "@/modules/projects/projects";
import {
  technicalContext, requestRfq, convertRfq, createQuotation, updateRfq, updateQuotation, listQuotations,
  removeQuotation,
} from "@/modules/technical/technical";
import { rfqInfo } from "@/modules/sales/salesAnalytics";
import { landedUnitCost, crossRate } from "@/shared/currencies";
import { qualityContext } from "@/modules/quality/quality";
import { NODES, EDGES, pathBetween, reachableFrom, traverse } from "@/platform/relations";
import { SECTION_COLLECTIONS, ALL_SECTION_KEYS } from "@/platform/db/keys";
import { activityByDay, periodDelta, activitySeriesFromCounts, trendFromCounts, readAggregate } from "@/modules/main/executive";
import { MAIN_AGG_SOURCES, utcDay, aggField } from "@/platform/db/mainAgg";
import { mainContext } from "@/modules/main/main";
import { rankQueue } from "@/modules/main/awaiting";
import { mergeValuesFor, fieldsFor, bindSubject, subjectOptions } from "@/modules/quality/quality";
import { isFieldKey, legalKeyFor, availableFields, reachOf } from "@/modules/quality/qualityFields";
import {
  createDoc, getDoc, listDocs, saveContent, savePageSetup, removeDoc,
} from "@/modules/quality/qualityDocs";
import {
  moveRevision as moveDocRevision, startRevision as startDocRevision,
  workflowFor, listRevisions as listDocRevisions,
} from "@/modules/quality/qualityDocRevisions";
import { resolveBlocks, blocksFor } from "@/modules/quality/quality";
import { listSections, plantMissingSections, getSectionByKey, addRow, readCol } from "@/platform/db/sections";
import { readArr, writeArr } from "@/platform/db/store";
import { S, REG as REG_KEYS } from "@/platform/db/keys";
import { financeContext, createInvoice, editInvoice, recordPayment, createExpense, removeInvoice, listInvoices, saveFinanceSettings } from "@/modules/finance/finance";
import { listAccounts, postEntry, reverseEntry, listJournal, trialBalance, postInvoice, postExpense, postPayment, postBill, postBillPayment } from "@/modules/finance/ledger";
import { arAging, topDebtors, collectionRate, dso, incomeVsExpense, expenseMix, apAging, topVendors, assetRegister } from "@/modules/finance/analytics";
import { listBills, createBill, editBill, approveBill, recordBillPayment, removeBill } from "@/modules/finance/payables";
import { depreciationOf, listAssets, createAsset, editAsset, disposeAsset } from "@/modules/finance/assets";
import { analyticsLevelOf, analyticsAllows } from "@/lib/analytics";
import { enabledWidgets, widgetsForRung, WIDGET_KEYS, WIDGET_SECTIONS, DASHBOARD_WIDGETS } from "@/lib/dashboardWidgets";
import { planOf } from "@/lib/plans";
import { createCatalogItem, deleteCatalogItem, listCatalog } from "@/lib/data/catalog";
import { drillHref } from "@/components/dashboard/drill";
import { presetRange } from "@/components/dashboard/dateRange";
import { toCSV } from "@/components/dashboard/exportTable";
import { overdueInvoiceNotices, overdueBillNotices, expiringDocumentNotices, expiringPermitNotices, OVERDUE_MILESTONES, EXPIRING_MILESTONES } from "@/modules/main/timeNotices";
import { resolveHolders } from "@/lib/studios";
import { NOVA_CAPABILITIES, capabilityEnabled, enabledCapabilities } from "@/lib/nova/capabilities";
import { getNovaConfig, saveNovaConfig } from "@/lib/data/novaConfig";
import { buildToolset } from "@/platform/nova/tools";
import { inventoryContext, createItem, editItem, createVendor, createOrder, editOrder, receiveOrder, adjustStock, listProjectSheets, saveSheetLine } from "@/modules/inventory/inventory";
import {
  hrContext, requestVacation, decideVacation,
  listDepartments, listHrRoles, createHrRole, editHrRole, removeHrRole,
  listEmployees, saveEmployment,
} from "@/modules/hr/hr";
import { updateProfile } from "@/platform/auth/users";
import { __signIn, __signOut } from "./nextHeaders.mjs";
// ENGAGEMENT FOUNDATIONS (Phase 0). tests/engagement.mjs carries its own
// standalone runner guarded on `import.meta.url === pathToFileURL(argv[1])`,
// which does not fire on a plain import — so importing it here only pulls in
// the seven exported test functions, called explicitly further down. They use
// node:assert (throw on failure) rather than this file's `ok()` harness, so
// each is run inside the try/catch block below that adapts one into the other.
import {
  testZsetHelpers, testEngagementKeys, testRegistry, testCreateRead,
  testAttach, testDetachAndRefs, testUnassigned,
} from "./engagement.mjs";
// ENGAGEMENT BACKFILL (Phase 1a). Same standalone-runner shape as
// engagement.mjs above — importing it here pulls in only the six exported
// test functions, run explicitly further down through the same try/catch
// adapter (node:assert throws are not this file's ok() shape).
import {
  testKeysAndDetId, testCluster, testOrphanClientLive, testApplyAndRead, testBackfillStudio, testParity,
  testVocabularyParity,
} from "./engagement-backfill.mjs";
// PHASE 1b-i DUAL-WRITE: createTicket mints the engagement layer as a
// best-effort side effect, reusing the backfill's own clustering.
import { deterministicEngId } from "@/platform/db/keys";
import { readEngagementView, readEngagement, engagementOf, resolveDealId } from "@/platform/db/engagement";
// THE ENGAGEMENTS VIEW (Task 6): the read layer that assembles a deal from
// the layer above, exercised end to end against a real seeded studio in the
// spine block below — the pure permission filter (visibleStageTypes) already
// has its own coverage in tests/engagement-view.mjs.
import { listEngagements, engagementBlock, engagementImpact, lockEngagement, removeEngagement } from "@/modules/main/engagements";
// PHASE 1b-i ON-CREATE (Task 1), plus the direct-project root (Task 1 of the
// direct-project-creation plan). Same standalone-runner shape as engagement.mjs
// and engagement-backfill.mjs above — importing it here pulls in the exported
// test functions, run explicitly further down through the same try/catch
// adapter (node:assert throws are not this file's ok() shape).
import {
  testAttachTicketEngagement,
  testDirectProjectMintsItsOwnEngagement,
  testBackfillClustersOrphanProjects,
  testBackfillLeavesLineagedProjectsAlone,
} from "./engagement-oncreate.mjs";
// PHASE 1b-ii SPINE (Task 5). Same standalone-runner shape as engagement.mjs,
// engagement-backfill.mjs and engagement-oncreate.mjs above — importing it
// here pulls in only the one exported test function, run explicitly further
// down through the same try/catch adapter (node:assert throws are not this
// file's ok() shape).
import {
  testSpineHelpers, testDetachResolvesThroughAlias, testDescriptorFollowsTheAlias,
  testMintingIsIdempotentAndGrandfathers, testAliasWriteIsNotBestEffort,
  testConvergesWhenAliasLandedButRootDidNot,
} from "./engagement-spine.mjs";
// THE ENGAGEMENTS VIEW's own tests (Task 6/7). Same standalone-runner shape as
// the four modules above — importing it here pulls in only the three exported
// test functions, run explicitly further down through the same try/catch
// adapter (node:assert throws are not this file's ok() shape). listEngagements
// and engagementBlock themselves are already exercised end to end against a
// real seeded studio in the block above ("the handler is carried, never
// copied"); this module covers what needs no studio at all — the index key,
// the permission catalogue entry, and the pure visibleStageTypes filter.
import { testIndex, testPermissionKey, testVisibleStageTypes } from "./engagement-view.mjs";
// THE DELETE PATH (this increment). Same standalone-runner shape as the five
// modules above -- importing it here pulls in only the exported test functions,
// run explicitly further down through the same try/catch adapter. The delete
// VERBS themselves (removeQuotation/removeProject) are exercised end to end
// against the seeded studio further up; this module covers the primitive and
// the impact query, which need no studio at all.
import {
  testNoPhantomStageAfterDelete, testDetachClearsTheApprovedQuotationSlot,
  testDetachClearsTheProjectSingleton, testDetachIsTheInverseOfAttach,
  testHasStageTracksTheLastRecordOfAType, testDetachIsIdempotent,
  testDetachNeverClobbersANewerClaim, testLineageDerivationMatchesTheCreatePath,
  testDeletionImpactNamesOnlyWhatTheReaderMaySee, testInternalQuotationDetaches,
  testLockDefaultsToLocked, testLockedEngagementRefusesDeletion,
  testDeleteEngagementIsIdempotent, testEveryStageDeclaresItsDisposition,
  testDeletingADealDoesNotDeleteItsClient, testASharedClientSurvivesEitherDeal,
  testKeptRecordsAreDetachedNotDeleted, testEngagementImpactSplitsDeletedFromSurviving,
} from "./engagement-delete.mjs";
// A PROJECT'S CHILDREN (this increment). Same standalone-runner shape as the
// six modules above — importing it here pulls in only the exported test
// functions, run explicitly further down through the same try/catch adapter.
// The create and delete VERBS themselves (createInvoice/removeInvoice, the two
// sheets openProject draws up) are exercised end to end against the seeded
// studio further up; this module covers the two primitives they share, which
// need no studio at all.
import {
  testAChildResolvesItsDealFromItsProject, testAChildRaisedOnAProjectJoinsTheDeal,
  testEveryRowOfOneActionJoinsTheSameDeal,
  testARecordWithNoProjectAttachesToNothingAndDoesNotThrow,
  testASwallowedAttachNeverFailsTheCreate,
  testDetachingAChildLeavesTheRestOfTheDealIntact,
  testDetachingARecordThatNeverAttachedIsANoOp,
} from "./engagement-children.mjs";
// THE FIFTEEN-SECTION RESTRUCTURE MAP (P0 restructure, Task 1). Same
// standalone-runner shape as the seven modules above — importing it here pulls
// in only the exported test functions, run explicitly further down. Unlike
// those seven, this file's tests take their assertion object as an ARGUMENT
// rather than importing node:assert themselves (so the same functions can also
// self-check when the file is run bare via `node tests/restructure.mjs`), so
// the adapter below is a tiny shim that forwards straight into this file's own
// ok() rather than a try/catch around a thrown node:assert error.
import {
  testEveryOldSectionKeyIsAccountedFor, testEveryMappedTargetActuallyExists,
  testEveryMappedPermissionTargetIsARealArea, testMapIsIdempotent,
  testTheFiveMovesAreDeclared, testNoRetiredSectionKeySurvivesInSource,
} from "./restructure.mjs";
// THE SQL QUERY BUILDER (P1 Postgres store swap, Task 7), same standalone-
// runner shape as restructure.mjs above: pure functions, no database, and
// self-checking when run bare via `node tests/pg-query.mjs`. Importing it
// here folds it into the one command (`npm test`) that already runs
// everything else, even though it needs none of what integration.test.mjs's
// bootstrap sets up for it.
import {
  testExactMatch, testUndefinedIsIgnoredNotMatched, testArrayMeansOneOf,
  testContainsIsCaseInsensitive, testTextOrderUsesAnIcuCollation, testNumberOrderCasts,
  testOrderIsMadeTotal, testDefaultOrderIsNewestFirst, testUnknownOperatorThrows,
  testNullRequiresKeyPresent, testNeUsesIsDistinctFrom, testNeNullKeepsAnAbsentKey,
  testInNullMemberRequiresKeyPresent, testNinKeepsAnAbsentKey,
  testNinExcludesAnExplicitNullOnlyWhenTheArrayHasOne, testOrderCoalescesMissingTextToEmptyString,
  testContainsEscapesWildcards, testGtCastsNumericForANumberArgument, testGtUsesCollateCForAStringArgument, testGtNullArgumentThrows,
  testCountMirrorsSelectsWhereClause,
  testScopeAndCollectionAreAlwaysParameterised, testLimitIsTheLastParameter,
} from "./pg-query.mjs";
// THE POSTGRES SEAM, SCHEMA AND ROW PRIMITIVES, PLUS THE DISPATCHER (P1
// Postgres store swap, Tasks 1, 2, 4 and 5), same standalone-runner shape as
// pg-query.mjs above: self-checking when run bare via `node
// tests/pg-parity.mjs`, folded in here so a regression shows up in the one
// command everything else already goes through. UNLIKE pg-query.mjs this
// touches a real, live Postgres — DATABASE_URL must be set (pg-parity.mjs
// exits loudly if it is not) — but every fixture it writes is either a
// synthetic tenant id cleaned up in the test's own `finally` block or, for
// the two dispatcher round-trip tests, no-ops outside NOMPANY_DB=parity.
import {
  testPgConnects, testPgRejectsNamedPreparedStatements, testQueryTimeoutOutlivesStatementTimeout,
  testWithTenantSetsTheLocalTenantSetting, testTenantSettingDoesNotLeakAcrossTransactions,
  testBareQueryAgainstTheTenantTableIsRefused, testWithinTheSeamTheTenantTableIsReachable,
  testWithTenantRefusesAnEmptyTenantId, testSchemaShape, testRlsIsEnabled, testRlsFiltersRowsBetweenTenants,
  testCheckConstraintRejectsEmptyTenantId, testPgSchemaQueryRefusesANonDdlStatement,
  testPgSchemaQueryRefusesDropTableEvenGuarded, testPgSchemaQueryRefusesDropSchema,
  testPgSchemaQueryRefusesDropOwned, testPgSchemaQueryRefusesDropIndex,
  testPgSchemaQueryRefusesAlterTableDropColumn, testPgSchemaQueryRefusesAlterTableRename,
  testPgSchemaQueryRefusesAlterColumnTypeJsonb, testPgSchemaQueryRefusesDisableRls,
  testPgSchemaQueryRefusesCreateView, testPgSchemaQueryDoesNotLaunderADropThroughAStringLiteral,
  testPgSchemaQueryRefusesCreateTableAsSelectPlain, testPgSchemaQueryRefusesCreateTableAsSelectWithExtraParens,
  testPgSchemaQueryAcceptsRealDdl, testFailedTransactionDestroysItsConnectionRatherThanRecyclingIt,
  testPgTxAlsoDestroysAFailedConnection, testReentrantWithTenantForTheSameTenantIsAbsorbed,
  testReentrantWithTenantForADifferentTenantFailsFast, testKilledConnectionDoesNotCrashTheProcess,
  testKeyOrderSurvives, testNewestFirst, testBatchKeepsArrivalOrderAmongItself, testFunctionPatchIsReapplied,
  testTwentyConcurrentFlipsAllLandNoneRejected, testImmutableFieldsCannotBePatched,
  testDeleteReportsWhetherAnythingWent, testBackendDefaultsToRedis, testDispatcherParityRoundTrip,
  testDispatcherDisagreementNamesBothValues, testCascadeDeleteSectionReapsRowsOutsideTheCatalogue,
} from "./pg-parity.mjs";
// THE POSTGRES SWEEP (Task 6) — see tests/pg-sweep.mjs. Used once, at the very
// end, right before the Redis delPrefix that would otherwise erase the one
// record (REG.studios) naming which tenants this run needs it to clean up.
import { sweepPgTenants } from "./pg-sweep.mjs";
// THE BLOB SWEEP (see tests/blob-sweep.mjs) — the third store's cleanup, and
// the only one whose namespace lives in the object path rather than in a key
// prefix or a tenant column.
import { sweepBlobObjects } from "./blob-sweep.mjs";

import {
  seedSuperAdmin, loginSuper, logoutSuper, findSuperBySession, SUPER_COOKIE, SUPER_TTL_SEC,
} from "@/platform/auth/superAuth";
import { ttlOf, editArr, hIncrBounded, pfAdd, pfCount, hGetAll, hSet, memoryPolicy, sMembers } from "@/platform/db/store";
import * as KEYS from "@/platform/db/keys";
import { STAT } from "@/platform/db/keys";
import { putMedia, getMedia } from "@/lib/media";
import { hashToken } from "@/platform/auth/passwords";
import { SERVICE_ACTIONS, FIELDS_OF_WORK, FIELD_ACTION_MATRIX, actionsForField, OTHER_FIELD } from "@/shared/fieldsOfWork";
import { nextPool, cleanNextActive } from "@/modules/studioServiceActions";

const PUT_COLLABORATORS = (await import("@/app/api/studios/[slug]/collaborators/route.ts")).PUT;
const TASKS_ROUTE = await import("@/app/api/studios/[slug]/tasks/route.ts");
const EXPORT_CSV = (await import("@/app/api/super/site-analytics/export/route.ts")).GET;
const YEAR_ROLLOVER = (await import("@/app/api/cron/year-rollover/route.ts")).GET;
const MAIN_ROLLUP = (await import("@/app/api/cron/main-rollup/route.ts")).GET;
const TRACK = (await import("@/app/api/track/route.ts")).POST;
const MEDIA_GET = (await import("@/app/api/media/[id]/route.ts")).GET;
const SVC_ACTIONS = await import("@/app/api/studios/[slug]/settings/service-actions/route.ts");
const FLOWS = await import("@/app/api/studios/[slug]/settings/flows/route.ts");

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

  // THE PRODUCER THAT HAD NEVER FIRED. NOTIFY.taskAssigned was declared from the
  // start and nothing produced it — a task handed to somebody told them nothing.
  // Owner assigned this to viewer above, so viewer, not owner, should hear.
  const assignNote = (await listForCollaborator(studio.id, viewer.collaborator.id))
    .find((n) => n.type === NOTIFY.taskAssigned);
  ok("the assignee is told they were handed a task", Boolean(assignNote), NOTIFY.taskAssigned);
  ok("...and the notice carries the task's title", assignNote?.body === "Ship the thing", JSON.stringify(assignNote?.body));
  ok("...and the assigner did NOT notify themselves",
    !(await listForCollaborator(studio.id, ctx.collaborator.id)).some((n) => n.type === NOTIFY.taskAssigned),
    "self-assignment is not news");

  const editedBefore = (await listForCollaborator(studio.id, viewer.collaborator.id))
    .filter((n) => n.type === NOTIFY.taskAssigned).length;
  const edited = await updateTask(ctx, made.task?.id, { title: "Ship the thing, renamed" });
  ok("owner can edit a task", edited.task?.title === "Ship the thing, renamed", edited.error);
  // A RENAME IS NOT A REASSIGNMENT. The assignee did not change, so no second
  // bell — or every edit to a task spams whoever holds it.
  const editedAfter = (await listForCollaborator(studio.id, viewer.collaborator.id))
    .filter((n) => n.type === NOTIFY.taskAssigned).length;
  ok("...and editing a task does not re-announce it", editedAfter === editedBefore, `${editedBefore} -> ${editedAfter}`);

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
  // THE APPROVAL PRODUCER'S SELF-GUARD: owner raised this AND signed it, so the
  // outcome is not news to them. The positive case — a raiser hearing that
  // somebody else granted their approval — rides the same announce pattern the
  // five producers above prove end-to-end, and Gate A block 7 guarantees the
  // type has a producer at all.
  const octx = await tasksContext(owner, slug);
  ok("signing your own approval task rings no bell for you",
    !(await listForCollaborator(studio.id, octx.collaborator.id)).some((n) => n.type === NOTIFY.approvalDecided),
    "the signer who is also the raiser is not told");

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
  // A ticket's services now name the studio's own Service Actions (Studio
  // Settings → Service Actions) rather than a Sales-owned catalogue, so the
  // fixture seeds the pool directly instead of creating a service row — and
  // BEFORE salesContext resolves, because the context snapshots `studio` at
  // read time and a later write here would not be seen by it.
  await updateStudio(studio.id, { serviceActions: ["Integration"] });

  const sales = await salesContext(owner, slug);
  ok("owner can open Sales", !sales.error, sales.error);

  // contactName/location are set here (the design fixture left them blank) so
  // the C-1 leak test below has real values to assert are ABSENT from a
  // non-Sales reader's engagementBlock payload — a blank field can't prove a
  // projection actually strips anything.
  const made = await createTicket(sales, {
    title: "Carry the handler", clientName: "Acme", deadline: "2026-12-01",
    industry: "Technology", serviceIds: ["Integration"],
    contactName: "Priya Shenoy", location: { name: "Acme HQ", city: "Austin", country: "US", url: "https://acme.example/hq" },
  });
  ok("a ticket can be raised", !!made.ticket, JSON.stringify(made.error));

  // dual-write: creating a ticket also mints its engagement (Phase 1b-i), and
  // that mint leaves the derived id an ALIAS rather than the deal's own id
  // (deal-aliases Task 3) — resolved here, once, so every read below (and
  // every comparison further down this same fixture) is asking about the
  // deal that actually exists rather than the address it used to have.
  const engId = await resolveDealId(studio.id, deterministicEngId("ticket", made.ticket.id));
  const view = await readEngagementView(studio.id, engId);
  ok("createTicket mints the ticket's engagement",
    view && view.singletons.ticket === made.ticket.id && !!view.context.clientName,
    JSON.stringify(view));

  const asked = await requestTicketRfq(sales, { ticketId: made.ticket?.id });
  ok("...and handed to Technical", !!asked.rfq, JSON.stringify(asked.error));

  // dual-write (Task 2): requesting an RFQ attaches it to the ticket's engagement.
  const rfqEngView = await readEngagementView(studio.id, engId);
  ok("requestRfq attaches the rfq to the ticket's engagement",
    !!rfqEngView?.members.rfq?.includes(asked.rfq?.id), JSON.stringify(rfqEngView?.members.rfq));

  // Converted to MEMBER, then reassigned to VIEWER. The second half is the one
  // that catches a copy: a copy keeps naming Member forever.
  const tech = await technicalContext(owner, slug);
  const conv = await convertRfq(tech, { rfqId: asked.rfq?.id, handledByCollaboratorId: member.collaborator.id });
  ok("an RFQ converts to a quotation", !!conv.quotation, JSON.stringify(conv.error));

  // dual-write (Task 3a): a CONVERTED quotation attaches to the ticket's
  // engagement, not its own — the ticket's is where the whole chain lives.
  const convQuoEngView = await readEngagementView(studio.id, engId);
  ok("convertRfq attaches the quotation to the ticket's engagement",
    !!convQuoEngView?.members.quotation?.includes(conv.quotation?.id), JSON.stringify(convQuoEngView?.members.quotation));

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
  ok("a Member does not hold unlock", !memberTech.access.has("crmSales.quotations.unlock"));

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
  // A PROJECT ASSIGNED IS A PROJECT ANNOUNCED. Owner opened it with member as
  // manager, so member — not owner — should hear it, and the notice links to
  // the projects list.
  {
    const note = (await listForCollaborator(studio.id, member.collaborator.id))
      .find((n) => n.type === NOTIFY.projectAssigned);
    ok("the project's manager is told it is theirs", Boolean(note), NOTIFY.projectAssigned);
    ok("...and the opener did not notify themselves",
      !(await listForCollaborator(studio.id, proj.collaborator.id)).some((n) => n.type === NOTIFY.projectAssigned),
      "self-assignment is not news");
  }
  ok("...with a BLANK number until Finance issues one", opened.project?.number === "",
    JSON.stringify(opened.project?.number));
  ok("...carrying the whole chain of keys",
    opened.project?.ticketId === made.ticket?.id
    && opened.project?.quotationId === conv.quotation?.id
    && opened.project?.rfqId === asked.rfq?.id,
    JSON.stringify({ t: opened.project?.ticketId, q: opened.project?.quotationId, r: opened.project?.rfqId }));

  // dual-write (Task 4): opening a project attaches it to the ticket's
  // engagement AND records the approved quotation on the root.
  const afterProjectEngView = await readEngagementView(studio.id, engId);
  ok("openProject attaches the project as the ticket engagement's singleton",
    afterProjectEngView?.singletons.project === opened.project?.id, JSON.stringify(afterProjectEngView?.singletons));
  ok("...and records the approved quotation",
    afterProjectEngView?.singletons.approvedQuotation === opened.project?.quotationId,
    JSON.stringify(afterProjectEngView?.singletons));

  console.log("\n== a project can be created directly, with no quotation behind it");
  {
    // THE SECOND WAY IN. Everything above this point opened a project from an
    // approved quotation; this is work handed to the studio directly — no
    // ticket, no RFQ, no quotation — and it has to become a real project with a
    // real client and a deal of its own.
    const directCtx = await projectsContext(owner, slug);
    const direct = await openProject(directCtx, {
      clientName: "Northwind Logistics",
      title: "Warehouse fit-out",
      industry: "Logistics",
      notes: "Handed to us directly by the client.",
      value: 42000,
      contactName: "Dana Reed", contactEmail: "dana@northwind.test",
      contactPhone: "+962 7 000 0000", contactPosition: "Facilities Manager",
      site: { name: "North yard", country: "Jordan", city: "Amman", url: "" },
      location: "Amman",
      startDate: "2026-09-01", endDate: "2026-12-01",
    });
    ok("a direct project is created", !!direct.project?.id, JSON.stringify(direct));
    ok("it carries no lineage at all",
      direct.project?.quotationId === "" && direct.project?.ticketId === "" && direct.project?.rfqId === "",
      `${direct.project?.quotationId}/${direct.project?.ticketId}/${direct.project?.rfqId}`);
    ok("its value is the typed figure, not a quotation total", direct.project?.value === 42000,
      String(direct.project?.value));
    ok("its number is blank until Finance issues one", direct.project?.number === "",
      String(direct.project?.number));

    // THE CLIENT IS SALES', RESOLVED THE WAY EVERY OTHER CREATE RESOLVES IT.
    // A typed name that matches nothing becomes a real Client record, with this
    // deal's contact and site folded onto it — not a free-text string on the
    // project row.
    ok("a real Client record was raised", !!direct.project?.clientId, String(direct.project?.clientId));
    ok("the project names the resolved client", direct.project?.clientName === "Northwind Logistics",
      String(direct.project?.clientName));

    // THE TYPED DESCRIPTION IS STORED, read back off the list rather than off
    // the create's own return — the quotation head never sent `notes`, so a
    // regression that dropped the field on the way to Redis would otherwise be
    // green everywhere (the gate-a body omits it and its golden pins "").
    const directReread = (await listProjects(await projectsContext(owner, slug)))
      .find((p) => p.id === direct.project?.id);
    ok("the typed description reaches the stored project",
      directReread?.notes === "Handed to us directly by the client.",
      JSON.stringify(directReread?.notes));

    // AND IT JOINS A DEAL. This is the half that fails silently: no ticket and
    // no quotation means no derived engagement id, so without the project-rooted
    // root the project is invisible on the engagements view. Resolved through
    // the alias (deal-aliases Task 3): the direct-project mint leaves this
    // derivation pointing at the deal rather than naming it.
    const directEngId = await resolveDealId(studio.id, deterministicEngId("project", String(direct.project?.id)));
    const directView = await readEngagementView(studio.id, directEngId);
    ok("the direct project roots its own engagement",
      directView?.singletons?.project === direct.project?.id,
      JSON.stringify(directView?.singletons));
    ok("and that engagement names the client live",
      directView?.context?.clientName === "Northwind Logistics",
      String(directView?.context?.clientName));

    // REFUSALS — neither writes a row.
    const before = (await listProjects(await projectsContext(owner, slug))).length;
    const noTitle = await openProject(await projectsContext(owner, slug),
      { clientName: "Northwind Logistics" });
    // "title", the same name updateProject and Sales give the same refusal —
    // the screens' refusal ladders are keyed on the field's own name.
    ok("a direct create with no title is refused", noTitle?.error === "title", JSON.stringify(noTitle));
    const noClient = await openProject(await projectsContext(owner, slug), { title: "Nameless" });
    ok("a direct create with no client is refused", noClient?.error === "client", JSON.stringify(noClient));
    const after = (await listProjects(await projectsContext(owner, slug))).length;
    ok("a refused direct create writes no row", before === after, `${before} → ${after}`);

    // THE SHEETS EXIST FOR A DIRECT PROJECT TOO, and they are empty — decided
    // deliberately, so a project's Sheets tab is the same tab everywhere. What
    // they must not be is absent: an absent tab reads as a missing feature.
    ok("a direct project is drawn up two sheets", (direct.sheets || []).length === 2,
      String((direct.sheets || []).length));
    ok("and neither claims a quotation it does not have",
      (direct.sheets || []).every((s) => s.quotationId === ""),
      JSON.stringify((direct.sheets || []).map((s) => s.quotationId)));
  }

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
  // ...AND BOTH ARE IN THE DEAL. A sheet is `onDelete: "cascade"` — the deal
  // owns it — but nothing attached one until this increment, so a deal reported
  // no sheets and deleting it left both behind.
  {
    const withSheets = await readEngagementView(studio.id, engId);
    ok("...and both sheets join the deal the project belongs to",
      (opened.sheets || []).every((s) => (withSheets?.members.sheet || []).includes(s.id)),
      JSON.stringify(withSheets?.members.sheet));
  }

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

  // --------------------------------------------------------------------------
  // ENGAGEMENTS VIEW (Task 6): listEngagements / engagementBlock / the safety
  // property. Reuses THIS chain rather than seeding a second one — it is
  // already ticket -> rfq -> quotation -> project, with `engId` deterministic
  // off the ticket, so nothing here re-runs the approval/PO ceremony above.
  //
  // An invoice, raised on the PROJECT and attached by createInvoice's own
  // dual-write. This used to seed the membership by hand through
  // attachToTicketEngagement, with a comment saying the write "will" exist —
  // it does now, so the read layer below is proved against the shape the
  // shipped create path actually produces rather than one this file built.
  const fin = await financeContext(owner, slug);
  const invoiceMade = await createInvoice(fin, {
    projectId: opened.project?.id, clientName: "Acme",
    lines: [{ description: "Deposit", qty: 1, unitPrice: 500 }],
  });
  ok("an invoice can be raised against the chain", !!invoiceMade.invoice, JSON.stringify(invoiceMade.error));
  // THE DEFECT THIS INCREMENT CLOSED: an invoice raised on a project was never
  // attached to anything, so the deal it billed did not contain it.
  ok("...and raising it on a project puts it IN the deal, with nothing told to attach it",
    (await readEngagementView(studio.id, engId))?.members.invoice?.includes(invoiceMade.invoice?.id),
    JSON.stringify((await readEngagementView(studio.id, engId))?.members));

  const ownerAccess = (await studioContext(owner, slug)).access;

  // ---- listEngagements ------------------------------------------------------
  const list = await listEngagements({ studio, access: ownerAccess });
  ok("listEngagements does not refuse the owner", !list.error, JSON.stringify(list.error));
  const engRow = list.engagements?.find((e) => e.id === engId);
  ok("the chain's engagement is listed", !!engRow, JSON.stringify(list.engagements?.map((e) => e.id)));
  ok("...naming the client and title", engRow?.clientName === "Acme" && engRow?.title === "Carry the handler",
    JSON.stringify(engRow));
  ok("...with every stage this reader (the owner) may see",
    ["ticket", "rfq", "quotation", "project", "invoice"].every((t) => (engRow?.stages || []).includes(t)),
    JSON.stringify(engRow?.stages));

  // A second, bare engagement — just a ticket, no chain behind it — created
  // AFTER the one above, to prove the list actually orders by recency rather
  // than by insertion into the index or by id.
  const laterTicket = await createTicket(sales, {
    title: "A later deal", clientName: "Later Co", deadline: "2026-12-01",
    industry: "Technology", serviceIds: ["Integration"],
  });
  const laterEngId = await resolveDealId(studio.id, deterministicEngId("ticket", laterTicket.ticket.id));
  const listAfter = await listEngagements({ studio, access: ownerAccess });
  const idxLater = listAfter.engagements.findIndex((e) => e.id === laterEngId);
  const idxEarlier = listAfter.engagements.findIndex((e) => e.id === engId);
  ok("newest first: the just-created engagement sorts ahead of the older chain",
    idxLater > -1 && idxEarlier > -1 && idxLater < idxEarlier, JSON.stringify({ idxLater, idxEarlier }));

  // ---- engagementBlock -------------------------------------------------------
  const block = await engagementBlock({ studio, access: ownerAccess }, engId);
  ok("engagementBlock does not refuse the owner", !block.error, JSON.stringify(block.error));
  const cardsByType = Object.fromEntries((block.engagement?.cards || []).map((c) => [c.type, c]));
  ok("a present stage carries a ref and a summary", cardsByType.ticket?.present === true && !!cardsByType.ticket.ref,
    JSON.stringify(cardsByType.ticket));
  ok("...the invoice too, once attached", cardsByType.invoice?.present === true, JSON.stringify(cardsByType.invoice));
  // contract/payment are stages Template A LISTS and this chain never had — the
  // fixture never signed one or took one — so they are the ones that prove
  // "does not exist yet" reads as an optional next step (present:false) rather
  // than as an error or a gap.
  //
  // THIS USED TO ASSERT ON bill/asset, and they are the wrong witnesses now
  // that the block is template-driven: neither is in Template A, so the flow
  // does not invite them and no card is emitted at all. Swapping them for two
  // stages the flow actually walks keeps the guard testing what it was written
  // to test rather than quietly testing nothing.
  ok("a stage the chain never had reads present:false, not absent",
    cardsByType.contract?.present === false && cardsByType.contract?.count === 0
    && cardsByType.payment?.present === false && cardsByType.payment?.count === 0,
    JSON.stringify({ contract: cardsByType.contract, payment: cardsByType.payment }));

  // THE THIRD CASE, which only exists now that the template decides the list. A
  // withheld stage is absent; a visible in-flow stage the deal lacks is an
  // invitation; and a visible stage the FLOW does not use is absent too. The
  // owner holds every right, so bill and asset are withheld from nobody here —
  // they are simply not part of a contracting project, and a screen that
  // offered to raise one would be inviting work the flow has no place for.
  ok("a stage this flow does not use is not offered, even to a reader who could see it",
    !cardsByType.bill && !cardsByType.asset,
    JSON.stringify(Object.keys(cardsByType)));
  ok("...and the cards are in the flow's order, not the registry's",
    (block.engagement?.cards || []).filter((c) => !c.offTemplate).map((c) => c.type).join(",")
      === ["ticket", "rfq", "quotation", "contract", "project", "sheet", "order", "delivery",
           "job", "timesheet", "change_order", "inspection", "invoice", "payment"].join(","),
    JSON.stringify((block.engagement?.cards || []).map((c) => c.type)));
  ok("...and the deal names the flow it walks",
    block.engagement?.templateId === "A" && !!block.engagement?.templateName,
    JSON.stringify({ id: block.engagement?.templateId, name: block.engagement?.templateName }));

  // ---- Task 3 (client-belongs-to-the-engagement): the client's name is
  // resolved LIVE at read time, never from a copy on the engagement root.
  // Rename the Client record, with NO engagement write in between, and
  // prove both readers see the NEW name — the property that a write-time
  // copy would fail silently (the stored clientName would just go stale,
  // and nothing here would notice unless it were asserted this way).
  const renamed = await editClient(sales, made.ticket.clientId, { name: "Acme Renamed" });
  ok("the client record itself is renamed", renamed.client?.name === "Acme Renamed",
    JSON.stringify(renamed.error || renamed));

  const listAfterRename = await listEngagements({ studio, access: ownerAccess });
  const engRowRenamed = listAfterRename.engagements?.find((e) => e.id === engId);
  ok("listEngagements reports the client's CURRENT name after the rename, no engagement write in between",
    engRowRenamed?.clientName === "Acme Renamed", JSON.stringify(engRowRenamed));

  const blockAfterRename = await engagementBlock({ studio, access: ownerAccess }, engId);
  ok("engagementBlock reports the current name too — read-time resolution, not a write-time copy",
    blockAfterRename.engagement?.context?.clientName === "Acme Renamed",
    JSON.stringify(blockAfterRename.engagement?.context));

  // ---- the safety property ---------------------------------------------------
  // A collaborator holding engagements.view and a Sales right, but explicitly
  // NOT finance.cash.view: the invoice must not surface anywhere in the
  // payload — not a card, not a ref, not a summary. The whole TYPE is
  // withheld, never blanked (spec §4, "What each person sees inside").
  const salesRole = await createRole(studio.id, {
    name: `Engager ${rand()}`,
    // crmSales.quotations.view IS DELIBERATE, and it is what makes the last
    // assertion in this block possible: it is the right that governs the
    // `contract` stage, which Template A lists and this deal does not have. The
    // role previously leaned on `bill` for that, and `bill` is not in Template A
    // at all — so once the block became template-driven there was no stage this
    // reader could see, was entitled to, and was still waiting for.
    permissions: [
      "engagements.view", "crmSales.tickets.view", "crmSales.quotations.view",
      "finance.payables.view",
    ],
  });
  const engager = await person("Engager", null);
  await updateCollaborator(studio.id, engager.collaborator.id, { roleIds: [salesRole.id] });
  const engagerAccess = (await studioContext(engager.user, slug)).access;
  ok("the fixture role really does hold crmSales.tickets.view but not finance.cash.view",
    engagerAccess.has("crmSales.tickets.view") && !engagerAccess.has("finance.cash.view"),
    JSON.stringify([...engagerAccess]));

  const engagerList = await listEngagements({ studio, access: engagerAccess });
  const engagerRow = engagerList.engagements?.find((e) => e.id === engId);
  ok("this reader still sees the engagement — they hold a stage right on it",
    !!engagerRow, JSON.stringify(engagerRow));
  ok("...but its visible stages name no invoice", !(engagerRow?.stages || []).includes("invoice"),
    JSON.stringify(engagerRow?.stages));

  const engagerBlock = await engagementBlock({ studio, access: engagerAccess }, engId);
  const engagerCards = engagerBlock.engagement?.cards || [];
  ok("no card of type invoice reaches this reader",
    !engagerCards.some((c) => c.type === "invoice"), JSON.stringify(engagerCards.map((c) => c.type)));
  const serialised = JSON.stringify(engagerBlock);
  ok("...and the invoice's own reference is nowhere in the serialised body",
    !serialised.includes(invoiceMade.invoice.reference), serialised);
  // A visible-but-absent stage (contract) still renders as the optional next
  // step here too — withholding a whole type must not also break that.
  ok("...while a visible-but-absent stage still reads present:false",
    engagerCards.find((c) => c.type === "contract")?.present === false, JSON.stringify(engagerCards));
  // And the withheld type is absent for the RIGHT reason. `bill` is missing
  // from this payload too, but because Template A does not use it rather than
  // because it was withheld — so it proves nothing about withholding, which is
  // exactly why the assertion above no longer rests on it.
  ok("the withheld invoice and the off-flow bill are both absent, and only one of them is a permission decision",
    !engagerCards.some((c) => c.type === "invoice") && !engagerCards.some((c) => c.type === "bill")
    && engagerAccess.has("finance.payables.view"),
    JSON.stringify(engagerCards.map((c) => c.type)));

  // ---- C-1: the block's `context` must not leak the ticket's private fields -
  // A reader who holds engagements.view plus a Finance stage right (NOT
  // sales.tickets.view, NOT any Sales right at all) still opens this block —
  // it holds finance.cash.view, which is what makes the attached invoice
  // present-and-visible above. Before the fix, engagementBlock returned
  // root.context VERBATIM: nine ticket-sourced fields including contact.name
  // and the full site address, none of which this screen renders and none of
  // which a Finance-only reader could reach any other way. `made.ticket` was
  // seeded above with a real contactName and location specifically so this
  // assertion has something to catch — a blank field proves nothing.
  const financeOnlyRole = await createRole(studio.id, {
    name: `Finance-only ${rand()}`,
    permissions: ["engagements.view", "finance.cash.view"],
  });
  const financeOnly = await person("FinanceOnly", null);
  await updateCollaborator(studio.id, financeOnly.collaborator.id, { roleIds: [financeOnlyRole.id] });
  const financeOnlyAccess = (await studioContext(financeOnly.user, slug)).access;
  ok("the fixture role really does hold finance.cash.view but not crmSales.tickets.view",
    financeOnlyAccess.has("finance.cash.view") && !financeOnlyAccess.has("crmSales.tickets.view"),
    JSON.stringify([...financeOnlyAccess]));

  const financeOnlyBlock = await engagementBlock({ studio, access: financeOnlyAccess }, engId);
  ok("a Finance-only reader still opens the block — they hold a stage right on it (the invoice)",
    !financeOnlyBlock.error, JSON.stringify(financeOnlyBlock.error));
  const leakSerialised = JSON.stringify(financeOnlyBlock);
  ok("...but the serialised payload names neither the ticket's contact",
    !leakSerialised.includes("Priya Shenoy"), leakSerialised);
  ok("...nor any field of its site",
    !leakSerialised.includes("Acme HQ") && !leakSerialised.includes("Austin") && !leakSerialised.includes("acme.example"),
    leakSerialised);
  ok("...context is projected to just clientName + title, not passed through",
    Object.keys(financeOnlyBlock.engagement?.context || {}).sort().join(",") === "clientName,title",
    JSON.stringify(financeOnlyBlock.engagement?.context));

  // ---- refused outright: neither engagements.view nor any stage right --------
  const nobodyAccess = (await studioContext(nobody.user, slug)).access;
  const nobodyList = await listEngagements({ studio, access: nobodyAccess });
  ok("no engagements.view and no stage right -> refused outright, not an empty list",
    nobodyList.error === "forbidden", JSON.stringify(nobodyList));
  const nobodyBlock = await engagementBlock({ studio, access: nobodyAccess }, engId);
  ok("...the same refusal on the block route", nobodyBlock.error === "forbidden", JSON.stringify(nobodyBlock));
}

// ============================================================================
console.log("\n== one function finds a client and folds in what a deal knows about them");
// resolveClientFor (src/modules/sales/salesClients.ts) is the find-or-create-
// then-fold block that used to live inline in createTicket — extracted so the
// quotation path (Task 2 of the client-belongs-to-the-engagement plan) can run
// through the identical logic instead of a second copy. createTicket's own
// coverage above already proves the wiring stayed intact; this proves the
// helper's contract directly, against the helper.
{
  const sales = await salesContext(owner, slug);
  ok("owner can open Sales", !sales.error, sales.error);
  const scope = { studio: sales.studio, section: sales.clientsSection };
  const name = `Helper Co ${rand()}`;

  const created = await resolveClientFor(scope, {
    clientName: name, industry: "Technology",
    contact: { name: "Alex Rivera", email: "alex@helperco.example", phone: "555-0100", position: "Buyer" },
    site: { name: "HQ", country: "US", city: "Reno", url: "https://helperco.example" },
    collaboratorId: sales.collaborator.id,
  });
  ok("an unknown name creates a client whose code is the slug",
    !!created && created.code === clientSlug(name), JSON.stringify(created));
  ok("...with the contact folded in",
    created?.contacts?.some((c) => c.name === "Alex Rivera" && c.email === "alex@helperco.example"),
    JSON.stringify(created?.contacts));
  ok("...and the site folded in",
    created?.locations?.some((l) => l.name === "HQ" && l.city === "Reno"),
    JSON.stringify(created?.locations));

  const rowsAfterFirst = await readCol(studio.id, sales.clientsSection.id, "salesClients");
  ok("exactly one client row exists for this name",
    rowsAfterFirst.filter((c) => c.name === name).length === 1,
    JSON.stringify(rowsAfterFirst.map((c) => c.name)));

  // Same name, different case: matches the existing row (not a second one),
  // and folding the SAME contact again does not duplicate it.
  const again = await resolveClientFor(scope, {
    clientName: name.toUpperCase(), industry: "Technology",
    contact: { name: "Alex Rivera", email: "", phone: "", position: "" },
    site: { name: "", country: "", city: "", url: "" },
    collaboratorId: sales.collaborator.id,
  });
  ok("the same name in a different case matches the existing client, not a new one",
    again?.id === created?.id, JSON.stringify({ again: again?.id, created: created?.id }));

  const rowsAfterSecond = await readCol(studio.id, sales.clientsSection.id, "salesClients");
  ok("...so the row count for this client is still exactly one",
    rowsAfterSecond.filter((c) => normaliseClientName(c.name) === normaliseClientName(name)).length === 1,
    JSON.stringify(rowsAfterSecond.map((c) => c.name)));
  ok("folding the same contact again does not duplicate it",
    again?.contacts?.filter((c) => c.name === "Alex Rivera").length === 1,
    JSON.stringify(again?.contacts));

  ok("no other field of the client row was disturbed by the second fold",
    again?.industry === created?.industry && again?.code === created?.code
    && again?.website === created?.website && again?.notes === created?.notes
    && again?.createdByCollaboratorId === created?.createdByCollaboratorId
    && again?.createdAt === created?.createdAt,
    JSON.stringify({ again, created }));

  // An explicit id with no name resolves to that row — the fall-back
  // createTicket has always relied on when a form carries an id but the name
  // field was left blank.
  const byId = await resolveClientFor(scope, {
    clientId: created.id, industry: "Technology",
    contact: { name: "", email: "", phone: "", position: "" },
    site: { name: "", country: "", city: "", url: "" },
    collaboratorId: sales.collaborator.id,
  });
  ok("an explicit id with no name resolves the same client", byId?.id === created.id, JSON.stringify(byId));

  // Neither a usable name nor a matching id: null — the condition createTicket
  // turns into { error: "client" }.
  const nothing = await resolveClientFor(scope, {
    clientName: "", clientId: "", industry: "Technology",
    contact: { name: "", email: "", phone: "", position: "" },
    site: { name: "", country: "", city: "", url: "" },
    collaboratorId: sales.collaborator.id,
  });
  ok("no usable name and no matching id resolves to null", nothing === null, JSON.stringify(nothing));
}

// ============================================================================
console.log("\n== a quotation captures the client the way a ticket does (Task 2, client-belongs-to-the-engagement)");
// createQuotation used to take clientId OR a typed clientName, mutually
// exclusive, and the free-text branch never touched Sales at all — that is
// what left "Project Home Invasion" with a blank client: its quotation had
// only a name typed in, never a real Client record. The whole client block
// now runs through resolveClientFor, exactly as createTicket's does, so an
// internal quotation always resolves to a real Client row.
{
  const tech = await technicalContext(owner, slug);
  const sequence = (tech.sequences || [])[0];
  ok("a default sequence exists to create against", Boolean(sequence), JSON.stringify(tech.sequences));

  const clientName = `Quote Client ${rand()}`;
  const first = await createQuotation(tech, {
    sequenceId: sequence?.id, clientName,
    contactName: "Priya Shah", contactPosition: "Facilities Manager",
    contactEmail: "priya@quoteclient.example", contactPhone: "555-0177",
    location: { name: "Main Site", country: "US", city: "Austin", url: "https://quoteclient.example/site" },
    title: "Full client block", industry: "Technology", deadline: "2026-12-01",
    description: "Captured the way a ticket does.",
  });
  ok("the quotation comes back carrying a real clientId",
    !!first.quotation?.clientId, JSON.stringify(first.error || first.quotation));

  const clients = await readCol(studio.id, tech.salesClientsSection.id, "salesClients");
  const client = clients.find((c) => c.id === first.quotation?.clientId);
  ok("a Client record exists with that name", client?.name === clientName, JSON.stringify(client));
  ok("...its contacts hold the contact",
    client?.contacts?.some((c) => c.name === "Priya Shah" && c.email === "priya@quoteclient.example"),
    JSON.stringify(client?.contacts));
  ok("...and its locations hold the site",
    client?.locations?.some((l) => l.name === "Main Site" && l.city === "Austin"),
    JSON.stringify(client?.locations));

  const second = await createQuotation(tech, {
    sequenceId: sequence?.id, clientName,
    title: "Second one, same client", industry: "Technology", deadline: "2026-12-15",
    description: "Reuses the client rather than duplicating it.",
  });
  ok("a second internal quotation for the same client name reuses that client, not a new one",
    !!second.quotation && second.quotation.clientId === first.quotation.clientId,
    JSON.stringify(second.error || second.quotation));

  const clientsAfter = await readCol(studio.id, tech.salesClientsSection.id, "salesClients");
  ok("...so there is still exactly one client row for this name",
    clientsAfter.filter((c) => c.name === clientName).length === 1,
    JSON.stringify(clientsAfter.map((c) => c.name)));
}

// ============================================================================
console.log("\n== engagement on-create (Phase 1b-ii, Task 3b): an internal quotation");
// dual-write: a quotation raised straight from the Quotations screen — no
// ticketId behind it — mints its OWN engagement, the backfill's orphan-
// quotation path reused so a live one and a backfilled one land on the same
// deterministic id. It must NOT attach to any ticket engagement, because there
// is no ticket behind it.
{
  const tech = await technicalContext(owner, slug);
  const sequence = (tech.sequences || [])[0];
  ok("a default sequence exists to create against", Boolean(sequence), JSON.stringify(tech.sequences));

  const madeInternal = await createQuotation(tech, {
    sequenceId: sequence?.id, clientName: "Internal Co",
    title: "Straight from Quotations", industry: "Technology", deadline: "2026-12-01",
    description: "No RFQ behind this one.",
  });
  ok("an internal quotation can be raised with no ticket behind it",
    !!madeInternal.quotation, JSON.stringify(madeInternal.error));

  // Resolved through the alias (deal-aliases Task 3): createQuotation's mint
  // leaves this derivation pointing at the deal, not naming it.
  const ownEngId = await resolveDealId(studio.id, deterministicEngId("quotation", madeInternal.quotation?.id));
  const ownView = await readEngagementView(studio.id, ownEngId);
  ok("createQuotation mints the quotation's own engagement",
    !!ownView?.members.quotation?.includes(madeInternal.quotation?.id), JSON.stringify(ownView));
}

// ============================================================================
console.log("\n== a project opened from a quotation knows whose work it is (Task 4, client-belongs-to-the-engagement)");
// THE DEFECT, confirmed on live data: "Project Home Invasion" has clientId ""
// and clientName "" — its quotation is INTERNAL (no ticketId), and openProject
// asked ticketFacts(quote.ticketId) for the client, which is blank whenever
// there is no ticket. Separately, it attached via attachToTicketEngagement
// with an empty ticketId, which resolves to a non-existent engagement,
// throws "no-engagement" inside claimSingleton, and the guarded catch
// swallowed it — so the project never joined ANY engagement.
{
  const tech = await technicalContext(owner, slug);
  const sequence = (tech.sequences || [])[0];

  const clientName = `Project Client ${rand()}`;
  const internal = await createQuotation(tech, {
    sequenceId: sequence?.id, clientName,
    contactName: "Dana Reyes", contactPosition: "Ops Lead",
    contactEmail: "dana@projectclient.example", contactPhone: "555-0199",
    location: { name: "HQ", country: "US", city: "Denver", url: "https://projectclient.example" },
    title: "Home Invasion, this time with a client", industry: "Technology", deadline: "2026-12-01",
    description: "An internal quotation, opened straight into a project.",
  });
  ok("an internal quotation can be raised with a full client block",
    !!internal.quotation?.clientId, JSON.stringify(internal.error || internal.quotation));

  // The commercial gate asks the approval TASK first and the stored status
  // second (quotationApproved) — a hand-set Approved status still counts, and
  // is the simplest way to approve a quotation with no ticket-approval task
  // behind it at all.
  const approved = await updateQuotation(tech, internal.quotation?.id, { status: "Approved" });
  ok("the internal quotation can be approved directly", approved.quotation?.status === "Approved",
    JSON.stringify(approved.error));

  const proj = await projectsContext(owner, slug);
  const openedInternal = await openProject(proj, { quotationId: internal.quotation?.id });
  ok("a project opens from an approved internal quotation",
    !!openedInternal.project, JSON.stringify(openedInternal.error));

  // (a) THE CLIENT COMES FROM THE ENGAGEMENT, NOT FROM ticketFacts — this is
  // the bug fix itself. Before it, both fields were blank.
  ok("...and carries the quotation's client, not a blank one",
    openedInternal.project?.clientId === internal.quotation?.clientId
    && openedInternal.project?.clientName === clientName,
    JSON.stringify({ clientId: openedInternal.project?.clientId, clientName: openedInternal.project?.clientName }));

  // (b) THE ENGAGEMENT IS THE QUOTATION'S OWN — deterministicEngId("quotation",
  // quotationId), the same root createQuotation minted — with the project as
  // its PROJECT singleton and the quotation recorded as approved. Before this
  // fix, attachToTicketEngagement(..., ticketId: "") threw inside
  // claimSingleton and the project joined nothing.
  // Resolved through the alias (deal-aliases Task 3): createQuotation's mint
  // leaves this derivation pointing at the deal, not naming it.
  const quoteEngId = await resolveDealId(studio.id, deterministicEngId("quotation", internal.quotation?.id));
  const quoteEngView = await readEngagementView(studio.id, quoteEngId);
  ok("the project joins the quotation's OWN engagement as its PROJECT singleton",
    quoteEngView?.singletons.project === openedInternal.project?.id, JSON.stringify(quoteEngView?.singletons));
  ok("...and that engagement records the approved quotation",
    quoteEngView?.singletons.approvedQuotation === internal.quotation?.id, JSON.stringify(quoteEngView?.singletons));

  // (c) REGRESSION GUARD — the ticket-headed path is unchanged: the same
  // engagement, the same client, resolved as before ("the handler is carried,
  // never copied" block, above, asserts the equivalent for a ticket-born
  // project — this reasserts it did not regress under the new client-resolving
  // code path).
  const svcRegressionName = `Regression ${rand()}`;
  // Seeded before the context resolves — see the note on the same pattern
  // above ("the handler is carried, never copied").
  await updateStudio(studio.id, { serviceActions: [svcRegressionName] });
  const salesForRegression = await salesContext(owner, slug);
  const ticketMade = await createTicket(salesForRegression, {
    title: "Ticket-headed path stays put", clientName: `Ticket Client ${rand()}`, deadline: "2026-12-01",
    industry: "Technology", serviceIds: [svcRegressionName],
  });
  // Resolved through the alias (deal-aliases Task 3): the ticket's mint leaves
  // this derivation pointing at the deal, not naming it.
  const ticketEngId = await resolveDealId(studio.id, deterministicEngId("ticket", ticketMade.ticket?.id));
  const rfqMade = await requestTicketRfq(salesForRegression, { ticketId: ticketMade.ticket?.id });
  const techForRegression = await technicalContext(owner, slug);
  const convMade = await convertRfq(techForRegression, { rfqId: rfqMade.rfq?.id });
  await updateQuotation(techForRegression, convMade.quotation?.id, { status: "Approved" });

  const projForRegression = await projectsContext(owner, slug);
  const openedTicketHeaded = await openProject(projForRegression, { quotationId: convMade.quotation?.id });
  ok("the ticket-headed path still opens a project", !!openedTicketHeaded.project,
    JSON.stringify(openedTicketHeaded.error));
  ok("...with the same client the ticket has",
    openedTicketHeaded.project?.clientId === ticketMade.ticket?.clientId
    && openedTicketHeaded.project?.clientName === ticketMade.ticket?.clientName,
    JSON.stringify({ p: openedTicketHeaded.project?.clientId, t: ticketMade.ticket?.clientId }));
  const ticketEngView = await readEngagementView(studio.id, ticketEngId);
  ok("...and the same engagement — the TICKET's, not a quotation-headed one",
    ticketEngView?.singletons.project === openedTicketHeaded.project?.id, JSON.stringify(ticketEngView?.singletons));

  // (d) THE FALLBACK (routed 28/08/2026, after this task first landed): sourcing
  // the client ONLY from the engagement reintroduced the same defect in a
  // narrower shape — a ticket whose engagement root never landed (createTicket's
  // dual-write is best-effort and swallows on failure; see attachTicketEngagement)
  // and has not yet been healed by the backfill/reconcile job would blank the
  // project's client rather than reading it off the ticket that is right there.
  // openProject now falls back to ticketFacts ONLY when the engagement answered
  // nothing AND a ticket exists to ask — never for an internal quotation, which
  // has no ticket to fall back to and does not need one (createQuotation already
  // guarantees its own engagement carries a real client).
  //
  // Built honestly: a real ticket -> RFQ -> quotation -> approval, then the
  // engagement ROOT KEY ITSELF deleted before opening the project — the exact
  // condition a missed dual-write leaves behind, not a faked code path. The
  // rfq/quotation attaches that follow do not depend on the root existing (only
  // a SINGLETON claim does, and neither of those is one), so they succeed same
  // as always and leave the engagement genuinely rootless, the way a swallowed
  // failure in attachTicketEngagement would.
  const svcFallbackName = `Fallback ${rand()}`;
  await updateStudio(studio.id, { serviceActions: [svcFallbackName] });
  const salesForFallback = await salesContext(owner, slug);
  const ticketFallback = await createTicket(salesForFallback, {
    title: "Engagement root never landed", clientName: `Fallback Client ${rand()}`, deadline: "2026-12-01",
    industry: "Technology", serviceIds: [svcFallbackName],
  });
  // Resolved through the alias (deal-aliases Task 3) to the minted deal — and
  // deliberately still the MINTED id after this: deleting its root below is
  // simulating a dual-write that landed the mint (and its alias) but crashed
  // before the root document was written, which is a truer shape of "never
  // landed" than deleting a key nothing points at.
  const fallbackEngId = await resolveDealId(studio.id, deterministicEngId("ticket", ticketFallback.ticket?.id));
  ok("the ticket's engagement exists before it is deliberately removed",
    !!(await readEngagementView(studio.id, fallbackEngId)), fallbackEngId);
  await delKeys(KEYS.ENG.root(studio.id, fallbackEngId));
  ok("...and is genuinely gone now, not a faked code path",
    !(await readEngagementView(studio.id, fallbackEngId)), fallbackEngId);

  const rfqFallback = await requestTicketRfq(salesForFallback, { ticketId: ticketFallback.ticket?.id });
  ok("an RFQ can still be raised with no engagement root behind the ticket",
    !!rfqFallback.rfq, JSON.stringify(rfqFallback.error));
  const techForFallback = await technicalContext(owner, slug);
  const convFallback = await convertRfq(techForFallback, { rfqId: rfqFallback.rfq?.id });
  await updateQuotation(techForFallback, convFallback.quotation?.id, { status: "Approved" });

  const projForFallback = await projectsContext(owner, slug);
  const openedFallback = await openProject(projForFallback, { quotationId: convFallback.quotation?.id });
  ok("a project still opens when its ticket's engagement root is missing",
    !!openedFallback.project, JSON.stringify(openedFallback.error));
  ok("...and falls back to the ticket for its client instead of going blank",
    !!openedFallback.project?.clientId
    && openedFallback.project?.clientId === ticketFallback.ticket?.clientId
    && openedFallback.project?.clientName === ticketFallback.ticket?.clientName,
    JSON.stringify({ clientId: openedFallback.project?.clientId, clientName: openedFallback.project?.clientName,
                     ticketClientId: ticketFallback.ticket?.clientId }));
}

// ============================================================================
console.log("\n== the picker one screen before openProject names an internal quotation's client (F4, engagement-client-source)");
// THE SURVIVING HALF OF THE SAME DEFECT: openProject reads the client
// correctly once a quotation is CHOSEN (the block above), but approvedQuotations
// is what the "open a project" picker lists BEFORE that — and it was still
// mapping clientName off ticketFacts(q.ticketId), which is the NO_TICKET
// sentinel (blank) for every internal quotation. A user picked an approved
// internal quotation whose client column was empty and the project that
// opened carried whatever the fallback happened to be. Fixed the same way
// listQuotations resolves an internal quotation's name (technical.ts): LIVE
// off Sales' own Client record via ticketFacts' clientsById, stored
// clientName only as the free-text fallback.
{
  const tech = await technicalContext(owner, slug);
  const sequence = (tech.sequences || [])[0];

  const clientName = `Picker Client ${rand()}`;
  const madePicker = await createQuotation(tech, {
    sequenceId: sequence?.id, clientName,
    title: "Picker names its client", industry: "Technology", deadline: "2026-12-01",
    description: "An internal quotation, checked from the picker before it is opened.",
  });
  ok("an internal quotation can be raised for the picker check",
    !!madePicker.quotation?.clientId, JSON.stringify(madePicker.error || madePicker.quotation));

  await updateQuotation(tech, madePicker.quotation?.id, { status: "Approved" });

  const proj = await projectsContext(owner, slug);
  const picked = await approvedQuotations(proj);
  const pickerRow = picked.find((q) => q.id === madePicker.quotation?.id);
  ok("the picker lists the approved internal quotation with its client's real name, not blank",
    pickerRow?.clientName === clientName, JSON.stringify(pickerRow));

  // LIVE, NOT A COPY: rename the Client record with no write to the
  // quotation in between — a stored-name read would still show the old
  // name here and nothing would notice.
  const salesForPicker = await salesContext(owner, slug);
  const renamedPickerClient = await editClient(salesForPicker, madePicker.quotation?.clientId, { name: "Picker Client Renamed" });
  ok("the picker client is renamed", renamedPickerClient.client?.name === "Picker Client Renamed",
    JSON.stringify(renamedPickerClient.error || renamedPickerClient));

  const pickedAfterRename = await approvedQuotations(proj);
  const pickerRowAfterRename = pickedAfterRename.find((q) => q.id === madePicker.quotation?.id);
  ok("...and the picker shows the renamed name — resolved live, not from a copy",
    pickerRowAfterRename?.clientName === "Picker Client Renamed", JSON.stringify(pickerRowAfterRename));

  // REGRESSION GUARD — a ticket-headed approved quotation still shows its
  // client in the picker, exactly as before this fix (that path was never
  // broken; only the internal-quotation branch above was).
  const svcPickerTicketName = `Picker Ticket ${rand()}`;
  await updateStudio(studio.id, { serviceActions: [svcPickerTicketName] });
  const salesForPickerTicket = await salesContext(owner, slug);
  const pickerTicket = await createTicket(salesForPickerTicket, {
    title: "Ticket-headed picker row", clientName: `Picker Ticket Client ${rand()}`, deadline: "2026-12-01",
    industry: "Technology", serviceIds: [svcPickerTicketName],
  });
  const pickerRfq = await requestTicketRfq(salesForPickerTicket, { ticketId: pickerTicket.ticket?.id });
  const techForPickerTicket = await technicalContext(owner, slug);
  const pickerConv = await convertRfq(techForPickerTicket, { rfqId: pickerRfq.rfq?.id });
  await updateQuotation(techForPickerTicket, pickerConv.quotation?.id, { status: "Approved" });

  const pickedTicketHeaded = await approvedQuotations(proj);
  const pickerTicketRow = pickedTicketHeaded.find((q) => q.id === pickerConv.quotation?.id);
  ok("...and a ticket-headed approved quotation still shows its client in the picker",
    pickerTicketRow?.clientName === pickerTicket.ticket?.clientName, JSON.stringify(pickerTicketRow));
}

// ============================================================================
console.log("\n== CI proves a quotation-born deal carries its client (Task 5, client-belongs-to-the-engagement)");
// THE WHOLE CHAIN, END TO END, ON LIVE'S OWN SHAPE — not a synthetic fixture.
// "Project Home Invasion" (pro_mt9pi5hjdjgsla) is a project with clientId ""
// opened from Q-0002, an INTERNAL quotation (no ticket) whose OWN clientId
// pointed at a real Client ("Abdullah Abu Hamad") that nothing downstream ever
// reached. Tasks 1-4 fixed each link separately (the client block on
// createQuotation, the engagement's symmetric orphan-branch resolution, the
// project reading its client from the engagement); this block rebuilds that
// exact chain — internal quotation -> approve -> open project — and asserts
// every link at once, plus the live-resolution property that would have
// caught a write-time copy silently going stale.
{
  const tech = await technicalContext(owner, slug);
  const sequence = (tech.sequences || [])[0];
  ok("a default sequence exists to create against", Boolean(sequence), JSON.stringify(tech.sequences));

  const clientName = `Home Invasion Client ${rand()}`;
  const madeQuote = await createQuotation(tech, {
    sequenceId: sequence?.id, clientName,
    contactName: "Abdullah Abu Hamad", contactPosition: "Owner",
    contactEmail: "abdullah@homeinvasion.example", contactPhone: "555-0142",
    location: { name: "Site 1", country: "US", city: "Phoenix", url: "https://homeinvasion.example" },
    title: "Project Home Invasion", industry: "Technology", deadline: "2026-12-01",
    description: "The exact chain that broke on live, rebuilt to prove it stays fixed.",
  });
  ok("the internal quotation resolves a real clientId",
    !!madeQuote.quotation?.clientId, JSON.stringify(madeQuote.error || madeQuote.quotation));

  const approvedQuote = await updateQuotation(tech, madeQuote.quotation?.id, { status: "Approved" });
  ok("the internal quotation approves directly (no ticket-approval task behind it)",
    approvedQuote.quotation?.status === "Approved", JSON.stringify(approvedQuote.error));

  const proj = await projectsContext(owner, slug);
  const openedQuote = await openProject(proj, { quotationId: madeQuote.quotation?.id });
  ok("a project opens from the approved internal quotation", !!openedQuote.project,
    JSON.stringify(openedQuote.error));

  // (1) THE PROJECT CARRIES THE CLIENT — this is the exact assertion that
  // would have failed for "Project Home Invasion" before Tasks 1-4.
  ok("the project carries the quotation's client, id and name both",
    openedQuote.project?.clientId === madeQuote.quotation?.clientId
    && openedQuote.project?.clientName === clientName,
    JSON.stringify({ clientId: openedQuote.project?.clientId, clientName: openedQuote.project?.clientName }));

  // (2) THE ENGAGEMENT IS THE QUOTATION'S OWN, with ticket left genuinely
  // null (never inherited, never guessed), the project claimed as the PROJECT
  // singleton, the approved quotation recorded, and the quotation itself among
  // the engagement's own members (createQuotation's dual-write, Phase 1b-ii).
  // Resolved through the alias (deal-aliases Task 3): createQuotation mints
  // its own deal now, and this derivation names it only by resolving.
  const chainEngId = await resolveDealId(studio.id, deterministicEngId("quotation", madeQuote.quotation?.id));
  const chainView = await readEngagementView(studio.id, chainEngId);
  ok("the derived id resolves to the deal the internal quotation minted", !!chainView, chainEngId);
  ok("...with no ticket — this deal never had one",
    chainView?.singletons.ticket === null, JSON.stringify(chainView?.singletons));
  ok("...the project claimed as the PROJECT singleton",
    chainView?.singletons.project === openedQuote.project?.id, JSON.stringify(chainView?.singletons));
  ok("...and the approved quotation recorded",
    chainView?.singletons.approvedQuotation === madeQuote.quotation?.id, JSON.stringify(chainView?.singletons));
  ok("...with the quotation itself among the engagement's members",
    !!chainView?.members.quotation?.includes(madeQuote.quotation?.id), JSON.stringify(chainView?.members));

  // (3) THE VIEW NAMES THE CLIENT — engagementBlock, the screen this whole
  // increment exists to feed, resolved through the same permission gate a
  // real reader hits.
  const chainAccess = (await studioContext(owner, slug)).access;
  const chainBlock = await engagementBlock({ studio, access: chainAccess }, chainEngId);
  ok("engagementBlock does not refuse the owner", !chainBlock.error, JSON.stringify(chainBlock.error));
  ok("...and names the client",
    chainBlock.engagement?.context?.clientName === clientName, JSON.stringify(chainBlock.engagement?.context));

  // (4) THE LIVE-RESOLUTION PROPERTY, on THIS chain rather than a synthetic
  // one: rename the Client record and re-read the block with NO write to the
  // engagement root in between — nothing here calls attachRecord, setApproved-
  // Quotation or any other engagement mutator between the rename and the
  // re-read. A write-time copy of the name would report the OLD name here and
  // nothing would notice; resolving live off the Client record is what makes
  // it impossible to go stale.
  const sales = await salesContext(owner, slug);
  const renamedClient = await editClient(sales, madeQuote.quotation?.clientId, { name: "Home Invasion Renamed" });
  ok("the client record is renamed", renamedClient.client?.name === "Home Invasion Renamed",
    JSON.stringify(renamedClient.error || renamedClient));

  const chainBlockAfterRename = await engagementBlock({ studio, access: chainAccess }, chainEngId);
  ok("engagementBlock reports the NEW name — resolved live, not a stale write-time copy",
    chainBlockAfterRename.engagement?.context?.clientName === "Home Invasion Renamed",
    JSON.stringify(chainBlockAfterRename.engagement?.context));
}

// ============================================================================
console.log("\n== deleting a record takes its engagement state with it");
// INVARIANT 11, THROUGH THE REAL DELETE VERBS. removeQuotation removed the row
// and nothing else; removeProject removed the row, the board and the plans and
// nothing else. Both left the engagement layer standing, so the deal kept
// pointing at rows that no longer existed: a Quotation card reading
// "present, 1" with a blank reference, and a `project` singleton naming a
// deleted project. Detach runs BEFORE the row goes — the recoverable direction,
// since a crash then leaves a real row with no engagement state, which the
// backfill heals, rather than engagement state nothing can heal.
{
  const tech = await technicalContext(owner, slug);
  const sequence = (tech.sequences || [])[0];
  const made = await createQuotation(tech, {
    sequenceId: sequence?.id, clientName: `Delete Path ${rand()}`,
    title: "Deleting this affects the deal", industry: "Technology", deadline: "2026-12-01",
    description: "Built to be deleted.",
  });
  ok("fixture: an internal quotation, with its own engagement", !!made.quotation,
    JSON.stringify(made.error));
  const quotationId = made.quotation?.id;
  // Resolved through the alias (deal-aliases Task 3): createQuotation mints
  // its own deal, and this derivation only names it by resolving.
  const engId = await resolveDealId(studio.id, deterministicEngId("quotation", quotationId));

  await updateQuotation(await technicalContext(owner, slug), quotationId, { status: "Approved" });
  const proj = await projectsContext(owner, slug);
  const opened = await openProject(proj, { quotationId });
  ok("fixture: a project opened from it", !!opened.project, JSON.stringify(opened.error));

  const before = await readEngagementView(studio.id, engId);
  ok("fixture: the deal holds the quotation, the approval and the project",
    before?.members.quotation?.includes(quotationId)
    && before?.singletons.approvedQuotation === quotationId
    && before?.singletons.project === opened.project?.id,
    JSON.stringify(before));

  // ---- the quotation goes -------------------------------------------------
  const goneQuote = await removeQuotation(await technicalContext(owner, slug), quotationId);
  ok("removeQuotation removes the row", goneQuote.ok === true, JSON.stringify(goneQuote));

  const afterQuote = await readEngagementView(studio.id, engId);
  ok("...and the quotation leaves the engagement's members",
    !afterQuote?.members.quotation?.includes(quotationId), JSON.stringify(afterQuote?.members));
  ok("...and the approvedQuotation pointer it filled is cleared",
    afterQuote?.singletons.approvedQuotation === null, JSON.stringify(afterQuote?.singletons));

  // THE USER-VISIBLE SYMPTOM, asserted where it was reported: the card.
  const access = (await studioContext(owner, slug)).access;
  const block = await engagementBlock({ studio, access }, engId);
  const quotationCard = (block.engagement?.cards || []).find((c) => c.type === "quotation");
  ok("...so the engagement card shows no phantom quotation stage",
    quotationCard?.present === false && quotationCard?.count === 0, JSON.stringify(quotationCard));

  // ---- the project goes ---------------------------------------------------
  const goneProject = await removeProject(await projectsContext(owner, slug), opened.project?.id);
  ok("removeProject removes the row", goneProject.ok === true, JSON.stringify(goneProject));

  const afterProject = await readEngagementView(studio.id, engId);
  ok("...and the deal's project singleton is cleared",
    afterProject?.singletons.project === null, JSON.stringify(afterProject?.singletons));
  ok("...and the engagement leaves eng-ix:has:project, its last project gone",
    !(await sMembers(KEYS.ENG.hasStage(studio.id, "project"))).includes(engId),
    KEYS.ENG.hasStage(studio.id, "project"));

  // Idempotent on re-run (invariant 11): deleting what is already deleted is a
  // "notfound", never a throw and never a second detach that damages anything.
  const again = await removeProject(await projectsContext(owner, slug), opened.project?.id);
  ok("...and a re-run is a clean notfound", again.error === "notfound", JSON.stringify(again));
}

// ============================================================================
console.log("\n== deleting a deal keeps the client it merely pointed at");
// THE USER'S RULE, END TO END ON REAL ROWS: "everything that is linked to it
// will be deleted EXCEPT IF THE INFORMATION IS CREATED ELSE WHERE."
//
// The Sales CLIENT is the case with consequences. An engagement's context NAMES
// a client; it does not own one, and every other deal for that client names the
// same row. A cascade that reached it would delete a customer because one of
// their jobs was cancelled. What keeps it safe is structural rather than
// remembered: a client is Tier B (spec §3.1) and is not in STAGE_REGISTRY at
// all, and the cascade walks the registry.
{
  const tech = await technicalContext(owner, slug);
  const sequence = (tech.sequences || [])[0];
  const clientName = `Survives Deletion ${rand()}`;
  const made = await createQuotation(tech, {
    sequenceId: sequence?.id, clientName,
    title: "This deal will be deleted", industry: "Technology", deadline: "2026-12-01",
    description: "The client must outlive it.",
  });
  ok("fixture: an internal quotation with a real client row", !!made.quotation?.clientId,
    JSON.stringify(made.error || made.quotation));
  const clientId = made.quotation?.clientId;
  // Resolved through the alias (deal-aliases Task 3): createQuotation mints
  // its own deal, and engagementImpact/removeEngagement/lockEngagement below
  // resolve it themselves now too — this must ask about the same one they do.
  const engId = await resolveDealId(studio.id, deterministicEngId("quotation", made.quotation?.id));

  const access = (await studioContext(owner, slug)).access;
  const engCtx = { studio, access };

  // (1) THE WARNING COMES FIRST, and it is the same answer the confirmation
  // dialog will show: what goes, and what stays.
  const impact = await engagementImpact(engCtx, engId);
  ok("the impact query names the deal", impact.impact?.id === engId, JSON.stringify(impact));
  ok("...and says the quotation would be deleted",
    (impact.impact?.deletes || []).some((d) => d.type === "quotation"), JSON.stringify(impact.impact?.deletes));
  ok("...and reports the deal as LOCKED, with no migration and no write to it",
    impact.impact?.locked === true, JSON.stringify(impact.impact?.locked));

  // (2) LOCKED REFUSES. The interlock is on by default for every engagement
  // that already exists, which is the whole reason `locked` defaults to true.
  const refusedDelete = await removeEngagement(engCtx, engId);
  ok("a locked deal refuses deletion", refusedDelete.error === "locked", JSON.stringify(refusedDelete));
  ok("...and its quotation is still there",
    (await listQuotations(await technicalContext(owner, slug))).some((q) => q.id === made.quotation?.id),
    "the row survives a refused delete");

  // (3) UNLOCK, THEN DELETE.
  const unlocked = await lockEngagement(engCtx, engId, false);
  ok("unlocking is its own act, behind its own right", unlocked.ok === true, JSON.stringify(unlocked));

  const gone = await removeEngagement(engCtx, engId);
  ok("an unlocked deal deletes", gone.ok === true, JSON.stringify(gone));
  ok("...and the quotation went with it",
    !(await listQuotations(await technicalContext(owner, slug))).some((q) => q.id === made.quotation?.id),
    JSON.stringify(gone.deleted));
  ok("...and the root is gone", (await readEngagement(studio.id, engId)) === null, engId);

  // (4) THE ASSERTION THIS BLOCK EXISTS FOR. The client row is still there and
  // still readable, because it was created elsewhere and other deals use it.
  const clientsAfter = await listClients(await salesContext(owner, slug));
  ok("THE CLIENT SURVIVES the deletion of the deal that pointed at it",
    clientsAfter.some((c) => c.id === clientId && c.name === clientName),
    JSON.stringify(clientsAfter.map((c) => c.name)));

  // (5) Re-running is a clean no-op, not a throw (invariant 11).
  const again = await removeEngagement(engCtx, engId);
  ok("...and re-running the delete is a clean notfound", again.error === "notfound", JSON.stringify(again));
}

// ============================================================================
console.log("\n== a project's children are in the deal, and leave it when they go");
// THE GAP THIS INCREMENT CLOSED, end to end on real rows. invoice, sheet,
// order, delivery, shipment and overtime are all `onDelete: "cascade"` — the
// deal owns them — and not one of their create verbs ever attached anything.
// They were registry members in name only: deleting a deal left its invoices
// standing, and the card under-reported the deal by every child raised on its
// project. The cascade was already correct; what was missing was the child
// being IN the deal for the cascade to reach.
{
  const tech = await technicalContext(owner, slug);
  const sequence = (tech.sequences || [])[0];
  const made = await createQuotation(tech, {
    sequenceId: sequence?.id, clientName: `Children Of The Deal ${rand()}`,
    title: "Its children belong to it", industry: "Technology", deadline: "2026-12-01",
    description: "Raised so it can be billed.",
  });
  ok("fixture: an internal quotation with its own engagement", !!made.quotation, JSON.stringify(made.error));
  const quotationId = made.quotation?.id;
  // Resolved through the alias (deal-aliases Task 3): createQuotation mints
  // its own deal, and this derivation only names it by resolving.
  const engId = await resolveDealId(studio.id, deterministicEngId("quotation", quotationId));
  await updateQuotation(await technicalContext(owner, slug), quotationId, { status: "Approved" });
  const opened = await openProject(await projectsContext(owner, slug), { quotationId });
  ok("fixture: a project opened on it", !!opened.project, JSON.stringify(opened.error));
  const projectId = opened.project?.id;

  const fin = await financeContext(owner, slug);
  const lines = [{ description: "Stage payment", qty: 1, unitPrice: 1000 }];
  const raised = await createInvoice(fin, { projectId, clientName: "Billed Co", lines });
  ok("an invoice raised on a project is created", !!raised.invoice, JSON.stringify(raised.error));
  ok("...and joins the deal that project belongs to, resolved from the project alone",
    (await readEngagementView(studio.id, engId))?.members.invoice?.includes(raised.invoice?.id),
    JSON.stringify((await readEngagementView(studio.id, engId))?.members));

  const access = (await studioContext(owner, slug)).access;
  const engCtx = { studio, access };
  const invoiceCard = ((await engagementBlock(engCtx, engId)).engagement?.cards || [])
    .find((c) => c.type === "invoice");
  ok("...and the engagement card counts it", invoiceCard?.present === true && invoiceCard?.count === 1,
    JSON.stringify(invoiceCard));

  // A RECORD WITH NO PROJECT HAS NO DEAL — a valid end state, not an error, and
  // deliberately not parked in __unassigned (a promotion holding pen, not a
  // home for something that never had a deal behind it).
  const loose = await createInvoice(fin, { clientName: "No Deal Co", lines });
  ok("an invoice raised with no project is still created", !!loose.invoice, JSON.stringify(loose.error));
  ok("...and joins no deal at all", (await engagementOf(studio.id, "invoice", loose.invoice?.id)) === null,
    JSON.stringify(await engagementOf(studio.id, "invoice", loose.invoice?.id)));

  // ---- the invoice is deleted on its own ----------------------------------
  const goneInvoice = await removeInvoice(await financeContext(owner, slug), raised.invoice?.id);
  ok("removeInvoice removes the row", goneInvoice.ok === true, JSON.stringify(goneInvoice));
  const afterInvoice = await readEngagementView(studio.id, engId);
  ok("...and the invoice leaves the deal's members",
    !(afterInvoice?.members.invoice || []).includes(raised.invoice?.id), JSON.stringify(afterInvoice?.members));
  ok("...while the rest of the deal is exactly as it was",
    afterInvoice?.singletons.project === projectId && (afterInvoice?.members.sheet || []).length === 2,
    JSON.stringify({ project: afterInvoice?.singletons.project, sheets: afterInvoice?.members.sheet }));

  // ---- the whole deal is deleted ------------------------------------------
  const second = await createInvoice(fin, { projectId, clientName: "Billed Co", lines });
  ok("fixture: a second invoice on the deal", !!second.invoice, JSON.stringify(second.error));
  await lockEngagement(engCtx, engId, false);
  const gone = await removeEngagement(engCtx, engId);
  ok("the unlocked deal deletes", gone.ok === true, JSON.stringify(gone));
  ok("DELETING THE DEAL DELETES THE INVOICE RAISED ON ITS PROJECT",
    !(await listInvoices(await financeContext(owner, slug))).some((i) => i.id === second.invoice?.id),
    JSON.stringify(gone.deleted));
  ok("...and names it among what it deleted",
    (gone.deleted || []).some((d) => d.type === "invoice" && d.id === second.invoice?.id),
    JSON.stringify(gone.deleted));
  ok("...and the invoice that belonged to no deal is untouched",
    (await listInvoices(await financeContext(owner, slug))).some((i) => i.id === loose.invoice?.id),
    "a record the deal never had cannot go with it");
}

// ============================================================================
console.log("\n== an RFQ tells the people who will quote it");
// The Sales to Technical handoff went quiet: a ticket moved to Opportunity and
// nobody downstream knew work was waiting. The handlers are resolved from the
// right to quote (technical.quotations.create), not a flag — the leave-approver
// shape — and the raiser is never told, since raising it is how they know.
{
  // Member holds no Technical right by default, so give it the Admin role for
  // this check — it is the second person who can quote, beside the owner who
  // raises — and hand it back after.
  await updateCollaborator(studio.id, member.collaborator.id, { roleIds: [ADMIN_ROLE_ID] });

  await updateStudio(studio.id, { serviceActions: ["Handoff"] });
  const salesOwner = await salesContext(owner, slug);
  const tk = await createTicket(salesOwner, {
    title: "Quote this", clientName: "Bell Co", deadline: "2026-12-01",
    industry: "Technology", serviceIds: ["Handoff"],
  });
  const asked = await requestTicketRfq(salesOwner, { ticketId: tk.ticket?.id });
  ok("an RFQ is raised", !!asked.rfq, JSON.stringify(asked.error));

  const memberNote = (await listForCollaborator(studio.id, member.collaborator.id))
    .find((n) => n.type === NOTIFY.rfqRaised);
  ok("a handler who can quote is told an RFQ is waiting", Boolean(memberNote), NOTIFY.rfqRaised);
  ok("...and the notice carries the RFQ reference", memberNote?.body === asked.rfq?.reference,
    JSON.stringify(memberNote?.body));
  ok("...and the raiser is not told",
    !(await listForCollaborator(studio.id, salesOwner.collaborator.id)).some((n) => n.type === NOTIFY.rfqRaised),
    "raising it is how they already know");

  await updateCollaborator(studio.id, member.collaborator.id, { roleIds: [roleId("Member")] });
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
  await updateStudio(studio.id, { serviceActions: ["Revisions"] });
  const sales = await salesContext(owner, slug);
  const made = await createTicket(sales, {
    title: "Revise the quotation", clientName: "Beta Works", deadline: "2026-12-01",
    industry: "Technology", serviceIds: ["Revisions"],
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
    overrides: { allow: ["administration.members.edit"], deny: [] },
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
console.log("\n== the ledger balances, because nothing unbalanced was let in");
// A double-entry book is only worth keeping if the trial balance is guaranteed,
// and it is guaranteed by refusing every entry whose debits do not equal its
// credits AT THE DOOR — so no report downstream ever has to cope with a book
// that does not balance. These prove the door, then prove the guarantee.
{
  const fin = await financeContext(owner, slug);

  // The chart seeds itself on first read — the ledger cannot post without one.
  const chart = await listAccounts(fin);
  ok("the chart of accounts seeds itself", (chart.accounts || []).length >= 16,
    JSON.stringify(chart.accounts?.length));
  ok("...idempotently — a second read adds nothing",
    (await listAccounts(fin)).accounts.length === chart.accounts.length,
    "seeded twice");
  const byCode = Object.fromEntries(chart.accounts.map((a) => [a.code, a.id]));
  const AR = byCode["1100"];      // Accounts Receivable (asset)
  const REV = byCode["4000"];     // Revenue (income)
  const VAT = byCode["2100"];     // VAT Payable (liability)
  const BANK = byCode["1010"];

  // A balanced sale: AR 115 debit = Revenue 100 credit + VAT 15 credit.
  const sale = await postEntry(fin, {
    memo: "Invoice INV-1", source: { kind: "invoice", id: "inv_x" },
    lines: [
      { accountId: AR, debit: 115 },
      { accountId: REV, credit: 100 },
      { accountId: VAT, credit: 15 },
    ],
  });
  ok("a balanced entry posts", !!sale.entry, JSON.stringify(sale.error ?? sale));
  ok("...and takes a reference from the counter", /^JE-\d+$/.test(sale.entry?.reference || ""),
    JSON.stringify(sale.entry?.reference));

  // The door: debits must equal credits.
  const bad = await postEntry(fin, {
    lines: [{ accountId: AR, debit: 100 }, { accountId: REV, credit: 90 }],
  });
  ok("an unbalanced entry is refused", bad.error === "unbalanced", JSON.stringify(bad));

  // The door: a line is a debit OR a credit, never both, never neither.
  const twoSided = await postEntry(fin, {
    lines: [{ accountId: AR, debit: 50, credit: 50 }, { accountId: REV, credit: 50 }],
  });
  ok("a line that is both a debit and a credit is refused", twoSided.error === "one-side", JSON.stringify(twoSided));
  const noneSided = await postEntry(fin, {
    lines: [{ accountId: AR, debit: 0, credit: 0 }, { accountId: REV, credit: 50 }],
  });
  ok("a line that is neither is refused too", noneSided.error === "one-side", JSON.stringify(noneSided));

  // The door: an unknown account cannot be posted against.
  const ghost = await postEntry(fin, {
    lines: [{ accountId: "acc_nope", debit: 10 }, { accountId: REV, credit: 10 }],
  });
  ok("a posting to an unknown account is refused", ghost.error === "account", JSON.stringify(ghost));

  // A second balanced entry: cash collection, Bank 115 debit = AR 115 credit.
  await postEntry(fin, {
    memo: "Payment", source: { kind: "payment" },
    lines: [{ accountId: BANK, debit: 115 }, { accountId: AR, credit: 115 }],
  });

  // THE GUARANTEE: the trial balance balances.
  const tb = await trialBalance(fin);
  ok("the trial balance's two columns are equal", tb.balanced === true,
    JSON.stringify({ d: tb.totalDebit, c: tb.totalCredit }));
  ok("...and it is not trivially empty", tb.totalDebit > 0, String(tb.totalDebit));
  // Revenue sits on its natural (credit) side with the 100 booked to it.
  const revRow = tb.rows.find((r) => r.code === "4000");
  ok("revenue shows a credit balance on its natural side",
    revRow?.credit === 100 && revRow?.normalSide === "credit", JSON.stringify(revRow));
  // AR was raised 115 then collected 115, so it nets to zero.
  const arRow = tb.rows.find((r) => r.code === "1100");
  ok("a raised-then-collected receivable nets to zero", arRow?.debit === 0 && arRow?.credit === 0,
    JSON.stringify(arRow));

  // REVERSAL is a mirror entry, not an edit or a delete.
  const rev = await reverseEntry(fin, sale.entry.id, "keyed to the wrong client");
  ok("an entry reverses into a mirror", !!rev.reversal, JSON.stringify(rev.error ?? rev));
  ok("...whose lines swap debit and credit",
    rev.reversal?.lines?.find((l) => l.accountId === AR)?.credit === 115,
    JSON.stringify(rev.reversal?.lines));
  ok("...tagged as a reversal of the original",
    rev.reversal?.reversalOfEntryId === sale.entry.id, JSON.stringify(rev.reversal?.source));

  // Reversing is a once-only correction.
  const twice = await reverseEntry(fin, sale.entry.id, "again");
  ok("an entry cannot be reversed twice", twice.error === "already-reversed", JSON.stringify(twice));
  const reverseAReversal = await reverseEntry(fin, rev.reversal.id, "no");
  ok("a reversal cannot itself be reversed", reverseAReversal.error === "is-a-reversal", JSON.stringify(reverseAReversal));

  // AND THE BOOK STILL BALANCES — the reversal and its original net to zero.
  const tb2 = await trialBalance(fin);
  ok("the book still balances after a reversal", tb2.balanced === true,
    JSON.stringify({ d: tb2.totalDebit, c: tb2.totalCredit }));
  const journal = await listJournal(fin);
  ok("the journal holds every posting, reversal included", journal.entries.length >= 3,
    String(journal.entries.length));

  // THE LEDGER IS GUARDED BY ITS SECTION, before any post/reverse right is even
  // consulted: a role with no finance grant cannot reach it. The Viewer role
  // grants nothing in Finance, so it is refused at the door. (Grant-isolation of
  // finance.ledger.{view,post,reverse} themselves is the permission matrix's job
  // in Gate A; enforcement is block 1's.) Viewer is Admin here from the People
  // block, so it is set to Viewer for the check and handed back after, leaving
  // the state exactly as later blocks expect it.
  // POST and REVERSE are their OWN powers, checked before any work is done. The
  // Viewer role grants nothing in Finance, so both refuse it — while the read
  // surface (the summary) may still open, which is why the guard sits on the act
  // and not on the section. Viewer is Admin here from the People block, so it is
  // set to Viewer for the check and handed back after, leaving the state exactly
  // as the blocks that follow expect it.
  await updateCollaborator(studio.id, viewer.collaborator.id, { roleIds: [roleId("Viewer")] });
  const viewerFin = await financeContext(viewer.user, slug);
  const vPost = await postEntry(viewerFin, { lines: [{ accountId: AR, debit: 1 }, { accountId: REV, credit: 1 }] });
  ok("a viewer cannot post to the ledger", vPost.error === "forbidden", JSON.stringify(vPost.error ?? vPost));
  const vRev = await reverseEntry(viewerFin, sale.entry.id, "no");
  ok("...nor reverse an entry", vRev.error === "forbidden", JSON.stringify(vRev.error ?? vRev));
  await updateCollaborator(studio.id, viewer.collaborator.id, { roleIds: [ADMIN_ROLE_ID] });
}

// ============================================================================
console.log("\n== the ledger posts the documents that feed it");
// A ledger nobody posts to is a right nothing exercises. These post the real
// documents — an invoice, its payment, an expense — into balanced entries with
// the conventional accounts, ONCE each, and the trial balance survives it.
{
  const fin = await financeContext(owner, slug);
  const chart = (await listAccounts(fin)).accounts;
  const idOf = (code) => chart.find((a) => a.code === code)?.id;

  // A 100 + 15% VAT invoice, issued so it can be posted.
  const inv = await createInvoice(fin, { clientName: "Ledger Co", lines: [{ description: "Work", qty: 1, unitPrice: 100 }] });
  ok("an invoice exists to post", !!inv.invoice, JSON.stringify(inv.error));

  // A DRAFT IS NOT POSTABLE — it is not yet a claim on anyone.
  const draftPost = await postInvoice(fin, inv.invoice.id);
  ok("a draft invoice cannot be posted", draftPost.error === "not-postable", JSON.stringify(draftPost));

  await editInvoice(fin, inv.invoice.id, { status: "Sent" });
  const posted = await postInvoice(fin, inv.invoice.id);
  ok("an issued invoice posts", !!posted.entry, JSON.stringify(posted.error ?? posted));
  // Dr AR 115 = Cr Revenue 100 + Cr VAT 15.
  const arLine = posted.entry.lines.find((l) => l.accountId === idOf("1100"));
  const revLine = posted.entry.lines.find((l) => l.accountId === idOf("4000"));
  const vatLine = posted.entry.lines.find((l) => l.accountId === idOf("2100"));
  ok("...debiting receivable for the whole claim", arLine?.debit === 115, JSON.stringify(arLine));
  ok("...crediting revenue for the net", revLine?.credit === 100, JSON.stringify(revLine));
  ok("...and VAT payable for the tax", vatLine?.credit === 15, JSON.stringify(vatLine));

  // ONCE. A document already in the ledger refuses a second posting.
  const twice = await postInvoice(fin, inv.invoice.id);
  ok("an invoice cannot be posted twice", twice.error === "already-posted", JSON.stringify(twice));

  // A payment against it: Dr Bank, Cr Receivable, clearing what was owed.
  const paid = await recordPayment(fin, inv.invoice.id, { amount: 115 });
  ok("a payment is recorded", (paid.invoice?.payments || []).length === 1, JSON.stringify(paid.error ?? paid));
  const payId = paid.invoice.payments[0].id;
  const payPosted = await postPayment(fin, inv.invoice.id, payId);
  ok("the payment posts", !!payPosted.entry, JSON.stringify(payPosted.error ?? payPosted));
  ok("...debiting the bank it arrived in",
    payPosted.entry.lines.find((l) => l.accountId === idOf("1010"))?.debit === 115, JSON.stringify(payPosted.entry.lines));
  ok("...and clearing the receivable",
    payPosted.entry.lines.find((l) => l.accountId === idOf("1100"))?.credit === 115, JSON.stringify(payPosted.entry.lines));
  const payTwice = await postPayment(fin, inv.invoice.id, payId);
  ok("a payment cannot be posted twice", payTwice.error === "already-posted", JSON.stringify(payTwice));

  // An expense: Dr its category's account, Cr Bank. Rent maps to 5200.
  const exp = await createExpense(fin, { amount: 500, category: "Rent" });
  ok("an expense exists to post", !!exp.expense, JSON.stringify(exp.error));
  const expPosted = await postExpense(fin, exp.expense.id);
  ok("the expense posts to its category account",
    expPosted.entry?.lines.find((l) => l.accountId === idOf("5200"))?.debit === 500, JSON.stringify(expPosted.error ?? expPosted.entry?.lines));
  ok("...crediting the bank it left",
    expPosted.entry.lines.find((l) => l.accountId === idOf("1010"))?.credit === 500, JSON.stringify(expPosted.entry.lines));
  // An unmapped category still posts, to Other Expenses (5900) rather than being refused.
  const misc = await createExpense(fin, { amount: 30, category: "Travel" });
  const miscPosted = await postExpense(fin, misc.expense.id);
  ok("an unmapped category falls to Other Expenses",
    miscPosted.entry?.lines.find((l) => l.accountId === idOf("5900"))?.debit === 30, JSON.stringify(miscPosted.error ?? miscPosted.entry?.lines));

  // AND THE BOOK STILL BALANCES after every document has posted.
  const tb = await trialBalance(fin);
  ok("the book balances after the documents post", tb.balanced === true,
    JSON.stringify({ d: tb.totalDebit, c: tb.totalCredit }));
}

// ============================================================================
console.log("\n== Finance 1a: the dashboard's arithmetic, on data that exists");
// Pure functions over the invoice/expense views, so they are provable to the
// cent without a studio or a screen — which is the point of building the numbers
// before the dashboard that shows them.
{
  const iv = (o) => ({ status: "Sent", total: 0, paid: 0, outstanding: 0, dueDate: "", clientName: "", payments: [], ...o });
  const asOf = "2026-08-22";
  const invoices = [
    iv({ clientName: "Acme", total: 100, outstanding: 100, dueDate: "2026-08-20" }),                 // 2d late -> 1-30
    iv({ clientName: "Acme", total: 200, paid: 50, outstanding: 150, dueDate: "2026-06-01" }),        // ~82d -> 61-90
    iv({ clientName: "Bell", total: 300, paid: 300, outstanding: 0, dueDate: "2026-08-01", status: "Paid" }),
    iv({ clientName: "Cyan", total: 90, outstanding: 90, dueDate: "2026-09-30" }),                    // future -> current
    iv({ clientName: "Draft", total: 999, outstanding: 999, status: "Draft" }),                       // excluded
  ];

  const aging = arAging(invoices, asOf);
  ok("AR aging sums only live outstanding", aging.total === 340, String(aging.total));
  const bucket = (k) => aging.buckets.find((x) => x.key === k);
  ok("...and buckets by days past due", bucket("current").amount === 90 && bucket("d1_30").amount === 100 && bucket("d61_90").amount === 150,
    JSON.stringify(aging.buckets));
  ok("...a draft is not a claim and is excluded", aging.buckets.every((x) => x.amount !== 999), "draft leaked");

  const debtors = topDebtors(invoices, 3);
  ok("top debtors rank by amount owed", debtors[0].clientName === "Acme" && debtors[0].owed === 250, JSON.stringify(debtors[0]));
  ok("...carrying the oldest unpaid due date", debtors[0].oldestDue === "2026-06-01", debtors[0].oldestDue);
  ok("...and a settled client drops off", !debtors.some((d) => d.clientName === "Bell"), "Bell still listed");

  ok("collection rate is collected over invoiced in-window",
    collectionRate([iv({ total: 100, paid: 100, dueDate: "2026-07-01" }), iv({ total: 100, paid: 40, dueDate: "2026-07-15" })], 90, asOf) === 0.7,
    "rate");
  ok("...and is 1 when nothing was due", collectionRate([iv({ total: 100, paid: 0, dueDate: "2020-01-01" })], 90, asOf) === 1, "empty window");

  ok("DSO weights age by amount outstanding", dso(invoices, asOf) === 37, String(dso(invoices, asOf)));

  const months = incomeVsExpense(
    [iv({ payments: [{ amount: 300, date: "2026-08-05" }] })],
    [{ category: "Rent", amount: 500, date: "2026-08-10" }, { category: "Rent", amount: 100, date: "2026-07-10" }, { category: "Fuel", amount: 50, date: "2026-08-11" }],
    3, asOf);
  const aug = months.find((m) => m.month === "2026-08");
  ok("income is cash collected, not billed", aug.income === 300, JSON.stringify(aug));
  ok("...expense is the month's spend, net is the difference", aug.expense === 550 && aug.net === -250, JSON.stringify(aug));

  const mix = expenseMix([{ category: "Rent", amount: 500 }, { category: "Rent", amount: 100 }, { category: "Fuel", amount: 50 }]);
  ok("expense mix groups by category, largest first", mix[0].category === "Rent" && mix[0].amount === 600, JSON.stringify(mix));
}

// ============================================================================
console.log("\n== analytics is paid: a rung sees at or below itself");
// The gate that makes analytics sellable: a widget above the studio's rung shows
// as a locked teaser, not the number.
{
  ok("a moderate tier sees basic/simple/moderate", analyticsAllows("moderate", "basic") && analyticsAllows("moderate", "simple") && analyticsAllows("moderate", "moderate"), "moderate");
  ok("...but not advanced", !analyticsAllows("moderate", "advanced"), "leaked advanced");
  ok("an unknown rung is the floor, never a free unlock", !analyticsAllows("typo", "simple") && analyticsAllows("basic", "typo"), "unknown");
  ok("a tier without a level resolves to basic", analyticsLevelOf({}) === "basic" && analyticsLevelOf({ analyticsLevel: "advanced" }) === "advanced", "levelOf");
}

// ============================================================================
console.log("\n== a tier's analytics rung: explicit wins, else the name, else the floor");
// The bug a studio actually hit: a tier NAMED "Advanced" showed only basic
// widgets because no console field set its rung. planOf now reads the explicit
// field first (the /super editor), then falls back to the tier's name, so a tier
// called "Advanced" grants the advanced rung with no migration.
{
  const tiers = [
    { id: "t_named", name: "Advanced" },
    { id: "t_explicit", name: "Gold", analyticsLevel: "moderate" },
    { id: "t_both", name: "Advanced", analyticsLevel: "simple" },
    { id: "t_unknown", name: "Platinum" },
  ];
  // Nova availability rides on the PACKAGE (the other gate axis), resolved by planOf.
  ok("a package's Nova switch resolves through planOf",
    planOf({ packageId: "p1" }, [{ id: "p1", novaHeadEnabled: true }], []).novaEnabled === true
    && planOf({ packageId: "p2" }, [{ id: "p2" }], []).novaEnabled === false, "novaEnabled");

  const lvl = (tierId) => planOf({ tierId }, [], tiers).analyticsLevel;
  ok("a tier named after a rung grants that rung", lvl("t_named") === "advanced", lvl("t_named"));
  ok("...an explicit field wins over the name", lvl("t_both") === "simple", lvl("t_both"));
  ok("...an explicit field with no rung-like name still resolves", lvl("t_explicit") === "moderate", lvl("t_explicit"));
  ok("...and an unrecognised tier is the free floor", lvl("t_unknown") === "basic", lvl("t_unknown"));

  // THE WRITE BOUNDARY: the console can store a rung, and only one of the four.
  const good = await createCatalogItem("tiers", { name: "ZZ Test Advanced Tier", analyticsLevel: "advanced" });
  const bad = await createCatalogItem("tiers", { name: "ZZ Test Wild Tier", analyticsLevel: "everything" });
  const stored = await listCatalog("tiers");
  const g = stored.find((t) => t.id === good.id);
  const b = stored.find((t) => t.id === bad.id);
  ok("the tiers editor stores a valid rung", g?.analyticsLevel === "advanced", JSON.stringify(g?.analyticsLevel));
  ok("...and a bad rung falls to the floor, never an unlock", b?.analyticsLevel === "basic", JSON.stringify(b?.analyticsLevel));
  await deleteCatalogItem("tiers", good.id);
  await deleteCatalogItem("tiers", bad.id);
}

// ============================================================================
console.log("\n== Nova's capability switchboard: default, override, and the write boundary");
// A capability is offered only when switched on. The default is the built-in
// one; the console can override it; and the store keeps only real keys.
{
  const readCap = NOVA_CAPABILITIES.find((c) => c.defaultOn);
  const offCap = NOVA_CAPABILITIES.find((c) => !c.defaultOn);
  ok("there are both default-on and default-off capabilities", !!readCap && !!offCap, "registry shape");

  // Explicit config wins; absence falls back to the built-in default.
  ok("an unset capability uses its built-in default",
    capabilityEnabled({ enabled: {} }, readCap) === true && capabilityEnabled({ enabled: {} }, offCap) === false, "default");
  ok("...and an explicit override wins either way",
    capabilityEnabled({ enabled: { [readCap.key]: false } }, readCap) === false
    && capabilityEnabled({ enabled: { [offCap.key]: true } }, offCap) === true, "override");

  const defaults = enabledCapabilities({ enabled: {} }).map((c) => c.key);
  ok("the default enabled set is exactly the default-on capabilities",
    defaults.length === NOVA_CAPABILITIES.filter((c) => c.defaultOn).length, String(defaults.length));

  // THE WRITE BOUNDARY: only real keys, only booleans, survive a save.
  const saved = await saveNovaConfig({ enabled: { [offCap.key]: true, "nova.not-a-capability": true, [readCap.key]: "yes" } });
  ok("the switchboard stores a real capability toggle", saved.enabled[offCap.key] === true, JSON.stringify(saved.enabled[offCap.key]));
  ok("...drops a key that is not a capability", !("nova.not-a-capability" in saved.enabled), JSON.stringify(saved.enabled));
  ok("...and drops a non-boolean value", !(readCap.key in saved.enabled), JSON.stringify(saved.enabled));
  const read = await getNovaConfig();
  ok("...and reads back what was stored", read.enabled[offCap.key] === true, JSON.stringify(read.enabled));
  // Leave the switchboard as we found it (defaults) so later reads are clean.
  await saveNovaConfig({ enabled: {} });
}

// ============================================================================
console.log("\n== Nova's toolset is enabled ∩ mapped ∩ permitted — never more");
// The security core: the model is only ever shown tools the asking user may use.
// A capability that is switched off, unmapped, or whose right the user lacks is
// absent from the toolset, so the model cannot call it. Pure over a constructed
// access set — no model, no key.
{
  // A user who can read Finance cash but nothing else.
  const cashOnly = new Set(["finance.cash.view"]);
  const { tools } = buildToolset({ enabled: {} }, cashOnly);
  const names = new Set(tools.map((t) => t.name));
  ok("a permitted, mapped, enabled read is offered", names.has("read__finance__invoices"), [...names].join(", "));
  ok("...and its input schema is well-formed", tools.every((t) => t.parameters && t.parameters.type === "object"), "schema");
  ok("a membership-only read (notifications) is always offered", names.has("read__notifications"), [...names].join(", "));
  ok("a read the user is NOT permitted for is withheld", !names.has("read__finance__bills") && !names.has("read__hr__my-leave"), [...names].join(", "));

  // Switching a capability off removes it even from a permitted user.
  const off = buildToolset({ enabled: { "read.finance.invoices": false } }, cashOnly);
  ok("a switched-off capability is withheld even when permitted", !off.tools.some((t) => t.name === "read__finance__invoices"), String(off.count));

  // A user holding a right whose capability is default-OFF is not offered it
  // until the switchboard enables it — the console gate is real.
  const canCreate = new Set(["finance.cash.view", "finance.cash.create"]);
  const defaultOff = buildToolset({ enabled: {} }, canCreate);
  // (log-expense is an action, default-off, and not yet mapped — so absent either way.)
  ok("a default-off capability is not offered by default", !defaultOff.tools.some((t) => t.name.includes("log__expense")), "default-off");

  // ACTIONS ARE PREPARE-ONLY. A default-on action the user is permitted for is
  // offered; calling it validates and records a proposal but writes NOTHING —
  // the write waits on the person's confirm at /nova/act.
  const canLeave = new Set(["hr.vacations.create", "hr.vacations.view"]);
  const leaveTs = buildToolset({ enabled: {} }, canLeave);
  ok("a permitted, enabled action is offered as a tool", leaveTs.tools.some((t) => t.name === "action__hr__request-leave"), leaveTs.tools.map((t) => t.name).join(", "));
  const incomplete = await leaveTs.execute("u", "s", "action__hr__request-leave", {});
  ok("...preparing without the required field asks for it, doesn't act", incomplete.prepared === false && incomplete.need.includes("from"), JSON.stringify(incomplete));
  const readyPrep = await leaveTs.execute("u", "s", "action__hr__request-leave", { from: "2026-09-01", type: "Annual" });
  ok("...with the field it prepares a proposal", readyPrep.prepared === true && typeof readyPrep.preview === "string", JSON.stringify(readyPrep));
  const proposal = leaveTs.takePrepared();
  ok("...recorded for the user to confirm, not submitted", proposal?.capKey === "action.hr.request-leave" && proposal?.fields?.from === "2026-09-01", JSON.stringify(proposal));
  // An action the user is NOT permitted for is never offered.
  const noLeave = buildToolset({ enabled: {} }, new Set(["hr.vacations.view"]));
  ok("an action the user cannot perform is withheld", !noLeave.tools.some((t) => t.name === "action__hr__request-leave"), "leaked action");
}

// ============================================================================
console.log("\n== Main executive widgets join the registry");
ok("Overview is a section the tier editor lists", WIDGET_SECTIONS.some((s) => s.key === "main"));
ok("main.activity is a simple-rung widget", widgetsForRung("simple").includes("main.activity"));
ok("main.awaiting-you is simple too", widgetsForRung("simple").includes("main.awaiting-you"));
ok("main.event-ribbon needs moderate",
  !widgetsForRung("simple").includes("main.event-ribbon") && widgetsForRung("moderate").includes("main.event-ribbon"));
ok("the free headline tiles are NOT gated widgets", !WIDGET_KEYS.has("main.openTickets"));

// ============================================================================
console.log("\n== a tier selects dashboard components: switch + list, else the rung");
// The model the console actually uses: a master switch and a per-component
// selection. enabledWidgets resolves what a studio sees from the fields planOf
// hands the client.
{
  const someKey = DASHBOARD_WIDGETS[0].key;
  const anotherKey = DASHBOARD_WIDGETS.find((w) => w.section === "finance").key;

  // Master switch off → nothing, whatever else is set.
  ok("the switch off shows no analytics", enabledWidgets({ analyticsEnabled: false, dashboardWidgets: [someKey], analyticsLevel: "advanced" }).size === 0, "switch leaked");

  // An explicit selection is exactly that set, and filters unknown keys.
  const sel = enabledWidgets({ analyticsEnabled: true, dashboardWidgets: [someKey, anotherKey, "finance.not-a-widget"] });
  ok("an explicit selection is exactly its valid keys", sel.size === 2 && sel.has(someKey) && sel.has(anotherKey) && !sel.has("finance.not-a-widget"), JSON.stringify([...sel]));

  // An explicit EMPTY array is a real answer — on, nothing ticked → nothing.
  ok("an explicit empty selection shows nothing", enabledWidgets({ analyticsEnabled: true, dashboardWidgets: [] }).size === 0, "empty leaked");

  // No selection ever made → the rung fallback, so pre-selection tiers still light up.
  const byRung = enabledWidgets({ analyticsEnabled: true, dashboardWidgets: null, analyticsLevel: "moderate" });
  const expected = new Set(widgetsForRung("moderate"));
  ok("no selection falls back to the rung's set", byRung.size === expected.size && [...byRung].every((k) => expected.has(k)), JSON.stringify({ got: byRung.size, want: expected.size }));
  ok("...and the rung fallback is only registry keys", [...byRung].every((k) => WIDGET_KEYS.has(k)), "stray key");

  // An undefined switch (an un-migrated tier) is treated as ON, so it keeps its rung set.
  ok("an absent switch is on by default", enabledWidgets({ dashboardWidgets: null, analyticsLevel: "simple" }).size === widgetsForRung("simple").length, "default off");

  // THE WRITE BOUNDARY stores the switch and whitelists the selection.
  const t = await createCatalogItem("tiers", { name: "ZZ Test Selection Tier", analyticsEnabled: false, dashboardWidgets: [someKey, "bogus.key"] });
  const stored = (await listCatalog("tiers")).find((x) => x.id === t.id);
  ok("the tier stores the master switch", stored?.analyticsEnabled === false, JSON.stringify(stored?.analyticsEnabled));
  ok("...and only real widget keys", Array.isArray(stored?.dashboardWidgets) && stored.dashboardWidgets.length === 1 && stored.dashboardWidgets[0] === someKey, JSON.stringify(stored?.dashboardWidgets));
  // A tier with no selection stores no array, so it stays on the rung fallback.
  const t2 = await createCatalogItem("tiers", { name: "ZZ Test No Selection Tier", analyticsLevel: "simple" });
  const stored2 = (await listCatalog("tiers")).find((x) => x.id === t2.id);
  ok("no selection is stored as absent, not empty", stored2?.dashboardWidgets === undefined, JSON.stringify(stored2?.dashboardWidgets));
  await deleteCatalogItem("tiers", t.id);
  await deleteCatalogItem("tiers", t2.id);
}

// ============================================================================
console.log("\n== Main executive: the entitled/locked split the route gates on");
{
  const basic = enabledWidgets({ analyticsEnabled: true, analyticsLevel: "basic" });
  ok("a basic tier unlocks NONE of the main.* executive widgets",
    !["main.activity","main.awaiting-you","main.headline-trend","main.event-ribbon"].some((k) => basic.has(k)),
    [...basic].filter((k)=>k.startsWith("main.")).join(","));

  const simple = enabledWidgets({ analyticsEnabled: true, analyticsLevel: "simple" });
  ok("a simple tier unlocks the three simple main widgets",
    simple.has("main.activity") && simple.has("main.awaiting-you") && simple.has("main.headline-trend"), "");
  ok("...but NOT the moderate ribbon", !simple.has("main.event-ribbon"), "");

  const moderate = enabledWidgets({ analyticsEnabled: true, analyticsLevel: "moderate" });
  ok("a moderate tier unlocks all four main widgets",
    ["main.activity","main.awaiting-you","main.headline-trend","main.event-ribbon"].every((k) => moderate.has(k)), "");

  const picked = enabledWidgets({ analyticsEnabled: true, dashboardWidgets: ["main.activity"] });
  ok("an explicit selection unlocks exactly what was ticked", picked.has("main.activity") && !picked.has("main.event-ribbon"), "");

  const off = enabledWidgets({ analyticsEnabled: false, analyticsLevel: "moderate" });
  ok("master switch off locks every main widget regardless of rung",
    !["main.activity","main.awaiting-you","main.headline-trend","main.event-ribbon"].some((k) => off.has(k)), "");
}

// ============================================================================
console.log("\n== a bill cannot be approved by a studio with no currency of its own");
// SPEC D4, and this runs BEFORE the block below sets one because it is the
// state every studio is really in: createStudio has never written a currency,
// so this is what an untouched studio does today. Everything else about the
// studio keeps working \u2014 only the act where an unknown amount matters stops.
{
  const fin = await financeContext(owner, slug);
  const bill = await createBill(fin, {
    vendorName: "Currencyless Co",
    lines: [{ description: "Anything", qty: 1, unitPrice: 100 }],
  });
  // RAISING IT STILL WORKS. An obligation that already exists must not wait on
  // an exchange rate; losing the record would be worse than not approving it.
  ok("a bill is still raised without a studio currency", !!bill.bill, JSON.stringify(bill.error ?? "raised"));
  ok("...and stores no plan, rather than a wrong one",
    bill.bill.approvalPlan === null, JSON.stringify(bill.bill.approvalPlan));

  const viewerFin0 = await financeContext(viewer.user, slug);
  const denied = await approveBill(viewerFin0, bill.bill.id);
  ok("but approving it refuses by name", denied.error === "no-studio-currency", JSON.stringify(denied));
  ok("...and the refusal says where to fix it", /settings/i.test(denied.detail || ""), denied.detail);
}

console.log("\n== Finance 1b: accounts payable mirrors the invoice");
// A bill is the AP counterpart of an invoice — same lines, same VAT, same aging
// arithmetic — with one thing an invoice lacks: APPROVAL, and invariant 7 on it
// (the raiser may not approve their own bill).
{
  // THE STUDIO NEEDS A CURRENCY OF ITS OWN before a bill can be judged against
  // a limit (spec D4), and createStudio has never set one. Set here rather than
  // in the fixture bootstrap so the block above can still prove the refusal on
  // a studio without one \u2014 and BEFORE financeContext, which snapshots the
  // studio it was built from.
  await updateStudio(studio.id, { currency: "SAR" });
  const fin = await financeContext(owner, slug);

  const bill = await createBill(fin, {
    vendorName: "Steel Co",
    lines: [{ description: "I-beams", qty: 2, unitPrice: 500 }],
    dueDate: "2026-06-01",
  });
  ok("a bill is raised", !!bill.bill, JSON.stringify(bill.error ?? bill));
  ok("...with a reference from the counter", /^BILL-\d+$/.test(bill.bill?.reference || ""), bill.bill?.reference);
  ok("...totalling like an invoice (net + VAT)", bill.bill.subtotal === 1000 && bill.bill.total === 1150 && bill.bill.outstanding === 1150, JSON.stringify(bill.bill));

  // D9: a bill carries the currency it was billed in, defaulted to the
  // studio's — exactly as a contract, a payment and a change order already do.
  // A bill was simply the one record of the family that never got the field,
  // which left the approval engine with nothing to convert.
  // SAR, not `studio.currency` — the fixture object is a snapshot taken at
  // creation and does not see the updateStudio above it. Naming the value the
  // block actually set is the assertion; reading it back off a stale snapshot
  // would have compared the default against itself.
  ok("a bill defaults to the studio's own currency",
    bill.bill.currency === "SAR", JSON.stringify(bill.bill.currency));

  const eurBill = await createBill(fin, {
    vendorName: "Bremen GmbH", currency: "EUR",
    lines: [{ description: "Valves", qty: 1, unitPrice: 100 }],
  });
  ok("...and a foreign supplier invoice keeps its own",
    eurBill.bill.currency === "EUR", JSON.stringify(eurBill.bill.currency));

  // INVARIANT 7: the owner raised it, so the owner cannot approve it.
  const selfApprove = await approveBill(fin, bill.bill.id);
  ok("the raiser cannot approve their own bill", selfApprove.error === "same-signer", JSON.stringify(selfApprove));

  // A different collaborator (viewer is Admin here) can.
  const viewerFin = await financeContext(viewer.user, slug);
  const approved = await approveBill(viewerFin, bill.bill.id);
  ok("a second person approves it", approved.bill?.status === "Approved", JSON.stringify(approved.error ?? approved));
  ok("...and records who", !!approved.bill?.approvedByCollaboratorId, JSON.stringify(approved.bill?.approvedByCollaboratorId));

  // An approved bill is locked to edits — dispute or cancel instead.
  const editLocked = await editBill(fin, bill.bill.id, { vendorName: "Nope" });
  ok("an approved bill cannot be edited", editLocked.error === "locked", JSON.stringify(editLocked));

  // Pay it: partial then the rest, and overpayment is refused.
  const over = await recordBillPayment(fin, bill.bill.id, { amount: 2000 });
  ok("a bill cannot be overpaid", over.error === "overpayment", JSON.stringify(over));
  const part = await recordBillPayment(fin, bill.bill.id, { amount: 150 });
  ok("a partial payment leaves it outstanding", part.bill?.outstanding === 1000 && part.bill?.status === "Approved", JSON.stringify(part.bill));
  const rest = await recordBillPayment(fin, bill.bill.id, { amount: 1000 });
  ok("...and paying the rest marks it Paid", rest.bill?.status === "Paid" && rest.bill?.outstanding === 0, JSON.stringify(rest.bill));

  // A paid bill is history — it cannot be deleted.
  const del = await removeBill(fin, bill.bill.id);
  ok("a bill with history cannot be deleted", del.error === "has-history", JSON.stringify(del));

  // It shows in the list with its derived totals and overdue flag.
  const listed = await listBills(fin);
  const row = listed.find((b) => b.id === bill.bill.id);
  ok("the bill lists with derived totals", row?.total === 1150 && row?.paid === 1150, JSON.stringify(row && { total: row.total, paid: row.paid }));
}

// ============================================================================
// ============================================================================
console.log("\n== Administration is reached by its own keys, and the old paths still resolve");
// The three screens were reached at "people", "access" and a literal match on
// "administration-settings" \u2014 all three listed in studioRoute.ts's SCREEN_KEYS,
// which is what told resolveActiveKey to return an address WITHOUT looking it
// up in the section list. That is how three screens stayed reachable while
// their sections were invisible.
//
// Two of those keys are pre-restructure and are in bookmarks and in
// notification payloads ALREADY DELIVERED \u2014 a notification links to /people
// and those records cannot be rewritten \u2014 so the old address has to keep
// resolving, and resolving to the NEW key is also what makes the shell
// highlight the right row for somebody who arrives on one.
{
  const { resolveActiveKey, requestedKey, studioSegments } = await import("@/shared/studioRoute");
  const visible = [{ key: "main" }, { key: "administration" },
    { key: "administration-members" }, { key: "administration-access" },
    { key: "administration-settings" }];
  const keyFor = (path) => resolveActiveKey(requestedKey(studioSegments(path, slug)), visible);

  ok("the People key resolves to its own section",
    keyFor(`/${slug}/administration-members`) === "administration-members",
    keyFor(`/${slug}/administration-members`));
  ok("the Access key resolves to its own section",
    keyFor(`/${slug}/administration-access`) === "administration-access",
    keyFor(`/${slug}/administration-access`));

  ok("the old People path resolves to the new key",
    keyFor(`/${slug}/people`) === "administration-members", keyFor(`/${slug}/people`));
  ok("the old Access path resolves to the new key",
    keyFor(`/${slug}/access`) === "administration-access", keyFor(`/${slug}/access`));

  // THE PAGE READS requestedKey DIRECTLY (page.js:188) while the shell reads
  // resolveActiveKey, so the alias has to live in the one they share or the
  // page would render People while the nav highlighted nothing. Asserted at
  // that level rather than only through resolveActiveKey.
  ok("the alias is in the derivation the PAGE reads, not only the shell's",
    requestedKey(studioSegments(`/${slug}/people`, slug)) === "administration-members",
    requestedKey(studioSegments(`/${slug}/people`, slug)));

  // A SECTION SOMEBODY CANNOT SEE still falls back the way it always did \u2014 the
  // alias must not turn a denied section into a resolved one.
  const noAdmin = [{ key: "main" }];
  ok("a retired address with no section granted falls back to Main",
    resolveActiveKey(requestedKey(studioSegments(`/${slug}/people`, slug)), noAdmin) === "main");

  // AND A RECORD PATH UNDER A RETIRED ADDRESS keeps its second segment, so a
  // deep link is aliased rather than truncated.
  ok("a retired address keeps the segments below it",
    studioSegments(`/${slug}/people/col_1`, slug).length === 2);
}

console.log("\n== bill approval chains: seeded, overridable, validated on write");
// P2's approval engine. A chain is the studio's own answer to "who signs
// this, and above what amount" - stored as an override over the seeded one,
// so a corrected built-in still reaches a studio that never edited theirs.
{
  const fin = await financeContext(owner, slug);

  // A STUDIO THAT HAS NEVER TOUCHED THEM STILL HAS THEM. The seed is the
  // answer, not an empty object: a studio with no chain would approve nothing,
  // which is the hole chainProblems refuses on write.
  ok("a fresh studio has the seeded bill chain",
    fin.approvalChains?.bill?.steps?.length === 2, JSON.stringify(fin.approvalChains?.bill));

  // AN OVERRIDE STORES ONLY WHAT CHANGED.
  const saved = await saveFinanceSettings(fin, {
    approvalChains: { bill: { type: "bill", steps: [
      { permission: "finance.payables.approve", from: 0, label: "Finance" },
      { permission: "finance.payables.approveHigh", from: 5000, label: "Director" },
    ] } },
  });
  ok("a studio can move its own threshold",
    saved.approvalChains?.bill?.steps?.[1]?.from === 5000,
    JSON.stringify(saved.error ?? saved.approvalChains?.bill));

  // ...AND THE OTHER SETTING ON THE SAME BLOB SURVIVES IT. Both live in the
  // finance-settings section's `settings`, so a writer that rebuilt the object
  // instead of extending it would silently drop the categories.
  ok("...without dropping the cash categories beside it",
    Array.isArray(saved.cashCategories) && saved.cashCategories.length > 0,
    JSON.stringify(saved.cashCategories));

  // REFUSED ON WRITE, IN WORDS ABOUT THE EDIT.
  const bad = await saveFinanceSettings(fin, {
    approvalChains: { bill: { type: "bill", steps: [
      { permission: "finance.payables.approveHigh", from: 100, label: "only one" },
    ] } },
  });
  ok("a chain with no always-on step is refused", bad.error === "refused", JSON.stringify(bad));
  ok("...and the refusal says what to fix", /from: 0/.test(bad.detail || ""), bad.detail);

  const unknown = await saveFinanceSettings(fin, {
    approvalChains: { bill: { type: "bill", steps: [
      { permission: "finance.payables.nuke", from: 0, label: "nope" },
    ] } },
  });
  ok("a chain naming a permission that does not exist is refused",
    unknown.error === "refused" && /nuke/.test(unknown.detail || ""), JSON.stringify(unknown));

  // AND NEITHER REFUSAL WROTE. A validator that refuses and saves anyway is
  // worse than no validator, and the ordering that produces it (write, then
  // check) looks identical from the call site.
  const after = await financeContext(owner, slug);
  ok("a refused chain was not stored",
    after.approvalChains?.bill?.steps?.[1]?.from === 5000,
    JSON.stringify(after.approvalChains?.bill));
}

// ============================================================================
console.log("\n== a bill over the studio's limit needs two signatures");
// THE DEFECT THIS WHOLE FEATURE EXISTS TO PREVENT. Threshold is 5000, set by
// the block above. Three people, because invariant 7 needs two and the
// signed-an-earlier-step rule needs three to prove itself.
//
// BOTH APPROVERS ARE ADMINS, and that is load-bearing rather than lazy. Admin
// is the seeded wildcard role, so approverA HOLDS finance.payables.approveHigh
// \u2014 which is the only way the same-signer assertion below proves what it
// claims. Give approverA the junior right alone and the second attempt would
// refuse for want of a permission, and the test would pass proving nothing.
{
  const approverAPerson = await person("ApproverA", "Admin");
  const approverBPerson = await person("ApproverB", "Admin");
  const raiser = await financeContext(owner, slug);
  const approverA = await financeContext(approverAPerson.user, slug);
  const approverB = await financeContext(approverBPerson.user, slug);

  const small = await createBill(raiser, { vendorName: "Small Co", lines: [{ description: "x", qty: 1, unitPrice: 1000 }] });
  ok("a bill under the limit plans one step",
    small.bill?.approvalPlan?.steps?.length === 1, JSON.stringify(small.bill?.approvalPlan?.steps));
  const a1 = await approveBill(approverA, small.bill.id);
  ok("...and is Approved after one signature",
    a1.bill?.status === "Approved", JSON.stringify(a1.error ?? a1.bill?.status));

  const big = await createBill(raiser, { vendorName: "Big Co", lines: [{ description: "x", qty: 1, unitPrice: 90000 }] });
  ok("a bill over the limit plans two steps",
    big.bill?.approvalPlan?.steps?.length === 2, JSON.stringify(big.bill?.approvalPlan?.steps));
  const b1 = await approveBill(approverA, big.bill.id);
  ok("...and is NOT Approved after one signature",
    b1.bill?.status !== "Approved", JSON.stringify(b1.error ?? b1.bill?.status));
  ok("...though one signature is recorded",
    b1.bill?.approvals?.length === 1, JSON.stringify(b1.bill?.approvals));

  // Invariant 7 about the RECORD, not the pair of rights. approverA is a
  // wildcard Admin, so this refuses because they already signed \u2014 not for
  // want of the right, which is the whole distinction.
  const sameAgain = await approveBill(approverA, big.bill.id);
  ok("the same person cannot sign the second step", sameAgain.error === "same-signer", JSON.stringify(sameAgain));

  const b2 = await approveBill(approverB, big.bill.id);
  ok("a second person completes it", b2.bill?.status === "Approved", JSON.stringify(b2.error ?? b2.bill?.status));
  ok("...and approvedByCollaboratorId is the FINAL approver",
    b2.bill?.approvedByCollaboratorId === approverB.collaborator.id,
    JSON.stringify([b2.bill?.approvedByCollaboratorId, approverB.collaborator.id]));
  ok("...with both signatures kept, in order",
    b2.bill?.approvals?.length === 2
      && b2.bill.approvals[0].permission === "finance.payables.approve"
      && b2.bill.approvals[1].permission === "finance.payables.approveHigh",
    JSON.stringify(b2.bill?.approvals?.map((a) => a.permission)));

  // UNCHANGED, and re-asserted because the walk rewrote the function that
  // used to enforce it.
  const own = await createBill(raiser, { vendorName: "Own Co", lines: [{ description: "x", qty: 1, unitPrice: 100 }] });
  const byRaiser = await approveBill(raiser, own.bill.id);
  ok("the raiser still cannot approve their own bill", byRaiser.error === "same-signer", JSON.stringify(byRaiser));
}

console.log("\n== a bill edited across the limit is re-planned");
// The one way this feature could be wrong without anything looking wrong: an
// edit that moves a bill over the threshold, routed by the old plan.
{
  const raiser = await financeContext(owner, slug);
  const made = await createBill(raiser, { vendorName: "Growing Co", lines: [{ description: "x", qty: 1, unitPrice: 1000 }] });
  ok("it starts needing one step",
    made.bill?.approvalPlan?.steps?.length === 1, JSON.stringify(made.bill?.approvalPlan?.steps));
  const edited = await editBill(raiser, made.bill.id, { lines: [{ description: "x", qty: 1, unitPrice: 90000 }] });
  ok("editing it over the limit re-derives the plan",
    edited.bill?.approvalPlan?.steps?.length === 2, JSON.stringify(edited.bill?.approvalPlan?.steps));
}

// ============================================================================
console.log("\n== Finance 1b: a bill posts as the mirror of an invoice");
// AP = expense + reclaimable VAT, credited to Accounts Payable. The double of
// postInvoice, and the book still balances.
{
  const fin = await financeContext(owner, slug);
  const chart = (await listAccounts(fin)).accounts;
  const idOf = (code) => chart.find((a) => a.code === code)?.id;

  const bill = await createBill(fin, { vendorName: "Cement Co", lines: [{ description: "Bags", qty: 1, unitPrice: 200 }] });
  // A received bill is postable (only Draft/Cancelled are not).
  const posted = await postBill(fin, bill.bill.id);
  ok("a bill posts", !!posted.entry, JSON.stringify(posted.error ?? posted));
  // Dr Cost of Sales 200 + Dr VAT 30 = Cr Accounts Payable 230.
  ok("...debiting the expense for the net", posted.entry.lines.find((l) => l.accountId === idOf("5000"))?.debit === 200, JSON.stringify(posted.entry.lines));
  ok("...debiting reclaimable VAT", posted.entry.lines.find((l) => l.accountId === idOf("2100"))?.debit === 30, JSON.stringify(posted.entry.lines));
  ok("...crediting accounts payable for the whole", posted.entry.lines.find((l) => l.accountId === idOf("2000"))?.credit === 230, JSON.stringify(posted.entry.lines));
  const twice = await postBill(fin, bill.bill.id);
  ok("a bill cannot be posted twice", twice.error === "already-posted", JSON.stringify(twice));

  // Pay it and post the payment: Dr AP, Cr Bank.
  const paid = await recordBillPayment(fin, bill.bill.id, { amount: 230 });
  const payId = paid.bill.payments[0].id;
  const payPosted = await postBillPayment(fin, bill.bill.id, payId);
  ok("the bill payment posts, clearing payable and crediting bank",
    payPosted.entry?.lines.find((l) => l.accountId === idOf("2000"))?.debit === 230 &&
    payPosted.entry?.lines.find((l) => l.accountId === idOf("1010"))?.credit === 230, JSON.stringify(payPosted.error ?? payPosted.entry?.lines));

  const tb = await trialBalance(fin);
  ok("the book balances after a bill and its payment", tb.balanced === true, JSON.stringify({ d: tb.totalDebit, c: tb.totalCredit }));
}

// ============================================================================
console.log("\n== Finance 1b: depreciation is derived, to the cent");
// The book value is a pure function of five fields and a date — never a stored
// schedule that rots when a life is corrected. Proven without a studio.
{
  // Straight-line: 12000 cost, 2000 salvage, 40 months. Base 10000 / 40 = 250/mo.
  const sl = { cost: 12000, salvageValue: 2000, usefulLifeMonths: 40, method: "straight-line", acquiredOn: "2026-01-01" };
  const at10 = depreciationOf(sl, "2026-11-01");   // 10 whole months
  ok("straight-line charges the base evenly", at10.monthlyDepreciation === 250 && at10.accumulated === 2500, JSON.stringify(at10));
  ok("...and book value is cost less accumulated", at10.bookValue === 9500, String(at10.bookValue));
  // Part months do not count: 2026-01-01 -> 2026-11-30 is still 10 months.
  ok("a part month does not depreciate", depreciationOf(sl, "2026-11-15").accumulated === 2500, JSON.stringify(depreciationOf(sl, "2026-11-15")));
  // Never below salvage, and fully depreciated at the end of life.
  const done = depreciationOf(sl, "2035-01-01");
  ok("...it never writes past salvage", done.accumulated === 10000 && done.bookValue === 2000 && done.fullyDepreciated, JSON.stringify(done));

  // Reducing-balance: front-loaded, and it too stops at salvage.
  const rb = { cost: 10000, salvageValue: 1000, usefulLifeMonths: 20, method: "reducing-balance", acquiredOn: "2026-01-01" };
  const rbEarly = depreciationOf(rb, "2026-02-01");   // 1 month, rate 2/20 = 0.1
  ok("reducing-balance is front-loaded", rbEarly.accumulated === 1000 && rbEarly.bookValue === 9000, JSON.stringify(rbEarly));
  const rbEnd = depreciationOf(rb, "2035-01-01");
  ok("...and never falls through salvage", rbEnd.bookValue >= 1000 && rbEnd.fullyDepreciated, JSON.stringify(rbEnd));

  // Disposal stops the clock: depreciation runs only to the disposal date.
  const disposed = depreciationOf({ ...sl, disposedOn: "2026-06-01" }, "2027-01-01");
  ok("disposal stops the clock at the disposal date", disposed.accumulated === 1250 && disposed.disposed, JSON.stringify(disposed));
}

// ============================================================================
console.log("\n== Finance 1b: the fixed-asset register");
{
  const fin = await financeContext(owner, slug);

  const bad = await createAsset(fin, { name: "", cost: 100, usefulLifeMonths: 12 });
  ok("an asset needs a name", bad.error === "name", JSON.stringify(bad));
  const noLife = await createAsset(fin, { name: "Van", cost: 100, usefulLifeMonths: 0 });
  ok("...and a useful life", noLife.error === "life", JSON.stringify(noLife));

  const asset = await createAsset(fin, {
    name: "Delivery van", category: "Vehicles", cost: 60000, salvageValue: 10000,
    usefulLifeMonths: 60, method: "straight-line", acquiredOn: "2026-01-01",
  });
  ok("an asset is registered", !!asset.asset, JSON.stringify(asset.error ?? asset));
  ok("...with a reference and a derived book value", /^FA-\d+$/.test(asset.asset?.reference || "") && asset.asset.bookValue <= 60000, JSON.stringify({ ref: asset.asset?.reference, bv: asset.asset?.bookValue }));

  // Salvage cannot exceed cost.
  const capped = await createAsset(fin, { name: "Laptop", cost: 5000, salvageValue: 9000, usefulLifeMonths: 24 });
  ok("salvage is capped at cost", capped.asset?.salvageValue === 5000, JSON.stringify(capped.asset?.salvageValue));

  // Dispose it, then it cannot be disposed again or edited.
  const disp = await disposeAsset(fin, asset.asset.id, { disposedOn: "2027-01-01", disposalProceeds: 55000 });
  ok("an asset is disposed", disp.asset?.disposedOn === "2027-01-01", JSON.stringify(disp.error ?? disp));
  ok("...carrying the gain or loss against book value", typeof disp.asset?.gainOnDisposal === "number", JSON.stringify(disp.asset?.gainOnDisposal));
  const again = await disposeAsset(fin, asset.asset.id, {});
  ok("...and cannot be disposed twice", again.error === "already-disposed", JSON.stringify(again));
  const editGone = await editAsset(fin, asset.asset.id, { name: "No" });
  ok("...nor edited once disposed", editGone.error === "disposed", JSON.stringify(editGone));

  const listed = await listAssets(fin);
  ok("the register lists assets with derived depreciation", (listed.assets || []).some((a) => a.id === asset.asset.id && typeof a.bookValue === "number"), `${(listed.assets || []).length} listed`);
}

// ============================================================================
console.log("\n== Finance 1b: the payables and register dashboard arithmetic");
// The AP mirror of the AR reports, plus the asset roll-up — pure, so provable to
// the cent. AP aging shares its engine with AR aging (same buckets), and a bill
// that is a draft or cancelled is not yet a payable, exactly as a draft invoice
// is not a receivable.
{
  const bl = (o) => ({ status: "Received", outstanding: 0, dueDate: "", vendorName: "", ...o });
  const asOf = "2026-08-22";
  const bills = [
    bl({ vendorName: "Steel", outstanding: 100, dueDate: "2026-08-20" }),   // 2d late -> 1-30
    bl({ vendorName: "Steel", outstanding: 150, dueDate: "2026-06-01" }),   // ~82d -> 61-90
    bl({ vendorName: "Glass", outstanding: 0, dueDate: "2026-08-01", status: "Paid" }),  // settled — nothing outstanding, so out of the aging
    bl({ vendorName: "Wood", outstanding: 90, dueDate: "2026-09-30" }),     // future -> current
    bl({ vendorName: "Draft", outstanding: 999, status: "Draft" }),         // excluded
  ];
  const aging = apAging(bills, asOf);
  ok("AP aging sums only live outstanding", aging.total === 340, String(aging.total));
  const bucket = (k) => aging.buckets.find((x) => x.key === k);
  ok("...buckets AP by days past due like AR", bucket("current").amount === 90 && bucket("d1_30").amount === 100 && bucket("d61_90").amount === 150, JSON.stringify(aging.buckets));
  ok("...and a draft bill is not yet a payable", aging.buckets.every((x) => x.amount !== 999), "draft leaked");

  const vendors = topVendors(bills, 3);
  ok("top vendors rank by amount owed", vendors[0].vendorName === "Steel" && vendors[0].owed === 250, JSON.stringify(vendors[0]));
  ok("...carrying the oldest unpaid due date", vendors[0].oldestDue === "2026-06-01", vendors[0].oldestDue);

  // The register counts only assets STILL HELD; a disposed one leaves the totals.
  const reg = assetRegister([
    { category: "Vehicles", method: "straight-line", cost: 60000, accumulated: 10000, bookValue: 50000, disposed: false },
    { category: "Vehicles", method: "straight-line", cost: 40000, accumulated: 40000, bookValue: 0, disposed: false },
    { category: "IT", method: "reducing-balance", cost: 5000, accumulated: 2000, bookValue: 3000, disposed: false },
    { category: "IT", method: "reducing-balance", cost: 9999, accumulated: 9999, bookValue: 0, disposed: true },   // disposed -> excluded
  ]);
  ok("the register totals only assets still held", reg.count === 3 && reg.disposedCount === 1, JSON.stringify({ c: reg.count, d: reg.disposedCount }));
  ok("...cost, accumulated and net book value roll up", reg.totalCost === 105000 && reg.totalAccumulated === 52000 && reg.netBookValue === 53000, JSON.stringify(reg));
  ok("...and it breaks down by category, largest first", reg.byCategory[0].label === "Vehicles" && reg.byCategory[0].cost === 100000, JSON.stringify(reg.byCategory));
}

// ============================================================================
console.log("\n== time-driven notices fire once per milestone, and reach the right people");
// The daily cron announces overdue and expiring records — but only on fixed day
// milestones, so a record is told once as each threshold passes rather than every
// morning. Pure, so provable without the cron or a studio.
{
  const today = "2026-08-23";
  const inv = (o) => ({ id: "i1", reference: "INV-1", status: "Sent", clientName: "Acme", lines: [{ description: "x", qty: 1, unitPrice: 100 }], vatRate: 0, payments: [], ...o });

  // 7 days is a milestone; 2 days is not.
  ok("an invoice fires on an overdue milestone", overdueInvoiceNotices([inv({ dueDate: "2026-08-16" })], today).length === 1, "day 7 silent");
  ok("...and stays silent between milestones", overdueInvoiceNotices([inv({ dueDate: "2026-08-21" })], today).length === 0, "day 2 fired");
  ok("...carrying how overdue and how much is outstanding", (() => { const n = overdueInvoiceNotices([inv({ dueDate: "2026-08-16" })], today)[0]; return n.daysOverdue === 7 && n.outstanding === 100 && n.name === "Acme"; })(), "detail");
  // A paid or draft claim is not overdue.
  ok("a paid invoice never fires", overdueInvoiceNotices([inv({ dueDate: "2026-08-16", payments: [{ amount: 100 }] })], today).length === 0, "paid fired");
  ok("a draft invoice never fires", overdueInvoiceNotices([inv({ dueDate: "2026-08-16", status: "Draft" })], today).length === 0, "draft fired");
  ok("the overdue milestones are the agreed set", JSON.stringify(OVERDUE_MILESTONES) === JSON.stringify([1, 7, 14, 30, 60, 90]), JSON.stringify(OVERDUE_MILESTONES));

  // Bills mirror invoices, on vendorName.
  const bill = { id: "b1", reference: "BILL-1", status: "Received", vendorName: "Steel", lines: [{ description: "x", qty: 1, unitPrice: 200 }], vatRate: 0, payments: [], dueDate: "2026-08-22" };
  ok("a bill fires the day it becomes overdue", overdueBillNotices([bill], today).length === 1 && overdueBillNotices([bill], today)[0].name === "Steel", "bill day 1");

  // Documents (ID/passport on the collaborator row) fire on expiry milestones.
  const emp = (o) => ({ id: "c1", alias: "Sara", ...o });
  ok("a document fires 7 days before it expires", expiringDocumentNotices([emp({ idExpiry: "2026-08-30" })], new Date(`${today}T00:00:00`)).length === 1, "doc day-7 silent");
  ok("...and not on an off-milestone day", expiringDocumentNotices([emp({ idExpiry: "2026-08-28" })], new Date(`${today}T00:00:00`)).length === 0, "doc day-5 fired");
  ok("the expiring milestones are the agreed set", JSON.stringify(EXPIRING_MILESTONES) === JSON.stringify([30, 14, 7, 3, 1, 0]), JSON.stringify(EXPIRING_MILESTONES));

  // Permits fire on validTo milestones.
  const permit = { id: "p1", reference: "PMT-1", type: "Hot work", validTo: "2026-08-24" };  // 1 day left
  ok("a permit fires the day before it lapses", expiringPermitNotices([permit], today).length === 1 && expiringPermitNotices([permit], today)[0].kind === "Hot work", "permit day-1");
  ok("...and a permit with no expiry never fires", expiringPermitNotices([{ id: "p2", type: "Other" }], today).length === 0, "no-validTo fired");

  // RECIPIENTS by permission: a role holder and the owner hear it; a bystander does not.
  const roles = [{ id: "r1", permissions: ["finance.cash.view"] }];
  const collaborators = [
    { id: "c1", userId: "u1", roleIds: ["r1"] },       // holds the right
    { id: "c2", userId: "u2", roleIds: [] },            // holds nothing
    { id: "owner", userId: "uo", role: "owner" },       // holds everything
  ];
  const { recipientIds, userIdOf } = resolveHolders(collaborators, roles, "finance.cash.view");
  ok("the notice reaches the holders and the owner, not a bystander", recipientIds.includes("c1") && recipientIds.includes("owner") && !recipientIds.includes("c2"), JSON.stringify(recipientIds));
  ok("...and maps each recipient to their user for the doorbell", userIdOf("c1") === "u1" && userIdOf("owner") === "uo", "userIdOf");
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
// ============================================================================
console.log("\n== a purchase order lands, and the person who raised it hears");
// "A new PO was received." The event the studio produced nothing for. The buyer
// who raised the order is told when it arrives IN FULL — not the storekeeper who
// booked it in, and not on a partial delivery.
{
  // Member raises the order, so member is the buyer. Admin for the block,
  // because raising a PO needs inventory.stock.create; taken back after.
  await updateCollaborator(studio.id, member.collaborator.id, { roleIds: [roleId("Admin")] });
  const memberInv = await inventoryContext(member.user, slug);
  const vendor = await createVendor(memberInv, { name: "Acme Supplies" });
  ok("a vendor exists to order from", !!vendor.vendor, JSON.stringify(vendor.error));
  const part = await createItem(memberInv, { name: "Bolt M6" });
  ok("an item exists to order", !!part.item, JSON.stringify(part.error));

  const order = await createOrder(memberInv, {
    vendorId: vendor.vendor.id,
    lines: [{ itemId: part.item.id, qty: 10 }],
  });
  ok("member raises a purchase order", !!order.order, JSON.stringify(order.error));
  const placed = await editOrder(memberInv, order.order.id, { status: "Ordered" });
  ok("...and places it with the vendor", placed.order?.status === "Ordered", JSON.stringify(placed.error));

  const ownerInv = await inventoryContext(owner, slug);
  const partial = await receiveOrder(ownerInv, order.order.id, { lines: [{ itemId: part.item.id, qty: 4 }] });
  ok("a partial receipt is Partly received", partial.order?.status === "Partly received", JSON.stringify(partial.error));
  ok("...and a partial arrival tells nobody yet",
    !(await listForCollaborator(studio.id, member.collaborator.id)).some((n) => n.type === NOTIFY.purchaseReceived),
    "a bell per box trains people to ignore the last one");

  const rest = await receiveOrder(ownerInv, order.order.id, { lines: [{ itemId: part.item.id, qty: 6 }] });
  ok("the balance completes the order", rest.order?.status === "Received", JSON.stringify(rest.error));
  const landed = (await listForCollaborator(studio.id, member.collaborator.id))
    .find((n) => n.type === NOTIFY.purchaseReceived);
  ok("the buyer is told the PO arrived in full", Boolean(landed), NOTIFY.purchaseReceived);
  ok("...and the storekeeper who booked it in is not",
    !(await listForCollaborator(studio.id, ownerInv.collaborator.id)).some((n) => n.type === NOTIFY.purchaseReceived),
    "the receiver is not the audience");

  await updateCollaborator(studio.id, member.collaborator.id, { roleIds: [roleId("Member")] });
}

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

  // A PENDING REQUEST RINGS THE PEOPLE WHO CAN APPROVE IT, not the person who
  // filed it. Owner holds hr.vacations.approve; the member does not.
  const ownerCollabId = (await hrContext(owner, slug)).collaborator.id;
  const approverNote = (await listForCollaborator(studio.id, ownerCollabId))
    .find((n) => n.type === NOTIFY.leaveRequested);
  ok("a pending leave request reaches an approver", Boolean(approverNote), NOTIFY.leaveRequested);
  ok("...and not the requester's own bell",
    !(await listForCollaborator(studio.id, member.collaborator.id)).some((n) => n.type === NOTIFY.leaveRequested),
    "you do not notify yourself of your own request");

  const withdrawn = await decideVacation(hr, asked.vacation?.id, "Cancelled");
  ok("...and can cancel it without the approve right", withdrawn.vacation?.status === "Cancelled",
    JSON.stringify(withdrawn));
  // A SELF-CANCEL TELLS NOBODY. Withdrawing your own request is not a decision
  // somebody else made about your leave, so it produces no "your leave was …".
  ok("...and withdrawing your own request notifies no one",
    !(await listForCollaborator(studio.id, member.collaborator.id)).some((n) => n.type === NOTIFY.leaveDecided),
    "a self-cancel is not a decision handed down");
}

// ============================================================================
console.log("\n== leave: the requester hears the verdict");
// THE HALF OF THE VACATION SCENARIO THAT MATTERS: someone asks, someone with the
// right decides, and the asker is told the outcome without refreshing anything.
{
  const hr = await hrContext(member.user, slug);
  const asked = await requestVacation(hr, { from: "2026-10-05", to: "2026-10-06", type: "Annual" });
  ok("the member filed a fresh request", asked.vacation?.status === "Pending", JSON.stringify(asked));

  // Owner holds the approve right; deciding somebody else's leave is a decision,
  // so the requester should hear it.
  const ownerHr = await hrContext(owner, slug);
  const decided = await decideVacation(ownerHr, asked.vacation?.id, "Approved");
  ok("an approver can approve it", decided.vacation?.status === "Approved", JSON.stringify(decided));

  const verdict = (await listForCollaborator(studio.id, member.collaborator.id))
    .find((n) => n.type === NOTIFY.leaveDecided);
  ok("the requester is told the outcome", Boolean(verdict), NOTIFY.leaveDecided);
  ok("...and the notice names the verdict", /approved/i.test(String(verdict?.title || "")), JSON.stringify(verdict?.title));
  ok("...and the approver did not notify themselves",
    !(await listForCollaborator(studio.id, ownerHr.collaborator.id)).some((n) => n.type === NOTIFY.leaveDecided),
    "the decider is not the audience");
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
  ok("...Sales is", departments.some((d) => d.id === "crm-sales"), departments.map((d) => d.id).join(", "));

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
  const placed = await saveEmployment(hr, member.collaborator.id, { departmentId: "crm-sales" });
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
  const said = explain(ghost, "crmSales.tickets.view");
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
// every section added to SECTION_DEFS after a studio existed reached new studios
// only. Quality was the first to land that way, and planting what is missing is
// the only reason the module is reachable at all in a studio created before it.
//
// R2 MOVED THE PLANTING OFF THE READ PATH — listSections no longer reconciles on
// every request (a pass on a list that changes approximately never). The defect
// this guards is unchanged: a studio predating a section must still get it. It is
// healed by the one-off backfill now — plantMissingSections, run from
// scripts/migrate/plant-sections.mjs when SECTION_DEFS gains a key — so this
// exercises that entry point, with every guarantee it used to make on read.
{
  const key = S.sections(studio.id);
  const before = await readArr(key);
  // Make this studio look like one created before Engineering & Documents
  // existed. It used to be Quality that was torn out here, and the
  // fifteen-section restructure made that the wrong choice rather than merely a
  // renamed one: what is left of Quality & HSE has NO children — the controlled
  // document register moved to Engineering & Documents — so tearing it out
  // could no longer exercise the half of this guard that matters, which is that
  // a planted parent brings its sub-sections with it. Engineering & Documents
  // has children, so it can.
  await writeArr(key, before.filter((x) => !String(x.key).startsWith("engineering-docs")));
  ok("the section is genuinely gone first",
    !(await readArr(key)).some((x) => x.key === "engineering-docs"));

  // A plain read no longer heals — it returns exactly what is stored (R2).
  const unhealed = await listSections(studio.id);
  ok("a plain read does NOT plant on the read path any more", !unhealed.some((x) => x.key === "engineering-docs"));

  const healed = await plantMissingSections(studio.id);
  ok("the backfill plants the parent", healed.some((x) => x.key === "engineering-docs"));
  ok("...and its sub-section", healed.some((x) => x.key === "engineering-docs-register"));
  const parent = healed.find((x) => x.key === "engineering-docs");
  const child = healed.find((x) => x.key === "engineering-docs-register");
  ok("...pointing at the parent it belongs to", child?.parentId === parent?.id);
  ok("...and placed in the nav where it belongs, not at the end",
    healed.findIndex((x) => x.key === "engineering-docs") < healed.findIndex((x) => x.key === "tasks"));

  // Planting must be idempotent, or every run mints a new SectionID and the
  // section's own data is orphaned behind it.
  const again = await plantMissingSections(studio.id);
  ok("running the backfill again plants nothing new", again.length === healed.length);
  ok("...and keeps the same SectionID", again.find((x) => x.key === "engineering-docs").id === parent.id);
  // And a subsequent plain read now sees the planted section, since it is stored.
  const afterRead = await listSections(studio.id);
  ok("a plain read sees the backfilled section", afterRead.some((x) => x.key === "engineering-docs"));
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
        "engineeringDocs.register.view", "engineeringDocs.register.create", "engineeringDocs.register.edit",
        "engineeringDocs.register.review", "engineeringDocs.register.approve",
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
  const asViewer = await workflowFor(await qualityContext(owner, slug), id, (p) => p !== "engineeringDocs.register.obsolete");
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
  // A ticket needs a service from the studio's own Service Actions, so the
  // fixture seeds the pool directly rather than posting an empty list.
  await updateStudio(studio.id, { serviceActions: ["Control systems"] });
  const salesCtx = await salesContext(owner, slug);
  const ticket = await createTicket(salesCtx, {
    title: "New control room", clientName: "Acme Industrial", deadline: "2026-12-01",
    industry: "Oil & Gas", serviceIds: ["Control systems"], contactName: "Sara Idris",
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
      overrides: { allow: ["engineeringDocs.register.view"], deny: [] },
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
  // Re-fetched after the write: `sales` above snapshotted `studio` before this
  // seeds the pool, and createTicket reads serviceActions off that snapshot.
  await updateStudio(studio.id, { serviceActions: ["Standalone"] });
  const salesFresh = await salesContext(owner, slug);
  const fresh = await createTicket(salesFresh, {
    title: "Nothing downstream yet", clientName: "Acme", deadline: "2027-01-01",
    industry: "Technology", serviceIds: ["Standalone"],
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
  const noSales = (p) => p !== "crmSales.tickets.view";
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
// SKIPS LOUDLY WITHOUT A BLOB TOKEN, the same shape tests/pg-parity.mjs uses
// for DATABASE_URL — a banner plus a visible per-test line, never a silent pass.
//
// REGRESSION: this block used to run unconditionally. Once the bytes moved out
// of Redis, `putMedia` needs a real Blob store, and `@vercel/blob` THROWS on a
// missing token rather than returning an error — so on a machine without one
// the suite did not fail an assertion, it died mid-run, taking every later
// block and Gate A with it. That is exactly what happened in CI, which has no
// BLOB_READ_WRITE_TOKEN: 0 failed assertions and a red build, which reads like
// an infrastructure problem rather than a missing secret.
//
// NOT SOLVED BY GIVING CI THE PRODUCTION TOKEN. CI gets an ephemeral redis:8
// container rather than the live Redis for a reason, and pointing it at the
// live Blob store would be the same mistake in a store where the namespace is
// a path prefix and a crashed run strands billed objects nobody is looking for.
// A separate Blob store for CI would be a real answer; until there is one, the
// coverage is honestly absent rather than quietly faked.
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.warn("  SKIPPED — BLOB_READ_WRITE_TOKEN is not set, so the media paths are NOT verified in this run");
  ok("skipped — media needs a Blob store, and this run has no token", true);
} else {
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

  // THE OBJECT PATHNAME CARRIES THE TEST NAMESPACE, asserted against the two
  // things that must agree with it rather than against a literal of its own.
  //
  // REGRESSION: `put` was called with a bare `media/${id}` while the Redis
  // record beside it went through MEDIA.blob() and was namespaced properly.
  // The suite therefore wrote its fixture objects into the LIVE Blob store
  // next to production's, and — because delPrefix then reaped the record that
  // named them — left them unreachable and unreclaimable, billed forever, one
  // more set per run. Both halves of the fix are asserted here: that the
  // pathname comes from the key builder (invariant 1), and that it falls
  // inside the scope tests/blob-sweep.mjs actually lists, since a namespaced
  // object the sweep cannot see leaks exactly as badly as an unnamespaced one.
  {
    const rec = await getMedia(pub.id);
    ok("an uploaded object's pathname comes from the key builder",
      rec.pathname === KEYS.MEDIA.object(pub.id), rec.pathname);
    ok("...and falls inside the scope the blob sweep lists",
      KEY_PREFIX ? rec.pathname.startsWith(`${KEY_PREFIX}media/`) : true, `prefix "${KEY_PREFIX}"`);
  }

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
console.log("== a studio's language is the tenant's, and it is a real setting");
// THERE IS NOWHERE IN THE URL TO PUT IT. A studio's address IS its slug —
// nompany.com/<slug>/… — so unlike the public site there is no /ar/ segment to
// read a locale from, and the root layout never touches the database, so it
// cannot resolve one either. The language is a field on the studio record,
// read by studioLocale and declared as lang/dir on the shell.
//
// Asserted because every step of that is silent when it goes wrong. A studio
// with no language reads as English and looks correct; a studio with a nonsense
// language would ALSO read as English and look correct; and the difference
// between "defaulted" and "quietly stored" is the whole of whether the setting
// works. Only the route can tell them apart, because updateStudio takes any
// patch it is handed — the allowlist is the boundary, not the writer.
{
  const langOwner = (await createUser({ email: `lang-${rand()}@test.invalid`, passwordHash: "x" })).user;
  const langSlug = `t-${rand()}${rand()}`;
  const madeLang = await createStudio({ ownerUserId: langOwner.id, name: "Language", slug: langSlug });
  ok("fixture studio created", !madeLang.error, madeLang.error);
  const langId = madeLang.studio.id;

  ok("a studio created without a language reads as English",
    studioLocale(madeLang.studio) === "en", JSON.stringify(madeLang.studio.language));
  ok("...and so does one predating the field entirely", studioLocale({}) === "en");

  await updateStudio(langId, { language: "ar" });
  const arabic = await getStudioBySlug(langSlug);
  ok("setting it to Arabic sticks", studioLocale(arabic) === "ar", String(arabic.language));
  ok("...and Arabic is the direction the shell declares", dirFor(studioLocale(arabic)) === "rtl");
  ok("...where English is not", dirFor(studioLocale(madeLang.studio)) === "ltr");

  await signInAs(langOwner.id);
  const refused = await SETTINGS.PUT(jsonReq({ language: "klingon" }), { params: params(langSlug) });
  ok("a language nobody has a dictionary for is accepted as a request", refused.status === 200);
  ok("...but the studio falls back to English rather than storing it",
    studioLocale(await getStudioBySlug(langSlug)) === "en",
    String((await getStudioBySlug(langSlug)).language));

  // And it has to reach the screen that renders the picker, which reads it off
  // this response and nowhere else.
  const shown = await SETTINGS.GET(new Request("http://localhost/test"), { params: params(langSlug) });
  const body = await shown.json();
  ok("the settings response carries the language, so the picker can show it",
    body.studio?.language === "en", JSON.stringify(body.studio?.language));

  await signInAs(owner.id);
}

// ============================================================================
console.log("== a person's own language overrides the studio's, and only theirs");
// THE STUDIO SETTING IS A DEFAULT, NOT A CEILING. It says what the company was
// set up in; the header's language menu says what one person reads it in, and
// that lives in a cookie because a studio's address has no room for a locale
// and a person belongs to more than one studio.
//
// Asserted because every branch of it fails silently. A cookie that is ignored
// looks exactly like a person who never set one; a cookie that wins when it
// holds nonsense would send an Arabic studio to English and look like the
// tenant setting had been lost. Only the resolver can tell the four apart, and
// it is a pure function precisely so this can check them without a request.
{
  ok("no preference falls back to the studio's own language",
    preferredLocale(undefined, "ar") === "ar");
  ok("...and an empty one does too", preferredLocale("", "ar") === "ar");
  ok("a preference the dictionaries know wins over the studio's",
    preferredLocale("en", "ar") === "en");
  ok("...in both directions", preferredLocale("ar", "en") === "ar");

  // The failure that would be invisible: a cookie is attacker-editable and
  // arrives as an arbitrary string. Falling back to the STUDIO rather than to
  // English is the difference between a bad cookie doing nothing and a bad
  // cookie silently un-translating an Arabic company.
  ok("a language nobody has a dictionary for falls back to the studio, not English",
    preferredLocale("klingon", "ar") === "ar", preferredLocale("klingon", "ar"));
  ok("...and with no studio to fall back to, to English",
    preferredLocale("klingon") === "en");

  // The direction follows the resolved language, not the tenant's — this is
  // what actually mirrors the layout, so a person on the override gets the
  // whole shell laid out their way rather than translated copy in a box the
  // wrong way round.
  ok("direction follows the person, not the company",
    dirFor(preferredLocale("ar", "en")) === "rtl" && dirFor(preferredLocale("en", "ar")) === "ltr");

  // The name is part of the contract: the client writes this cookie and the
  // studio page reads it, in two different files, and a rename in one of them
  // is a preference that saves and never applies.
  ok("the cookie the client writes is the cookie the server reads",
    UI_LANG_COOKIE === "lang", UI_LANG_COOKIE);
}

// ============================================================================
console.log("== studio settings enforces the right that used to grant nothing");
// administration.settings.view existed all through the fifteen-section
// restructure and enforced NOTHING: this GET checked membership and stopped
// there, so the right was grantable and granted nobody anything. It survived
// because the only thing that would have read it \u2014 the section lookup \u2014 was
// bypassed for this key on purpose.
//
// A right nothing can exercise is the dead capability the catalogue's own rule
// forbids (invariant 16), and gating the nav on it while leaving the endpoint
// open would have been worse than either: the screen would vanish while its
// data stayed readable by any member.
{
  await signInAs(nobody.user.id);
  const denied = await SETTINGS.GET(new Request("http://localhost/test"), { params: params(slug) });
  ok("a member holding none of it cannot read studio settings",
    denied.status === 403, String(denied.status));

  // AND THE BODY IS A REFUSAL, not a partial payload. A 403 carrying the
  // studio would be the same leak wearing a status code.
  const deniedBody = await denied.json();
  ok("...and the response carries no studio at all",
    deniedBody.studio === undefined, JSON.stringify(Object.keys(deniedBody)));

  // THE OWNER STILL READS IT. The owner short-circuit in effectivePermissions
  // is what makes this pass without granting anything explicitly, and the two
  // existing SETTINGS.GET callers in this file rely on it \u2014 which is why
  // adding the check did not move them.
  await signInAs(owner.id);
  const allowed = await SETTINGS.GET(new Request("http://localhost/test"), { params: params(slug) });
  ok("...and somebody holding the right still can", allowed.status === 200, String(allowed.status));
}

// ============================================================================
console.log("== the settings payload displays the field of work, but does not write it");
// settings/service-actions/route.ts is the SOLE writer of fieldOfWork,
// fieldOfWorkOther, serviceActions and retiredServiceActions — choosing a field
// re-seeds the pool from the matrix and a removed-but-used action is retired,
// not deleted, and that guarantee only holds if there is exactly one door onto
// it. This route only DISPLAYS the four fields; asserted here so a future
// convenience write through the general allowlist would fail loudly rather
// than silently reintroducing the second write path.
{
  await signInAs(owner.id);
  const s = await (await SETTINGS.GET(new Request("http://localhost/test"), { params: params(slug) })).json();
  ok("settings carries the field of work", "fieldOfWork" in s.studio, JSON.stringify(Object.keys(s.studio)));
  ok("settings carries the retired actions", Array.isArray(s.studio.retiredServiceActions));

  // A direct write of serviceActions through the general route is a no-op: the
  // key is not in FIELDS, so it is silently dropped from the patch rather than
  // stored — the dedicated route's tests cover the actual write path.
  const before = await getStudioBySlug(slug);
  const attempt = await SETTINGS.PUT(jsonReq({ serviceActions: ["Nope"] }), { params: params(slug) });
  ok("a bare serviceActions write through /settings is refused as an empty patch",
    attempt.status === 400, String(attempt.status));
  const after = await getStudioBySlug(slug);
  ok("...and the studio's pool is unchanged",
    JSON.stringify(after.serviceActions || []) === JSON.stringify(before.serviceActions || []),
    JSON.stringify({ before: before.serviceActions, after: after.serviceActions }));
}

// ============================================================================
console.log("== MUI mirrors, because a plugin rewrites its CSS as it is serialised");
// EVERYTHING ELSE IN THE STUDIO MIRRORS FROM ONE ATTRIBUTE. `dir="rtl"` on the
// shell flips ps-/pe-, ms-/me- and border-s-, because those are logical
// properties and the browser owns them. MUI is the exception: it emits physical
// CSS — padding-left, margin-right, left: 0 — from Emotion at runtime, so no
// attribute can turn it round. The Data Grid, the date/time pickers and
// Autocomplete are the three places that matters.
//
// stylis-plugin-rtl is what rewrites it, and this asserts the rewrite rather
// than the install. A plugin that loads but no longer flips — a stylis major,
// an API change, a bad resolution — is indistinguishable from a working one
// until somebody opens an Arabic studio and finds the grid pointing the wrong
// way. Five properties, one of each kind it has to handle.
{
  ok("the plugin resolves to a function at all", typeof rtlPlugin === "function",
    `${typeof rtlPlugin}`);

  const css = ".x{padding-left:8px;margin-right:4px;text-align:left;border-top-left-radius:6px;left:0;}";
  const out = serialize(compile(css), middleware([prefixer, rtlPlugin, stringify]));

  ok("padding-left becomes padding-right", out.includes("padding-right:8px"), out);
  ok("...and margin-right becomes margin-left", out.includes("margin-left:4px"), out);
  ok("...and text-align flips", out.includes("text-align:right"), out);
  ok("...and a corner radius moves with it", out.includes("border-top-right-radius:6px"), out);
  ok("...and an absolute edge does too", out.includes("right:0"), out);
  ok("nothing physical is left pointing the old way",
    !/padding-left|margin-right|text-align:left|border-top-left-radius|[^-]left:0/.test(out), out);
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
  const groups = ["REG", "U", "S", "SEC", "IX", "OTP", "CHAT", "FX", "RL", "STAT", "MEDIA", "ENG"];
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
console.log("\n== Main executive: pure derivations");
{
  const rows = [
    { id: "a", createdAt: "2026-08-25T09:00:00" },
    { id: "b", createdAt: "2026-08-25T18:00:00" },
    { id: "c", createdAt: "2026-08-24T10:00:00" },
    { id: "old", createdAt: "2026-01-01T00:00:00" },
  ];
  const series = activityByDay(rows, 30, "2026-08-25");
  ok("activity is one entry per day", series.length === 30, String(series.length));
  ok("today counts both of today's rows", series[29].value === 2, JSON.stringify(series[29]));
  ok("yesterday counts one", series[28].value === 1, JSON.stringify(series[28]));
  ok("a row outside the window is excluded", series.reduce((s, x) => s + x.value, 0) === 3, "old row leaked");

  const p = periodDelta(rows, "createdAt", { start: "2026-07-01", mid: "2026-08-01", end: "2026-09-01" });
  ok("period delta counts the current window", p.current === 3, String(p.current));
  ok("nothing in the prior window", p.previous === 0, String(p.previous));
  ok("a percentage on a zero base is null, not +100%", p.deltaPct === null, String(p.deltaPct));
}

// ============================================================================
console.log("\n== Main rollup: key builder and source list");
{
  ok("S.mainAgg is namespaced under the studio", S.mainAgg("stud_1").endsWith("s:stud_1:mainagg"), S.mainAgg("stud_1"));
  ok("six tracked sources", MAIN_AGG_SOURCES.length === 6, String(MAIN_AGG_SOURCES.length));
  ok("sources carry the tracked collections", MAIN_AGG_SOURCES.map((s) => s.collection).includes("salesTickets"));
  ok("utcDay is a YYYY-MM-DD string", /^\d{4}-\d{2}-\d{2}$/.test(utcDay("2026-08-25T09:00:00Z")) && utcDay("2026-08-25T23:59:59Z") === "2026-08-25");
  ok("aggField composes id and day", aggField("sec_1", "2026-08-25") === "sec_1:day:2026-08-25");
}

// ============================================================================
console.log("\n== Main rollup: the write path increments the rollup");
{
  // The fixture studio is shared across the whole suite, so earlier blocks
  // (createTicket etc.) have already bumped this section's field today —
  // assert the DELTA this block causes, not an absolute value.
  const sec = await getSectionByKey(studio.id, "crm-sales-tickets");
  const today = utcDay();
  const field = aggField(sec.id, today);
  const before = await hGetAll(S.mainAgg(studio.id));
  const baseline = Number(before[field] || 0);

  await addRow(studio.id, sec.id, "salesTickets", { title: "A", createdAt: `${today}T09:00:00Z` });
  await addRow(studio.id, sec.id, "salesTickets", { title: "B", createdAt: `${today}T10:00:00Z` });
  await addRow(studio.id, sec.id, "notes", { body: "untracked" }); // not a tracked collection

  // addRow's own call is `void`-ed (fire-and-forget, §3) so it must not join the
  // write's latency or failure path — but that means it can race this assertion.
  // Settle by polling hGetAll briefly rather than awaiting a second bump, which
  // would double-count instead of observing the same one.
  let hash = before;
  for (let i = 0; i < 20; i++) {
    hash = await hGetAll(S.mainAgg(studio.id));
    if (Number(hash[field] || 0) === baseline + 2) break;
    await new Promise((r) => setTimeout(r, 25));
  }
  ok("two tracked creates count as +2 on today's field", Number(hash[field] || 0) === baseline + 2, JSON.stringify({ before: baseline, after: hash[field] }));
  ok(
    "an untracked collection writes no rollup field (no third bump)",
    Number(hash[field] || 0) !== baseline + 3,
    JSON.stringify({ before: baseline, after: hash[field] }),
  );
}

// ============================================================================
console.log("\n== Main rollup: the reconcile rebuilds from live rows and fails closed");
{
  const prevSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-secret";
  const sec = await getSectionByKey(studio.id, "crm-sales-tickets");
  const today = utcDay();
  // Seed three creates today, one far outside the 90-day horizon.
  await addRow(studio.id, sec.id, "salesTickets", { title: "1", createdAt: `${today}T01:00:00Z` });
  await addRow(studio.id, sec.id, "salesTickets", { title: "2", createdAt: `${today}T02:00:00Z` });
  await addRow(studio.id, sec.id, "salesTickets", { title: "3", createdAt: `${today}T03:00:00Z` });
  await addRow(studio.id, sec.id, "salesTickets", { title: "old", createdAt: "2020-01-01T00:00:00Z" });
  // Plant a stale field the reconcile must prune, by name.
  await hSet(S.mainAgg(studio.id), aggField(sec.id, "2019-01-01"), 99);

  // The shared `studio` fixture is bumped by every earlier block in this
  // suite, so today's field is not "3" — it is whatever the live rows add up
  // to. The reconcile is a rebuild-and-replace, not a delta, so the only
  // correct assertion is equality against the true live count, counted
  // independently from the same collection the route itself reads.
  const liveToday = (await readCol(studio.id, sec.id, "salesTickets"))
    .filter((r) => String(r.createdAt || "").slice(0, 10) === today).length;

  const authed = new Request("http://x/api/cron/main-rollup", { headers: { authorization: "Bearer test-secret" } });
  const res = await MAIN_ROLLUP(authed);
  ok("reconcile returns ok", res.status === 200, String(res.status));

  const hash = await hGetAll(S.mainAgg(studio.id));
  ok(
    "today's field equals the true live-row count, not a delta",
    hash[aggField(sec.id, today)] === String(liveToday),
    JSON.stringify({ field: hash[aggField(sec.id, today)], liveToday }),
  );
  ok("the out-of-horizon create is not in the rollup", !(aggField(sec.id, "2020-01-01") in hash), JSON.stringify(hash));
  ok("the planted stale field was pruned by name", !(aggField(sec.id, "2019-01-01") in hash), JSON.stringify(hash));
  ok("a refreshedAt stamp is set", typeof hash["meta:refreshedAt"] === "string" && hash["meta:refreshedAt"].length > 0);

  const denied = await MAIN_ROLLUP(new Request("http://x/api/cron/main-rollup")); // no auth
  ok("reconcile refuses an unauthenticated request", denied.status === 401 || denied.status === 503, String(denied.status));
  process.env.CRON_SECRET = prevSecret;
}

// ============================================================================
console.log("\n== Main rollup: count→series helpers match the row-based derivation");
{
  const counts = { "2026-08-25": 2, "2026-08-24": 1, "2026-07-15": 5 };
  const s = activitySeriesFromCounts(counts, 30, "2026-08-25");
  ok("series is one entry per day", s.length === 30, String(s.length));
  ok("today reads its count", s[29].value === 2, JSON.stringify(s[29]));
  ok("a day outside the window is excluded", s.reduce((a, x) => a + x.value, 0) === 3, "leaked");
  const t = trendFromCounts(counts, { start: "2026-07-01", mid: "2026-08-01", end: "2026-09-01" });
  ok("current window sums August", t.current === 3, String(t.current));
  ok("prior window sums July", t.previous === 5, String(t.previous));
  ok("delta is a real percentage", t.deltaPct === -40, String(t.deltaPct));
}

// ============================================================================
console.log("\n== Main rollup: the oracle — rollup equals on-read, to the unit");
{
  const prevSecret = process.env.CRON_SECRET;
  const prevFlag = process.env.MAIN_ROLLUP_READ;
  process.env.CRON_SECRET = "test-secret";
  const sec = await getSectionByKey(studio.id, "crm-sales-tickets");
  const today = utcDay();
  await addRow(studio.id, sec.id, "salesTickets", { title: "x", createdAt: `${today}T04:00:00Z` });
  const reconciled = await MAIN_ROLLUP(
    new Request("http://x/api/cron/main-rollup", { headers: { authorization: "Bearer test-secret" } }),
  );
  ok("reconcile ran before the oracle compares", reconciled.status === 200, String(reconciled.status));

  const ctx = await mainContext(owner, slug);
  ok("mainContext resolved for the owner", !ctx.error, JSON.stringify(ctx.error || null));

  process.env.MAIN_ROLLUP_READ = "";
  const onread = await readAggregate(ctx, today);
  process.env.MAIN_ROLLUP_READ = "true";
  const rolled = await readAggregate(ctx, today);
  process.env.MAIN_ROLLUP_READ = prevFlag ?? "";

  ok("rollup activity equals on-read activity", JSON.stringify(rolled.activity) === JSON.stringify(onread.activity), "activity mismatch");
  ok("rollup trends equal on-read trends", JSON.stringify(rolled.trends) === JSON.stringify(onread.trends), "trends mismatch");
  ok("rollup ribbon equals on-read ribbon", JSON.stringify(rolled.ribbon) === JSON.stringify(onread.ribbon), "ribbon mismatch");
  process.env.CRON_SECRET = prevSecret;
}

// ============================================================================
console.log("\n== Main rollup: visibility survives aggregation");
{
  // Seed a create in a tracked section, populate the rollup via reconcile, then
  // read as a collaborator who holds no role at all — no section grants, so no
  // rollup figure for it either (invariant 2: a section the viewer cannot see
  // is never read, not read and hidden).
  const prevSecret = process.env.CRON_SECRET;
  const prevFlag = process.env.MAIN_ROLLUP_READ;
  process.env.CRON_SECRET = "test-secret";
  const sec = await getSectionByKey(studio.id, "crm-sales-tickets");
  await addRow(studio.id, sec.id, "salesTickets", { title: "secret", createdAt: `${utcDay()}T05:00:00Z` });
  const reconciled = await MAIN_ROLLUP(
    new Request("http://x/api/cron/main-rollup", { headers: { authorization: "Bearer test-secret" } }),
  );
  ok("reconcile ran before the visibility read", reconciled.status === 200, String(reconciled.status));

  const noRoleCtx = await mainContext(nobody.user, slug);
  ok("mainContext resolved for a member with no role", !noRoleCtx.error, JSON.stringify(noRoleCtx.error || null));

  process.env.MAIN_ROLLUP_READ = "true";
  const agg = await readAggregate(noRoleCtx, utcDay());
  process.env.MAIN_ROLLUP_READ = prevFlag ?? "";
  ok("a member without the section gets no rollup activity for it",
    !agg.activity.some((a) => a.section === "crm-sales-tickets"), JSON.stringify(agg.activity));
  process.env.CRON_SECRET = prevSecret;
}

// ============================================================================
console.log("\n== Main executive: the awaiting-you queue orders by age");
{
  const items = [
    { kind: "task", section: "tasks", id: "t2", label: "Approve PO", at: "2026-08-20T00:00:00" },
    { kind: "quotation", section: "crm-sales-quotations", id: "q1", label: "Q-1001", at: "2026-08-24T00:00:00" },
    { kind: "task", section: "tasks", id: "t1", label: "Review RFQ", at: "2026-08-10T00:00:00" },
  ];
  const ranked = rankQueue(items);
  ok("oldest waiting item is first", ranked[0].id === "t1", ranked[0].id);
  ok("newest waiting item is last", ranked[2].id === "q1", ranked[2].id);
  ok("nothing is dropped", ranked.length === 3, String(ranked.length));
}

// ============================================================================
console.log("\n== Shared shell: drill-down deep-links into the department screen");
ok("bare link is the section screen", drillHref("acme", "crm-sales-tickets") === "/acme/crm-sales-tickets", drillHref("acme", "crm-sales-tickets"));
ok("a filter rides as a query", drillHref("acme", "crm-sales-tickets", { status: "open" }) === "/acme/crm-sales-tickets?status=open");

// ============================================================================
console.log("\n== Shared shell: fiscal-aware preset ranges");
{
  const m = presetRange("month", "2026-08-25", 1);
  ok("this month starts on the 1st", m.start === "2026-08-01", m.start);
  ok("this month ends at next month's 1st (exclusive)", m.end === "2026-09-01", m.end);
  const y = presetRange("year", "2026-08-25", 1);
  ok("calendar year starts in January", y.start === "2026-01-01", y.start);
  const fy = presetRange("year", "2026-08-25", 4); // fiscal year starts April
  ok("a fiscal year starting in April rolls back to this April", fy.start === "2026-04-01", fy.start);
}

// ============================================================================
console.log("\n== Shared shell: CSV export escapes honestly");
{
  const rows = [{ name: "Acme, Inc", owed: 250 }, { name: 'He said "hi"', owed: 90 }];
  const csv = toCSV(rows, [{ key: "name", header: "Client" }, { key: "owed", header: "Owed" }]);
  ok("header row first", csv.split("\n")[0] === "Client,Owed", csv.split("\n")[0]);
  ok("a comma forces quoting", csv.includes('"Acme, Inc"'), csv);
  ok("an inner quote is doubled", csv.includes('"He said ""hi"""'), csv);
}

// ============================================================================
console.log("== fields of work: the matrix cannot drift from its actions");
{
  ok("there are 20 standard service actions", SERVICE_ACTIONS.length === 20, String(SERVICE_ACTIONS.length));
  ok("there are 25 fields of work", FIELDS_OF_WORK.length === 25, String(FIELDS_OF_WORK.length));

  const actionSet = new Set(SERVICE_ACTIONS);
  const strayValues = Object.entries(FIELD_ACTION_MATRIX)
    .flatMap(([f, acts]) => acts.filter((a) => !actionSet.has(a)).map((a) => `${f}:${a}`));
  ok("every matrix value is one of the 20 actions", strayValues.length === 0, strayValues.join(", "));

  const missingRows = FIELDS_OF_WORK.filter((f) => !Array.isArray(FIELD_ACTION_MATRIX[f]));
  ok("every field has a matrix row", missingRows.length === 0, missingRows.join(", "));

  ok("actionsForField returns a field's row", actionsForField("Manufacturing").includes("Fabrication / Manufacturing"));
  ok("actionsForField('Other') seeds nothing", actionsForField(OTHER_FIELD).length === 0);
  ok("actionsForField(unknown) seeds nothing", actionsForField("Nope").length === 0);
}

// ============================================================================
console.log("== service-action pool: remove is retire, not delete");
{
  // Removing a referenced action carries it into retired, not out of existence.
  const a = nextPool({
    prevActive: ["Installation", "Training"], prevRetired: [],
    nextActive: ["Installation"], referenced: new Set(["Training"]),
  });
  ok("a referenced removed action is retired", a.retiredServiceActions.includes("Training"));
  ok("...and leaves the active pool", !a.serviceActions.includes("Training"));

  // Removing an UNreferenced action just drops it — nothing carries it.
  const b = nextPool({
    prevActive: ["Installation", "Training"], prevRetired: [],
    nextActive: ["Installation"], referenced: new Set(),
  });
  ok("an unreferenced removed action is dropped", !b.retiredServiceActions.includes("Training"));

  // Re-adding a retired action un-retires it.
  const c = nextPool({
    prevActive: ["Installation"], prevRetired: ["Training"],
    nextActive: ["Installation", "Training"], referenced: new Set(["Training"]),
  });
  ok("re-adding un-retires", c.serviceActions.includes("Training") && !c.retiredServiceActions.includes("Training"));

  // A retired action whose last item is gone is pruned on the next write.
  const d = nextPool({
    prevActive: ["Installation"], prevRetired: ["Training"],
    nextActive: ["Installation"], referenced: new Set(),
  });
  ok("a retired action nothing references is pruned", d.retiredServiceActions.length === 0);

  // Edited pool is limited to the standard 20 plus surviving legacy names.
  ok("a non-standard new action is rejected", !cleanNextActive(["Made Up"], ["Installation"]).includes("Made Up"));
  ok("a legacy name in prevActive survives", cleanNextActive(["Legacy Thing"], ["Legacy Thing"]).includes("Legacy Thing"));
  ok("a standard action is accepted", cleanNextActive(["Commissioning"], []).includes("Commissioning"));
}

// ============================================================================
console.log("== inventory scope carries a retired action, it does not drop it");
{
  await updateStudio(studio.id, { serviceActions: ["Installation", "Training"], retiredServiceActions: [] });
  const ic = await inventoryContext(owner, slug);
  const item = await createItem(ic, { name: `Scoped ${rand()}`, unit: "pcs", scope: ["Installation", "Training"] });
  ok("an item scopes to two live actions", (item.item?.scope || []).length === 2, JSON.stringify(item));

  // Training is removed from the pool but retired because this item still uses it.
  await updateStudio(studio.id, { serviceActions: ["Installation"], retiredServiceActions: ["Training"] });
  const ic2 = await inventoryContext(owner, slug);
  const again = await editItem(ic2, item.item.id, { name: item.item.name, unit: "pcs", scope: ["Installation", "Training"] });
  ok("re-saving keeps the retired action in scope", (again.item?.scope || []).includes("Training"), JSON.stringify(again));

  // A truly unknown action (neither active nor retired) is still filtered out.
  const ic3 = await inventoryContext(owner, slug);
  const filtered = await editItem(ic3, item.item.id, { name: item.item.name, unit: "pcs", scope: ["Installation", "Nonsense"] });
  ok("an unknown action is still dropped", !(filtered.item?.scope || []).includes("Nonsense"), JSON.stringify(filtered));
}

// ============================================================================
console.log("== service-actions endpoint: a field seeds the pool, removal retires");
{
  await signInAs(owner.id);

  // Choosing a field seeds serviceActions from the matrix row.
  const seed = await SVC_ACTIONS.PUT(jsonReq({ fieldOfWork: "Manufacturing" }), { params: params(slug) });
  ok("setting a field of work is accepted", seed.status === 200, String(seed.status));
  const afterSeed = await (await SVC_ACTIONS.GET(new Request("http://localhost/test"), { params: params(slug) })).json();
  ok("the pool is the field's matrix row", afterSeed.serviceActions.includes("Fabrication / Manufacturing"));
  ok("the chosen field is echoed back", afterSeed.fieldOfWork === "Manufacturing");
  ok("the endpoint offers all 25 fields", afterSeed.options.fields.length === 25);

  // An item scoped to one action; removing that action retires it (carry).
  const ic = await inventoryContext(owner, slug);
  await createItem(ic, { name: `Ep ${rand()}`, unit: "pcs", scope: ["Installation"] });
  const withoutInstall = afterSeed.serviceActions.filter((a) => a !== "Installation");
  const edit = await SVC_ACTIONS.PUT(jsonReq({ serviceActions: withoutInstall }), { params: params(slug) });
  ok("editing the pool is accepted", edit.status === 200, String(edit.status));
  const afterEdit = await (await SVC_ACTIONS.GET(new Request("http://localhost/test"), { params: params(slug) })).json();
  ok("the removed-but-used action is retired", afterEdit.retiredServiceActions.includes("Installation"));
  ok("...and usage reports the item count", afterEdit.usage["Installation"] >= 1, JSON.stringify(afterEdit.usage));

  // "Other" seeds nothing.
  await SVC_ACTIONS.PUT(jsonReq({ fieldOfWork: "Other", fieldOfWorkOther: "Bespoke" }), { params: params(slug) });
  const other = await (await SVC_ACTIONS.GET(new Request("http://localhost/test"), { params: params(slug) })).json();
  ok("Other seeds an empty pool", other.serviceActions.length === 0, JSON.stringify(other.serviceActions));
  ok("Other keeps its typed label", other.fieldOfWorkOther === "Bespoke");

  // A member with no role (not a non-member — nobody has a collaborator row,
  // just no roleId, so no grant reaches studio.settings.edit) cannot edit.
  await signInAs(nobody.user.id);
  // usage is manager-only: it exists to warn the manage-side edit alerts
  // ("N items use this action"), which a view-only member never sees, so the
  // route must not hand a viewer per-action inventory counts, and must not
  // even do the inventory read to produce them.
  const nobodyGet = await (await SVC_ACTIONS.GET(new Request("http://localhost/test"), { params: params(slug) })).json();
  ok("a member without settings.edit gets no usage counts",
    Object.keys(nobodyGet.usage || {}).length === 0 && nobodyGet.canManage === false, JSON.stringify(nobodyGet));
  const denied = await SVC_ACTIONS.PUT(jsonReq({ serviceActions: [] }), { params: params(slug) });
  ok("someone without settings.edit is refused", denied.status === 403, String(denied.status));

  // A TRUE non-member — no collaborator row in this studio at all — learns
  // nothing about the contents, on both verbs. studioContext returns
  // "forbidden" before either handler runs, same door as every other route.
  const svcOutsider = (await createUser({ email: `svc-outsider-${rand()}@test.invalid`, passwordHash: "x" })).user;
  await signInAs(svcOutsider.id);
  const outsiderGet = await SVC_ACTIONS.GET(new Request("http://localhost/test"), { params: params(slug) });
  ok("a non-member's GET of service-actions is refused, not answered",
    outsiderGet.status === 403 || outsiderGet.status === 404, String(outsiderGet.status));
  const outsiderPut = await SVC_ACTIONS.PUT(jsonReq({ serviceActions: [] }), { params: params(slug) });
  ok("...and so is its PUT",
    outsiderPut.status === 403 || outsiderPut.status === 404, String(outsiderPut.status));

  await signInAs(owner.id);
}

// ============================================================================
console.log("== service-actions: settings.edit without inventory view must never drop a referenced action");
{
  // FINDING B (final-review). serviceActionUsage used to read inventory through
  // inventoryContext(user, slug), which is gated on the CALLER's
  // inventory.items.view — but the route that decides retire-vs-drop gates only
  // on studio.settings.edit, and a role can hold that WITHOUT any inventory
  // right. Under that combination the usage read came back `{}` (forbidden),
  // "referenced" was empty, and a still-referenced action was DROPPED instead
  // of retired — landing in neither serviceActions nor retiredServiceActions,
  // so inventory's cleanScope no longer recognised it and the next item edit
  // silently stripped it from scope. This proves the carry now holds even when
  // the acting collaborator cannot see Inventory at all.
  await signInAs(owner.id);
  await updateStudio(studio.id, { serviceActions: ["Installation", "Training"], retiredServiceActions: [] });
  const ic = await inventoryContext(owner, slug);
  const scoped = await createItem(ic, { name: `Gap ${rand()}`, unit: "pcs", scope: ["Training"] });
  ok("an item scopes to Training before the gap is exercised",
    (scoped.item?.scope || []).includes("Training"), JSON.stringify(scoped));

  // A role holding ONLY studio.settings.edit — no inventory.* permission at all,
  // so inventoryContext(user, slug) for this person resolves { error: "forbidden" }.
  const settingsOnly = await createRole(studio.id, {
    name: `SettingsOnly ${rand()}`, permissions: ["administration.settings.edit"],
  });
  const gap = await person("GapAdmin", null);
  await updateCollaborator(studio.id, gap.collaborator.id, { roleIds: [settingsOnly.id] });
  const gapCtx = await studioContext(gap.user, slug);
  ok("the fixture role really does hold administration.settings.edit but not inventory view",
    gapCtx.access.has("administration.settings.edit") && !gapCtx.access.has("inventory.items.view"),
    JSON.stringify([...gapCtx.access]));

  await signInAs(gap.user.id);
  const before = await (await SVC_ACTIONS.GET(new Request("http://localhost/test"), { params: params(slug) })).json();
  // THE FIX, asserted directly: `usage` is complete for this caller even though
  // they hold no inventory.* right at all — serviceActionUsage no longer routes
  // through the caller's own inventory grant, so there is nothing left to be
  // incomplete about. Before the fix this came back `{}` (inventoryContext's
  // own forbidden refusal), which is the exact hole the removal below exploited.
  ok("this caller's usage read is COMPLETE despite holding no inventory permission",
    before.usage?.Training === 1, JSON.stringify(before.usage));

  const withoutTraining = (before.serviceActions || []).filter((a) => a !== "Training");
  const put = await SVC_ACTIONS.PUT(jsonReq({ serviceActions: withoutTraining }), { params: params(slug) });
  ok("the settings-only admin's removal is accepted", put.status === 200, String(put.status));
  const after = await put.json();
  ok("Training is RETIRED, not dropped, though this caller cannot see inventory",
    (after.retiredServiceActions || []).includes("Training"), JSON.stringify(after));
  ok("...and it left the active pool", !(after.serviceActions || []).includes("Training"), JSON.stringify(after));

  // The carry actually protected the row: the item keeps its scope on a later edit.
  await signInAs(owner.id);
  const ic2 = await inventoryContext(owner, slug);
  const resaved = await editItem(ic2, scoped.item.id, { name: scoped.item.name, unit: "pcs", scope: ["Training"] });
  ok("the item's scope still carries Training after the permission gap",
    (resaved.item?.scope || []).includes("Training"), JSON.stringify(resaved));
}

// ============================================================================
console.log("== service-actions: an action a TICKET names must retire, not drop");
{
  // THE REFERRER THE USAGE QUERY DID NOT KNOW ABOUT. serviceActionUsage counted
  // inventory item scopes ONLY. That was complete right up until services moved
  // from the Sales-owned catalogue to Studio Settings -> Service Actions, at which
  // point a TICKET became a referrer too — and an action this query misses is
  // reported unreferenced, so nextPool DROPS it instead of retiring it. It then
  // lands in neither serviceActions nor retiredServiceActions, cleanServiceIds
  // no longer recognises it, and the next edit of that ticket silently strips it
  // from the ticket's scope: data loss reached from a settings screen, with no
  // inventory item involved anywhere.
  await signInAs(owner.id);
  await updateStudio(studio.id, { serviceActions: ["Installation", "Commissioning"], retiredServiceActions: [] });

  const salesForPool = await salesContext(owner, slug);
  const poolTicket = await createTicket(salesForPool, {
    title: `Pool referrer ${rand()}`, clientName: "Acme", deadline: "2031-12-01",
    industry: "Technology", serviceIds: ["Commissioning"],
  });
  ok("a ticket names Commissioning, and no inventory item does",
    (poolTicket.ticket?.serviceIds || []).includes("Commissioning"), JSON.stringify(poolTicket.error));

  const usageRes = await (await SVC_ACTIONS.GET(new Request("http://localhost/test"), { params: params(slug) })).json();
  ok("the usage query counts the ticket's reference",
    usageRes.usage?.Commissioning >= 1, JSON.stringify(usageRes.usage));

  const withoutIt = (usageRes.serviceActions || []).filter((a) => a !== "Commissioning");
  const putRes = await SVC_ACTIONS.PUT(jsonReq({ serviceActions: withoutIt }), { params: params(slug) });
  ok("removing it from the pool is accepted", putRes.status === 200, String(putRes.status));
  const afterPool = await putRes.json();
  ok("Commissioning is RETIRED, not dropped, on a ticket's reference alone",
    (afterPool.retiredServiceActions || []).includes("Commissioning"), JSON.stringify(afterPool));
  ok("...and it left the active pool",
    !(afterPool.serviceActions || []).includes("Commissioning"), JSON.stringify(afterPool));
}

// ============================================================================
console.log("== the flow editor: a studio owns its flows, and a refusal says why");
{
  await signInAs(owner.id);
  const req = (path = "") => new Request(`http://localhost/test${path}`);

  const seen = await (await FLOWS.GET(req(), { params: params(slug) })).json();
  ok("a studio reads the seven built-in flows", seen.templates?.length === 7, String(seen.templates?.length));
  // THE WARNING THIS SCREEN OWES ANYBODY ABOUT TO CHANGE A FLOW. Editing a
  // template changes what every deal on it shows, which stages it still invites
  // and what may attach to it — and the editor had no idea any of them existed.
  // Service Actions next door has warned "N items use this action" since the day
  // removing one could silently drop a ticket's scope.
  //
  // Counted from the engagement ROOTS rather than from ENG.hasStage: that index
  // looks like exactly what this wants, but applyDescriptor never writes it, so
  // it does not know about the deals every ticket mints.
  ok("the flows report how many deals already walk them",
    (seen.usage?.deals?.A ?? 0) >= 1, JSON.stringify(seen.usage));
  ok("...and say whether that count is the whole picture or a floor",
    seen.usage?.capped === false && seen.usage?.scanned >= 1, JSON.stringify(seen.usage));

  ok("...and the twenty-five industries", seen.industries?.length === 25, String(seen.industries?.length));
  ok("...and is told it may edit them", seen.canManage === true);

  // A REFUSAL IS 400 AND CARRIES ITS REASON. This is the whole reason flows.ts
  // validates on write rather than on read: "statusChain names X, which it does
  // not use" is something the studio can act on while it is still their edit.
  // A bare code, or the 500 a thrown Error would become, throws that away.
  const bad = await FLOWS.PUT(jsonReq({
    template: {
      id: "A", name: "Ours", stages: ["ticket"], heads: ["ticket"],
      statusChain: ["project"], billingTrigger: "progress",
      costDrivers: [], cardinalityOverrides: {},
    },
  }), { params: params(slug) });
  const badBody = await bad.json();
  ok("a template naming a stage it does not use is refused", bad.status === 400, String(bad.status));
  ok("...and the reason reaches the studio, in words about their edit",
    badBody.error === "refused" && badBody.detail.includes("which it does not use"),
    JSON.stringify(badBody).slice(0, 120));

  // THE TWO templateProblems DID NOT CHECK until a tenant could type them. Both
  // are invisible at runtime: a nameless flow cannot be picked from the list an
  // industry must choose from, and a billingTrigger outside the seven matches
  // nothing, surfacing later as revenue that never triggered.
  const nameless = await FLOWS.PUT(jsonReq({
    template: {
      id: "Z", name: "", stages: ["ticket"], heads: ["ticket"], statusChain: ["ticket"],
      billingTrigger: "progress", costDrivers: [], cardinalityOverrides: {},
    },
  }), { params: params(slug) });
  ok("a nameless template is refused", nameless.status === 400, String(nameless.status));
  const noTrigger = await FLOWS.PUT(jsonReq({
    template: {
      id: "Z", name: "Z", stages: ["ticket"], heads: ["ticket"], statusChain: ["ticket"],
      billingTrigger: "whenever", costDrivers: [], cardinalityOverrides: {},
    },
  }), { params: params(slug) });
  const triggerBody = await noTrigger.json();
  ok("a billingTrigger outside the seven is refused, and named",
    noTrigger.status === 400 && String(triggerBody.detail).includes("billingTrigger"),
    JSON.stringify(triggerBody).slice(0, 120));

  // A GOOD EDIT IS AN OVERRIDE, not a fork: the other six stay built-in.
  const good = await FLOWS.PUT(jsonReq({
    template: {
      id: "A", name: "Contracting (ours)", stages: ["ticket", "quotation", "project"],
      heads: ["ticket"], statusChain: ["project", "ticket"], billingTrigger: "progress",
      costDrivers: ["timesheet"], cardinalityOverrides: {},
    },
  }), { params: params(slug) });
  ok("a valid edit is accepted", good.status === 200, String(good.status));
  const edited = await (await FLOWS.GET(req(), { params: params(slug) })).json();
  ok("...and editing a built-in does not add an eighth", edited.templates.length === 7);
  ok("...and the edit is what the studio now reads",
    edited.templates.find((t) => t.id === "A")?.name === "Contracting (ours)");
  ok("...while the other six are untouched",
    edited.templates.find((t) => t.id === "G")?.name === "Recurring Contract");

  // AN INDUSTRY IS CHECKED AGAINST THIS STUDIO'S TEMPLATES, not the built-ins.
  const badIndustry = await FLOWS.PUT(jsonReq({
    industry: { key: "made-up", name: "Made Up", primary: "ZZ", secondary: "", note: "" },
  }), { params: params(slug) });
  ok("an industry pointing at a template that does not exist is refused",
    badIndustry.status === 400, String(badIndustry.status));
  const goodIndustry = await FLOWS.PUT(jsonReq({
    industry: { key: "made-up", name: "Made Up", primary: "A", secondary: "", note: "ours" },
  }), { params: params(slug) });
  ok("...and one pointing at a real template is accepted", goodIndustry.status === 200);
  const withIndustry = await (await FLOWS.GET(req(), { params: params(slug) })).json();
  ok("a new industry appends a twenty-sixth", withIndustry.industries.length === 26,
    String(withIndustry.industries.length));

  // DELETING AN OVERRIDE REVERTS TO THE BUILT-IN — one operation, and which it
  // is depends only on whether a seed exists underneath.
  const reverted = await FLOWS.DELETE(req("?template=A"), { params: params(slug) });
  ok("dropping an override reports that one existed", (await reverted.json()).existed === true);
  const afterRevert = await (await FLOWS.GET(req(), { params: params(slug) })).json();
  ok("...and the built-in is back",
    afterRevert.templates.find((t) => t.id === "A")?.name === "Contracting / Project");
  const again = await FLOWS.DELETE(req("?template=A"), { params: params(slug) });
  ok("...and a second drop is a no-op, not an error",
    again.status === 200 && (await again.json()).existed === false);

  const noSubject = await FLOWS.DELETE(req(), { params: params(slug) });
  ok("a DELETE naming nothing is refused", noSubject.status === 400, String(noSubject.status));

  // USAGE IS MANAGER-ONLY. Somebody who may read the flows but not change them
  // is offered no warning to act on, so producing one costs them the whole
  // engagement scan on every GET — and hands a person with no deal rights a
  // count of how much work the studio is carrying.
  const readerRole = await createRole(studio.id, {
    name: `Flow reader ${rand()}`,
    permissions: ["administration.settings.view"],
  });
  const reader = await person("Flow reader", null);
  await updateCollaborator(studio.id, reader.collaborator.id, { roleIds: [readerRole.id] });
  await signInAs(reader.user.id);
  const readerBody = await (await FLOWS.GET(req(), { params: params(slug) })).json();
  ok("a reader sees the flows themselves", readerBody.templates?.length === 7);
  ok("...is told they may not manage them", readerBody.canManage === false);
  ok("...and is given no count of the studio's deals", readerBody.usage === null,
    JSON.stringify(readerBody.usage));

  // A member with no role cannot change them. Whether they may READ is
  // administration.settings.view, which a roleless member does not hold either
  // — so this asserts the door, not a particular one of the two answers.
  await signInAs(nobody.user.id);
  const viewer = await FLOWS.GET(req(), { params: params(slug) });
  ok("a member without settings.view is refused the read, or told they cannot manage",
    viewer.status === 403 || (await viewer.clone().json()).canManage === false, String(viewer.status));
  const viewerWrite = await FLOWS.PUT(jsonReq({
    template: {
      id: "A", name: "Theirs", stages: ["ticket"], heads: ["ticket"], statusChain: ["ticket"],
      billingTrigger: "progress", costDrivers: [], cardinalityOverrides: {},
    },
  }), { params: params(slug) });
  ok("...and their write is refused", viewerWrite.status === 403, String(viewerWrite.status));

  // A TRUE non-member learns nothing about the contents, on every verb.
  const flowOutsider = (await createUser({ email: `flow-outsider-${rand()}@test.invalid`, passwordHash: "x" })).user;
  await signInAs(flowOutsider.id);
  for (const [verb, res] of [
    ["GET", await FLOWS.GET(req(), { params: params(slug) })],
    ["PUT", await FLOWS.PUT(jsonReq({ template: { id: "A" } }), { params: params(slug) })],
    ["DELETE", await FLOWS.DELETE(req("?template=A"), { params: params(slug) })],
  ]) {
    ok(`a non-member's ${verb} is refused, not answered`,
      res.status === 403 || res.status === 404, String(res.status));
  }

  await signInAs(owner.id);
}

// ============================================================================
console.log("\n== engagement foundations (Phase 0)");
// Each function throws (node:assert) on its first failed check rather than
// reporting a boolean, so it is adapted to this file's ok() harness one test
// at a time: a thrown assertion still counts as ONE failed block instead of
// aborting the whole suite, which is what letting it propagate would do —
// and every subsequent block, including the final sweep, would never run.
{
  for (const t of [testZsetHelpers, testEngagementKeys, testRegistry, testCreateRead,
                   testAttach, testDetachAndRefs, testUnassigned]) {
    try {
      await t();
      ok(t.name, true);
    } catch (e) {
      ok(t.name, false, e.message);
    }
  }
}

// ============================================================================
console.log("\n== engagement backfill (Phase 1a)");
{
  for (const t of [testKeysAndDetId, testCluster, testOrphanClientLive, testApplyAndRead, testBackfillStudio,
                    testParity, testVocabularyParity]) {
    try {
      await t();
      ok(t.name, true);
    } catch (e) {
      ok(t.name, false, e.message);
    }
  }
}

// ============================================================================
console.log("\n== engagement on-create (Phase 1b-i)");
{
  for (const t of [
    testAttachTicketEngagement,
    testDirectProjectMintsItsOwnEngagement,
    testBackfillClustersOrphanProjects,
    testBackfillLeavesLineagedProjectsAlone,
  ]) {
    try {
      await t();
      ok(t.name, true);
    } catch (e) {
      ok(t.name, false, e.message);
    }
  }
}

// ============================================================================
console.log("\n== engagement spine (Phase 1b-ii, Task 5)");
{
  for (const t of [
    testSpineHelpers, testDetachResolvesThroughAlias, testDescriptorFollowsTheAlias,
    testMintingIsIdempotentAndGrandfathers, testAliasWriteIsNotBestEffort,
    testConvergesWhenAliasLandedButRootDidNot,
  ]) {
    try {
      await t();
      ok(t.name, true);
    } catch (e) {
      ok(t.name, false, e.message);
    }
  }
}

// ============================================================================
console.log("\n== engagement view (Task 7)");
{
  for (const t of [testIndex, testPermissionKey, testVisibleStageTypes]) {
    try {
      await t();
      ok(t.name, true);
    } catch (e) {
      ok(t.name, false, e.message);
    }
  }
}

// ============================================================================
console.log("\n== engagement delete path");
{
  for (const t of [testNoPhantomStageAfterDelete, testDetachClearsTheApprovedQuotationSlot,
                   testDetachClearsTheProjectSingleton, testDetachIsTheInverseOfAttach,
                   testHasStageTracksTheLastRecordOfAType, testDetachIsIdempotent,
                   testDetachNeverClobbersANewerClaim, testLineageDerivationMatchesTheCreatePath,
                   testDeletionImpactNamesOnlyWhatTheReaderMaySee, testInternalQuotationDetaches,
                   testLockDefaultsToLocked, testLockedEngagementRefusesDeletion,
                   testDeleteEngagementIsIdempotent, testEveryStageDeclaresItsDisposition,
                   testDeletingADealDoesNotDeleteItsClient, testASharedClientSurvivesEitherDeal,
                   testKeptRecordsAreDetachedNotDeleted, testEngagementImpactSplitsDeletedFromSurviving]) {
    try {
      await t();
      ok(t.name, true);
    } catch (e) {
      ok(t.name, false, e.message);
    }
  }
}

// ============================================================================
console.log("\n== a project's children join and leave the deal");
{
  for (const t of [testAChildResolvesItsDealFromItsProject, testAChildRaisedOnAProjectJoinsTheDeal,
                   testEveryRowOfOneActionJoinsTheSameDeal,
                   testARecordWithNoProjectAttachesToNothingAndDoesNotThrow,
                   testASwallowedAttachNeverFailsTheCreate,
                   testDetachingAChildLeavesTheRestOfTheDealIntact,
                   testDetachingARecordThatNeverAttachedIsANoOp]) {
    try {
      await t();
      ok(t.name, true);
    } catch (e) {
      ok(t.name, false, e.message);
    }
  }
}

// ============================================================================
console.log("\n== what Nova volunteers, before anybody asks");
// THE SPEECH BUBBLE'S SENTENCES ARE DERIVED, NOT WRITTEN. Every assertion here
// guards a condition that can be got wrong quietly — a bubble that says the
// wrong thing is worse than a silent one, because it is unprompted and it looks
// authoritative. Pure functions, so no Redis and no fixture: rows in, insights
// out.
{
  const INS = await import("@/modules/main/insights.ts");
  const COPY = await import("@/shared/studio/insights.ts");
  const money = (v) => `SAR ${Number(v || 0).toFixed(2)}`;
  const TODAY = "2026-08-30";
  const kinds = (rows) => rows.map((r) => r.kind);

  // ---- the arithmetic ------------------------------------------------------
  ok("days are counted forward and backward from the same instant",
    INS.daysSince("2026-08-20", TODAY) === 10 && INS.daysUntil("2026-09-09", TODAY) === 10);
  ok("a date nobody filled in is null, not zero",
    INS.daysSince("", TODAY) === null && INS.daysSince(undefined, TODAY) === null);

  // ---- THE BUG main.ts SHIPPED ONCE ---------------------------------------
  // `lowStock` counted items that merely HAD a reorder level, so a studio that
  // had configured its catalogue properly was told all of it was running out.
  // The condition is a COMPARISON against the ledger's balance, and this is the
  // assertion that keeps it one.
  {
    const items = [
      { id: "a", name: "Healthy", reorderLevel: 5 },
      { id: "b", name: "Low", reorderLevel: 10 },
      { id: "c", name: "Gone", reorderLevel: 4 },
      { id: "d", name: "Unwatched" },
    ];
    const onHand = { a: 40, b: 6, c: 0, d: 0 };
    const out = INS.stockInsights(items, onHand);
    ok("a well-stocked item with a reorder level is not 'low'",
      !out.some((i) => i.vars.name === "Healthy"), kinds(out).join(","));
    ok("an item with no reorder level is never reported, at any quantity",
      !out.some((i) => i.vars.name === "Unwatched"));
    ok("out-of-stock and low are separate sentences",
      out.some((i) => i.kind === "stock.out" && i.vars.name === "Gone")
      && out.some((i) => i.kind === "stock.low" && i.vars.name === "Low"), kinds(out).join(","));
  }

  // The one asked for by name: a quotation number with nothing priced under it.
  // `items` is the FLAT PRICED LIST, so tables without rows still count as
  // empty — the number was issued and the work was never priced.
  {
    const out = INS.quotationInsights([
      { id: "q1", number: "Q-0041", status: "Draft", items: [], createdAt: "2026-08-29" },
      { id: "q2", number: "Q-0042", status: "Draft", items: [{ description: "x", qty: 1, unitPrice: 5 }], createdAt: "2026-08-29" },
      { id: "q3", number: "Q-0033", status: "Sent", items: [{ description: "x", qty: 1, unitPrice: 5 }], createdAt: "2026-08-01" },
    ], TODAY);
    ok("a draft quotation with no items is named, a priced one is not",
      out.some((i) => i.kind === "quotation.noItems" && i.vars.number === "Q-0041")
      && !out.some((i) => i.vars.number === "Q-0042"), kinds(out).join(","));
    ok("a quotation sitting with the client for a fortnight is chased",
      out.some((i) => i.kind === "quotation.stale" && i.vars.number === "Q-0033" && i.vars.days === 29));
  }

  // A NULL LIST IS "NOT YOURS TO KNOW", NOT "THERE ARE NONE". Two derivations
  // cross a section boundary, and both must go quiet rather than assert
  // something about a department the viewer was never granted — "this ticket
  // has no RFQ" IS a statement about Technical.
  {
    const tickets = [{ id: "t1", ref: "T-001", status: "Open", deadline: "2026-12-01" }];
    ok("with Technical invisible, no claim is made about a ticket's RFQ",
      !INS.ticketInsights(tickets, null, TODAY).some((i) => i.kind === "ticket.noRfq"));
    ok("...and with Technical visible, the bare ticket is named",
      INS.ticketInsights(tickets, [], TODAY).some((i) => i.kind === "ticket.noRfq" && i.vars.reference === "T-001"));

    const projects = [{ id: "p1", number: "P-01", stage: "Completed" }];
    ok("with Finance invisible, no claim is made about what was invoiced",
      !INS.projectInsights(projects, null, TODAY).some((i) => i.kind === "project.uninvoiced"));
    ok("...and with Finance visible, the unbilled project is named",
      INS.projectInsights(projects, [], TODAY).some((i) => i.kind === "project.uninvoiced" && i.vars.number === "P-01"));
  }

  // A closed ticket is not a live one, and the trio must match main.ts's
  // `openTickets` headline — a bubble and a tile disagreeing about what "open"
  // means is the kind of thing nobody reports and everybody notices.
  {
    const closed = ["Closed Won", "Closed Lost", "Dropped"].map((status, n) =>
      ({ id: `c${n}`, ref: `T-9${n}`, status, deadline: "2026-08-01" }));
    ok("a won, lost or dropped ticket is never chased for its deadline",
      INS.ticketInsights(closed, [], TODAY).length === 0);
  }

  // Outstanding is RECOMPUTED from the lines and the payments, never a stored
  // balance — the same `invoiceTotals` Finance and the notice cron use. A fully
  // paid invoice past its due date is not overdue.
  {
    const line = [{ description: "w", qty: 1, unitPrice: 100 }];
    const out = INS.invoiceInsights([
      { id: "i1", reference: "INV-1", status: "Sent", dueDate: "2026-08-10", lines: line, vatRate: 0, payments: [] },
      { id: "i2", reference: "INV-2", status: "Sent", dueDate: "2026-08-10", lines: line, vatRate: 0, payments: [{ amount: 100 }] },
      { id: "i3", reference: "INV-3", status: "Draft", createdAt: "2026-08-01", lines: line, vatRate: 0 },
    ], TODAY);
    const overdue = out.find((i) => i.kind === "invoice.overdue");
    ok("an invoice paid in full is not overdue, however late",
      overdue && overdue.vars.reference === "INV-1" && !out.some((i) => i.vars.reference === "INV-2"),
      kinds(out).join(","));
    ok("the amount is the outstanding balance, not the total",
      overdue && overdue.vars.amount === 100 && overdue.vars.days === 20);
    ok("a draft nobody sent is its own, quieter sentence",
      out.some((i) => i.kind === "invoice.draft" && i.vars.reference === "INV-3"));
  }

  // ---- ranking for the screen ---------------------------------------------
  {
    const mk = (kind, section, weight) => ({ id: kind, kind, tone: "info", section, href: null, vars: {}, weight });
    const rows = [
      mk("invoice.overdue", "finance-cash", 350),
      mk("ticket.noRfq", "crm-sales-tickets", 120),
      mk("quotation.noItems", "crm-sales-quotations", 230),
    ];
    ok("with no view, the loudest thing is said first",
      COPY.rankForView(rows, "")[0].kind === "invoice.overdue");
    ok("on a screen, that screen's own section outranks a louder one elsewhere",
      COPY.rankForView(rows, "crm-sales-tickets")[0].kind === "ticket.noRfq");
    ok("a sibling section still beats an unrelated department",
      COPY.rankForView(rows, "finance-payables")[0].kind === "invoice.overdue");
    ok("nothing is dropped by the view — only reordered",
      COPY.rankForView(rows, "crm-sales-tickets").length === rows.length);
    ok("a department is the key up to its first dash",
      COPY.departmentOf("crm-sales-quotations") === "crm-sales" && COPY.departmentOf("tasks") === "tasks");
  }

  // ---- the words -----------------------------------------------------------
  // THE API SHIPS NO PROSE. Every sentence is assembled on display, in the
  // reader's language, which is the only reason an Arabic studio does not get
  // English from an endpoint and a golden does not pin a language.
  {
    const vars = { number: "Q-0041", more: 0 };
    const en = COPY.insightCopy("quotation.noItems", vars, "en", money);
    const ar = COPY.insightCopy("quotation.noItems", vars, "ar", money);
    ok("the same insight reads in English and in Arabic",
      en && ar && en.text !== ar.text && en.text.includes("Q-0041") && ar.text.includes("Q-0041"));
    ok("...and its chip is translated too", en.label === "Quotation" && ar.label === "عرض سعر");

    ok("a kind this build has never heard of is skipped, not drawn blank",
      COPY.insightCopy("something.invented", {}, "en", money) === null);

    // A DEADLINE IN THE PAST AND ONE IN THE FUTURE ARE DIFFERENT SENTENCES,
    // not the same one with a minus sign in it.
    const soon = COPY.insightCopy("ticket.deadline", { reference: "T-1", days: 3, more: 0 }, "en", money);
    const past = COPY.insightCopy("ticket.deadline", { reference: "T-1", days: -3, more: 0 }, "en", money);
    const now = COPY.insightCopy("ticket.deadline", { reference: "T-1", days: 0, more: 0 }, "en", money);
    ok("due in three days, due today and three days late all read differently",
      soon.text !== past.text && past.text !== now.text && !past.text.includes("-3"), past.text);

    ok("money goes through the caller's formatter, never a hardcoded currency",
      COPY.insightCopy("invoice.overdue",
        { reference: "INV-1", days: 4, amount: 250, total: 250, more: 0 }, "en", money).text.includes("SAR 250.00"));

    ok("the count of others is a tail, and absent when there are none",
      COPY.insightCopy("quotation.noItems", { number: "Q-1", more: 2 }, "en", money).text.includes("+2 more")
      && !COPY.insightCopy("quotation.noItems", { number: "Q-1", more: 0 }, "en", money).text.includes("+"));

    // Every kind the server can emit must have words on both sides. A kind
    // added to the derivations and forgotten here is a bubble that never fires,
    // which is invisible — exactly the failure this file exists to make loud.
    const EMITTED = [
      "task.overdue", "task.approval", "task.awaiting",
      "quotation.noItems", "quotation.stale", "rfq.unquoted",
      "ticket.noRfq", "ticket.deadline",
      "project.overdue", "project.uninvoiced",
      "stock.out", "stock.low",
      "invoice.overdue", "invoice.draft", "bill.overdue",
      "permit.expired", "permit.expiring",
      "hr.docExpiring", "hr.leavePending", "notifications.unread",
    ];
    const missing = EMITTED.filter((k) =>
      ["en", "ar"].some((l) => !COPY.insightCopy(k, { n: 1, days: 2, more: 0 }, l, money)));
    ok("every kind the derivations emit has words in both languages",
      missing.length === 0, missing.join(", "));
  }
}

// SHARED ADAPTER for every pure, standalone-runner test file below that takes
// its assertion object as an ARGUMENT rather than importing node:assert
// itself (restructure.mjs, pg-query.mjs, pg-parity.mjs) — one definition
// rather than three copies of the identical five lines.
const asT = {
  equal: (actual, expected, message = "") => ok(
    message, actual === expected,
    actual === expected ? "" : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  ),
};

// ============================================================================
console.log("\n== the fifteen-section restructure map (P0 restructure, Task 1)");
// testEveryMappedTargetActuallyExists, testEveryMappedPermissionTargetIsARealArea
// and testNoRetiredSectionKeySurvivesInSource are EXPECTED RED here: SECTION_DEFS
// and the permission catalogue have not moved to the fifteen sections yet
// (Tasks 2 and 4) and the source sweep that retires the twelve-department keys
// has not happened (Task 5). Do not weaken these three to make this block
// green — them turning green for real is what proves those tasks landed.
{
  for (const test of [
    testEveryOldSectionKeyIsAccountedFor,
    testEveryMappedTargetActuallyExists,
    testEveryMappedPermissionTargetIsARealArea,
    testMapIsIdempotent,
    testTheFiveMovesAreDeclared,
    testNoRetiredSectionKeySurvivesInSource,
  ]) {
    await test(asT);
  }
}

// ============================================================================
console.log("\n== the SQL query builder (P1 Postgres store swap, Task 7)");
// NO REDIS, NO POSTGRES. buildSelect/buildCount are pure — this block asserts
// the generated SQL text and parameter list only, exactly like
// tests/pg-query.mjs run bare. It runs here too so a regression shows up in
// the one command (`npm test`) everything else already goes through.
{
  for (const test of [
    testExactMatch,
    testUndefinedIsIgnoredNotMatched,
    testArrayMeansOneOf,
    testContainsIsCaseInsensitive,
    testTextOrderUsesAnIcuCollation,
    testNumberOrderCasts,
    testOrderIsMadeTotal,
    testDefaultOrderIsNewestFirst,
    testUnknownOperatorThrows,
    testNullRequiresKeyPresent,
    testNeUsesIsDistinctFrom,
    testNeNullKeepsAnAbsentKey,
    testInNullMemberRequiresKeyPresent,
    testNinKeepsAnAbsentKey,
    testNinExcludesAnExplicitNullOnlyWhenTheArrayHasOne,
    testOrderCoalescesMissingTextToEmptyString,
    testContainsEscapesWildcards,
    testGtCastsNumericForANumberArgument,
    testGtUsesCollateCForAStringArgument,
    testGtNullArgumentThrows,
    testCountMirrorsSelectsWhereClause,
    testScopeAndCollectionAreAlwaysParameterised,
    testLimitIsTheLastParameter,
  ]) {
    await test(asT);
  }
}

// ============================================================================
console.log("\n== the postgres seam, schema, row primitives and dispatcher (P1 Postgres store swap, Tasks 1/2/4/5)");
// A REAL, LIVE POSTGRES, UNLIKE THE BLOCK ABOVE. Same standalone-runner shape
// (asT, no throw on a failed assertion) as tests/pg-parity.mjs run bare — this
// is Task 6's own requirement: fold the dispatched-store proof into the one
// command (`npm test` / `npm run test:parity`) that already runs everything
// else, so a regression here shows up beside every other test rather than
// only in a file nobody remembers to run separately. Every fixture is either
// a synthetic tenant id the test itself deletes in a `finally` block, or (the
// two dispatcher round-trip tests) a no-op outside NOMPANY_DB=parity — none of
// this reaches the postgres sweep below, which only ever concerns the real
// studios createStudio minted further up this file.
{
  for (const test of [
    testPgConnects,
    testPgRejectsNamedPreparedStatements,
    testQueryTimeoutOutlivesStatementTimeout,
    testWithTenantSetsTheLocalTenantSetting,
    testTenantSettingDoesNotLeakAcrossTransactions,
    testBareQueryAgainstTheTenantTableIsRefused,
    testWithinTheSeamTheTenantTableIsReachable,
    testWithTenantRefusesAnEmptyTenantId,
    testSchemaShape,
    testRlsIsEnabled,
    testRlsFiltersRowsBetweenTenants,
    testCheckConstraintRejectsEmptyTenantId,
    testPgSchemaQueryRefusesANonDdlStatement,
    testPgSchemaQueryRefusesDropTableEvenGuarded,
    testPgSchemaQueryRefusesDropSchema,
    testPgSchemaQueryRefusesDropOwned,
    testPgSchemaQueryRefusesDropIndex,
    testPgSchemaQueryRefusesAlterTableDropColumn,
    testPgSchemaQueryRefusesAlterTableRename,
    testPgSchemaQueryRefusesAlterColumnTypeJsonb,
    testPgSchemaQueryRefusesDisableRls,
    testPgSchemaQueryRefusesCreateView,
    testPgSchemaQueryDoesNotLaunderADropThroughAStringLiteral,
    testPgSchemaQueryRefusesCreateTableAsSelectPlain,
    testPgSchemaQueryRefusesCreateTableAsSelectWithExtraParens,
    testPgSchemaQueryAcceptsRealDdl,
    testFailedTransactionDestroysItsConnectionRatherThanRecyclingIt,
    testPgTxAlsoDestroysAFailedConnection,
    testReentrantWithTenantForTheSameTenantIsAbsorbed,
    testReentrantWithTenantForADifferentTenantFailsFast,
    testKilledConnectionDoesNotCrashTheProcess,
    testKeyOrderSurvives,
    testNewestFirst,
    testBatchKeepsArrivalOrderAmongItself,
    testFunctionPatchIsReapplied,
    testTwentyConcurrentFlipsAllLandNoneRejected,
    testImmutableFieldsCannotBePatched,
    testDeleteReportsWhetherAnythingWent,
    testBackendDefaultsToRedis,
    testDispatcherParityRoundTrip,
    testDispatcherDisagreementNamesBothValues,
    testCascadeDeleteSectionReapsRowsOutsideTheCatalogue,
  ]) {
    await test(asT);
  }
}

// ============================================================================
// THE POSTGRES SWEEP (Task 6) — MUST RUN BEFORE THE REDIS SWEEP BELOW.
// REG_KEYS.studios ("g:studios") is itself one of the keys delPrefix is about
// to erase, and it is the only record of which studios THIS run created: the
// three studios created directly above (Test/Before/Language) plus whichever
// ones the imported engagement-backfill fixtures minted along the way. Under
// NOMPANY_DB=parity every one of those studios also dual-wrote into
// collection_rows; under redis/postgres-only this reports 0 and costs a few
// no-op queries, because sections.ts never touched Postgres under those
// backends. See tests/pg-sweep.mjs for why an explicit id list is the only
// safe shape once RLS is FORCED.
// CRITICAL FIX (whole-branch review): this call used to be unguarded, and
// pg.ts's getPool() throws the instant DATABASE_URL is unset — CI's
// redis:8-only setup left it unset, so this line died before the Redis
// delPrefix below ever ran, stranding this run's whole namespace (the exact
// dirty-namespace trap CLAUDE.md documents, surfacing as an unrelated wall of
// "forbidden"/"no-section" failures in whichever run claims the prefix next).
// Skip loudly when there is nothing to sweep (no DATABASE_URL — CI always
// sets one); on any OTHER failure, catch it here so the Redis sweep still
// runs, and count it as a suite failure via `fails` rather than losing it
// silently.
if (!process.env.DATABASE_URL) {
  console.warn(`skipping the Postgres sweep — DATABASE_URL is not set (nothing was dual-written to collection_rows this run)`);
} else {
  try {
    const studioIds = (await readArr(REG_KEYS.studios)).map((s) => s.id).filter(Boolean);
    const pgSwept = await sweepPgTenants(studioIds);
    console.log(`swept ${pgSwept} postgres row(s) across ${studioIds.length} studio(s) created by this run`);
  } catch (e) {
    fails += 1;
    console.error(`Postgres sweep failed — continuing to the Redis sweep below so this run does not strand its namespace: ${e.message}`);
  }
}

// THE BLOB SWEEP — see tests/blob-sweep.mjs. Ordered here for a different
// reason than the Postgres one above: it does not depend on any Redis record
// to know what it owns (the prefix is in the object pathname itself), so it
// could run anywhere. It runs BEFORE delPrefix anyway, next to its two
// siblings, so all three cleanups read as one block rather than one of them
// sitting apart for no stated reason.
//
// Guarded the same way, for the same reason: a failure here must not stop the
// Redis sweep below and strand the namespace. Counted as a suite failure so a
// store that quietly stopped accepting deletes does not pass as clean.
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.warn(`skipping the Blob sweep — BLOB_READ_WRITE_TOKEN is not set (nothing was uploaded to Blob this run)`);
} else {
  try {
    const blobSwept = await sweepBlobObjects(KEY_PREFIX);
    console.log(`swept ${blobSwept} blob object(s) under "${KEY_PREFIX}media/"`);
  } catch (e) {
    fails += 1;
    console.error(`Blob sweep failed — continuing to the Redis sweep below so this run does not strand its namespace: ${e.message}`);
  }
}

// ============================================================================
// Everything this suite wrote lives under the namespace, so cleanup is one
// prefix deletion. Runs whatever happened above — a failed assertion must not
// leave keys behind.
const swept = await delPrefix(KEY_PREFIX);
console.log(`\nswept ${swept} keys from "${KEY_PREFIX}"`);

console.log(fails ? `\n${fails} FAILURES\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
