// BUDGET & SPEND — what Marketing planned to spend, and what Finance says it
// did (21/09/2026). The arithmetic is ./spend, pure and shared with the screen;
// this file decides WHAT COUNTS AS MARKETING SPEND, reads it, and converts it.
//
// NOTHING IS SPENT FROM HERE. A bill and an expense are Finance's records and
// are raised there; each may NAME a campaign, exactly as a bill already names a
// cost code and an invoice a milestone. Marketing reads them. Growing a second
// way to record money out of this screen would be two ledgers for one company,
// free to disagree about what a campaign cost — the same argument that keeps
// releasing retention in Finance rather than on a project screen.
//
// NAME THE SWITCH, NOT THE STORAGE (the owner, 17/09/2026). An expense is FILED
// under `finance-cash` and belongs to **Payables & Expenses**, so the switch
// that decides whether it is read is `finance-payables` — the department a
// person would go to switch it off — and not the row it happens to live in.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { crossRate } from "@/shared/currencies";
import { roundMoney } from "@/shared/money";
import { billTotals } from "@/modules/finance/payables";
import { budgetTotal, isFinal } from "./model";
import { campaignSpend, campaignReturn, type SpendRow } from "./spend";
import { campaignResultsFor } from "./campaigns";
import type { MarketingContext, Campaign } from "./types";
import type { Bill, Expense } from "@/modules/finance/schema";

const Campaigns = repo<Campaign>("marketingCampaigns");
const Bills = repo<Bill>("bills");
const Expenses = repo<Expense>("expenses");

/**
 * THE SECTION'S REPORT: every campaign with what it was allowed, what it has
 * cost, and what that bought.
 *
 * ONE RIGHT, VIEW ONLY (`marketing.budget.view`), and the absent verbs are the
 * design rather than an omission. Setting a campaign's budget is editing the
 * campaign (`marketing.campaigns.edit`); filing a cost against one is editing
 * that bill (`finance.payables.edit`). A `budget.edit` would be a second right
 * over acts two other rights already govern, free to disagree with both. What
 * this right decides is who may SEE what the company spends on its marketing —
 * the same split as `tendering.rates` and `projects.costs`.
 */
export async function marketingBudget(ctx: MarketingContext) {
  const denied = requirePermission(ctx.access, "marketing.budget.view");
  if (denied) return denied;

  const { studio } = ctx;
  const base = String(studio.currency || "").toUpperCase();
  // A SWITCHED-OFF PART IS NOT READ, and the screen is told which sources
  // answered — "no spend" and "nothing was read" are different sentences.
  const reads = { finance: Boolean(ctx.payablesSection) && ctx.on("finance-payables") };

  const [campaigns, bills, expenses, results] = await Promise.all([
    Campaigns.find({ studio, section: ctx.campaignsSection }),
    reads.finance ? Bills.find({ studio, section: ctx.payablesSection! }) : Promise.resolve([] as Bill[]),
    reads.finance && ctx.cashSection
      ? Expenses.find({ studio, section: ctx.cashSection })
      : Promise.resolve([] as Expense[]),
    campaignResultsFor(ctx),
  ]);

  // ONLY WHAT NAMES A CAMPAIGN is converted or counted — a studio's whole
  // payables ledger is not marketing's, and reading the rate table for bills
  // nobody filed here would cost a fetch for nothing.
  const billed = bills.filter((b) => String(b.campaignId || "")
    && b.status !== "Draft" && b.status !== "Cancelled");
  const claimed = expenses.filter((e) => String(e.campaignId || ""));
  const foreign = (c: unknown) => Boolean(base && c && String(c).toUpperCase() !== base);
  const rates = billed.some((b) => foreign(b.currency)) ? (await getExchangeSnapshot()).rates : null;

  let unconverted = 0;
  const spend: SpendRow[] = [];
  for (const bill of billed) {
    const gross = billTotals(bill, base).total;
    const from = String(bill.currency || "").toUpperCase();
    if (!foreign(from)) {
      spend.push({ campaignId: bill.campaignId, amount: gross, kind: "bill" });
      continue;
    }
    // THE RATE THE BILL WAS BOOKED AT WINS, and today's table is the fallback.
    // A bill already posted has its rate frozen on it (fx.ts); re-reading the
    // market would move a cost that was settled months ago every morning.
    const rate = Number(bill.exchangeRate) > 0 ? Number(bill.exchangeRate) : crossRate(rates, from, base);
    if (rate == null) { unconverted += 1; continue; }
    spend.push({ campaignId: bill.campaignId, amount: roundMoney(gross * rate, base), kind: "bill" });
  }
  // AN EXPENSE IS IN THE STUDIO'S OWN MONEY — it carries no currency of its own
  // (schema.ts), so there is nothing to convert and nothing to get wrong.
  for (const e of claimed) spend.push({ campaignId: e.campaignId, amount: Number(e.amount) || 0, kind: "expense" });

  // A DRAFT AND A CANCELLED BILL ARE NOT SPEND, filtered above on the same list
  // `projectCosting` uses and for its reason: a draft was raised against nobody
  // and a cancelled bill was withdrawn. An UNAPPROVED bill IS spend — approval
  // authorises payment, and a report that waited for it would call a campaign
  // under budget for exactly as long as its paperwork was behind.
  const open = campaigns.filter((c) => !isFinal(c.status));
  const report = campaignSpend(campaigns, spend, budgetTotal(open));

  const rows = campaigns
    .map((c) => {
      const s = report.campaigns.get(c.id)!;
      const got = results.get(c.id) || { leads: 0, won: 0, wonValue: 0 };
      return {
        id: c.id,
        reference: c.reference,
        name: c.name,
        status: c.status,
        parentId: c.parentId || "",
        startOn: c.startOn || "",
        endOn: c.endOn || "",
        budget: s.budget,
        spent: s.total,
        ownSpend: s.own,
        remaining: s.remaining,
        used: s.used,
        over: s.over,
        nearly: s.nearly,
        bills: s.bills,
        expenses: s.expenses,
        leads: got.leads,
        won: got.won,
        wonValue: got.wonValue,
        ...campaignReturn(s.total, got),
      };
    })
    // THE ONES NEEDING A DECISION FIRST: over its budget, then close to it,
    // then the biggest spenders. A report sorted by entry date buries the
    // campaign that is 40% over on page two.
    .sort((a, b) => Number(b.over) - Number(a.over)
      || Number(b.nearly) - Number(a.nearly)
      || b.spent - a.spent
      || a.name.localeCompare(b.name));

  // THE STUDIO'S TOTAL INCLUDES WHAT NAMES A DELETED CAMPAIGN, and that is the
  // whole point of keeping `unattributed` rather than dropping it. Measured in
  // the sandbox: deleting one campaign took the spent tile from 8,800 to 6,300
  // while its bill sat untouched in Payables, so the screen reported the studio
  // as having spent less BY TIDYING ITS REGISTER — the exact failure
  // `projectCosting` wrote down as "money nobody filed properly is still the
  // project's money". The per-campaign rows cannot show it (it belongs to no
  // campaign now), so the screen names it on its own line beneath the tiles.
  return {
    currency: base,
    asOf: new Date().toISOString().slice(0, 10),
    campaigns: rows,
    totals: {
      budget: report.budget,
      spent: report.spent,
      remaining: report.remaining,
      unattributed: report.unattributed,
      over: rows.filter((r) => r.over).length,
      nearly: rows.filter((r) => r.nearly).length,
      ...campaignReturn(report.spent, rows.reduce((s, r) => ({
        leads: s.leads + r.leads, won: s.won + r.won, wonValue: s.wonValue + r.wonValue,
      }), { leads: 0, won: 0, wonValue: 0 })),
    },
    sources: reads,
    unconverted,
    /** Whoever may file a cost against a campaign is told where to do it. */
    canFile: !requirePermission(ctx.access, "finance.payables.edit"),
  };
}
