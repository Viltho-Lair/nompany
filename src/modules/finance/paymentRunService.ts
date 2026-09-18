// THE STORE HALF OF ./paymentRun. A run's record is filed under
// `finance-payables` beside the bills it paid (`paymentRuns`).

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listBills, listBillsForScreen, recordBillPayment } from "./payables";
import { storedMoneyAccounts, moneyAccountProblem } from "./ledger";
import { runCandidates } from "./paymentRun";
import type { FinanceContext } from "./types";

type RunLine = { billId: string; reference: string; vendorName: string; amount: number; currency: string; outcome: string };
type Run = {
  id: string;
  date: string;
  accountId: string;
  lines: RunLine[];
  byCollaboratorId: string;
  at: string;
};

const Runs = repo<Run>("paymentRuns");
const scope = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.payablesSection });
const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");

/** What a run due by `dueBy` would pay, and the runs made before. */
export async function paymentRunView(ctx: FinanceContext, dueBy: string) {
  const denied = requirePermission(ctx.access, "finance.payables.view");
  if (denied) return denied;
  const today = new Date().toISOString().slice(0, 10);
  const [bills, runs, accounts] = await Promise.all([
    listBillsForScreen(ctx), Runs.find(scope(ctx)), storedMoneyAccounts(ctx),
  ]);
  const cutoff = day(dueBy) || today;
  return {
    dueBy: cutoff,
    candidates: runCandidates(bills as Parameters<typeof runCandidates>[0], cutoff),
    runs: [...runs].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20),
    moneyAccounts: accounts.map((a) => ({ id: a.id, code: a.code, name: a.name })),
    studioCurrency: ctx.studio.currency || "",
    canPay: !requirePermission(ctx.access, "finance.payables.pay"),
  };
}

/**
 * PAY THE CHOSEN BILLS, each for what it still owes, through the one door a
 * bill payment has. A bill the door refuses — held, no longer approved, paid
 * meanwhile by somebody else — is recorded with its reason and the rest are
 * still paid: a run that stopped at the first refusal would leave the studio
 * guessing which suppliers had been paid.
 */
export async function executeRun(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.payables.pay");
  if (denied) return denied;
  const ids = [...new Set((Array.isArray(body?.billIds) ? body.billIds : []).map((v) => String(v)))];
  if (!ids.length) return { error: "missing" };
  const date = day(body?.date) || new Date().toISOString().slice(0, 10);
  const accountId = String(body?.accountId ?? "").trim().slice(0, 60);
  // A WRONG ACCOUNT WOULD REFUSE EVERY BILL ONE BY ONE; refused once, up front.
  const wrong = await moneyAccountProblem(ctx, accountId);
  if (wrong) return { error: wrong };

  // EVERY BILL APPROVED AND OWING, whatever its due date — the screen chose
  // them. The hold is not read here: the pay door asks it, bill by bill.
  const all = runCandidates((await listBills(ctx)) as Parameters<typeof runCandidates>[0], "");
  const byId = new Map(all.map((c) => [c.id, c]));

  const lines: RunLine[] = [];
  for (const id of ids) {
    const c = byId.get(id);
    if (!c) { lines.push({ billId: id, reference: "", vendorName: "", amount: 0, currency: "", outcome: "not-payable" }); continue; }
    const result = await recordBillPayment(ctx, id, {
      amount: c.outstanding, date, accountId, method: "Payment run", note: `Payment run ${date}`,
    }) as { error?: string };
    lines.push({
      billId: id, reference: c.reference, vendorName: c.vendorName, amount: c.outstanding, currency: c.currency,
      outcome: result?.error ? String(result.error) : "paid",
    });
  }
  // A RUN IN WHICH NOTHING WAS EVEN PAYABLE is refused without a record: it
  // paid nobody and tried nobody, and a history of empty runs is noise.
  if (lines.every((l) => l.outcome === "not-payable")) return { error: "not-payable" };
  const run = await Runs.create(scope(ctx), {
    date, accountId, lines, byCollaboratorId: ctx.collaborator.id, at: new Date().toISOString(),
  });
  return { run };
}
