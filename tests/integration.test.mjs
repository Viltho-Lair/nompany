// INTEGRATION SUITE — bootstrap.
//
// Runs the REAL modules against the REAL Redis, inside a key namespace of its
// own. Everything this suite writes lives under NOMPANY_KEY_PREFIX and is
// deleted wholesale at the end, so it cannot see or touch a live studio: with a
// prefix set there is no key it can name that a real studio also uses.
//
// This file only sets the stage. The tests are in ./suite.mjs, imported
// dynamically so the loader and the environment are in place before any
// project module is evaluated — keys.js reads the prefix at import time, so
// setting it afterwards would be setting it too late.

import { register } from "node:module";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// A prefix nothing in production uses, and never the empty string: an empty
// prefix would point the whole suite at live data.
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
process.env.NOMPANY_KEY_PREFIX = process.env.NOMPANY_KEY_PREFIX || `test_${SESSION}suite_`;
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run the integration suite with NODE_ENV=production.");
  process.exit(1);
}
if (!process.env.NOMPANY_KEY_PREFIX.trim()) {
  console.error("NOMPANY_KEY_PREFIX must not be empty — that would run against live keys.");
  process.exit(1);
}

// REDIS_URL lives in .env.local, which Next loads and plain Node does not.
// Read just enough of it to connect; no dependency for six lines of parsing.
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI may supply the environment directly */ }

if (!process.env.REDIS_URL) {
  console.error("REDIS_URL is not set — the integration suite needs a Redis to talk to.");
  process.exit(1);
}

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

// SWEEP BEFORE, NOT ONLY AFTER.
//
// The run cleans up when it finishes, which is no help when it does NOT finish:
// a killed run, a timeout, or a crash leaves its fixtures behind, and the next
// run then builds on top of them. That produced 187 golden failures in one
// go — every list response carrying rows from a previous life — and looked
// exactly like a mass regression, which is the most expensive kind of false
// alarm.
//
// So the namespace is emptied on the way IN as well. It is the same one-prefix
// delete, it costs nothing on a clean run, and it makes every run independent of
// how the last one ended.
const { delPrefix: sweepBefore } = await import("@/lib/data/store");
await sweepBefore(process.env.NOMPANY_KEY_PREFIX);

await import("./suite.mjs");
