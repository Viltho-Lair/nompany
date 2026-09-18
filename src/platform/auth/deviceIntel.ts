// DEVICE INTELLIGENCE — what Fingerprint says about the browser signing in.
//
// The sign-in and sign-up pages run Fingerprint's agent and leave the event id
// in a cookie (`components/public/deviceIntel.js`). Here the server asks
// Fingerprint's Server API about THAT EVENT, with the secret key, and believes
// only the answer: a visitor id the browser reported itself would be whatever
// an attacker typed. docs/functionality/device-intel.md is the file.
//
// WHAT IT IS USED FOR, and nothing else — sign-in security. Keeping it to that
// is deliberate: whether device fingerprinting needs consent turns on its
// purpose, and "securing the account being signed into" is the narrowest one
// there is (the doc records what the privacy policy must say):
//   - a trusted device is BOUND to the browser that was trusted, so a device
//     cookie copied onto another machine asks for the emailed code again;
//   - a bad bot is refused at sign-in and sign-up;
//   - failed passwords and new accounts are counted per device, not only per IP.
//
// IT FAILS OPEN ON OUR SIDE AND CLOSED ON THE CALLER'S. No secret key, or
// Fingerprint down, and sign-in behaves exactly as it did before this file
// existed — a third party's outage must not lock anybody out. But a MISSING or
// FORGED event is something the caller controls, so a device bound to a visitor
// cannot be passed off without one: that asks for the code.

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { derivedSecret } from "@/platform/db/masterKeys";
import { log } from "@/platform/http/observability";
import { DEVICE_EVENT_COOKIE, DEVICE_EVENT_MAX_AGE_SEC, FINGERPRINT_REGION } from "@/shared/deviceIntel";
import type { DeviceFacts } from "./otp";

// IMPORTS NOTHING FROM identity OR otp BUT A TYPE: both import this file, and a
// value import back the other way is a cycle that works until a bundler orders
// the modules differently.

export type IntelStatus = "ok" | "off" | "missing" | "invalid" | "unavailable";

export type DeviceIntel =
  | { status: Exclude<IntelStatus, "ok">; reason?: string }
  | {
      status: "ok";
      /** A keyed digest of Fingerprint's visitor id — the id itself is never stored. */
      visitorHash: string;
      bot: "bad" | "good" | "not_detected" | string;
      vpn: boolean;
      incognito: boolean;
      suspectScore: number | null;
    };

/** Could the caller have forged or withheld this? Only then does a binding bite. */
export const callerAccountable = (status: IntelStatus | undefined): boolean =>
  status === "ok" || status === "missing" || status === "invalid";

/**
 * PURE: may a trusted device row still skip the code, given what Fingerprint
 * said about THIS request? An unbound row, a request that was never asked
 * (`facts` null), and Fingerprint being off or down all answer yes — the
 * behaviour before this file existed. A bound row answers yes only to the
 * same browser.
 */
export function bindingHolds(boundHash: string | undefined, facts: Pick<DeviceFacts, "intel" | "visitorHash"> | null): boolean {
  if (!boundHash || !facts || !callerAccountable(facts.intel)) return true;
  return facts.intel === "ok" && facts.visitorHash === boundHash;
}

const API = FINGERPRINT_REGION === "eu" ? "https://eu.api.fpjs.io" : "https://api.fpjs.io";
const TIMEOUT_MS = 2500;
// A clock a minute ahead of ours is a clock, not an attack.
const FUTURE_SKEW_MS = 60_000;

/** What the Server API returns, as far as this file reads it. */
export type FingerprintEvent = {
  identification?: { visitor_id?: string };
  bot?: string;
  vpn?: boolean;
  incognito?: boolean;
  suspect_score?: number;
  timestamp?: number;
  url?: string;
};

/**
 * PURE: is this event a fresh identification of a browser on THIS site?
 *
 * The host check is what stops somebody running our public key on a page of
 * their own and bringing the event here; freshness is what makes an event id
 * lifted off somebody else's machine worth little.
 */
export function judgeEvent(
  event: FingerprintEvent | null | undefined,
  { now, host }: { now: number; host: string },
): { ok: true; visitorId: string } | { ok: false; reason: string } {
  const visitorId = event?.identification?.visitor_id;
  if (!visitorId) return { ok: false, reason: "no-visitor" };
  const at = Number(event?.timestamp);
  if (!Number.isFinite(at)) return { ok: false, reason: "no-timestamp" };
  if (now - at > DEVICE_EVENT_MAX_AGE_SEC * 1000) return { ok: false, reason: "stale" };
  if (at - now > FUTURE_SKEW_MS) return { ok: false, reason: "future" };
  let eventHost = "";
  try { eventHost = new URL(String(event?.url || "")).host; } catch { /* judged below */ }
  if (!host || eventHost.toLowerCase() !== host.toLowerCase()) return { ok: false, reason: "other-site" };
  return { ok: true, visitorId };
}

// KEYED, like the IP digest beside it (identity.ts, hashIp): two sign-ins from
// one browser still match, and the database never holds an identifier that
// Fingerprint — or anybody holding a leaked dump — could look a person up by.
function visitorHash(visitorId: string): string {
  const key = derivedSecret("fingerprint-visitor");
  if (!key) return "";
  return crypto.createHmac("sha256", key).update(visitorId).digest("hex").slice(0, 32);
}

// Where this request says it was sent, the same way the browser saw it.
function requestHost(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  try { return new URL(request.url).host; } catch { return request.headers.get("host") || ""; }
}

/** Ask Fingerprint about the event this request's cookie names. Never throws. */
export async function readDeviceIntel(request: Request): Promise<DeviceIntel> {
  const secret = process.env.FINGERPRINT_SECRET_API_KEY;
  if (!secret) return { status: "off" };
  const eventId = (await cookies()).get(DEVICE_EVENT_COOKIE)?.value || "";
  // An event id is a short token; anything else is not one of ours.
  if (!eventId) return { status: "missing" };
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(eventId)) return { status: "invalid", reason: "malformed" };

  let res: Response;
  try {
    res = await fetch(`${API}/v4/events/${encodeURIComponent(eventId)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    log.warn("[device-intel] Fingerprint unreachable; sign-in proceeds without it", { error: (e as Error)?.message });
    return { status: "unavailable", reason: "network" };
  }
  // 404: no such event — forged, or from another workspace. That is the caller.
  if (res.status === 404 || res.status === 400) return { status: "invalid", reason: `http-${res.status}` };
  // Anything else is Fingerprint's trouble or ours (a revoked key, a lapsed
  // plan, a rate limit) and must not become the person's. Logged as an ERROR,
  // because a key that stopped working quietly turns this whole file off.
  if (!res.ok) {
    log.error("[device-intel] Fingerprint refused the lookup; sign-in proceeds without it", { status: res.status });
    return { status: "unavailable", reason: `http-${res.status}` };
  }
  const event = (await res.json().catch(() => null)) as FingerprintEvent | null;
  const judged = judgeEvent(event, { now: Date.now(), host: requestHost(request) });
  if (!judged.ok) return { status: "invalid", reason: judged.reason };
  const hash = visitorHash(judged.visitorId);
  // No NOMPANY_DATA_KEY: nothing to bind by. hashIp's failure, and already loud.
  if (!hash) return { status: "unavailable", reason: "no-key" };
  return {
    status: "ok",
    visitorHash: hash,
    bot: String(event?.bot || "not_detected"),
    vpn: Boolean(event?.vpn),
    incognito: Boolean(event?.incognito),
    suspectScore: typeof event?.suspect_score === "number" ? event.suspect_score : null,
  };
}

/**
 * What a sign-in records about the device from Fingerprint's verdict — spread
 * onto `deviceFingerprint(request)` by the routes that ask Fingerprint.
 */
export function intelFacts(intel: DeviceIntel): Pick<DeviceFacts, "intel" | "visitorHash"> {
  return { intel: intel.status, ...(intel.status === "ok" ? { visitorHash: intel.visitorHash } : {}) };
}

/** A bad bot, as Fingerprint judged it. Good bots (search engines) never sign in anyway. */
export const isBadBot = (intel: DeviceIntel | undefined): boolean => intel?.status === "ok" && intel.bot === "bad";

/** The per-device key for the limits in attempts.ts and signup, or "" when there is none. */
export const visitorKey = (intel: DeviceIntel | undefined): string => (intel?.status === "ok" ? intel.visitorHash : "");
