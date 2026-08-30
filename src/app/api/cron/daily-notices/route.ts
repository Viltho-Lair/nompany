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
import {
  overdueInvoiceNotices, overdueBillNotices, expiringDocumentNotices, expiringPermitNotices,
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

async function run(request: Request) {
  // Fails closed when CRON_SECRET is unset — invariant 15, see cronAuth.
  const denied = cronDenied(request);
  if (denied) return denied;

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayDate = new Date(`${todayISO}T00:00:00Z`);
  const studios = await readArr<{ id: string; slug?: string }>(REG.studios);

  let sent = 0;
  let scanned = 0;
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
  }
  return Response.json({ ok: true, studios: studios.length, scanned, sent });
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
  const trackingId = sectionId("field-service-tracking");

  // Read only the sections this studio actually has, all at once.
  const [invoices, bills, permits] = await Promise.all([
    cashId ? Invoices.find({ studio: { id: studioId }, section: { id: cashId } }) : Promise.resolve([]),
    payablesId ? Bills.find({ studio: { id: studioId }, section: { id: payablesId } }) : Promise.resolve([]),
    trackingId ? Permits.find({ studio: { id: studioId }, section: { id: trackingId } }) : Promise.resolve([]),
  ]);

  const overdueDetail = (n: { reference?: string; name?: string; daysOverdue?: number }) =>
    `${n.reference || "An item"}${n.name && n.name !== "—" ? ` — ${n.name}` : ""}, ${n.daysOverdue} day${n.daysOverdue === 1 ? "" : "s"} overdue`;
  const expiryDetail = (label: (n: { name?: string; kind?: string }) => string) => (n: { name?: string; kind?: string; daysLeft?: number }) =>
    `${label(n)} ${(n.daysLeft ?? 0) <= 0 ? "expires today" : `expires in ${n.daysLeft} day${n.daysLeft === 1 ? "" : "s"}`}`;

  // Each notice type: the batch (computed once), whose right hears it, and how to
  // word it. Employees ARE the collaborators — their ID/passport expiries sit on
  // the collaborator row — so the HR scan reads no extra key.
  const jobs = [
    { notices: overdueInvoiceNotices(invoices as never, todayISO), key: "finance.cash.view", type: NOTIFY.invoiceOverdue, title: "Overdue invoices", href: "finance/cash", say: overdueDetail },
    { notices: overdueBillNotices(bills as never, todayISO), key: "finance.payables.view", type: NOTIFY.billOverdue, title: "Bills overdue", href: "finance/payables", say: overdueDetail },
    { notices: expiringDocumentNotices(collaborators as never, todayDate), key: "hr.employees.view", type: NOTIFY.documentExpiring, title: "Documents expiring", href: "hr/employees", say: expiryDetail((n) => `${n.name}'s ${n.kind}`) },
    { notices: expiringPermitNotices(permits as never, todayISO), key: "fieldService.tracking.view", type: NOTIFY.permitExpiring, title: "Permits expiring", href: "field-service-tracking", say: expiryDetail((n) => `${n.name}`) },
  ];

  let sent = 0;
  for (const job of jobs) {
    if (!job.notices.length) continue;
    const { recipientIds, userIdOf } = resolveHolders(collaborators, roles as never, job.key as never);
    if (!recipientIds.length) continue;
    const rows = await notifyCollaborators(studioId, recipientIds, build(job.title, job.notices, job.type, job.href, job.say), { userIdOf });
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
  return { type, title: n === 1 ? title.replace(/s$/, "") : `${n} ${title.toLowerCase()}`, body, href, tone: "warning" };
}
