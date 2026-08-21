// Empty the sandbox namespace. Refuses to run without a prefix, because an
// empty prefix here would mean "delete everything".
import { readFileSync } from "node:fs";
import { createClient } from "redis";

const PREFIX = process.env.NOMPANY_SANDBOX_PREFIX || "sandbox_";
if (!PREFIX.trim()) { console.error("No prefix — refusing."); process.exit(1); }

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const client = createClient({ url: process.env.REDIS_URL });
await client.connect();

// Collected first, deleted by EXPLICIT key list — the rule this project wrote
// for itself after the orphan sweep, and it applies to a throwaway namespace
// exactly as much as to a real one.
const keys = [];
for await (const k of client.scanIterator({ MATCH: `${PREFIX}*`, COUNT: 500 })) {
  Array.isArray(k) ? keys.push(...k) : keys.push(k);
}
if (keys.length) for (let i = 0; i < keys.length; i += 100) await client.del(keys.slice(i, i + 100));
console.log(`swept ${keys.length} keys from "${PREFIX}"`);
await client.quit();
