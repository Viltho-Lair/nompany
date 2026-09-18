import { route } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { financeSetup } from "@/modules/finance/setup";
import { valuesFor } from "@/modules/administration/taxonomy";
import { unclaimed } from "@/modules/finance/withholding";
import {
  financeContext, listInvoices, listExpenses, profitability, billableProjects, summarise, saleItems,
  INVOICE_STATUSES, EXPENSE_CATEGORIES, PAYMENT_METHODS,
} from "@/modules/finance/finance";
import { referencePickers } from "@/modules/procurement/pickers";
import { studioVatRate } from "@/shared/vat";
import { storedMoneyAccounts } from "@/modules/finance/ledger";

// WHAT FINANCE NEEDS SET UP AND IS MISSING (modules/finance/setup), and whether
// this reader can fix it — the notice links to Studio settings only for them.
const setupOf = (f: { studio: unknown; on: (k: string) => boolean; access: unknown }) => ({
  setup: financeSetup(f.studio, { sectionOn: f.on }),
  canFixSetup: !requirePermission(f.access as Parameters<typeof requirePermission>[0], "administration.settings.edit"),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Finance screen. Every figure here is computed from the
// records that justify it — invoice totals from their lines, amounts paid from
// their payments, project cost from purchase orders plus booked expenses.
export const GET = route(
  { auth: "studio", context: financeContext, name: "finance" },
  async (g) => {
  // EVERYTHING HERE IS FINANCE → CASH'S. This response draws the Cash screens
  // and, on the landing page, the receivables half of the dashboard and the
  // project margins — which are built from the same invoices and expenses. So
  // with Cash switched off none of it is read, and the landing page keeps only
  // what Payables and Fixed assets fetch for themselves.
  const cashOn = g.on("finance-cash");
  const [invoices, expenses, projects, { milestones = [] }] = cashOn ? await Promise.all([
    listInvoices(g), listExpenses(g), billableProjects(g),
    // THE MILESTONES AN INVOICE CAN CLAIM. `milestoneId` has been on the
    // invoice since billing schedules shipped and no form set it, so every
    // project invoice landed in "unattributed" and no milestone ever read as
    // billed.
    referencePickers(g.studio, { projects: g.projectsListSection }, { milestones: true }),
  ]) : [[], [], [], { milestones: [] }];
  const projectMargins = cashOn ? await profitability(g, { invoices, expenses }) : [];
  // What an invoice line may name — only when somebody here can raise one.
  const items = cashOn && g.canManage ? await saleItems(g) : [];
  // WHERE MONEY CAN ARRIVE OR LEAVE — the bank, a till, a second bank. Only for
  // somebody who records money; a form offers it only when there is a choice.
  const moneyAccounts = cashOn && g.canManage
    ? (await storedMoneyAccounts(g)).map((a) => ({ id: a.id, code: a.code, name: a.name }))
    : [];

  return {
    canManage: g.canManage,
    // Whether the module's OWN screen may be opened. The dashboard summarises
    // everything underneath it, so it is withheld on a right of its own.
    canViewDashboard: g.canViewDashboard,
    nav: g.nav,
    // Manage per section key, so each screen can ask about itself rather
    // than being handed the parent section's answer.
    manage: g.manage,
    invoices, expenses, projects, milestones, items,
    ...setupOf(g),
    profitability: projectMargins,
    summary: summarise(invoices, expenses, g.studio.currency),
    // WHAT THE STUDIO CAN RECLAIM. Tax withheld is only worth anything if the
    // studio can prove it was paid over, so this lists the documents where tax
    // was deducted and no certificate has been recorded — a list to CHASE,
    // which is a different list from what was withheld.
    unclaimedWithholding: unclaimed(invoices.map((inv) => ({
      document: inv, withheld: inv.withheld, certificateRef: inv.certificateRef,
    }))),
    vocabulary: {
      invoiceStatuses: INVOICE_STATUSES,
      moneyAccounts,
      // WHAT THIS STUDIO ADMITS, not what the product ships — otherwise a
      // service accepts a value no picker on the screen could offer.
      expenseCategories: valuesFor("expenseCategories", g.studio.taxonomies),
      paymentMethods: valuesFor("paymentMethods", g.studio.taxonomies),
      // The studio's own rules, so a form offers exactly what the reader will
      // match against — empty in a jurisdiction with no withholding.
      withholdingRules: g.withholdingRules,
      // THE STUDIO'S VAT RATE, which a new invoice starts at. The form read
      // `defaultVatRate` from here for months while nothing sent it, so its VAT
      // field opened on the text "undefined" and saved nought.
      defaultVatRate: studioVatRate(g.studio) ?? 0,
      vatEnabled: studioVatRate(g.studio) !== null,
    },
  };
});
