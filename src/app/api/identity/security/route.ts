import { route, refused } from "@/platform/http/route";
import { securitySummary, setPin, removePin, setIdleMinutes } from "@/platform/auth/lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THIS PERSON'S LOCK SETTINGS — the PIN and the idle timeout. Setting or
// removing the PIN needs the account password where there is one (lock.ts says
// why); the timeout needs a PIN to exist, because nothing could unlock it.
const spec = {
  auth: "user", name: "identity/security",
  status: { invalid: 401, "pin-required": 409 },
};

export const GET = route(spec, async ({ user }) => ({ ok: true, ...(await securitySummary(user.id)) }));

export const PUT = route({ ...spec, body: true }, async ({ user, body }) => {
  const result = await setPin(user.id, body.pin, body.password);
  if (refused(result)) return result;
  return { ok: true, ...(await securitySummary(user.id)) };
});

export const DELETE = route({ ...spec, body: true }, async ({ user, body }) => {
  const result = await removePin(user.id, body.password);
  if (refused(result)) return result;
  return { ok: true, ...(await securitySummary(user.id)) };
});

export const PATCH = route({ ...spec, body: true }, async ({ user, body }) => {
  const result = await setIdleMinutes(user.id, body.idleMinutes);
  if (refused(result)) return result;
  return { ok: true, ...(await securitySummary(user.id)) };
});
