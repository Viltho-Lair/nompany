// PASSKEYS (WebAuthn), through @simplewebauthn/server — 18/09/2026.
// `docs/functionality/sessions-and-devices.md` is the file.
//
// A PASSKEY IS A WHOLE SIGN-IN. It proves the device holds a private key that
// never leaves it, and the device's own unlock (a fingerprint, a face, the
// phone's PIN) proves the person — so a passkey sign-in asks neither the
// emailed code nor the authenticator.
//
// WHY IT MATTERS FOR SHARING: a password and a forwarded code can be handed to
// twenty people; a passkey lives in one phone or one security key.
//
// WHAT IS STORED, per person, on their own security document: each passkey's
// credential id, its PUBLIC key, the signature counter and when it was used.
// Nothing secret — a public key is public — which is why none of it is sealed.
// The challenge each ceremony signs is stored beside it for five minutes and
// spent on first use, so a signed response cannot be replayed.
//
// THE RELYING PARTY IS THE SITE'S OWN DOMAIN, without "www." — a passkey made
// on www.nompany.com then works on nompany.com too, which is where studios
// live. PASSKEY_RP_ID overrides it where a deployment needs another answer.

import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from "@simplewebauthn/server";
import { OTP, ID } from "@/platform/db/keys";
import { getJSON, setJSONEx, release } from "@/platform/db/store";
import { verifyPassword } from "./passwords";
import { getUserById, getProfile } from "./users";
import { getSecurity, patchSecurity } from "./lock";

export type PasskeyRow = {
  id: string;                 // credential id, base64url
  publicKey: string;          // base64url
  counter: number;
  transports?: string[];
  name: string;
  deviceType?: string;        // singleDevice | multiDevice (synced)
  backedUp?: boolean;
  createdAt: string;
  lastUsedAt?: string;
};

const CEREMONY_SEC = 5 * 60;
const MAX_PASSKEYS = 10;
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64url");
const unb64 = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));

/** The relying party this request is on: its domain and its exact origin. */
export function relyingParty(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const hostname = host.split(":")[0].toLowerCase();
  return {
    rpID: process.env.PASSKEY_RP_ID || hostname.replace(/^www\./, ""),
    origin: `${proto}://${host}`,
  };
}

/** What the Security page lists. */
export async function listPasskeys(userId: string) {
  const rows = (await getSecurity(userId))?.passkeys || [];
  return rows.map((p) => ({
    id: p.id, name: p.name, createdAt: p.createdAt, lastUsedAt: p.lastUsedAt || "",
    synced: p.deviceType === "multiDevice" || Boolean(p.backedUp),
  }));
}

// CHANGING WHAT CAN SIGN YOU IN NEEDS THE PASSWORD, where there is one — the
// PIN's and the authenticator's rule, for the same reason: somebody at an open
// session must not be able to add their own key to the owner's account.
async function passwordProblem(userId: string, password: unknown) {
  const user = await getUserById(userId);
  if (!user) return "notfound" as const;
  if (!user.passwordHash) return "";
  return (await verifyPassword(String(password || ""), user.passwordHash)) ? "" : ("invalid" as const);
}

// ---- adding a passkey ---------------------------------------------------------

export async function beginRegistration(userId: string, request: Request) {
  const user = await getUserById(userId);
  if (!user) return { error: "notfound" as const };
  const [sec, profile] = await Promise.all([getSecurity(userId), getProfile(userId)]);
  const existing = sec?.passkeys || [];
  if (existing.length >= MAX_PASSKEYS) return { error: "passkey-limit" as const };
  const { rpID } = relyingParty(request);
  const options = await generateRegistrationOptions({
    rpName: "nompany",
    rpID,
    userName: user.email,
    userDisplayName: profile?.fullName || user.email,
    // THE USER ID TRAVELS INSIDE THE PASSKEY, and comes back with every
    // sign-in as the user handle — which is how a sign-in that typed no email
    // finds whose passkey it is.
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports })),
    // DISCOVERABLE, so the person can sign in without typing an address.
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  await patchSecurity(userId, (cur) => ({
    ...cur, passkeyChallenge: { value: options.challenge, expires: Date.now() + CEREMONY_SEC * 1000 },
  }));
  return { options };
}

export async function finishRegistration(
  userId: string, request: Request, response: unknown, name: unknown, password: unknown,
) {
  const bad = await passwordProblem(userId, password);
  if (bad) return { error: bad };
  const sec = await getSecurity(userId);
  const challenge = sec?.passkeyChallenge;
  // SPENT BEFORE IT IS CHECKED, so a second attempt with the same response
  // finds nothing to match.
  await patchSecurity(userId, (cur) => ({ ...cur, passkeyChallenge: null }));
  if (!challenge || challenge.expires < Date.now()) return { error: "expired" as const };
  const { rpID, origin } = relyingParty(request);
  let verified;
  try {
    verified = await verifyRegistrationResponse({
      response: response as RegistrationResponseJSON,
      expectedChallenge: challenge.value,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch {
    return { error: "passkey-invalid" as const };
  }
  if (!verified.verified) return { error: "passkey-invalid" as const };
  const info = verified.registrationInfo;
  const row: PasskeyRow = {
    id: info.credential.id,
    publicKey: b64(info.credential.publicKey),
    counter: info.credential.counter,
    transports: info.credential.transports,
    name: String(name || "").trim().slice(0, 60) || "Passkey",
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
    createdAt: new Date().toISOString(),
  };
  await patchSecurity(userId, (cur) => ({
    ...cur, passkeys: [...(cur.passkeys || []).filter((p) => p.id !== row.id), row].slice(-MAX_PASSKEYS),
  }));
  return { ok: true as const };
}

export async function removePasskey(userId: string, id: unknown, password: unknown) {
  const bad = await passwordProblem(userId, password);
  if (bad) return { error: bad };
  const target = String(id || "");
  const sec = await getSecurity(userId);
  if (!(sec?.passkeys || []).some((p) => p.id === target)) return { error: "notfound" as const };
  await patchSecurity(userId, (cur) => ({ ...cur, passkeys: (cur.passkeys || []).filter((p) => p.id !== target) }));
  return { ok: true as const };
}

// ---- signing in with one -----------------------------------------------------

type PasskeyCeremony = { stage: "passkey"; challenge: string; createdAt: number };

/** Options for "Sign in with a passkey", and the ticket that holds their challenge. */
export async function beginSignIn(request: Request) {
  const { rpID } = relyingParty(request);
  // NO allowCredentials: the browser offers whichever of this site's passkeys
  // the person has, which is what lets them sign in without typing anything.
  const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });
  const ticketId = ID.signinTicket();
  const ceremony: PasskeyCeremony = { stage: "passkey", challenge: options.challenge, createdAt: Date.now() };
  await setJSONEx(OTP.pending(ticketId), ceremony, CEREMONY_SEC);
  return { options, ticketId };
}

/**
 * WHOSE PASSKEY SIGNED THIS, if it verifies: the user handle names the person,
 * their stored public key checks the signature, and the counter moves forward.
 * Returns the user id, or a refusal. The ticket is spent on the way in.
 */
export async function verifySignIn(ticketId: string, request: Request, response: unknown) {
  const t = ticketId ? await getJSON<PasskeyCeremony>(OTP.pending(ticketId)) : null;
  if (ticketId) await release(OTP.pending(ticketId));
  if (!t || t.stage !== "passkey") return { error: "expired" as const };

  const r = response as AuthenticationResponseJSON;
  const handle = r?.response?.userHandle;
  if (!handle) return { error: "passkey-invalid" as const };
  const userId = new TextDecoder().decode(unb64(handle));
  const user = await getUserById(userId);
  if (!user) return { error: "passkey-invalid" as const };
  if (user.status === "suspended") return { error: "suspended" as const };

  const stored = ((await getSecurity(userId))?.passkeys || []).find((p) => p.id === r.id);
  // A passkey the person has since removed — or one from before a console
  // reset — signs nobody in, whatever the device still holds.
  if (!stored) return { error: "passkey-invalid" as const };

  const { rpID, origin } = relyingParty(request);
  let verified;
  try {
    verified = await verifyAuthenticationResponse({
      response: r,
      expectedChallenge: t.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: { id: stored.id, publicKey: unb64(stored.publicKey), counter: stored.counter, transports: stored.transports },
      requireUserVerification: false,
    });
  } catch {
    return { error: "passkey-invalid" as const };
  }
  if (!verified.verified) return { error: "passkey-invalid" as const };

  const newCounter = verified.authenticationInfo.newCounter;
  await patchSecurity(userId, (cur) => ({
    ...cur,
    passkeys: (cur.passkeys || []).map((p) => (p.id === stored.id
      ? { ...p, counter: newCounter, lastUsedAt: new Date().toISOString() } : p)),
  }));
  return { userId, user };
}
