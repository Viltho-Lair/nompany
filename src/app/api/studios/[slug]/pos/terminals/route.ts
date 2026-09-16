import { route, refused } from "@/platform/http/route";
import { posContext, saveTerminal } from "@/modules/sales/pos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A TILL IS ADDED, RENAMED OR RETIRED — never deleted, because its receipts name
// it. So there is no DELETE here, and retiring one with a shift open is a
// conflict rather than a bad request: the drawer has to be closed first.
const spec = {
  auth: "studio", context: posContext, body: true, name: "crm-sales-pos",
  status: { duplicate: 409, "shift-open": 409 },
};

export const POST = route(spec, async (pos) => {
  const result = await saveTerminal(pos, { ...pos.body, id: "" });
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, terminal: result.terminal } };
});

export const PUT = route(spec, async (pos) => {
  if (!pos.body.id) return { error: "missing" };
  const result = await saveTerminal(pos, pos.body);
  if (refused(result)) return result;
  return { ok: true, terminal: result.terminal };
});
