import { route } from "@/platform/http/route";
import { salesContext, createClient, editClient, removeClient } from "@/modules/sales/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Viewing Sales is enough to read; CHANGING it needs the Manage grant.
const spec = { auth: "studio", context: salesContext, body: true, name: "sales/clients" };
const manageable = (sales) => (sales.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (sales) => {
  const refusal = manageable(sales);
  if (refusal) return refusal;

  const result = await createClient(sales, sales.body);
  if (result.error) return result;
  return { status: 201, body: { ok: true, client: result.client } };
});

export const PUT = route(spec, async (sales) => {
  const refusal = manageable(sales);
  if (refusal) return refusal;
  if (!sales.body.id) return { error: "missing" };

  const result = await editClient(sales, sales.body.id, sales.body);
  if (result.error) return result;
  return { ok: true, client: result.client };
});

// A client with tickets can't be deleted — that would orphan real work. The
// refusal carries the tickets holding it, and that list now actually reaches the
// caller: this route forwarded it by hand, one of the few that did, and the
// wrapper forwards every refusal's context the same way.
export const DELETE = route(spec, async (sales) => {
  const refusal = manageable(sales);
  if (refusal) return refusal;
  if (!sales.body.id) return { error: "missing" };

  const result = await removeClient(sales, sales.body.id);
  if (result.error) return result;
  return { ok: true };
});
