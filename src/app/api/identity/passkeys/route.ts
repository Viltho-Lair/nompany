import { route, refused } from "@/platform/http/route";
import { listPasskeys, beginRegistration, finishRegistration, removePasskey } from "@/platform/auth/passkeys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THIS PERSON'S PASSKEYS — list, add, remove (platform/auth/passkeys.ts).
// Adding is two requests: `begin` hands out the options (and keeps the
// challenge five minutes), `finish` checks what the device signed. Finishing
// and removing need the account password where there is one.
const spec = {
  auth: "user", name: "identity/passkeys",
  status: { invalid: 401, "passkey-invalid": 400, "passkey-limit": 409 },
};

export const GET = route(spec, async ({ user }) => ({ ok: true, passkeys: await listPasskeys(user.id) }));

export const POST = route({ ...spec, body: true }, async ({ user, request, body }) => {
  if (body.action === "begin") {
    const begun = await beginRegistration(user.id, request);
    if (refused(begun)) return begun;
    return { ok: true, options: begun.options };
  }
  const result = await finishRegistration(user.id, request, body.response, body.name, body.password);
  if (refused(result)) return result;
  return { ok: true, passkeys: await listPasskeys(user.id) };
});

export const DELETE = route({ ...spec, body: true }, async ({ user, body }) => {
  const result = await removePasskey(user.id, body.id, body.password);
  if (refused(result)) return result;
  return { ok: true, passkeys: await listPasskeys(user.id) };
});
