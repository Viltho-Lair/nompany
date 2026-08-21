// ONE ANSWER PER KEY, so a retry cannot bill twice.
//
// A network timeout tells the client nothing about whether the write happened.
// Its only options are to retry — risking a second invoice, a second payment, a
// second ticket — or not to, risking having lost the first. Neither is
// acceptable on the endpoints that move money, so a client may send
// `Idempotency-Key: <something-unique>` and get the FIRST response back for
// every repeat of it.
//
// OPT-IN, ON PURPOSE. A request with no key behaves exactly as it did before, so
// this cannot change the behaviour of a caller that has not asked for it. The
// UI adopts it endpoint by endpoint, starting with the ones where a duplicate is
// expensive.
//
// THE HARD CASE IS THE CONCURRENT RETRY, not the sequential one. A client whose
// request timed out often retries while the original is still running — that is
// the whole reason it timed out. If both executed there would be two invoices
// and the second would overwrite the first's record, so the reservation is taken
// with SET NX before any work begins: the first request wins it, and a second
// arriving mid-flight is told the original is still in progress rather than
// being allowed to duplicate it.
//
// 409 IS THE HONEST ANSWER THERE, not a replay. We do not have the first
// response yet — it has not finished — and inventing one would be worse than
// saying so. The client retries again and gets the recorded answer.

import crypto from "crypto";
import { IDEM } from "@/lib/data/keys";
import { getJSON, setJSON, claim, release } from "@/lib/data/store";

// Long enough to cover any retry a human or a client library will attempt, short
// enough that a key is not a permanent record. Stripe uses 24h; there is no
// reason to disagree with the industry on a number this arbitrary.
const TTL_SEC = 24 * 3600;

// A marker, not a response — distinguishable from a recorded `{status, body}`
// because a real record always carries a numeric status.
const IN_FLIGHT = { inFlight: true };

/**
 * The record key for one caller's use of one key on one endpoint.
 *
 * IDENTITY IS IN THE HASH. The key is chosen by the client, so hashing only the
 * key would let one user replay another's response — or, worse, claim it — by
 * guessing a UUID. Method and path are in there too: the same key on a different
 * endpoint is a different intention, and treating it as a repeat would answer a
 * DELETE with the body of a POST.
 */
export function digestFor({ identity, method, path, key }) {
  return crypto.createHash("sha256")
    .update(`${identity || "anon"}|${method}|${path}|${key}`)
    .digest("hex");
}

/**
 * Look for a previous answer, or reserve the right to produce one.
 *
 * @returns {Promise<{replay?: {status:number, body:any}, busy?: boolean, reserved?: boolean}>}
 */
export async function beginIdempotent(digest) {
  const key = IDEM.record(digest);

  const existing = await getJSON(key);
  if (existing && typeof existing.status === "number") return { replay: existing };
  if (existing) return { busy: true };

  // SET NX. Two concurrent first-attempts race here and exactly one wins; the
  // loser is told the original is in flight rather than being allowed to run.
  const won = await claim(key, JSON.stringify(IN_FLIGHT), TTL_SEC);
  if (!won) {
    // Somebody claimed it between the read and the write. Re-read rather than
    // assuming in-flight: a very fast first request may already have finished,
    // in which case the caller deserves the real answer.
    const now = await getJSON(key);
    if (now && typeof now.status === "number") return { replay: now };
    return { busy: true };
  }
  return { reserved: true };
}

/** Record the answer so every later repeat of this key gets it. */
export async function finishIdempotent(digest, status, body) {
  await setJSON(IDEM.record(digest), { status, body }, TTL_SEC);
}

/**
 * Give up the reservation without recording an answer.
 *
 * Used when the handler THREW. A crash is not a result, and freezing a 500 into
 * the record for 24 hours would make a transient failure permanent for that key
 * — the retry that would have succeeded would be answered with the crash
 * instead. Releasing lets the next attempt run for real.
 */
export async function abandonIdempotent(digest) {
  await release(IDEM.record(digest)).catch(() => {});
}
