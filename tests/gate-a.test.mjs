// GATE A — bootstrap.
//
// A second entry rather than another block inside integration.test.mjs, for two
// reasons. suite.mjs ends by sweeping its namespace and calling process.exit, so
// nothing imported after it would run. And the two files answer different
// questions — the suite guards behaviours that broke once, Gate A guards the
// SHAPE of everything, which is a contract rather than a set of cases. A failure
// in one should not bury the other's output.
//
// They now take separate key namespaces (see below), so running them together
// is safe — each sweeps only its own.

import { register } from "node:module";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// KEY NAMESPACE — two collisions, one mechanism.
//
// This suite and Gate A both used "test_", and both END by deleting their whole
// namespace. Running them together therefore had one sweep delete the other's
// fixtures mid-flight; that happened twice in one session before it was
// understood. They now take separate namespaces, so the two files can run
// concurrently and neither can reap the other.
//
// NOMPANY_TEST_SESSION is the second half: two DEVELOPERS (or two agent
// sessions) sharing one Redis need a discriminator of their own, because the
// file-level split does nothing for two copies of the same file. Set it to
// anything short and distinct and the namespaces stop overlapping entirely.
//
// Both still begin with "test_", so every existing safety assumption about that
// prefix continues to hold.
const SESSION = process.env.NOMPANY_TEST_SESSION ? `${process.env.NOMPANY_TEST_SESSION}_` : "";
process.env.NOMPANY_KEY_PREFIX = process.env.NOMPANY_KEY_PREFIX || `test_${SESSION}gatea_`;
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run Gate A with NODE_ENV=production.");
  process.exit(1);
}
if (!process.env.NOMPANY_KEY_PREFIX.trim()) {
  console.error("NOMPANY_KEY_PREFIX must not be empty — that would run against live keys.");
  process.exit(1);
}

try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI may supply the environment directly */ }

if (!process.env.REDIS_URL) {
  console.error("REDIS_URL is not set — Gate A needs a Redis to talk to.");
  process.exit(1);
}

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const { gateAFailures } = await import("./gate-a.mjs");

// Everything Gate A wrote lives under the namespace, so cleanup is one prefix
// deletion. Runs whatever happened above — a failed assertion must not leave
// keys behind.
const { delPrefix } = await import("@/lib/data/store");
const { getRedisClient } = await import("@/lib/data/redis");
const swept = await delPrefix(process.env.NOMPANY_KEY_PREFIX);
console.log(`swept ${swept} keys from "${process.env.NOMPANY_KEY_PREFIX}"`);
await (await getRedisClient()).quit();

process.exit(gateAFailures ? 1 : 0);
