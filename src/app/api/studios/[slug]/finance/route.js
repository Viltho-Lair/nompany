import {
  financeGuard, listInvoices, listExpenses, profitability, billableProjects, summarise,
  INVOICE_STATUSES, EXPENSE_CATEGORIES, PAYMENT_METHODS, DEFAULT_VAT_RATE,
} from "@/lib/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Finance screen. Every figure here is computed from the
// records that justify it — invoice totals from their lines, amounts paid from
// their payments, project cost from purchase orders plus booked expenses.
export async function GET(request, ctx) {
  const g = await financeGuard(ctx.params);
  if (g.fail) return g.fail;

  const [invoices, expenses, projects] = await Promise.all([
    listInvoices(g), listExpenses(g), billableProjects(g),
  ]);
  const projectMargins = await profitability(g, { invoices, expenses });

  return Response.json({
    canManage: g.canManage,
    nav: g.nav,
    invoices, expenses, projects,
    profitability: projectMargins,
    summary: summarise(invoices, expenses),
    vocabulary: {
      invoiceStatuses: INVOICE_STATUSES,
      expenseCategories: EXPENSE_CATEGORIES,
      paymentMethods: PAYMENT_METHODS,
      defaultVatRate: DEFAULT_VAT_RATE,
    },
  });
}
