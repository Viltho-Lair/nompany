import { route, refused } from "@/platform/http/route";
import { inventoryContext, importVendors } from "@/modules/inventory/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// BULK VENDOR CREATE. Its own route rather than a second body shape on the
// vendors POST: "create this vendor" and "create these two hundred" answer
// differently — one hands back a vendor, the other a tally and a list of what
// it would not take — and a caller should not have to read the body to know
// which of those it is going to get.
//
// The rows arrive as JSON. The CSV the person actually attached is parsed in
// the browser, which is where the file is; this route never sees a file and
// never trusts the parse, because importVendors re-cleans every field through
// the same helpers the single-vendor form goes through.
const spec = { auth: "studio", context: inventoryContext, body: true, name: "inventory/vendors/import" };

export const POST = route(spec, async (inv) => {
  if (!inv.canManage) return { error: "read-only" };

  const result = await importVendors(inv, inv.body.rows);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, created: result.created, skipped: result.skipped } };
});
