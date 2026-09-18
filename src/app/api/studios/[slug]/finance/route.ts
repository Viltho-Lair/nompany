import { route } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { setupFor as setupOf } from "@/modules/finance/setup";
import { valuesFor } from "@/modules/administration/taxonomy";
import {
  financeContext, listInvoices, listExpenses, profitability, billableProjects, summarise, saleItems,
  INVOICE_STATUSES, EXPENSE_CATEGORIES, PAYMENT_METHODS,
} from "@/modules/finance/finance";
import { referencePickers } from "@/modules/procurement/pickers";
import { studioVatRate } from "@/shared/vat";
import { storedMoneyAccounts } from "@/modules/finance/ledger";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Finance screen. Every figure here is computed from the
// records that justify it — invoice totals from their lines, amounts paid from
// their payments, project cost from purchase orders plus booked expenses.
export const GET = route(
  { auth: "studio", context: financeContext, name: "finance" },
  async (g) => {
  // EACH PART ANSWERS TO ITS OWN SUB-SECTION AND ITS OWN RIGHT (18/09/2026).
  // This read serves the Receivables screen (invoices), the Expenses tab of
  // Payables & Expenses, the project margins on Reports, and the Finance
  // dashboard, which summarises all of it. Before the split it answered to the
  // Cash switch alone and checked NO right — anybody who could open any part
  // of Finance was handed every invoice and expense. Now each is read only for
  // somebody who may see it there, or who holds the dashboard, which is the
  // right that has always summarised them; and never while its screen is off.
  const has = (key: string) => !requirePermission(g.access, key as Parameters<typeof requirePermission>[1]);
  const arOn = g.on("finance-receivables");
  const expOn = g.on("finance-payables");
  const seeInvoices = arOn && (has("finance.receivables.view") || g.canViewDashboard);
  const seeExpenses = expOn && (has("finance.expenses.view") || g.canViewDashboard);
  // THE MARGINS ARE A REPORT: built from invoices and expenses, shown to whoever
  // reads Reports (or the dashboard) whether or not they may open the documents
  // one by one — an aggregate is what that right is for.
  const seeMargins = g.on("finance-reports") && (has("finance.reports.view") || g.canViewDashboard);
  const readInvoices = seeInvoices || seeMargins;
  const readExpenses = seeExpenses || seeMargins;
  const [allInvoices, allExpenses, projects, { milestones = [] }] = readInvoices || readExpenses ? await Promise.all([
    readInvoices ? listInvoices(g) : Promise.resolve([]),
    readExpenses ? listExpenses(g) : Promise.resolve([]),
    billableProjects(g),
    // THE MILESTONES AN INVOICE CAN CLAIM. `milestoneId` has been on the
    // invoice since billing schedules shipped and no form set it, so every
    // project invoice landed in "unattributed" and no milestone ever read as
    // billed.
    referencePickers(g.studio, { projects: g.projectsListSection }, { milestones: true }),
  ]) : [[], [], [], { milestones: [] }];
  const projectMargins = seeMargins ? await profitability(g, { invoices: allInvoices, expenses: allExpenses }) : [];
  const invoices = seeInvoices ? allInvoices : [];
  const expenses = seeExpenses ? allExpenses : [];
  // What an invoice line may name — only when somebody here can raise one.
  const items = seeInvoices && has("finance.receivables.create") ? await saleItems(g) : [];
  // WHERE MONEY CAN ARRIVE OR LEAVE — the bank, a till, a second bank. Only for
  // somebody who records money; a form offers it only when there is a choice.
  const moneyAccounts = (seeInvoices || seeExpenses) && g.canManage
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
    // What the reader may do on each screen this read serves.
    canManageReceivables: has("finance.receivables.create") || has("finance.receivables.edit"),
    canManageExpenses: has("finance.expenses.create") || has("finance.expenses.edit"),
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
