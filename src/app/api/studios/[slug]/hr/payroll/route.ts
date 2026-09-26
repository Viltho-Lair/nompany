import { route, refused } from "@/platform/http/route";
import { hrContext } from "@/modules/hr/hr";
import {
  listPay, savePay, prepareRun, readRun, moveRun, requestRunApproval, bankFile, payslipDocument,
  deleteRun, postRunAgain,
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
// POSTING IS FINANCE'S CODE, CALLED FROM HERE. An approved run posts its wage
// bill through Finance's own `postPayroll` (payrollService.postRunToLedger) —
// the ledger stays the one place that knows what a balanced entry looks like;
// what changed on 27/09/2026 is that approving a run now asks it to.
// `post-again` offers a run whose posting was refused once more.
const spec = { auth: "studio", context: hrContext, body: true, name: "hr/payroll" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const ctx = c as HrContext;
  const url = new URL(c.request.url);
  const runId = url.searchParams.get("run");
  const bank = url.searchParams.get("bank");
  // ONE PERSON'S SLIP IN ONE RUN, to print: `?run=<id>&slip=<collaboratorId>`.
  const slip = url.searchParams.get("slip");

  const result = bank ? await bankFile(ctx, bank)
    : runId && slip ? await payslipDocument(ctx, runId, slip)
    : runId ? await readRun(ctx, runId)
      : await listPay(ctx);
  return refused(result) ? result : { ok: true, ...result };
});

// EVERY ACT IS NAMED IN THE BODY. A payroll run's transitions are not edits,
// and routing them through a generic PUT is the shape that let a rejected change
// order approve itself. APPROVING is asked for here (`request-approval`) and
// answered on the Approvals page (19/09/2026).
export const POST = route(spec, async (c) => {
  const ctx = c as HrContext;
  const action = String(c.body?.action ?? "");
  const result = action === "pay" ? await savePay(ctx, c.body)
    : action === "prepare" ? await prepareRun(ctx, c.body)
      : action === "move"
        ? await moveRun(ctx, String(c.body?.id ?? ""), String(c.body?.status ?? "") as RunStatus)
        : action === "request-approval"
          ? await requestRunApproval(ctx, String(c.body?.id ?? ""))
          // DISCARDING A WRONG DRAFT is an act named like the others rather
          // than a DELETE verb: the run's rules (Draft only, not while an
          // approval is pending) are the service's, and one door keeps them one.
          : action === "delete"
            ? await deleteRun(ctx, String(c.body?.id ?? ""))
            : action === "post-again"
              ? await postRunAgain(ctx, String(c.body?.id ?? ""))
              : { error: "action" };
  return refused(result) ? result : { ok: true, ...result };
});
