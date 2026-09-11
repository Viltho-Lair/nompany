import { route } from "@/platform/http/route";
import { valuesFor } from "@/modules/administration/taxonomy";
import { unclaimed } from "@/modules/finance/withholding";
import {
  financeContext, listInvoices, listExpenses, profitability, billableProjects, summarise,
  INVOICE_STATUSES, EXPENSE_CATEGORIES, PAYMENT_METHODS,
} from "@/modules/finance/finance";
import { referencePickers } from "@/modules/procurement/pickers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Finance screen. Every figure here is computed from the
// records that justify it — invoice totals from their lines, amounts paid from
// their payments, project cost from purchase orders plus booked expenses.
export const GET = route(
  { auth: "studio", context: financeContext, name: "finance" },
  async (g) => {
  const [invoices, expenses, projects, { milestones = [] }] = await Promise.all([
    listInvoices(g), listExpenses(g), billableProjects(g),
    // THE MILESTONES AN INVOICE CAN CLAIM. `milestoneId` has been on the
    // invoice since billing schedules shipped and no form set it, so every
    // project invoice landed in "unattributed" and no milestone ever read as
    // billed.
    referencePickers(g.studio, { projects: g.projectsListSection }, { milestones: true }),
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
    invoices, expenses, projects, milestones,
    profitability: projectMargins,
    summary: summarise(invoices, expenses),
    // WHAT THE STUDIO CAN RECLAIM. Tax withheld is only worth anything if the
    // studio can prove it was paid over, so this lists the documents where tax
    // was deducted and no certificate has been recorded — a list to CHASE,
    // which is a different list from what was withheld.
    unclaimedWithholding: unclaimed(invoices.map((inv) => ({
      document: inv, withheld: inv.withheld, certificateRef: inv.certificateRef,
    }))),
    vocabulary: {
      invoiceStatuses: INVOICE_STATUSES,
      // WHAT THIS STUDIO ADMITS, not what the product ships — otherwise a
      // service accepts a value no picker on the screen could offer.
      expenseCategories: valuesFor("expenseCategories", g.studio.taxonomies),
      paymentMethods: valuesFor("paymentMethods", g.studio.taxonomies),
      // The studio's own rules, so a form offers exactly what the reader will
      // match against — empty in a jurisdiction with no withholding.
      withholdingRules: g.withholdingRules,
    },
  };
});
