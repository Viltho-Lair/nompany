import { route } from "@/platform/http/route";
import { vapid, listDevices, addDevice, removeDevice, publicDevice, pushToUser } from "@/platform/notify/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THIS PERSON'S PUSH DEVICES — the phones and computers they turned push on
// for, and the public key a browser needs to subscribe. `auth: "user"`: a
// device is the person's, reached from every studio they belong to.
//
// NO ENDPOINT EVER LEAVES THIS ROUTE. A push endpoint is a capability — whoever
// holds it can push to that device — so the list carries an id, a label and
// dates, and nothing a second party could use.

export const GET = route({ auth: "user", name: "account/push" }, async ({ user }) => {
  const key = vapid();
  return {
    publicKey: key?.publicKey || null,
    keyId: key?.keyId || null,
    devices: (await listDevices(String(user.id))).map(publicDevice),
  };
});

// { subscription: { endpoint }, locale, label } adds this browser;
// { action: "test" } rings every device, so the person can see it works.
export const POST = route({ auth: "user", name: "account/push", body: true }, async ({ user, body }) => {
  const b = (body || {}) as { action?: unknown; subscription?: { endpoint?: unknown }; locale?: unknown; label?: unknown };
  if (b.action === "test") return { ok: true, sent: await pushToUser(String(user.id)) };
  const out = await addDevice(String(user.id), { endpoint: b.subscription?.endpoint, locale: b.locale, label: b.label });
  if ("error" in out) return { status: 400, body: { error: out.error } };
  return { ok: true, device: out.device };
});

export const DELETE = route({ auth: "user", name: "account/push" }, async ({ request, user }) => {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return { status: 400, body: { error: "missing" } };
  return { ok: await removeDevice(String(user.id), id) };
});
