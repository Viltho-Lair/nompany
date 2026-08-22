// ONE RUN PER NAMESPACE AT A TIME.
//
// Both bootstraps empty their namespace on the way in, which is what makes a run
// independent of how the last one ended. It is also what makes two runs of the
// SAME file destroy each other: the second one's entry sweep deletes the first
// one's fixtures mid-flight, and the first then fails somewhere far away with a
// TypeError on a context that came back as an error object.
//
// The file-level split (gate-a vs suite) does nothing here, because the two
// colliding runs are the same file. NOMPANY_TEST_SESSION is the real remedy and
// requires somebody to remember; this is the same protection applied by default.
//
// WHY THIS EARNED ITS PLACE. The failure does not look like a race. It looks
// like a bug in whatever service happened to be mid-call, three hundred lines
// from the sweep that caused it — and it is perfectly reproducible while the
// other run is still going, which is exactly what an agent bisecting it will
// conclude is a real regression. It cost two separate investigations in one
// session, one of which very nearly convicted an innocent commit.
//
// The lock carries a TTL rather than relying on release, because the runs this
// protects against are precisely the ones that die without cleaning up.

// Longer than the slowest suite so a legitimate run is never evicted mid-flight,
// and short enough that a lock orphaned by a hard kill expires within a coffee.
// NOMPANY_TEST_FORCE exists because "wait ten minutes" is not an acceptable
// answer to a developer who just pressed Ctrl-C.
const LOCK_TTL_SEC = 10 * 60;

/**
 * Take the namespace lock, or exit with an explanation.
 *
 * @param {string} prefix  the NOMPANY_KEY_PREFIX this run owns
 * @param {string} label   which suite is asking, for the message
 * @returns {Promise<() => Promise<void>>} release function
 */
export async function claimNamespace(prefix, label) {
  const { claim, release, getIndex } = await import("@/platform/db/store");
  const key = lockKeyFor(prefix);

  // The lock key is INSIDE the prefix so it can never outlive the namespace it
  // guards — a stale lock on a namespace nobody is using is worse than no lock.
  //
  // Which is why the entry sweep has to spare it, and why sweepExcept() below
  // exists. Two earlier attempts got this wrong in two different ways: claiming
  // before a sweep meant deleting your own lock, and claiming after it meant the
  // OTHER run's sweep deleted yours. A lock inside a namespace that gets wiped
  // wholesale cannot survive either way — the sweep itself had to change.
  const forced = process.env.NOMPANY_TEST_FORCE === "1";
  if (forced) await release(key).catch(() => {});

  const got = await claim(key, `${label}:${process.pid}`, LOCK_TTL_SEC);
  if (!got) {
    const holder = await getIndex(key);
    console.error(
      `\nRefusing to start: "${prefix}" is already in use by ${holder || "another run"}.\n\n` +
      `Two runs sharing one namespace delete each other's fixtures on entry, and the\n` +
      `resulting failure looks like a bug in whichever service was mid-call.\n\n` +
      `Either wait for that run to finish, or give this one a namespace of its own:\n` +
      `  NOMPANY_TEST_SESSION=<something-short> node tests/${label}\n`,
    );
    process.exit(1);
  }

  let released = false;
  const done = async () => {
    if (released) return;
    released = true;
    await release(key).catch(() => {});
  };
  // A HARD KILL IS THE NORMAL CASE, not the exceptional one — timeouts, Ctrl-C,
  // and a stopped test runner all arrive as signals, and the first version of
  // this handled only SIGINT. A run killed by `timeout` (SIGTERM) therefore held
  // the namespace for the full TTL, which is a worse failure than the collision
  // it was written to prevent. The TTL is the floor, not the plan.
  process.once("exit", () => { void done(); });
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
    process.once(sig, () => { void done().then(() => process.exit(130)); });
  }
  return done;
}

/**
 * Empty the namespace the way the bootstraps used to with delPrefix, but leave
 * the lock alone.
 *
 * Deliberately a scan-filter-delete here rather than a new option on
 * delPrefix(): this is the project's own rule for destructive work — export,
 * delete by EXPLICIT key list, and never hand a prefix to a delete that some
 * other caller might one day widen.
 *
 * @param {string} prefix
 * @param {string} lockKey  the one key to keep
 */
export async function sweepExcept(prefix, lockKey) {
  const { scanPrefix, delKeys } = await import("@/platform/db/store");
  const keys = (await scanPrefix(prefix)).filter((k) => k !== lockKey);
  if (!keys.length) return 0;
  await delKeys(...keys);
  return keys.length;
}

/** The lock key for a namespace, so a bootstrap can name it before claiming. */
export const lockKeyFor = (prefix) => `${prefix}suite:lock`;
