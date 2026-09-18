import QRCode from "qrcode";
import { route, refused } from "@/platform/http/route";
import {
  twoFactorEnabled, beginTwoFactor, enableTwoFactor, disableTwoFactor, recoveryCodesLeft,
} from "@/platform/auth/twoFactor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THIS PERSON'S AUTHENTICATOR — enrol, confirm, or switch off. The console's
// three steps (api/super/mfa) for the console's reason: GET hands back a secret
// and stores nothing; POST stores it only with a code the app produced from it.
// The QR is drawn HERE, as an SVG string, never by a third party: a QR of an
// otpauth:// URI is the secret itself.
const spec = { auth: "user", name: "identity/two-factor", status: { invalid: 401, code: 401 } };

export const GET = route(spec, async ({ user }) => {
  if (await twoFactorEnabled(user.id)) {
    return { ok: true, enabled: true, recoveryLeft: await recoveryCodesLeft(user.id) };
  }
  const begun = await beginTwoFactor(user.id);
  if (refused(begun)) return begun;
  const qr = await QRCode.toString(begun.uri, { type: "svg", margin: 1, width: 200 }).catch(() => "");
  return { ok: true, enabled: false, secret: begun.secret, uri: begun.uri, qr };
});

export const POST = route({ ...spec, body: true }, async ({ user, body }) => {
  const result = await enableTwoFactor(user.id, body.secret, body.code, body.password);
  if (refused(result)) return result;
  return { ok: true, enabled: true, recoveryCodes: result.recoveryCodes };
});

export const DELETE = route({ ...spec, body: true }, async ({ user, body }) => {
  const result = await disableTwoFactor(user.id, body.code);
  if (refused(result)) return result;
  return { ok: true, enabled: false };
});
