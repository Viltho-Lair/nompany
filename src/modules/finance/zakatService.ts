// THE STORE HALF OF ./zakat — a fiscal year's worksheet, saved with the
// accountant's adjustments, provisioned into the ledger and paid.
//
// OFFERED ONLY WHERE THE STUDIO'S COUNTRY LEVIES ZAKAT (its definition carries
// `rules.zakat`), which is the owner's rule for everything country-shaped: the
// studio's country decides, and a studio elsewhere never sees the screen.
//
// Reading is `finance.tax.view`; saving, provisioning and paying are
// `finance.tax.file`, the right that files and settles the VAT return — the same
// person declares what the company owes the authority either way.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { studioZakatRules } from "@/shared/compliance/rules";
import { profitAndLoss, balanceSheet } from "./statements";
import { ledgerAccounts, moneyAccountProblem, storedMoneyAccounts } from "./ledger";
import { autoPost } from "./posting";
import { zakatWorksheet, cleanAdjustment, daysIn } from "./zakat";
import type { ZakatAdjustment } from "./zakat";
import type { FinanceContext, JournalEntry } from "./types";

export type ZakatRecord = {
  id: string;
  from: string;
  to: string;
  adjustments: ZakatAdjustment[];
  zakatableShare: number;
  status: "draft" | "provisioned" | "paid";
  /** The figures at the moment of provisioning — what was booked. */
  provisioned?: ReturnType<typeof zakatWorksheet>;
  provisionedOn?: string;
  paidOn?: string;
  accountId?: string;
};

const Sheets = repo<ZakatRecord>("zakatWorksheets");
const Entries = repo<JournalEntry>("journalEntries");
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown, max = 10) => String(v ?? "").trim().slice(0, max);
const scope = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.taxSection });

/** Last calendar year — the fiscal year most studios settle next. */
function lastYear() {
  const y = new Date().getUTCFullYear() - 1;
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

/**
 * WHAT THE LEDGER CAN SAY FOR CERTAIN about a fiscal year: equity at year end
 * (the result no account holds yet included), net fixed assets, and the year's
 * profit. A ZAKAT PROVISION IS LEFT OUT OF THE PROFIT: it is this worksheet's
 * own output, and counting it would move the figure every time it is opened.
 */
async function ledgerInputs(ctx: FinanceContext, from: string, to: string) {
  const chart = await ledgerAccounts(ctx);
  const all = await Entries.find({ studio: ctx.studio, section: ctx.ledgerSection });
  const entries = all.filter((e) => e.source?.kind !== "zakat-provision" && e.source?.kind !== "zakat-payment");
  const currency = ctx.studio.currency;
  const bs = balanceSheet(entries, chart, to, currency);
  const pl = profitAndLoss(entries, chart, { from, to, currency });
  const fixed = bs.asset.filter((r) => r.code === "1500" || r.code === "1510").reduce((t, r) => t + r.amount, 0);
  return { equity: bs.totalEquity + bs.retainedResult, netFixedAssets: fixed, profit: pl.profit };
}

export async function zakatView(ctx: FinanceContext, query: { from?: unknown; to?: unknown }) {
  const denied = requirePermission(ctx.access, "finance.tax.view");
  if (denied) return denied;
  const rule = studioZakatRules(ctx.studio);
  if (!rule) return { enabled: false as const };

  const fallback = lastYear();
  const from = ISO.test(text(query.from)) ? text(query.from) : fallback.from;
  const to = ISO.test(text(query.to)) ? text(query.to) : fallback.to;
  if (from > to) return { error: "period" };

  const sheets = await Sheets.find(scope(ctx));
  const saved = sheets.find((s) => s.from === from && s.to === to) || null;
  const inputs = await ledgerInputs(ctx, from, to);
  const days = daysIn(from, to);
  const result = zakatWorksheet({
    ...inputs, days,
    adjustments: saved?.adjustments || [],
    zakatableShare: saved?.zakatableShare ?? 100,
  }, rule, ctx.studio.currency);

  return {
    enabled: true as const,
    from, to, days, rule, inputs, result, saved,
    sheets: [...sheets].sort((a, b) => b.from.localeCompare(a.from)),
    canFile: !requirePermission(ctx.access, "finance.tax.file"),
    moneyAccounts: (await storedMoneyAccounts(ctx)).map((a) => ({ id: a.id, code: a.code, name: a.name })),
  };
}

/** SAVE A YEAR'S ADJUSTMENTS AND SHARE — a draft, edited until it is provisioned. */
export async function saveZakat(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.tax.file");
  if (denied) return denied;
  if (!studioZakatRules(ctx.studio)) return { error: "no-zakat" };
  const from = text(body?.from);
  const to = text(body?.to);
  if (!ISO.test(from) || !ISO.test(to) || from > to) return { error: "period" };
  const adjustments = (Array.isArray(body?.adjustments) ? body.adjustments : [])
    .map((a) => cleanAdjustment(a as Record<string, unknown>))
    .filter((a): a is ZakatAdjustment => a !== null)
    .slice(0, 50);
  const zakatableShare = Math.min(100, Math.max(0, Number(body?.zakatableShare ?? 100) || 0));

  const sheets = await Sheets.find(scope(ctx));
  const current = sheets.find((s) => s.from === from && s.to === to);
  if (current && current.status !== "draft") return { error: "provisioned" };
  // ONE WORKSHEET PER YEAR, and years may not overlap — a day in two years is
  // zakat provided for twice.
  const overlap = sheets.find((s) => s.id !== current?.id && s.from <= to && from <= s.to);
  if (overlap) return { error: "overlap", from: overlap.from, to: overlap.to };

  const sheet = current
    ? await Sheets.update(scope(ctx), current.id, { adjustments, zakatableShare })
    : await Sheets.create(scope(ctx), { from, to, adjustments, zakatableShare, status: "draft" } as Omit<ZakatRecord, "id">);
  return sheet ? { sheet } : { error: "notfound" };
}

/**
 * PROVISION A YEAR: freeze the figures and book them — Dr Zakat (5950), Cr
 * Zakat Payable (2170), dated the year's last day.
 */
export async function provisionZakat(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.tax.file");
  if (denied) return denied;
  const rule = studioZakatRules(ctx.studio);
  if (!rule) return { error: "no-zakat" };
  const sheet = (await Sheets.find(scope(ctx))).find((s) => s.id === id);
  if (!sheet) return { error: "notfound" };
  if (sheet.status !== "draft") return { error: "provisioned" };

  const inputs = await ledgerInputs(ctx, sheet.from, sheet.to);
  const provisioned = zakatWorksheet({
    ...inputs, days: daysIn(sheet.from, sheet.to), adjustments: sheet.adjustments, zakatableShare: sheet.zakatableShare,
  }, rule, ctx.studio.currency);
  const provisionedOn = new Date().toISOString().slice(0, 10);
  const updated = await Sheets.update(scope(ctx), id, () => ({ status: "provisioned", provisioned, provisionedOn }));
  if (!updated) return { error: "notfound" };
  const posting = provisioned.zakat > 0 ? await autoPost(ctx, "zakat-provision", id) : null;
  return { sheet: updated, ...(posting ? { posting } : {}) };
}

/** PAY A PROVISIONED YEAR through a money account: Dr Zakat Payable, Cr the account. */
export async function payZakat(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.tax.file");
  if (denied) return denied;
  const sheet = (await Sheets.find(scope(ctx))).find((s) => s.id === id);
  if (!sheet) return { error: "notfound" };
  if (sheet.status !== "provisioned") return { error: sheet.status === "paid" ? "already-paid" : "not-provisioned" };
  const accountId = String(body?.accountId ?? "").trim().slice(0, 60);
  const wrong = await moneyAccountProblem(ctx, accountId);
  if (wrong) return { error: wrong };
  const paidOn = ISO.test(text(body?.paidOn)) ? text(body?.paidOn) : new Date().toISOString().slice(0, 10);
  const updated = await Sheets.update(scope(ctx), id, () => ({ status: "paid", paidOn, ...(accountId ? { accountId } : {}) }));
  if (!updated) return { error: "notfound" };
  const posting = await autoPost(ctx, "zakat-payment", id);
  return { sheet: updated, posting };
}
