import { cronDenied } from "@/platform/auth/cronAuth";
import { withRequest, log } from "@/platform/http/observability";
import { readArr } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { listSections } from "@/platform/db/sections";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { listRoles } from "@/modules/people/roles";
import { resolveHolders } from "@/lib/studios";
import { notifyCollaborators, NOTIFY } from "@/platform/notify/notifications";
import { raiseDuePlanJobs } from "@/modules/operations/planJobs";
import { engineSectionKey } from "@/platform/access";
import { raiseDuePmOrders } from "@/modules/maintenance/pmRun";
import {
  overdueInvoiceNotices, overdueBillNotices, expiringDocumentNotices, expiringPermitNotices,
  dueWorkOrderNotices, dueCalibrationNotices, type WorkOrderNotice,
} from "@/modules/main/timeNotices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE DAILY NUDGE. Time makes some things worth saying that no click ever will —
// an invoice nobody chased, a permit about to lapse, an ID expiring next week.
// This scans every studio once a day and tells the people who can act.
//
// It writes to the SAME bell every request-driven notification uses, addressed
// to CollaboratorIDs (invariant 6) and gated by permission, so a person is told
// only about the records they are allowed to see. It is idempotent by design:
// the producers fire on fixed day-milestones (see modules/main/timeNotices), so
// a record announces itself once as each threshold passes and there is nothing
// to remember between runs.
//
// One slow or broken studio never sinks the run — each is wrapped, logged, and
// the sweep goes on. Nothing is deleted or written except notifications.
export async function GET(request: Request) {
  return withRequest("cron/daily-notices", () => run(request));
}

const Invoices = repo("invoices");
const Bills = repo("bills");
const Permits = repo("permits");
const WorkOrders = repo("workOrders");
const EngineRecords = repo("engineRecords");

async function run(request: Request) {
  // Fails closed when CRON_SECRET is unset — invariant 15, see cronAuth.
  const denied = cronDenied(request);
  if (denied) return denied;

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayDate = new Date(`${todayISO}T00:00:00Z`);
  const studios = await readArr<{ id: string; slug?: string }>(REG.studios);

  let sent = 0;
  let scanned = 0;
  let planJobs = 0;
  let pmOrders = 0;
  for (const s of studios) {
    try {
      sent += await noticesForStudio(String(s.id), todayISO, todayDate);
      scanned += 1;
    } catch (err) {
      // A studio that fails to scan costs its own notices for a day, never the
      // run — tomorrow's pass covers it, and the milestones it missed by a day
      // are the exception, not the rule.
      log.error("daily-notices: studio scan failed", {
        studioId: s.id, error: err instanceof Error ? err.message : String(err),
      });
    }
    // PM PLANS FALL DUE ON THE SAME DAILY CLOCK (tier 5), so they ride this run
    // rather than a cron of their own — a new schedule is a Vercel limit to
    // re-learn, and one of those once refused a whole deployment. Its own try:
    // a plan that cannot be raised must not cost the studio its notices.
    try {
      planJobs += await raiseDuePlanJobs(String(s.id), todayISO);
    } catch (err) {
      log.error("daily-notices: PM plan jobs failed", {
        studioId: s.id, error: err instanceof Error ? err.message : String(err),
      });
    }
    // MAINTENANCE'S PREVENTIVE PLANS, on the same clock and in their own try,
    // for the same reason as the line above.
    try {
      pmOrders += await raiseDuePmOrders(String(s.id), todayISO);
    } catch (err) {
      log.error("daily-notices: preventive plan orders failed", {
        studioId: s.id, error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return Response.json({ ok: true, studios: studios.length, scanned, sent, planJobs, pmOrders });
}

// One studio: read what it has, work out what crosses a line today, and tell the
// people who hold the matching right. Returns how many notifications it wrote.
async function noticesForStudio(studioId: string, todayISO: string, todayDate: Date): Promise<number> {
  const [collaborators, roles, sections] = await Promise.all([
    listCollaborators(studioId),
    listRoles(studioId),
    listSections(studioId),
  ]);
  const sectionId = (key: string) => sections.find((sec) => sec.key === key)?.id;

  const cashId = sectionId("finance-cash");
  const payablesId = sectionId("finance-payables");
  // PERMITS LIVE UNDER THE FIELD-SERVICE ROOT (SECTION_COLLECTIONS in keys.ts),
  // not under Tracking. Read from `field-service-tracking`, this found no permit
  // in any studio, so no expiry notice has ever been sent.
  const permitsId = sectionId("field-service");
  // Maintenance's work orders, and the engine's calibration register — which
  // lives in `engineRecords` under its own planted section, told apart by type.
  const ordersId = sectionId("maintenance-orders");
  // BUILT, NOT TYPED: an engine register's section is planted at runtime and is
  // in no static list, so its key comes from the one function that mints it.
  const calibrationKey = engineSectionKey("calibration");
  const calibrationId = sectionId(calibrationKey);

  // Read only the sections this studio actually has, all at once.
  const [invoices, bills, permits, workOrders, calibrations] = await Promise.all([
    cashId ? Invoices.find({ studio: { id: studioId }, section: { id: cashId } }) : Promise.resolve([]),
    payablesId ? Bills.find({ studio: { id: studioId }, section: { id: payablesId } }) : Promise.resolve([]),
    permitsId ? Permits.find({ studio: { id: studioId }, section: { id: permitsId } }) : Promise.resolve([]),
    ordersId ? WorkOrders.find({ studio: { id: studioId }, section: { id: ordersId } }) : Promise.resolve([]),
    calibrationId
      ? EngineRecords.find({ studio: { id: studioId }, section: { id: calibrationId } }, { where: { typeKey: "calibration" } })
      : Promise.resolve([]),
  ]);

  const overdueDetail = (n: { reference?: string; name?: string; daysOverdue?: number }) =>
    `${n.reference || "An item"}${n.name && n.name !== "—" ? ` — ${n.name}` : ""}, ${n.daysOverdue} day${n.daysOverdue === 1 ? "" : "s"} overdue`;
  const expiryDetail = (label: (n: { name?: string; kind?: string }) => string) => (n: { name?: string; kind?: string; daysLeft?: number }) =>
    `${label(n)} ${(n.daysLeft ?? 0) <= 0 ? "expires today" : `expires in ${n.daysLeft} day${n.daysLeft === 1 ? "" : "s"}`}`;

  // Each notice type: the batch (computed once), whose right hears it, and how to
  // word it. Employees ARE the collaborators — their ID/passport expiries sit on
  // the collaborator row — so the HR scan reads no extra key.
  const jobs = [
    { notices: overdueInvoiceNotices(invoices as never, todayISO), key: "finance.cash.view", also: "", type: NOTIFY.invoiceOverdue, title: "Overdue invoices", href: "finance/cash", say: overdueDetail },
    { notices: overdueBillNotices(bills as never, todayISO), key: "finance.payables.view", also: "", type: NOTIFY.billOverdue, title: "Bills overdue", href: "finance/payables", say: overdueDetail },
    { notices: expiringDocumentNotices(collaborators as never, todayDate), key: "hr.employees.view", also: "", type: NOTIFY.documentExpiring, title: "Documents expiring", href: "hr/employees", say: expiryDetail((n) => `${n.name}'s ${n.kind}`) },
    // PERMITS ARE QUALITY & HSE'S (tier 5). Heard by the permit right AND by
    // Tracking's, which held them until `grant-permits.mjs` has run — a notice
    // that went quiet the day its right moved would be the one nobody misses.
    // And it links to the register a studio actually has.
    { notices: expiringPermitNotices(permits as never, todayISO), key: "qualityHse.permits.view", also: "fieldService.tracking.view", type: NOTIFY.permitExpiring, title: "Permits expiring", href: sectionId("quality-hse-permits") ? "quality-hse-permits" : "field-service-schedule", say: expiryDetail((n) => `${n.name}`) },
    // CALIBRATION IS TOLD TO WHOEVER CAN RECORD THE NEW CERTIFICATE — the
    // register's edit right, not its view: a notice nobody who reads it can act
    // on is a notice that wastes the person who saw it.
    { notices: dueCalibrationNotices(calibrations as never, todayISO), key: "engine.calibration.edit", also: "", type: NOTIFY.calibrationDue, title: "Due calibrations", href: calibrationKey, say: (n: { name?: string; daysLeft?: number }) => `${n.name} ${(n.daysLeft ?? 0) <= 0 ? "is due for calibration today" : `is due for calibration in ${n.daysLeft} day${n.daysLeft === 1 ? "" : "s"}`}` },
  ];

  let sent = 0;
  for (const job of jobs) {
    if (!job.notices.length) continue;
    const main = resolveHolders(collaborators, roles as never, job.key as never);
    const extra = job.also ? resolveHolders(collaborators, roles as never, job.also as never) : null;
    const recipientIds = [...new Set([...main.recipientIds, ...(extra?.recipientIds || [])])];
    if (!recipientIds.length) continue;
    const rows = await notifyCollaborators(studioId, recipientIds, build(job.title, job.notices, job.type, job.href, job.say), { userIdOf: main.userIdOf });
    sent += rows.length;
  }

  // WORK ORDERS ARE TOLD TO WHOEVER IS DOING THEM, not to everybody holding a
  // right — a technician hears about their own round, and a supervisor is not
  // buzzed about forty orders that each have somebody on them. So each person
  // gets one entry for THEIR orders, the same count-plus-example shape.
  //
  // An assignee is told only while they may still open work orders; an order
  // with nobody on it (or nobody left who may see it) goes to whoever may edit
  // work orders, because somebody has to put a name on it.
  sent += await tellWorkOrders(studioId, dueWorkOrderNotices(workOrders as never, todayISO), collaborators, roles);
  return sent;
}

async function tellWorkOrders(
  studioId: string,
  due: WorkOrderNotice[],
  collaborators: Awaited<ReturnType<typeof listCollaborators>>,
  roles: Awaited<ReturnType<typeof listRoles>>,
): Promise<number> {
  if (!due.length) return 0;
  const viewers = resolveHolders(collaborators, roles as never, "maintenance.orders.view" as never);
  const editors = resolveHolders(collaborators, roles as never, "maintenance.orders.edit" as never);
  const canSee = new Set(viewers.recipientIds);
  const byPerson = new Map<string, WorkOrderNotice[]>();
  for (const n of due) {
    const doing = n.assignees.filter((id) => canSee.has(id));
    for (const id of doing.length ? doing : editors.recipientIds) byPerson.set(id, [...(byPerson.get(id) || []), n]);
  }
  const say = (n: { reference?: string; name?: string; daysOverdue?: number }) =>
    `${n.reference || "A work order"} — ${n.name}, ${n.daysOverdue === 0 ? "due today" : `${n.daysOverdue} day${n.daysOverdue === 1 ? "" : "s"} overdue`}`;
  let sent = 0;
  for (const [id, notices] of byPerson) {
    const rows = await notifyCollaborators(studioId, [id],
      build("Due work orders", notices, NOTIFY.workOrderDue, "maintenance-orders", say),
      { userIdOf: viewers.userIdOf });
    sent += rows.length;
  }
  return sent;
}

// Turn a batch of same-kind notices into one bell entry — a count with the most
// urgent example, rather than one buzz per record, so a studio with a dozen
// overdue invoices gets a single actionable line linking to the screen.
function build(
  title: string,
  notices: { reference?: string; name?: string; kind?: string; daysOverdue?: number; daysLeft?: number }[],
  type: string,
  href: string,
  say: (n: { reference?: string; name?: string; kind?: string; daysOverdue?: number; daysLeft?: number }) => string,
) {
  const n = notices.length;
  const first = say(notices[0]);
  const body = n === 1 ? first : `${first} (+${n - 1} more)`;
  return {
    type,
    title: n === 1 ? title.replace(/s$/, "") : `${n} ${title.toLowerCase()}`,
    body,
    href,
    tone: "warning",
    // THE TEMPLATE TITLE IS THE FIXED PLURAL, so an Arabic reader loses
    // the "3 " prefix and the singular form this English title switches
    // between. Deliberate: pluralising two languages inside a template is
    // a grammar engine, and the count is still on screen — the body says
    // "(+2 more)". `detail` is assembled here because only this job knows
    // how to name a document of its own kind.
    params: { detail: body },
  };
}
