import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import { listPayments, createPayment, reversePayment } from "@/modules/finance/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: financeContext, body: true, name: "finance/payments" };

export const GET = route({ ...spec, body: false }, async (finance) => {
  const result = await listPayments(finance);
  if (refused(result)) return result;
  return { ok: true, payments: result.payments };
});

export const POST = route(spec, async (finance) => {
  const result = await createPayment(finance, finance.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, payment: result.payment } };
});

// THERE IS NO PUT, AND NO DELETE. Money is append-only (Law 6): an issued
// payment never mutates and a recorded one is never removed. A correction is a
// NEW record — a reversal referencing the original — so the trail shows both
// the mistake and the fix, which is the only version of "corrected" an auditor
// can check.
//
// This is also why a payment survives the deletion of its deal: money that
// moved in the world is detached, never destroyed. A route offering to edit one
// would quietly contradict both halves of that.
export const PATCH = route(spec, async (finance) => {
  const id = String(finance.body.id || "");
  if (!id) return { error: "missing" };
  const result = await reversePayment(finance, id, finance.body);
  if (refused(result)) return result;
  // `reversal`, not `payment` — the service names it that way deliberately and
  // the response keeps the distinction. A caller handed back `payment` would
  // reasonably read it as "the payment, now corrected", which is the one thing
  // an append-only rule says never happens: the original still stands, and this
  // is a second record that opposes it.
  return { status: 201, body: { ok: true, reversal: result.reversal } };
});
