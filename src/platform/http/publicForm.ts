import { NextResponse } from "next/server";
import { incrWithTTL } from "@/platform/db/store";
import { isCrossSite } from "@/platform/http/origin";

// THE TWO GUARDS EVERY PUBLIC FORM NEEDS, in one place.
//
// There are three endpoints an unauthenticated caller can make WRITE — traffic
// ingest, the contact form and job applications — and the last two both put
// something in a person's inbox. Each was growing its own copy of the same two
// checks, which is how two of three ended up with different answers to "what
// does a cross-site POST get" (403 in one, silence in the other).
//
// IT IS A REFUSAL OR NOTHING, deliberately: the caller gets back a response to
// return, or `null` meaning carry on. Returning a boolean would leave each
// route to invent its own status and its own body, which is the duplication
// this exists to remove.

/** The client address, as far as the edge will tell us. */
export function callerIp(request: Request): string {
  return (
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Refuse a cross-site post or one over the rate limit; otherwise `null`.
 *
 * `rateKey` takes the IP so the caller names its OWN counter — sharing one
 * between forms would let somebody exhaust the contact form by applying for
 * jobs, and borrowing the credential counters would let a person lock
 * themselves out of their account by filling in a form too often.
 */
export async function refusePublicForm(
  request: Request,
  { rateKey, max, windowSec }: {
    rateKey: (ip: string) => string;
    max: number;
    windowSec: number;
  },
): Promise<NextResponse | null> {
  // A FORM POST FROM SOMEBODY ELSE'S PAGE IS NOT AN ENQUIRY. The only
  // legitimate caller of a public write is a page on this site.
  if (isCrossSite(request)) {
    return NextResponse.json({ ok: false, error: "cross-site" }, { status: 403 });
  }
  if ((await incrWithTTL(rateKey(callerIp(request)), windowSec)) > max) {
    return NextResponse.json(
      { ok: false, error: "rate-limited" },
      { status: 429, headers: { "Retry-After": String(windowSec) } },
    );
  }
  return null;
}
