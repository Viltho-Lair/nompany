import {
  isProvider, providerConfigured, authorizeUrl, makeState, stateCookie,
} from "@/lib/oauth";
import { requestIsHttps } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kick off Google / Microsoft sign-in. The signed state travels both in the
// redirect and in a cookie; the callback requires the two to match.
export async function GET(request, ctx) {
  const { provider } = await ctx.params;
  if (!isProvider(provider)) return new Response("Unknown provider", { status: 404 });
  if (!providerConfigured(provider)) return new Response("Provider not configured", { status: 503 });

  const state = makeState(new URL(request.url).searchParams.get("next") || "");
  const res = Response.redirect(authorizeUrl({ provider, request, state }), 302);
  const out = new Response(res.body, res);
  out.headers.append("Set-Cookie", stateCookie(state, requestIsHttps(request)));
  return out;
}
