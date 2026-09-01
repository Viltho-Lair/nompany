import { route, refused } from "@/platform/http/route";
import { salesContext } from "@/modules/sales/sales";
import { listContracts, createContract, updateContract } from "@/modules/sales/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CONTRACTS SHARE THE QUOTATIONS SECTION but not its route name.
//
// The convention since the fifteen-section restructure is that a route spec's
// `name` is the section key it serves, because an audit action is
// `${method} ${spec.name}` and the trail is read by section. Contracts have no
// section of their own — they live with quotations, since a contract is what a
// won quotation becomes — so following that convention literally would record
// every signed contract as "POST crm-sales-quotations", indistinguishable from
// a quotation being raised.
//
// The convention exists so an audit action names something meaningful, and here
// the section key is the less meaningful of the two. The name is the record.
const spec = { auth: "studio", context: salesContext, body: true, name: "crm-sales-contracts" };

// PERMISSION IS ENFORCED IN THE SERVICE, not here — createContract and
// updateContract each call requirePermission before touching anything. A route
// can be added and forgotten; the function that does the work cannot be reached
// around. This layer decides HTTP shape and nothing else.
export const GET = route({ ...spec, body: false }, async (sales) => {
  const result = await listContracts(sales);
  if (refused(result)) return result;
  return { ok: true, contracts: result.contracts };
});

export const POST = route(spec, async (sales) => {
  const result = await createContract(sales, sales.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, contract: result.contract } };
});

// NO DELETE, and that is a decision rather than an omission.
//
// A contract is the deal's value baseline: invoices claim against it, change
// orders adjust it, and a progress claim means nothing without it. Deleting one
// would leave those records pointing at a value that no longer exists.
//
// Ending a contract is a state a contract HAS — an end date, a termination —
// not the absence of a record. When that state lands it belongs on the record,
// where the trail keeps showing what was agreed and when it stopped. Removing
// the deal removes the contract with it (`onDelete: "cascade"`), which is the
// one case where a contract genuinely should not survive.
export const PUT = route(spec, async (sales) => {
  if (!sales.body.id) return { error: "missing" };
  const result = await updateContract(sales, String(sales.body.id), sales.body);
  if (refused(result)) return result;
  return { ok: true, contract: result.contract };
});
