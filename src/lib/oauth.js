// OAuth sign-in (Google + Microsoft) for the restructured User model.
//
// The provider vouches for the email address, so an OAuth user is created with
// emailVerifiedAt already stamped and NEVER has to enter a code. They get a
// random password they don't know — if they later want to sign in with one,
// they set it through "forgot password" on their own address.
//
// State is a signed, short-lived value carried in a cookie AND the redirect, so
// a callback that wasn't started by us is rejected (CSRF protection).

import crypto from "node:crypto";

export const OAUTH_STATE_COOKIE = "nc_oauth";
const STATE_TTL_SEC = 600;

const PROVIDERS = {
  google: {
    idEnv: "GOOGLE_CLIENT_ID",
    secretEnv: "GOOGLE_CLIENT_SECRET",
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
  },
  microsoft: {
    idEnv: "MICROSOFT_CLIENT_ID",
    secretEnv: "MICROSOFT_CLIENT_SECRET",
    // "common" lets both work and personal Microsoft accounts sign in.
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email profile User.Read",
  },
};

export function isProvider(name) {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, String(name || ""));
}
export function providerConfigured(name) {
  const p = PROVIDERS[name];
  return Boolean(p && process.env[p.idEnv] && process.env[p.secretEnv]);
}
// Which buttons the sign-in/sign-up pages should show.
export function enabledProviders() {
  return Object.keys(PROVIDERS).filter(providerConfigured);
}

function origin(request) {
  const proto = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return `${proto}://${host}`;
}
export function redirectUri(request, provider) {
  return `${origin(request)}/api/auth/callback/${provider}`;
}

// ---- state (CSRF) ----------------------------------------------------------
export function makeState(next = "") {
  const raw = `${crypto.randomBytes(16).toString("hex")}.${Date.now()}.${encodeURIComponent(next)}`;
  const sig = crypto.createHmac("sha256", stateSecret()).update(raw).digest("hex").slice(0, 32);
  return `${raw}.${sig}`;
}
export function readState(state) {
  const parts = String(state || "").split(".");
  if (parts.length !== 4) return null;
  const [nonce, ts, next, sig] = parts;
  const expect = crypto.createHmac("sha256", stateSecret()).update(`${nonce}.${ts}.${next}`).digest("hex").slice(0, 32);
  if (sig !== expect) return null;
  if (Date.now() - Number(ts) > STATE_TTL_SEC * 1000) return null;
  return { next: decodeURIComponent(next || "") };
}
function stateSecret() {
  return process.env.OTP_SECRET || process.env.FIELD_ENCRYPTION_KEY || "nompany-oauth";
}
export function stateCookie(state, isHttps) {
  return `${OAUTH_STATE_COOKIE}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${STATE_TTL_SEC}${isHttps ? "; Secure" : ""}`;
}
export function clearedStateCookie() {
  return `${OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// ---- the two calls ---------------------------------------------------------
export function authorizeUrl({ provider, request, state }) {
  const p = PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: process.env[p.idEnv],
    redirect_uri: redirectUri(request, provider),
    response_type: "code",
    scope: p.scope,
    state,
    prompt: "select_account",
  });
  return `${p.authorize}?${params.toString()}`;
}

// Exchange the code and return { email, fullName } — or { error }.
export async function exchangeCode({ provider, code, request }) {
  const p = PROVIDERS[provider];
  try {
    const res = await fetch(p.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env[p.idEnv],
        client_secret: process.env[p.secretEnv],
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri(request, provider),
      }),
    });
    const token = await res.json().catch(() => ({}));
    if (!res.ok || !token.id_token) return { error: "exchange" };

    // The id_token is a JWT signed by the provider we just spoke to over TLS,
    // using our own client secret — so the payload is trustworthy here without
    // a separate signature verification round-trip.
    const payload = JSON.parse(Buffer.from(token.id_token.split(".")[1], "base64").toString("utf8"));
    const email = String(payload.email || payload.preferred_username || "").trim().toLowerCase();
    if (!email) return { error: "no-email" };
    // Google tells us whether the address is verified; Microsoft implies it.
    if (provider === "google" && payload.email_verified === false) return { error: "unverified" };
    return { email, fullName: String(payload.name || "").trim() };
  } catch {
    return { error: "exchange" };
  }
}
