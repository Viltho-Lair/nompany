// WEB PUSH — a notice on this person's phone or computer, even with nompany
// closed (29/09/2026). The owner's choices, each of which shapes this file:
//
//   THE KEY IS DERIVED, NOT STORED. The VAPID key pair that identifies nompany
//   to the browsers' push services is a purpose subkey of NOMPANY_DATA_KEY
//   (masterKeys.ts, "web-push/vapid"), the rule that there is ONE key variable
//   and every other secret is derived from it. Nothing new to store, back up or
//   forget to set; it changes only if the master changes, and a device
//   subscribed under an old key is told so and re-subscribes (`keyId`).
//
//   THE PUSH CARRIES NOTHING. A push travels through Apple's, Google's or
//   Mozilla's servers, so it goes EMPTY — no title, no body, not even the
//   studio's name — and the service worker (public/sw.js) wakes and asks
//   `/api/account/push/latest`, on the person's own session, what to show. The
//   same rule the doorbell follows (notifications.ts, finding L-7): the channel
//   is a bell, the words are fetched by whoever may read them. It also means no
//   payload encryption, which is most of what a push library exists for.
//
//   A DEAD DEVICE IS FORGOTTEN. A push service answering 404 or 410 has
//   dropped the subscription (the browser was reset, the app removed); the
//   device is pruned rather than asked again every time.

import crypto from "crypto";
import { U } from "@/platform/db/keys";
import { getJSON, editJSON } from "@/platform/db/store";
import { derivedSecret } from "@/platform/db/masterKeys";
import { log } from "@/platform/http/observability";

// ---- the key ----------------------------------------------------------------

type Vapid = { publicKey: string; keyId: string; privateKey: crypto.KeyObject };
const b64url = (b: Buffer) => b.toString("base64url");

let cached: Vapid | null | undefined;

/**
 * THE KEY PAIR, or null when there is no master key (a deployment without
 * NOMPANY_DATA_KEY simply offers no push). The 32 derived bytes are the P-256
 * private scalar; the rare value outside the curve's range is re-hashed until
 * it is not, deterministically, so every instance derives the same pair.
 */
export function vapid(): Vapid | null {
  if (cached !== undefined) return cached;
  let d = derivedSecret("web-push/vapid");
  if (!d) return (cached = null);
  for (let i = 0; i < 8; i++) {
    try {
      const ecdh = crypto.createECDH("prime256v1");
      ecdh.setPrivateKey(d);
      const pub = ecdh.getPublicKey(); // uncompressed, 65 bytes: 0x04 ‖ x ‖ y
      const privateKey = crypto.createPrivateKey({
        key: { kty: "EC", crv: "P-256", d: b64url(d), x: b64url(pub.subarray(1, 33)), y: b64url(pub.subarray(33, 65)) },
        format: "jwk",
      });
      const publicKey = b64url(pub);
      const keyId = crypto.createHash("sha256").update(pub).digest("hex").slice(0, 12);
      return (cached = { publicKey, keyId, privateKey });
    } catch {
      d = crypto.createHash("sha256").update(d).digest();
    }
  }
  return (cached = null);
}

/** For tests: forget the derived pair. */
export function resetVapid() { cached = undefined; }

/** The signed token a push service checks: who is sending, to which service, until when. */
export function vapidJwt(audience: string, key: Vapid, now = Date.now()): string {
  const header = b64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64url(Buffer.from(JSON.stringify({
    aud: audience,
    exp: Math.floor(now / 1000) + 12 * 3600,
    sub: `mailto:${process.env.PUSH_CONTACT || "support@nompany.com"}`,
  })));
  const signature = crypto.sign("sha256", Buffer.from(`${header}.${claims}`), { key: key.privateKey, dsaEncoding: "ieee-p1363" });
  return `${header}.${claims}.${b64url(signature)}`;
}

// ---- where a push may be sent ---------------------------------------------

// THE SERVER FETCHES WHATEVER ADDRESS A BROWSER REGISTERED, which is exactly
// the shape of a request-forgery hole: a subscription naming an internal host
// would have nompany's servers call it. So an endpoint must be HTTPS on one of
// the browser vendors' push services, and nothing else is stored.
const PUSH_HOSTS = [
  "fcm.googleapis.com",                 // Chrome, Edge (Chromium), Android
  "updates.push.services.mozilla.com",  // Firefox
  "web.push.apple.com",                 // Safari, iOS home-screen apps
  ".push.apple.com",
  ".notify.windows.com",                // Edge on Windows (legacy WNS)
];

export function pushEndpointAllowed(endpoint: unknown): boolean {
  try {
    const u = new URL(String(endpoint || ""));
    if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return false;
    const host = u.hostname.toLowerCase();
    return PUSH_HOSTS.some((h) => (h.startsWith(".") ? host.endsWith(h) : host === h));
  } catch {
    return false;
  }
}

// ---- the devices ------------------------------------------------------------

export type PushDevice = {
  id: string;
  endpoint: string;
  /** The key the device subscribed under — a different one means re-subscribe. */
  keyId: string;
  /** The language this device reads, sent when it subscribed. */
  locale: "en" | "ar";
  /** "Chrome on Windows", as the browser described itself — for the list only. */
  label: string;
  createdAt: string;
  lastOkAt?: string;
};

const MAX_DEVICES = 10;

export async function listDevices(userId: string): Promise<PushDevice[]> {
  const rows = await getJSON<PushDevice[]>(U.pushDevices(userId));
  return Array.isArray(rows) ? rows : [];
}

/** The public shape — never the endpoint, which is a capability to push to them. */
export const publicDevice = (d: PushDevice) => ({ id: d.id, label: d.label, locale: d.locale, createdAt: d.createdAt, lastOkAt: d.lastOkAt || "", keyId: d.keyId });

/**
 * ADD THIS BROWSER, or refresh it. One entry per endpoint: subscribing again on
 * the same browser replaces its entry rather than adding a second. The oldest
 * falls off past ten, which is more phones and laptops than a person has.
 */
export async function addDevice(userId: string, input: { endpoint: unknown; locale?: unknown; label?: unknown }) {
  const key = vapid();
  if (!key) return { error: "not-configured" as const };
  if (!pushEndpointAllowed(input.endpoint)) return { error: "endpoint" as const };
  const endpoint = String(input.endpoint);
  const device: PushDevice = {
    id: crypto.createHash("sha256").update(endpoint).digest("hex").slice(0, 16),
    endpoint,
    keyId: key.keyId,
    locale: input.locale === "ar" ? "ar" : "en",
    label: String(input.label || "").slice(0, 80),
    createdAt: new Date().toISOString(),
  };
  await editJSON<PushDevice[], null>(U.pushDevices(userId), (current) => ({
    next: [device, ...(current || []).filter((d) => d.endpoint !== endpoint)].slice(0, MAX_DEVICES),
    result: null,
  }));
  return { device: publicDevice(device) };
}

export async function removeDevice(userId: string, id: string) {
  return editJSON<PushDevice[], boolean>(U.pushDevices(userId), (current) => {
    const rows = current || [];
    const next = rows.filter((d) => d.id !== id);
    return next.length === rows.length ? { result: false } : { next, result: true };
  });
}

// ---- sending ------------------------------------------------------------------

async function ring(device: PushDevice, key: Vapid): Promise<number> {
  const audience = new URL(device.endpoint).origin;
  const res = await fetch(device.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${vapidJwt(audience, key)}, k=${key.publicKey}`,
      // A day: a phone that was off overnight still gets the morning's notice.
      TTL: "86400",
      Urgency: "normal",
      "Content-Length": "0",
    },
    signal: AbortSignal.timeout(8000),
  });
  return res.status;
}

/**
 * RING EVERY DEVICE THIS PERSON TURNED PUSH ON FOR. Best-effort: a push is a
 * courtesy on top of a notice that is already in the bell, so a failure is
 * logged and never thrown. A device subscribed under another key is skipped —
 * the screen re-subscribes it when it next opens.
 */
export async function pushToUser(userId: string): Promise<number> {
  const key = vapid();
  if (!key || !userId) return 0;
  try {
    const devices = (await listDevices(userId)).filter((d) => d.keyId === key.keyId && pushEndpointAllowed(d.endpoint));
    if (!devices.length) return 0;
    const gone: string[] = [];
    const ok: string[] = [];
    await Promise.all(devices.map(async (d) => {
      try {
        const status = await ring(d, key);
        if (status === 404 || status === 410) gone.push(d.id);
        else if (status >= 200 && status < 300) ok.push(d.id);
        else log.warn(`[push] ${status} from ${new URL(d.endpoint).hostname}`);
      } catch (e) {
        log.warn(`[push] send failed: ${(e as Error).message}`);
      }
    }));
    if (gone.length || ok.length) {
      const at = new Date().toISOString();
      await editJSON<PushDevice[], null>(U.pushDevices(userId), (current) => ({
        next: (current || [])
          .filter((d) => !gone.includes(d.id))
          .map((d) => (ok.includes(d.id) ? { ...d, lastOkAt: at } : d)),
        result: null,
      }));
    }
    return ok.length;
  } catch (e) {
    log.error(`[push] failed for ${userId}: ${(e as Error).message}`);
    return 0;
  }
}
