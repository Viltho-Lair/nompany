// Empty the sandbox namespace. Refuses to run without a prefix, because an
// empty prefix here would mean "delete everything".
//
// ON POSTGRES NOW. The sweep used to walk Redis keys and DEL them in batches;
// the store's own `delPrefix` does exactly that job against `documents` and
// `events`, and carries the two guards that matter with it — it refuses an
// empty prefix, and it escapes LIKE's wildcards so `sandbox_` cannot also match
// `sandboxX`. Calling it is strictly safer than re-implementing the scan here,
// and it is the reason this file no longer talks to a database directly.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

const PREFIX = process.env.NOMPANY_SANDBOX_PREFIX || "sandbox_";
if (!PREFIX.trim()) { console.error("No prefix — refusing."); process.exit(1); }

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — there is nothing to sweep.");
  process.exit(1);
}

// The loader hook fills in the extensionless specifiers the store's own modules
// use to reach their siblings — the same one tests/ and scripts/migrate/ register.
register(new URL("../tests/loader.mjs", import.meta.url),
  { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const { delPrefix } = await import("@/platform/db/store");
const swept = await delPrefix(PREFIX);
console.log(`swept ${swept} rows from "${PREFIX}" (documents + events)`);
process.exit(0);
