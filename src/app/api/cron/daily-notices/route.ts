import { cronJob } from "@/platform/http/cron";
import { log } from "@/platform/http/observability";
import { readArr } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { listSections } from "@/platform/db/sections";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { listRoles } from "@/modules/people/roles";
import { resolveHolders } from "@/lib/studios";
import { notifyCollaborators, NOTIFY } from "@/platform/notify/notifications";
import { dayIn, studioTimezone } from "@/shared/timezone";
import { raiseDuePlanJobs } from "@/modules/operations/planJobs";
import { engineSectionKey } from "@/platform/access";
import { identityDocumentLabel } from "@/shared/identityDocuments";
import { raiseDuePmOrders, raiseDueContractOrders, raiseDueConditionOrders } from "@/modules/maintenance/pmRun";
import {
  overdueInvoiceNotices, overdueBillNotices, expiringDocumentNotices, expiringPermitNotices,
  dueWorkOrderNotices, dueCalibrationNotices, overdueLeadNotices, closingTenderNotices,
  engineExpiryNotices, supplierDocumentNotices, ENGINE_EXPIRIES,
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
export const GET = cronJob("daily-notices", run);

const Invoices = repo("invoices");
const Bills = repo("bills");
const Permits = repo("permits");
const WorkOrders = repo("workOrders");
const EngineRecords = repo("engineRecords");
const SalesTickets = repo("salesTickets");
const Tenders = repo("tenders");
const Vendors = repo("inventoryVendors");

// HOW MANY STUDIOS ARE SWEPT AT ONCE (28/09/2026). The run went studio by
// studio, one after another, inside one invocation with a 300-second ceiling —
// fine for tens of studios, and the day there are enough of them the tail of
// the list silently gets nothing. A few at a time finishes the same work in a
// fraction of the wall clock without asking the pool for a connection per
// studio at once.
const STUDIOS_AT_ONCE = 4;

type Counts = { sent: number; scanned: number; planJobs: number; pmOrders: number; contractOrders: number; conditionOrders: number };

async function run() {
  const studios = await readArr<{ id: string; slug?: string; currency?: string; timezone?: string }>(REG.studios);

  const total: Counts = { sent: 0, scanned: 0, planJobs: 0, pmOrders: 0, contractOrders: 0, conditionOrders: 0 };
  for (let i = 0; i < studios.length; i += STUDIOS_AT_ONCE) {
    const batch = await Promise.all(studios.slice(i, i + STUDIOS_AT_ONCE).map(forStudio));
    for (const c of batch) for (const k of Object.keys(total) as (keyof Counts)[]) total[k] += c[k];
  }
  return Response.json({ ok: true, studios: studios.length, ...total });
}

/**
 * ONE STUDIO, ON ITS OWN CALENDAR. "Today" is the STUDIO's day (shared/timezone,
 * Studio settings) — the owner's rule that a nightly job asks the studio which
 * day it is, rather than keeping a UTC answer of its own that disagrees for
 * every studio east or west of Greenwich for part of each day. A studio that
 * has not set a zone keeps the UTC day it always had.
 */
async function forStudio(s: { id: string; currency?: string; timezone?: string }): Promise<Counts> {
  const c: Counts = { sent: 0, scanned: 0, planJobs: 0, pmOrders: 0, contractOrders: 0, conditionOrders: 0 };
  const todayISO = dayIn(new Date(), studioTimezone(s)) || new Date().toISOString().slice(0, 10);
  const todayDate = new Date(`${todayISO}T00:00:00Z`);
  const id = String(s.id);
  try {
    c.sent += await noticesForStudio(id, todayISO, todayDate, s.currency);
    c.scanned += 1;
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
  // re-learn, and one of those once refused a whole deployment. Each in its own
  // try: a plan that cannot be raised must not cost the studio its notices.
  // MAINTENANCE'S PREVENTIVE PLANS and SERVICE CONTRACTS' VISITS likewise, and
  // CONDITION PLANS as the RECOVERY pass — their reading is normally judged the
  // moment it is recorded, and that route swallows a failed run deliberately so
  // the reading is never lost; this is what picks the breach up afterwards.
  const steps: [keyof Counts, string, () => Promise<number>][] = [
    ["planJobs", "PM plan jobs", () => raiseDuePlanJobs(id, todayISO)],
    ["pmOrders", "preventive plan orders", () => raiseDuePmOrders(id, todayISO)],
    ["contractOrders", "service contract visits", () => raiseDueContractOrders(id, todayISO)],
    ["conditionOrders", "condition orders", () => raiseDueConditionOrders(id, todayISO)],
  ];
  for (const [key, what, step] of steps) {
    try {
      c[key] += await step();
    } catch (err) {
      log.error(`daily-notices: ${what} failed`, {
        studioId: s.id, error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return c;
}

// One studio: read what it has, work out what crosses a line today, and tell the
// people who hold the matching right. Returns how many notifications it wrote.
// `currency` is only the fallback for documents raised before each froze its
// own, and only decides whether an outstanding amount rounds to nothing.
async function noticesForStudio(studioId: string, todayISO: string, todayDate: Date, currency?: unknown): Promise<number> {
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
  // SALES' TICKETS, for the leads waiting past their campaign's deadline.
  const ticketsId = sectionId("crm-sales-tickets");
  // THE TENDER REGISTER, for the tenders about to close.
  const tendersId = sectionId("tendering-register");

  // Read only the sections this studio actually has, all at once.
  const [invoices, bills, permits, workOrders, calibrations, tickets, tenders] = await Promise.all([
    cashId ? Invoices.find({ studio: { id: studioId }, section: { id: cashId } }) : Promise.resolve([]),
    payablesId ? Bills.find({ studio: { id: studioId }, section: { id: payablesId } }) : Promise.resolve([]),
    permitsId ? Permits.find({ studio: { id: studioId }, section: { id: permitsId } }) : Promise.resolve([]),
    ordersId ? WorkOrders.find({ studio: { id: studioId }, section: { id: ordersId } }) : Promise.resolve([]),
    calibrationId
      ? EngineRecords.find({ studio: { id: studioId }, section: { id: calibrationId } }, { where: { typeKey: "calibration" } })
      : Promise.resolve([]),
    ticketsId ? SalesTickets.find({ studio: { id: studioId }, section: { id: ticketsId } }) : Promise.resolve([]),
    tendersId ? Tenders.find({ studio: { id: studioId }, section: { id: tendersId } }) : Promise.resolve([]),
  ]);

  // THE DATED REGISTERS (timeNotices' ENGINE_EXPIRIES) and the suppliers'
  // documents — dates each screen drew in a column and nothing watched.
  const dated = [...new Set(ENGINE_EXPIRIES.map((e) => e.typeKey))];
  const suppliersId = sectionId("procurement-suppliers");
  const [engineByType, vendors] = await Promise.all([
    Promise.all(dated.map(async (typeKey) => {
      const sec = sectionId(engineSectionKey(typeKey));
      const rows = sec
        ? await EngineRecords.find({ studio: { id: studioId }, section: { id: sec } }, { where: { typeKey } })
        : [];
      return { typeKey, rows };
    })),
    suppliersId ? Vendors.find({ studio: { id: studioId }, section: { id: suppliersId } }) : Promise.resolve([]),
  ]);

  const overdueDetail = (n: { reference?: string; name?: string; daysOverdue?: number }) =>
    `${n.reference || "An item"}${n.name && n.name !== "—" ? ` — ${n.name}` : ""}, ${n.daysOverdue} day${n.daysOverdue === 1 ? "" : "s"} overdue`;
  const expiryDetail = (label: (n: { name?: string; kind?: string }) => string) => (n: { name?: string; kind?: string; daysLeft?: number }) =>
    `${label(n)} ${(n.daysLeft ?? 0) <= 0 ? "expires today" : `expires in ${n.daysLeft} day${n.daysLeft === 1 ? "" : "s"}`}`;

  // Each notice type: the batch (computed once), whose right hears it, and how to
  // word it. Employees ARE the collaborators — their identity document's expiry
  // sits on the collaborator row — so the HR scan reads no extra key.
  const jobs = [
    { notices: overdueInvoiceNotices(invoices as never, todayISO, currency), key: "finance.receivables.view", also: "", type: NOTIFY.invoiceOverdue, title: "Overdue invoices", href: "finance-receivables", say: overdueDetail },
    { notices: overdueBillNotices(bills as never, todayISO, currency), key: "finance.payables.view", also: "", type: NOTIFY.billOverdue, title: "Bills overdue", href: "finance-payables", say: overdueDetail },
    { notices: expiringDocumentNotices(collaborators as never, todayDate), key: "hr.employees.view", also: "", type: NOTIFY.documentExpiring, title: "Documents expiring", href: "hr-employees", say: expiryDetail((n) => `${n.name}'s ${identityDocumentLabel(n.kind, "en", { inSentence: true })}`) },
    // PERMITS ARE QUALITY & HSE'S (tier 5). Heard by the permit right AND by
    // Tracking's, which held them until `grant-permits.mjs` has run — a notice
    // that went quiet the day its right moved would be the one nobody misses.
    // And it links to the register a studio actually has.
    { notices: expiringPermitNotices(permits as never, todayISO), key: "qualityHse.permits.view", also: "fieldService.tracking.view", type: NOTIFY.permitExpiring, title: "Permits expiring", href: sectionId("quality-hse-permits") ? "quality-hse-permits" : "field-service-schedule", say: expiryDetail((n) => `${n.name}`) },
    // CALIBRATION IS TOLD TO WHOEVER CAN RECORD THE NEW CERTIFICATE — the
    // register's edit right, not its view: a notice nobody who reads it can act
    // on is a notice that wastes the person who saw it.
    // A LEAD PAST ITS CAMPAIGN'S DEADLINE is told to whoever hands leads out
    // (modules/sales/leads): they are the one who can put a name on it or move it.
    { notices: overdueLeadNotices(tickets as never, new Date().toISOString(), todayISO), key: "crmSales.tickets.assign", also: "", type: NOTIFY.leadOverdue, title: "Leads waiting too long", href: "crm-sales-tickets", say: (n: { reference?: string; name?: string; daysOverdue?: number }) => `${n.reference || "A lead"}${n.name && n.name !== "—" ? ` — ${n.name}` : ""}, ${(n.daysOverdue ?? 0) <= 0 ? "past its deadline today" : `${n.daysOverdue} day${n.daysOverdue === 1 ? "" : "s"} past its deadline`}` },
    { notices: dueCalibrationNotices(calibrations as never, todayISO), key: "engine.calibration.edit", also: "", type: NOTIFY.calibrationDue, title: "Due calibrations", href: calibrationKey, say: (n: { name?: string; daysLeft?: number }) => `${n.name} ${(n.daysLeft ?? 0) <= 0 ? "is due for calibration today" : `is due for calibration in ${n.daysLeft} day${n.daysLeft === 1 ? "" : "s"}`}` },
    // ONE JOB PER DATED REGISTER, told to whoever may EDIT it — the person who
    // can record the renewal, as calibration is (28/09/2026).
    ...engineByType.map(({ typeKey, rows }) => ({
      notices: engineExpiryNotices(typeKey, rows as never, todayISO),
      key: `engine.${typeKey}.edit`, also: "", type: NOTIFY.recordExpiring, title: "Dates coming up",
      href: engineSectionKey(typeKey),
      say: (n: { name?: string; kind?: string; daysLeft?: number }) =>
        `${n.name} — ${n.kind} ${(n.daysLeft ?? 0) <= 0 ? "today" : `in ${n.daysLeft} day${n.daysLeft === 1 ? "" : "s"}`}`,
    })),
    // A SUPPLIER'S DOCUMENTS, told to whoever keeps the supplier register.
    { notices: supplierDocumentNotices(vendors as never, todayISO), key: "procurement.suppliers.edit", also: "", type: NOTIFY.supplierDocumentExpiring, title: "Supplier documents expiring", href: "procurement-suppliers", say: expiryDetail((n) => `${n.name}'s ${n.kind}`) },
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
  sent += await tellByPerson(studioId, dueWorkOrderNotices(workOrders as never, todayISO), collaborators, roles, {
    view: "maintenance.orders.view", edit: "maintenance.orders.edit",
    title: "Due work orders", type: NOTIFY.workOrderDue, href: "maintenance-orders",
    say: (n) => `${n.reference || "A work order"} — ${n.name}, ${n.daysOverdue === 0 ? "due today" : `${n.daysOverdue} day${n.daysOverdue === 1 ? "" : "s"} overdue`}`,
  });
  // A TENDER ABOUT TO CLOSE is told to whoever owns it — the same shape as a
  // work order, for the same reason: the person chasing it, not everybody who
  // may read the register (28/09/2026).
  sent += await tellByPerson(studioId, closingTenderNotices(tenders as never, todayISO), collaborators, roles, {
    view: "tendering.tenders.view", edit: "tendering.tenders.edit",
    title: "Tenders closing", type: NOTIFY.tenderClosing, href: "tendering-register",
    say: (n) => `${n.reference || "A tender"} — ${n.name}, ${(n.daysLeft ?? 0) <= 0 ? "closes today" : `closes in ${n.daysLeft} day${n.daysLeft === 1 ? "" : "s"}`}`,
  });
  return sent;
}

type PersonNotice = { reference?: string; name?: string; daysOverdue?: number; daysLeft?: number; assignees: string[] };

/**
 * TOLD TO WHOEVER IS DOING IT, not to everybody holding a right — a technician
 * hears about their own round, a bidder about their own tender, and a
 * supervisor is not buzzed about forty records that each have somebody on them.
 * So each person gets one entry for THEIR records, the same count-plus-example
 * shape.
 *
 * An assignee is told only while they may still open the register; a record
 * with nobody on it (or nobody left who may see it) goes to whoever may edit
 * the register, because somebody has to put a name on it.
 */
async function tellByPerson<N extends PersonNotice>(
  studioId: string,
  due: N[],
  collaborators: Awaited<ReturnType<typeof listCollaborators>>,
  roles: Awaited<ReturnType<typeof listRoles>>,
  how: { view: string; edit: string; title: string; type: string; href: string; say: (n: N) => string },
): Promise<number> {
  if (!due.length) return 0;
  const viewers = resolveHolders(collaborators, roles as never, how.view as never);
  const editors = resolveHolders(collaborators, roles as never, how.edit as never);
  const canSee = new Set(viewers.recipientIds);
  const byPerson = new Map<string, N[]>();
  for (const n of due) {
    const doing = n.assignees.filter((id) => canSee.has(id));
    for (const id of doing.length ? doing : editors.recipientIds) byPerson.set(id, [...(byPerson.get(id) || []), n]);
  }
  let sent = 0;
  for (const [id, notices] of byPerson) {
    const rows = await notifyCollaborators(studioId, [id],
      build(how.title, notices, how.type, how.href, how.say as never),
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
