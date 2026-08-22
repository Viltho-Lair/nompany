import { route } from "@/platform/http/route";
import {
  financeContext, listInvoices, listExpenses, profitability, billableProjects, summarise,
  INVOICE_STATUSES, EXPENSE_CATEGORIES, PAYMENT_METHODS, DEFAULT_VAT_RATE,
} from "@/modules/finance/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Finance screen. Every figure here is computed from the
// records that justify it — invoice totals from their lines, amounts paid from
// their payments, project cost from purchase orders plus booked expenses.
export const GET = route(
  { auth: "studio", context: financeContext, name: "finance" },
  async (g) => {
  const [invoices, expenses, projects] = await Promise.all([
    listInvoices(g), listExpenses(g), billableProjects(g),
  ]);
  const projectMargins = await profitability(g, { invoices, expenses });

  return {
    canManage: g.canManage,
    // Whether the module's OWN screen may be opened. The dashboard summarises
    // everything underneath it, so it is withheld on a right of its own.
    canViewDashboard: g.canViewDashboard,
    nav: g.nav,
    // Manage per section key, so each screen can ask about itself rather
    // than being handed the parent section's answer.
    manage: g.manage,
    invoices, expenses, projects,
    profitability: projectMargins,
    summary: summarise(invoices, expenses),
    vocabulary: {
      invoiceStatuses: INVOICE_STATUSES,
      expenseCategories: EXPENSE_CATEGORIES,
      paymentMethods: PAYMENT_METHODS,
      defaultVatRate: DEFAULT_VAT_RATE,
    },
  };
});
