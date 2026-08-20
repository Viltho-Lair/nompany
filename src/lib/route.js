// SEAM A — the one door every API route goes through.
//
// Ninety-six route files repeat the same four steps: read the caller, refuse
// with 401 if there isn't one, parse a body that might not be JSON, and turn a
// service's `{ error }` into a status by hand. Fifty-nine of them write their
// own ladder for that last step and they do not agree with each other. The
// repetition is not the problem — the DIVERGENCE is. Every copy is a place the
// rules can be slightly different, and several of them already are.
//
// This module is what they collapse into. A route declares WHAT IT NEEDS and
// returns WHAT IT MEANS; the wrapper decides what that is worth in HTTP.
//
//   export const PUT = route({ auth: "user", body: true }, async ({ user, body }) => {
//     const result = await savePersonalInfo(user.id, body);
//     if (result.error) return result;            // status comes from the table
//     return { ok: true, profile: result.profile };
//   });
//
// WHAT THE WRAPPER OWNS, so that no route has to:
//   - authentication, and the 401 that follows from its absence
//   - studio membership and the access resolution built on it
//   - JSON body parsing that cannot throw
//   - the error-to-status table (src/lib/httpStatus.js)
//   - a request id, in the log line AND on the response
//
// WHAT IT DELIBERATELY DOES NOT OWN: permission checks inside a studio. Those
// live in the services, next to the write they guard, and access.test.js proves
// every one of them is there. Moving them up here would put the check further
// from the thing it protects, which is how the UI and the write paths came to
// disagree in the first place.

import { currentUser, currentIdentity } from "@/lib/identity";
import { studioContext } from "@/lib/studios";
import { statusFor } from "@/lib/httpStatus";
import { isCrossSite, MUTATING } from "@/lib/origin";
import { withRequest, requestId } from "@/lib/observability";

/** A route's answer carries a status, a body, and sometimes headers. */
const isResponse = (v) => v instanceof Response;
const isErrorShape = (v) => v && typeof v === "object" && typeof v.error === "string";

/**
 * Parse a JSON body without ever throwing.
 *
 * Every route already does this in its own two-line try/catch, and they all
 * agree that a malformed body is an empty object rather than a 400 — because
 * the validation that follows produces a better message than "unparseable"
 * would. Kept identical here so conversion changes nothing.
 */
async function readBody(request) {
  try { return (await request.json()) ?? {}; } catch { return {}; }
}

/**
 * Turn whatever a handler returned into a Response.
 *
 * @param {*} out       handler's return value
 * @param {object} spec the route spec, for local status overrides
 */
function finish(out, spec) {
  if (isResponse(out)) return stamp(out);

  if (isErrorShape(out)) {
    // THE WHOLE REFUSAL GOES BACK, not just its name — a deliberate change, and
    // the one place conversion alters a response body rather than only a status.
    //
    // Services attach context to refusals with obvious care: `clash` carries the
    // startTime and endTime it collided with, `insufficient` carries have and
    // needed, `in-use` carries the shipments still pointing at the thing, and
    // `forbidden` carries the permission key you are missing. Most routes then
    // wrote `{ error: result.error }` and threw every bit of it away, so the UI
    // could only ever say "that didn't work". A few routes forwarded one field
    // by hand, which is why the join screen can name the studio and nothing else
    // can.
    //
    // Nothing in that set is sensitive: it is all addressed to the person who
    // just made the request, about the request they just made. If a service ever
    // wants to attach something internal, the fix is not to strip fields here —
    // it is to not put it in a refusal that was always destined for a client.
    //
    // A LOCAL OVERRIDE IS A SMELL, not a feature. It exists because a few error
    // names mean two different things in two different places — `invalid` is
    // "the password you typed is wrong" (401) in identity and "that field is
    // malformed" (400) everywhere else. The honest fix is to rename the service
    // error so the table can be right for both; until then the override keeps
    // the conversion behaviour-preserving instead of silently downgrading a 401.
    const status = spec.status?.[out.error] ?? statusFor(out.error);
    return stamp(Response.json(out, { status }));
  }

  // `{ status, body }` for the handful of routes that mean 201 or 204.
  if (out && typeof out === "object" && "body" in out && typeof out.status === "number") {
    const res = Response.json(out.body, { status: out.status });
    for (const [k, v] of Object.entries(out.headers || {})) res.headers.append(k, v);
    return stamp(res);
  }

  return stamp(Response.json(out ?? { ok: true }));
}

// THE REQUEST ID GOES OUT AS WELL AS INTO THE LOG. A user reporting "it failed"
// can read this off the network tab, and it is the only thing that turns their
// sentence into the exact line in the log stream. Costs one header.
function stamp(res) {
  const id = requestId();
  if (id && !res.headers.has("X-Request-Id")) res.headers.set("X-Request-Id", id);
  return res;
}

const refuse = (error, status) => stamp(Response.json({ error }, { status }));

/**
 * Build a Next route handler from a spec and a handler.
 *
 * spec:
 *   auth      "public" | "user" | "identity" | "studio"   (default "user")
 *   body      true to parse a JSON body
 *   name      label for the log line; defaults to the spec's auth + method
 *   status    { [errorName]: code } local overrides — see finish()
 *   context   a module context builder (technicalContext, salesContext, …);
 *             defaults to studioContext. Implies auth: "studio".
 *
 * The handler receives one context object rather than positional arguments, so
 * adding something to it later does not touch every call site:
 *   { request, params, user, identity, studio, collaborator, access, sections, body }
 */
export function route(spec, handler) {
  const auth = spec.auth || "user";

  return async function handle(request, ctx) {
    return withRequest(spec.name || auth, async () => {
      // CSRF, REFUSED BEFORE ANYTHING IS READ — before the body, before the
      // session lookup, before a single Redis command. A cross-site write must
      // not be able to cost us work, and it must not be distinguishable by
      // timing from one that failed later for a different reason.
      //
      // Reads are exempt: see origin.js for why, and for the larger point that
      // this is one layer rather than the answer.
      if (MUTATING.has(request.method) && isCrossSite(request)) {
        return refuse("cross-site", 403);
      }

      const params = ctx?.params ? await ctx.params : {};
      const base = { request, params };

      if (spec.body) base.body = await readBody(request);

      if (auth === "public") return finish(await handler(base), spec);

      // `identity` is the fuller read (user + profile + studios); `user` is the
      // cheap one. Routes ask for what they use so nobody pays for the other.
      if (auth === "identity") {
        const identity = await currentIdentity();
        if (!identity) return refuse("unauthorized", 401);
        return finish(await handler({ ...base, identity, user: identity.user || identity }), spec);
      }

      const user = await currentUser();
      if (!user) return refuse("unauthorized", 401);
      if (auth === "user") return finish(await handler({ ...base, user }), spec);

      // auth === "studio": membership authorises, the URL never does.
      //
      // A MODULE ROUTE NAMES ITS OWN CONTEXT BUILDER rather than getting the bare
      // studio one. technicalContext, salesContext and the rest each resolve the
      // studio and then the section, and they return the same `{ error }` shape,
      // so the wrapper can refuse through the same table without knowing which
      // module it is looking at. `no-section` and `forbidden` stop being whatever
      // each route happened to map them to.
      //
      // Deliberately ONE call, not studioContext followed by the module builder:
      // the builder already resolves the studio itself, and asking twice is the
      // duplicate this seam exists to remove rather than reproduce.
      const build = spec.context || studioContext;
      const context = await build(user, params.slug);
      if (context.error) return refuse(context.error, statusFor(context.error));
      return finish(await handler({ ...base, user, ...context }), spec);
    });
  };
}
