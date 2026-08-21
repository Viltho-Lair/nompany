import QRCode from "qrcode";
import { route } from "@/lib/route";
import { patchAdmin } from "@/lib/superAuth";
import { beginEnrolment, verifyCode, makeRecoveryCodes, sealSecret, openSecret, mfaEnabled } from "@/lib/superMfa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ENROL, CONFIRM, OR TURN IT OFF.
//
// Three steps rather than one, because the failure this guards against is
// enrolling somebody into a factor they cannot produce. A secret written the
// moment it is generated locks the account the first time the app was scanned
// wrongly, the clock was out, or the QR never rendered — and the person it locks
// out is the only person who could have fixed it.
//
// So GET hands back a secret and a URI and stores NOTHING. POST takes a code
// generated from that secret and only then writes it, which means enrolment
// cannot complete unless the authenticator has already produced one working
// code. The recovery codes are shown in that same response and never again.
const spec = { auth: "super", name: "super/mfa" };

export const GET = route(spec, async ({ admin }) => {
  if (mfaEnabled(admin)) return { enabled: true, enrolledAt: admin.mfa.enabledAt };

  // NOT PERSISTED. The client holds it for the length of the enrolment and
  // sends it back with the first code; an abandoned enrolment leaves nothing.
  const { secret, uri } = beginEnrolment(admin.email);

  // THE QR IS RENDERED SERVER-SIDE AS AN SVG STRING, not fetched from a chart
  // service and not built in the browser. A QR of an otpauth:// URI IS the
  // secret — handing it to a third party to draw would post the console's second
  // factor to somebody else's logs, which is a strange way to add security.
  //
  // SVG rather than a PNG data URI so it stays sharp and stays small (~1.2 KB),
  // and inline so no image host has to be allowed through the CSP.
  const qr = await QRCode.toString(uri, { type: "svg", margin: 1, width: 200 }).catch(() => "");

  return { enabled: false, secret, uri, qr };
});

export const POST = route({ ...spec, body: true }, async ({ admin, body }) => {
  if (mfaEnabled(admin)) return { error: "already" };

  const secret = String(body.secret || "");
  if (!secret) return { error: "missing" };
  // THE PROOF, and the whole reason this is a second request: a code the app
  // actually produced from the secret it was shown.
  if (!verifyCode(secret, body.code)) return { error: "invalid" };

  const { plain, hashes } = makeRecoveryCodes();
  await patchAdmin(admin.id, () => ({
    mfa: {
      secret: sealSecret(secret),
      recoveryCodes: hashes,
      enabledAt: new Date().toISOString(),
    },
  }));

  // SHOWN ONCE. They are stored as digests, so this response is the only time
  // they exist in readable form anywhere — which is what makes them a way back
  // in rather than a second copy of the factor.
  return { enabled: true, recoveryCodes: plain };
});

// TURNING IT OFF NEEDS A CURRENT CODE, not just a session. A session is what an
// attacker has if they got in; requiring the factor to remove the factor means
// stealing a console session is not enough to disarm the console.
export const DELETE = route({ ...spec, body: true }, async ({ admin, body }) => {
  if (!mfaEnabled(admin)) return { error: "notfound" };
  if (!verifyCode(openSecret(admin.mfa.secret), body.code)) return { error: "invalid" };

  await patchAdmin(admin.id, () => ({ mfa: null }));
  return { ok: true, enabled: false };
});
