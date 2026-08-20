// GOLDEN RESPONSES — the parity contract for the refactor.
//
// WHY THESE EXIST. Waves 2 through 5 rewrite the route layer, the service
// contexts, the data layer and eventually the database, and every one of them is
// promised to hold "exact functional parity". That promise is unenforceable by
// reading diffs: the interesting failures are wiring failures, and wiring looks
// correct in isolation. So the shape of every response is recorded ONCE, before
// any of it starts, and every later run is compared against the recording.
//
// A refactor that renames a field, turns "" into null, drops a key, or changes a
// status code now fails a test instead of reaching a client.
//
// NORMALISATION IS THE WHOLE TRICK. A raw response is different on every run —
// ids are minted from Date.now(), timestamps move, the fixture slug is random.
// Comparing raw text would fail every time and teach everyone to ignore it. So
// ids and times are replaced by stable placeholders BEFORE recording and before
// comparing. What survives normalisation is exactly what we want pinned: the
// keys, the nesting, the types, the enumerated values, the status code.
//
// WHAT IS DELIBERATELY NOT PINNED: the id values themselves, wall-clock times,
// and array ORDER where the route does not promise one. Pinning those would make
// the suite flap, and a flapping test is deleted within a month.
//
// RECORDING. `NOMPANY_RECORD_GOLDENS=1 npm test` rewrites the files. That is a
// deliberate act with a visible diff — re-recording is how a change of contract
// is approved, so it belongs in its own commit with a reason, never bundled into
// the change that caused it.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, "goldens");
export const RECORDING = process.env.NOMPANY_RECORD_GOLDENS === "1";

// ---- normalisation ---------------------------------------------------------
// Every id this product mints is `<prefix>_<base36 time><base36 random>` (see
// keys.js makeId), which is ~14 characters after the underscore. Row ids take
// their prefix from the COLLECTION NAME's first three letters — so `salesTickets`
// mints `sal_…` and `generatedDocuments` mints `gen_…`, and a hand-maintained
// list of prefixes would go stale the first time somebody adds a collection.
//
// So the pattern is structural rather than enumerated: three or four lowercase
// letters, an underscore, and a long base36 tail. The prefix is captured, so a
// golden still shows WHICH kind of id it was — `<std_ID>` reads better than
// `<id>` and catches a field that starts returning the wrong sort of thing.
const RE = [
  [/\b([a-z]{3,4})_[a-z0-9]{10,}\b/g, "<$1_ID>"],
  [/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z\b/g, "<timestamp>"],
  [/\b\d{13}-\d+\b/g, "<streamId>"],            // Redis stream entry ids
  [/\b[a-f0-9]{32}\b/g, "<hex32>"],             // media ids
  [/\b[A-Za-z0-9_-]{40,}\b/g, "<token>"],       // session tokens, base64url
];

/**
 * Replace everything that legitimately differs between runs, so what remains is
 * the contract. `extra` carries fixture-specific values (the random slug, the
 * fixture emails) that are not id-shaped.
 */
export function normalise(value, extra = {}) {
  let text = JSON.stringify(value, null, 2);
  for (const [from, to] of RE) text = text.replace(from, to);
  for (const [literal, placeholder] of Object.entries(extra)) {
    if (!literal) continue;
    text = text.split(literal).join(placeholder);
  }
  return text;
}

// ---- compare ---------------------------------------------------------------
const pathFor = (name) => join(DIR, `${name}.json`);

/**
 * @returns {{ok: boolean, recorded?: boolean, detail?: string}}
 */
export function golden(name, payload, extra = {}) {
  const actual = normalise(payload, extra);
  const file = pathFor(name);

  if (RECORDING) {
    if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
    writeFileSync(file, `${actual}\n`, "utf8");
    return { ok: true, recorded: true };
  }

  if (!existsSync(file)) {
    return { ok: false, detail: `no golden recorded — run NOMPANY_RECORD_GOLDENS=1 npm test` };
  }
  const expected = readFileSync(file, "utf8").trimEnd();
  if (expected === actual) return { ok: true };
  return { ok: false, detail: firstDifference(expected, actual) };
}

// The first line that differs, with a little context. A full diff of a large
// response buries the one thing that changed.
function firstDifference(expected, actual) {
  const a = expected.split("\n");
  const b = actual.split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] === b[i]) continue;
    const at = `line ${i + 1}`;
    return `${at}: expected ${JSON.stringify(a[i] ?? "<end>")}, got ${JSON.stringify(b[i] ?? "<end>")}`;
  }
  return "differs in length only";
}

// ---- calling a route -------------------------------------------------------
// Routes are called the way Next calls them — a real Request and a params
// promise — so the thing under test is the handler, not a reimplementation of
// what the handler is thought to do.
export function req(url, { method = "GET", body, headers = {} } = {}) {
  const init = { method, headers: { host: "nompany.test", ...headers } };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return new Request(`http://nompany.test${url}`, init);
}

export const ctx = (params = {}) => ({ params: Promise.resolve(params) });

/** Status + parsed body, ready to hand to golden(). */
export async function capture(handler, request, context) {
  const res = await handler(request, context);
  let body;
  const text = await res.text();
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
}
