import { route, refused } from "@/platform/http/route";
import { posContext, pairTerminal, unpairTerminal } from "@/modules/sales/pos";
import { tillCookie, clearedTillCookie, tillClaim } from "@/modules/sales/tillPairing";
import { deviceLabel, requestIsHttps } from "@/platform/auth/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PAIR THIS DEVICE TO A TILL, or unpair a till from wherever its device is
// (modules/sales/tillPairing says why a till is a device). Pairing is done FROM
// the counter's computer: the secret goes into this browser's HttpOnly cookie
// and only its digest is kept on the till. `pos.settings.edit`, asked by the
// service.
const spec = {
  auth: "studio", context: posContext, body: true, name: "pos-till-pairing",
  status: { inactive: 409 },
};

export const POST = route(spec, async (pos) => {
  const result = await pairTerminal(pos, String(pos.body.id || ""), deviceLabel(pos.request));
  if (refused(result)) return result;
  const res = Response.json({ ok: true, terminal: result.terminal });
  res.headers.append("Set-Cookie", tillCookie(result.cookieValue, requestIsHttps(pos.request)));
  return res;
});

export const DELETE = route(spec, async (pos) => {
  const id = String(pos.body.id || "");
  const result = await unpairTerminal(pos, id);
  if (refused(result)) return result;
  const res = Response.json({ ok: true, terminal: result.terminal });
  // Unpaired FROM this device: it stops carrying the secret too.
  const claim = await tillClaim();
  if (claim?.terminalId === id) res.headers.append("Set-Cookie", clearedTillCookie());
  return res;
});
