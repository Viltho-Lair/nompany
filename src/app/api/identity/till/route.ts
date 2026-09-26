import { route, refused } from "@/platform/http/route";
import {
  pairedTill, tillCashiers, tillCashier, unpairPairedTill, clearedTillCookie,
} from "@/modules/sales/tillPairing";
import { checkPinForAct } from "@/platform/auth/lock";
import { getUserById, mintSession, revokeSession, touchLastLogin, findUserBySession } from "@/platform/auth/users";
import {
  sessionCookie, clearedSessionCookie, requestIsHttps, requestSessionToken, deviceFingerprint, SESSION_TTL,
  currentSession,
} from "@/platform/auth/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A CASHIER TAKES OVER A PAIRED TILL WITH THEIR PIN (the owner, 18/09/2026).
//
// PUBLIC, and the device's till cookie is the whole proof: this door exists
// only on a device a manager paired, it names the studio and the till only
// after the secret checks out, and it lists nothing but the names of those who
// may sell there. What it mints is a TILL session — good for this till and
// nothing else (the route wrapper and the studio shell hold it there), eight
// hours at most, and counted against nobody's device limit.
const spec = { auth: "public", name: "identity/till" };

export const GET = route(spec, async () => {
  const till = await pairedTill();
  if (!till) return { ok: true, till: null };
  return {
    ok: true,
    till: {
      studio: { name: String(till.studio.name || ""), slug: String(till.studio.slug || "") },
      terminal: { name: till.terminal.name, code: till.terminal.code || "" },
      cashiers: await tillCashiers(String(till.studio.id)),
    },
  };
});

export const POST = route({ ...spec, body: true }, async ({ request, body }) => {
  const till = await pairedTill();
  if (!till) return { error: "not-a-till" };
  const studioId = String(till.studio.id);
  const cashier = await tillCashier(studioId, String(body.collaboratorId || ""));
  if (!cashier?.userId) return { error: "forbidden" };
  const user = await getUserById(String(cashier.userId));
  if (!user) return { error: "notfound" };
  if (user.status === "suspended") return { error: "suspended" };

  const checked = await checkPinForAct(user.id, body.pin);
  if (refused(checked)) return checked;

  // WHOEVER WAS ON THIS TILL BEFORE is signed out of it: one till, one cashier.
  const previous = await requestSessionToken();
  if (previous) {
    const was = await findUserBySession(previous);
    if (was) await revokeSession(was.id, previous);
  }
  const device = deviceFingerprint(request);
  const token = await mintSession(user.id, SESSION_TTL, {
    scope: "till", studioId, terminalId: till.terminal.id,
    deviceType: device.deviceType, label: device.label, location: device.location,
  });
  await touchLastLogin(user.id);
  const res = Response.json({ ok: true, slug: String(till.studio.slug || "") });
  res.headers.append("Set-Cookie", sessionCookie(token, SESSION_TTL, requestIsHttps(request)));
  return res;
});

// THE DEVICE GIVES UP ITS OWN PAIRING (26/09/2026). The till row forgets the
// pairing, this browser forgets the secret, and a till session on this browser
// ends with it — a till session on a device that is no longer a till is good
// for nothing.
//
// NO PIN AND NO RIGHT, and that is deliberate rather than an omission. The
// first version asked a Point of Sale manager's PIN, and it guarded nothing:
// whoever holds this browser can unpair it already by clearing its cookies.
// What it did stop was the person it was built for — somebody whose own
// computer was paired once, standing in front of it, whose studio's manager
// had never set a PIN. The cookie IS the proof: only the paired device holds
// the secret, so only the paired device can ask, and all it can undo is itself.
// A manager re-pairs from Settings in a click.
export const DELETE = route(spec, async () => {
  const till = await pairedTill();
  if (!till) return { error: "not-a-till" };
  await unpairPairedTill(till);
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", clearedTillCookie());
  const { user: holder, state } = await currentSession();
  if (holder && state?.scope === "till") {
    await revokeSession(holder.id, await requestSessionToken());
    res.headers.append("Set-Cookie", clearedSessionCookie());
  }
  return res;
});
