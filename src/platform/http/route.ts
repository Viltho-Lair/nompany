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
//   - the error-to-status table (src/platform/http/httpStatus.js)
//   - a request id, in the log line AND on the response
//
// WHAT IT DELIBERATELY DOES NOT OWN: permission checks inside a studio. Those
// live in the services, next to the write they guard, and access.test.js proves
// every one of them is there. Moving them up here would put the check further
// from the thing it protects, which is how the UI and the write paths came to
// disagree in the first place.

/** What a handler may hand back when a bare body is not enough. */
type Shaped = { status: number; body: unknown; headers?: Record<string, unknown> };

import { cookies } from "next/headers";
import { currentUser, currentIdentity, SESSION_COOKIE } from "@/platform/auth/identity";
import { studioContext } from "@/lib/studios";
import { getStudioBySlug } from "@/modules/main/studios";
import { currentSuperAdmin } from "@/platform/auth/superAuth";
import { statusFor } from "./httpStatus";
import { isCrossSite, MUTATING } from "./origin";
import { withRequest, requestId } from "./observability";
import { record as recordAudit, ACTOR } from "./audit";
import { digestFor, beginIdempotent, finishIdempotent, abandonIdempotent } from "./idempotency";

/**
 * WHAT A ROUTE SPEC SAYS. Every field is optional except in combination: `body`
 * only means something on a write, `context` only on a studio route, and
 * `status` only where a service's own refusal name needs a local override.
 */
export type RouteSpec = {
  auth?: "public" | "user" | "identity" | "studio" | "super";
  body?: boolean;
  name?: string;
  status?: Record<string, number>;
  context?: (user: unknown, slug: string) => Promise<Record<string, unknown>>;
};

/** What the wrapper hands a handler: the request, the params, and whoever it resolved. */
export type RouteArgs = Record<string, any>;

const isResponse = (v: unknown): v is Response => v instanceof Response;
const isErrorShape = (v: unknown): v is { error: string } =>
  Boolean(v) && typeof v === "object" && typeof (v as { error?: unknown }).error === "string";

/**
 * Parse a JSON body without ever throwing.
 *
 * Every route already does this in its own two-line try/catch, and they all
 * agree that a malformed body is an empty object rather than a 400 — because
 * the validation that follows produces a better message than "unparseable"
 * would. Kept identical here so conversion changes nothing.
 */
async function readBody(request: Request): Promise<unknown> {
  try { return (await request.json()) ?? {}; } catch { return {}; }
}

/**
 * Turn whatever a handler returned into a Response.
 *
 * @param out   handler's return value
 * @param spec  the route spec, for local status overrides
 */
function finish(out: unknown, spec: RouteSpec): Response {
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
  if (out && typeof out === "object" && "body" in out && typeof (out as Shaped).status === "number") {
    const shaped = out as Shaped;
    const res = Response.json(shaped.body, { status: shaped.status });
    for (const [k, v] of Object.entries(shaped.headers || {})) res.headers.append(k, String(v));
    return stamp(res);
  }

  return stamp(Response.json(out ?? { ok: true }));
}

// THE REQUEST ID GOES OUT AS WELL AS INTO THE LOG. A user reporting "it failed"
// can read this off the network tab, and it is the only thing that turns their
// sentence into the exact line in the log stream. Costs one header.
function stamp(res: Response): Response {
  const id = requestId();
  if (id && !res.headers.has("X-Request-Id")) res.headers.set("X-Request-Id", id);
  return res;
}

const refuse = (error: string, status: number) => stamp(Response.json({ error }, { status }));

/**
 * Record one mutation, after it happened.
 *
 * WHICH IDENTITY ACTED is the question this has to get right, because the
 * product has three and they are not ranks of one another. Inside a studio the
 * actor is the COLLABORATOR — CollaboratorID is the identity there, and every
 * signature, assignment and notification is addressed to it, so a log naming the
 * UserID instead would not join up with any of them. A console action is a
 * SuperAdmin, from a separate registry, outside every cascade. An account-level
 * action is the User themselves.
 *
 * Never throws, and never delays the caller's answer by more than the write: the
 * action has already happened, and refusing to report a completed change is not
 * a reason to fail it.
 */
async function audit(
  res: Response, spec: RouteSpec, request: Request, args: RouteArgs, identity: string,
): Promise<void> {
  const actorType = args.admin ? ACTOR.SUPER
    : args.collaborator ? ACTOR.COLLABORATOR
      : ACTOR.USER;
  const actor = args.admin?.id || args.collaborator?.id || args.user?.id || identity || "";

  // The id the request named, wherever it named it. Bodies use `id` almost
  // everywhere; a few routes carry it in the path instead.
  const subject = args.body?.id || args.params?.id || args.params?.userId
    || new URL(request.url).searchParams.get("id") || "";

  await recordAudit({
    studioId: args.studio?.id || "",
    actor,
    actorType,
    action: `${request.method} ${spec.name || ""}`.trim(),
    subject: String(subject || ""),
    status: res.status,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip") || "",
    requestId: requestId(),
  });
}

/**
 * Build a Next route handler from a spec and a handler.
 *
 * spec:
 *   auth      "public" | "user" | "identity" | "studio" | "super"  (default "user")
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
export function route(spec: RouteSpec, handler: (args: RouteArgs) => unknown) {
  const auth = spec.auth || "user";

  // WHO IS ASKING, and what the handler gets. Split out of the request path so
  // that idempotency can sit between "we know who you are" and "we do the work"
  // — it needs the identity to scope its key, and it must wrap the handler.
  async function resolve(
    base: Record<string, unknown>,
    params: Record<string, string>,
  ): Promise<{ refusal?: Response; args?: RouteArgs; identity?: string }> {
    if (auth === "public") return { args: base, identity: "" };

    // A THIRD IDENTITY, NOT A BIGGER SECOND ONE. /super runs on a SuperAdmin —
    // its own registry, its own cookie, outside every cascade — and it is
    // emphatically not a User with extra rights. Giving it its own branch here
    // rather than folding it into the user path is what keeps the two from ever
    // being mistaken for one another: no studio context is built, no membership
    // is consulted, and a studio owner's session cannot reach any of it.
    if (auth === "super") {
      const admin = await currentSuperAdmin();
      if (!admin) return { refusal: refuse("unauthorized", 401) };
      return { args: { ...base, admin }, identity: `super:${admin.id}` };
    }

    // `identity` is the fuller read (user + profile + studios); `user` is the
    // cheap one. Routes ask for what they use so nobody pays for the other.
    if (auth === "identity") {
      const identity = await currentIdentity();
      if (!identity) return { refusal: refuse("unauthorized", 401) };
      // `identity.user || identity` is the original line, and it is defensive
      // rather than descriptive: currentIdentity always returns the fuller
      // shape, so the fallback covers a case that has never occurred. Kept as
      // it was — this conversion does not get to decide that — and the id is
      // read off whichever half answered.
      const user = (identity as { user?: unknown }).user || identity;
      return { args: { ...base, identity, user }, identity: String((user as { id?: unknown })?.id || "") };
    }

    // PREFETCH THE STUDIO WHILE THE USER IS BEING RESOLVED.
    //
    // Who you are and which studio the URL names are independent questions, and
    // the wrapper was asking them one after the other — resolve the session,
    // read the user registry, and only then start on the slug. Two full round
    // trips spent in sequence for two answers that never depended on each other.
    //
    // Nothing is done with the result. It warms the request cache, so when the
    // module context asks for the same studio a moment later the value is
    // already there: no extra command, and no extra wave. That is the whole
    // trick — a prefetch that changes no code path, only when the reads happen.
    //
    // GATED ON THE COOKIE, because an unauthenticated caller should not be able
    // to make us do Redis work by naming a slug. Reading a cookie costs nothing;
    // /api/track exists as a reminder of what an unbounded public read is worth.
    let warming;
    if (auth === "studio" && params.slug) {
      const hasSession = Boolean((await cookies()).get(SESSION_COOKIE)?.value);
      if (hasSession) warming = getStudioBySlug(params.slug).catch(() => null);
    }

    const user = await currentUser();
    if (!user) return { refusal: refuse("unauthorized", 401) };
    if (auth === "user") return { args: { ...base, user }, identity: String(user.id) };

    // Joined so a rejected prefetch cannot surface as an unhandled rejection;
    // its value is deliberately unused.
    if (warming) await warming;

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
    if (context.error) {
      const name = String(context.error);
      return { refusal: refuse(name, statusFor(name)) };
    }
    return { args: { ...base, user, ...context }, identity: String(user.id) };
  }

  return async function handle(request: Request, ctx?: { params?: Promise<Record<string, string>> }) {
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
      const base: Record<string, unknown> = { request, params };
      if (spec.body) base.body = await readBody(request);

      const resolved = await resolve(base, params);
      if (resolved.refusal) return resolved.refusal;
      // Narrowed here rather than in the destructure above: `refusal` and `args`
      // are alternatives, and destructuring both loses the fact that ruling one
      // out establishes the other.
      const args = resolved.args as RouteArgs;
      const identity = resolved.identity || "";

      // WHO DID WHAT — written after the handler, so it records what actually
      // happened rather than what was attempted. Reads are not logged: an audit
      // trail nobody can read through is not one anybody will.
      const auditing = MUTATING.has(request.method);

      // IDEMPOTENCY IS OPT-IN AND ONLY FOR WRITES. No header, no behaviour
      // change — which is what lets this land under every converted route at
      // once without altering a single existing caller.
      const key = request.headers.get("idempotency-key");
      if (!key || !MUTATING.has(request.method)) {
        const out = finish(await handler(args), spec);
        if (auditing) await audit(out, spec, request, args, identity);
        return out;
      }

      const digest = digestFor({
        identity,
        method: request.method,
        path: new URL(request.url).pathname,
        key,
      });

      const seen = await beginIdempotent(digest);
      if ("replay" in seen) {
        const res = Response.json(seen.replay.body, { status: seen.replay.status });
        // So a client can tell a replay from the original. Without it, "did my
        // retry do anything?" is unanswerable from the response alone.
        res.headers.set("Idempotent-Replay", "true");
        return stamp(res);
      }
      // The original is still running. We do not have its answer yet, and
      // inventing one would be worse than saying so.
      if ("busy" in seen) return refuse("in-progress", 409);

      let res;
      try {
        res = finish(await handler(args), spec);
      } catch (error) {
        // A CRASH IS NOT A RESULT. Freezing a 500 into the record would make a
        // transient failure permanent for this key for a day — the retry that
        // would have succeeded gets answered with the crash instead.
        await abandonIdempotent(digest);
        throw error;
      }

      // Recorded below 500 only, for the same reason. A 400 IS a result and
      // deserves to be replayed: the request was wrong the first time and it is
      // still wrong.
      if (res.status < 500) {
        const body = await res.clone().json().catch(() => null);
        await finishIdempotent(digest, res.status, body);
      } else {
        await abandonIdempotent(digest);
      }
      if (auditing) await audit(res, spec, request, args, identity);
      return res;
    });
  };
}
