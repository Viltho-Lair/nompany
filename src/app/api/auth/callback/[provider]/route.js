import { cookies } from "next/headers";
import {
  isProvider, providerConfigured, exchangeCode, readState,
  clearedStateCookie, OAUTH_STATE_COOKIE,
} from "@/lib/oauth";
import { signInWithProvider, sessionCookie, requestIsHttps } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const back = (request, reason) =>
  new URL(`/en/login?oauth=${encodeURIComponent(reason)}`, new URL(request.url).origin);

// Complete Google / Microsoft sign-in: verify state, exchange the code for the
// verified email, then sign in (or create) the User and land on their account.
export async function GET(request, ctx) {
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

  const result = await signInWithProvider({ ...profile, provider });
  if (result.error) return Response.redirect(back(request, result.error), 302);

  const res = Response.redirect(new URL("/en/questionnaire", url.origin), 302);
  const out = new Response(res.body, res);
  out.headers.append("Set-Cookie", sessionCookie(result.token, result.ttl, requestIsHttps(request)));
  out.headers.append("Set-Cookie", clearedStateCookie());
  return out;
}
