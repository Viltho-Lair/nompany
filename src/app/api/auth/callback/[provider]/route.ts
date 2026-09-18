import { refused } from "@/platform/http/route";
import { cookies } from "next/headers";
import {
  isProvider, providerConfigured, exchangeCode, readState,
  clearedStateCookie, OAUTH_STATE_COOKIE,
} from "@/platform/auth/oauth";
import {
  signInWithProvider, sessionCookie, requestIsHttps,
  deviceFingerprint, deviceCookie, DEVICE_COOKIE, pendingCookie,
} from "@/platform/auth/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const back = (request: Request, reason: string) =>
  new URL(`/en/login?oauth=${encodeURIComponent(reason)}`, new URL(request.url).origin);

// Complete Google / Microsoft sign-in: verify state, exchange the code for the
// verified email, then sign in (or create) the User and land on their account.
export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const { provider } = await ctx.params;
  if (!isProvider(provider) || !providerConfigured(provider)) {
    return Response.redirect(back(request, "unavailable"), 302);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error") || !code) return Response.redirect(back(request, "cancelled"), 302);

  // CSRF: the state must be ours AND match the cookie we set when starting.
  const cookieState = (await cookies()).get(OAUTH_STATE_COOKIE)?.value || "";
  if (!state || state !== cookieState || !readState(state)) {
    return Response.redirect(back(request, "state"), 302);
  }

  const profile = await exchangeCode({ provider, code, request });
  if (profile.error) return Response.redirect(back(request, profile.error), 302);

  // The same device details the password path collects — see deviceFingerprint.
  // The cookie carries the id of a browser this account has used before, so a
  // returning one updates its row instead of adding a second.
  const jar = await cookies();
  const result = await signInWithProvider({
    ...profile,
    provider,
    deviceId: jar.get(DEVICE_COOKIE)?.value || "",
    device: deviceFingerprint(request),
  });
  if (refused(result)) return Response.redirect(back(request, result.error), 302);

  // AN AUTHENTICATOR CODE IS OWED (twoFactor.ts): the sign-in page asks for it
  // — a redirect cannot carry the question, so the page reads it back from the
  // paused sign-in the cookie names.
  const paused = result.totpRequired ? result.ticketId : "";
  const res = Response.redirect(new URL(paused ? "/en/login?continue=1" : "/en/questionnaire", url.origin), 302);
  const out = new Response(res.body, res);
  if (paused) out.headers.append("Set-Cookie", pendingCookie(paused, requestIsHttps(request)));
  else if (result.token) out.headers.append("Set-Cookie", sessionCookie(result.token, result.ttl, requestIsHttps(request)));
  // AND THE DEVICE COOKIE, or the id is never handed back and this browser
  // appears as a brand new device on every single sign-in — a Security page
  // that grows a row per visit is no more useful than one that stays empty.
  if (result.deviceId) {
    out.headers.append("Set-Cookie", deviceCookie(result.deviceId, requestIsHttps(request)));
  }
  out.headers.append("Set-Cookie", clearedStateCookie());
  return out;
}
