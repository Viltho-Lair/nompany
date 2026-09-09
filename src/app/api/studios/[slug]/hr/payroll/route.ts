import { route, refused } from "@/platform/http/route";
import { hrContext } from "@/modules/hr/hr";
import {
  listPay, savePay, prepareRun, readRun, moveRun, bankFile,
} from "@/modules/hr/payrollService";
import type { HrContext } from "@/modules/hr/types";
import type { RunStatus } from "@/modules/hr/payroll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PAY RECORDS AND PAYROLL RUNS.
//
// `hr.payroll` IS NOT `hr.employees.salary`. That right reveals one person's
// record to somebody who may already read it; this one opens the whole
// company's wage bill, and a studio hands them to different people.
//
// POSTING IS NOT HERE. A run reaches the ledger through Finance's own posting
// route, on the rule every other posting follows — the ledger is the one place
// that knows what a balanced entry looks like.
const spec = { auth: "studio", context: hrContext, body: true, name: "hr/payroll" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const ctx = c as HrContext;
  const url = new URL(c.request.url);
  const runId = url.searchParams.get("run");
  const bank = url.searchParams.get("bank");

  const result = bank ? await bankFile(ctx, bank)
    : runId ? await readRun(ctx, runId)
      : await listPay(ctx);
  return refused(result) ? result : { ok: true, ...result };
});

// EVERY ACT IS NAMED IN THE BODY. A payroll run's transitions are not edits —
// approving one is the second half of the oldest control there is — and routing
// them through a generic PUT is the shape that let a rejected change order
// approve itself.
export const POST = route(spec, async (c) => {
  const ctx = c as HrContext;
  const action = String(c.body?.action ?? "");
  const result = action === "pay" ? await savePay(ctx, c.body)
    : action === "prepare" ? await prepareRun(ctx, c.body)
      : action === "move"
        ? await moveRun(ctx, String(c.body?.id ?? ""), String(c.body?.status ?? "") as RunStatus)
        : { error: "action" };
  return refused(result) ? result : { ok: true, ...result };
});
