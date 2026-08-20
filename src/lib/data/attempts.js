// HOW MANY TIMES SOMEBODY HAS GOT A CREDENTIAL WRONG.
//
// THE HOLE THIS CLOSES. `login()` verified the password and only then, on an
// unrecognised device, reached `createChallenge` — which is where the rate
// limits lived. So the limiters guarded the SECOND factor and nothing guarded
// the first: a wrong password returned immediately, uncounted, and online
// guessing was bounded only by bcrypt's cost and how many requests could be run
// in parallel. `/api/identity/forgot` and `/reset` had no limit at all.
//
// WHY FAILURES AND NOT ATTEMPTS. Counting every attempt would throttle the
// person who types their password correctly forty times in a busy morning, and
// throttling correct credentials protects nobody. The GATE still runs before
// `verifyPassword` — what advances is only the tally, and only on the way out
// of a failure. A successful sign-in clears the slate.
//
// WHY THREE COUNTERS. One per-email limit would be simpler and would hand
// anybody a denial-of-service: type a colleague's address wrong five times and
// they are locked out of their own account. So the tight limits are keyed on
// the SOURCE, and the per-email limit is deliberately loose — a backstop
// against a distributed attack on one named account, set high enough that a
// spiteful individual cannot reach it before the per-IP limit stops them.
//
//   pair (ip + email)  the sharpest. Somebody sitting on one account from one
//                      machine. Five wrong passwords is already generous.
//   ip                 spraying: one machine trying many accounts. Loose
//                      enough for a shared office behind one NAT address.
//   email              a distributed attack converging on one account. Loose,
//                      long window, and it exists so the account is not
//                      defenceless when every request comes from a new IP.
//
// WHY THE LOCKOUT GROWS. A flat fifteen-minute window is a rate, not a
// deterrent: an attacker simply waits it out and comes back forever. Strikes
// outlive the counters, so the second lockout is an hour, the third six, and
// anything after that a day — while an ordinary person who has forgotten which
// password they used sees only the first fifteen minutes and never the rest.
//
// The reply says only that too many attempts were made, never whether the
// address exists — the gate runs identically for an email nobody has ever
// registered, which is what stops it becoming an existence oracle.

import { RL } from "@/lib/data/keys";
import { incrWithTTL, extendTTL, ttlOf, delKeys, getIndex } from "@/lib/data/store";
import { log } from "@/lib/observability";

// Windows and ceilings. Failures, not attempts.
const PAIR_MAX = 5;
const PAIR_WINDOW_SEC = 15 * 60;

const IP_MAX = 20;
const IP_WINDOW_SEC = 15 * 60;

const EMAIL_MAX = 50;
const EMAIL_WINDOW_SEC = 60 * 60;

// Strike n → how long the source stays shut out. The last entry repeats.
const LOCKOUT_LADDER_SEC = [15 * 60, 60 * 60, 6 * 60 * 60, 24 * 60 * 60];
const STRIKE_MEMORY_SEC = 24 * 60 * 60;

const lockoutFor = (strikes) =>
  LOCKOUT_LADDER_SEC[Math.min(Math.max(strikes, 1), LOCKOUT_LADDER_SEC.length) - 1];

/**
 * MAY THIS CALLER TRY A CREDENTIAL AT ALL? Asked BEFORE the password is
 * verified, so a locked-out source never reaches bcrypt.
 *
 * Reads three counters and never writes, so asking costs nothing and cannot
 * itself be used to drive somebody's tally up.
 *
 * @returns {Promise<{blocked: boolean, retryAfter?: number, scope?: string}>}
 */
export async function checkCredentialAttempts({ ip, email }) {
  const gates = [
    { scope: "pair", key: RL.attemptPair(ip, email), max: PAIR_MAX },
    { scope: "ip", key: RL.attemptIp(ip), max: IP_MAX },
    { scope: "email", key: RL.attemptEmail(email), max: EMAIL_MAX },
  ];

  const counts = await Promise.all(gates.map((g) => tally(g.key)));
  for (let i = 0; i < gates.length; i += 1) {
    if (counts[i] < gates[i].max) continue;
    const ttl = await ttlOf(gates[i].key);
    // A counter at its ceiling with no expiry must not wedge somebody out
    // forever if an `expire` were ever lost; report a floor instead.
    return { blocked: true, scope: gates[i].scope, retryAfter: ttl > 0 ? ttl : 60 };
  }
  return { blocked: false };
}

// The current tally without touching it. A missing key reads as zero.
async function tally(key) {
  const raw = await getIndex(key);
  return raw == null ? 0 : Number(raw) || 0;
}

/**
 * One more wrong credential from this source.
 *
 * Bumps all three counters, and when a source-keyed one crosses its ceiling,
 * takes a strike and lengthens that window to the next rung of the ladder. The
 * per-email counter never escalates: it is a backstop, and stretching it would
 * turn the denial-of-service this design avoids straight back on.
 */
export async function recordCredentialFailure({ ip, email }) {
  const [pair, byIp /* email counter bumped, never escalated */] = await Promise.all([
    incrWithTTL(RL.attemptPair(ip, email), PAIR_WINDOW_SEC),
    incrWithTTL(RL.attemptIp(ip), IP_WINDOW_SEC),
    incrWithTTL(RL.attemptEmail(email), EMAIL_WINDOW_SEC),
  ]);

  const tripped = pair >= PAIR_MAX || byIp >= IP_MAX;
  if (!tripped) return { tripped: false };

  const strikes = await incrWithTTL(RL.attemptStrikes(ip), STRIKE_MEMORY_SEC);
  const lockout = lockoutFor(strikes);
  await Promise.all([
    extendTTL(RL.attemptPair(ip, email), lockout),
    extendTTL(RL.attemptIp(ip), lockout),
  ]);
  log.warn(`[attempts] locked out ${ip || "unknown"} for ${lockout}s (strike ${strikes})`);
  return { tripped: true, strikes, retryAfter: lockout };
}

/**
 * A correct credential wipes the slate for this source-and-account pair.
 *
 * The per-IP counter is cleared too: one machine that signs in successfully is
 * not the machine the per-IP limit was written for. The STRIKES are deliberately
 * left standing — they are the memory of having been locked out, and a single
 * success should not erase a day of that.
 */
export async function clearCredentialFailures({ ip, email }) {
  await delKeys(RL.attemptPair(ip, email), RL.attemptIp(ip));
}

export const __limits = {
  PAIR_MAX, IP_MAX, EMAIL_MAX,
  PAIR_WINDOW_SEC, IP_WINDOW_SEC, EMAIL_WINDOW_SEC,
  LOCKOUT_LADDER_SEC, lockoutFor,
};
