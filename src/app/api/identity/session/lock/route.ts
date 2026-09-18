import { route } from "@/platform/http/route";
import { currentSessionDigest } from "@/platform/auth/identity";
import { lockStatus, lockSession, unlockSession, heartbeat } from "@/platform/auth/lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE LOCK ON THE SESSION THIS REQUEST CARRIES — docs/functionality/sessions-and-devices.md.
//
// PUBLIC to the wrapper, and deliberately: a locked session is refused by
// `currentUser`, and this is the one door it must still reach — to ask whether
// it is locked, and to unlock. Every action here acts on the session the
// cookie names and on nothing else, so there is nothing to reach beyond it.
const spec = {
  auth: "public", name: "identity/session/lock",
  status: { "pin-invalid": 401, "pin-locked-out": 401, "pin-required": 409 },
};

export const GET = route(spec, async () => ({ ok: true, ...(await lockStatus(await currentSessionDigest())) }));

// lock · unlock (with the PIN) · active (the heartbeat that keeps an idle
// timeout from running out while somebody is working).
export const POST = route({ ...spec, body: true }, async ({ body }) => {
  const digest = await currentSessionDigest();
  const action = String(body.action || "");
  if (action === "lock") return lockSession(digest);
  if (action === "unlock") return unlockSession(digest, body.pin);
  if (action === "active") return heartbeat(digest);
  return { error: "action" };
});
