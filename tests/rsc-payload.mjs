// THE CEILING ON A SERVER-RENDERED FIRST PAYLOAD, PURELY. No store, no routes,
// no fixtures.
//
// Server-rendering a screen's first payload saves one HTTP request — one round
// trip to the database's region, ~75ms from Frankfurt — and pays for it in bytes
// on the RSC stream. At a deliberately pessimistic 5 Mbps that round trip buys
// ~47 KB, so below the ceiling the bytes are cheaper than the trip and above it
// they are not.
//
// scripts/bundle-budget.mjs measures CLIENT JS ONLY and cannot see the RSC
// stream at all, which is why this rule lives here and is checked at REQUEST
// time rather than at build time: the size depends on the tenant's data, and no
// fixture proves anything about a real tenant.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const R = await import("@/shared/rscPayload");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the ceiling");

ok("the ceiling is 48 KiB in bytes", R.RSC_PAYLOAD_CEILING_BYTES === 49152,
  String(R.RSC_PAYLOAD_CEILING_BYTES));

const filler = (bytes) => ({ pad: "a".repeat(bytes) });

ok("a small payload fits", R.fitsInRscPayload({ ok: true, tenders: [] }));
ok("a payload under the ceiling fits", R.fitsInRscPayload(filler(40000)));
ok("a payload over the ceiling does not", !R.fitsInRscPayload(filler(60000)));

// EXACTLY AT THE CEILING FITS. An inclusive bound, so the constant names the
// largest payload that is allowed rather than the smallest that is refused —
// otherwise the number in the comment and the number in the code disagree by one.
const wrapper = JSON.stringify(filler(1)).length - 1; // `{"pad":"a"}` minus the one padding char
const padding = R.RSC_PAYLOAD_CEILING_BYTES - wrapper;
ok("a payload of exactly the ceiling fits",
  R.fitsInRscPayload(filler(padding))
  && Buffer.byteLength(JSON.stringify(filler(padding)), "utf8") === R.RSC_PAYLOAD_CEILING_BYTES,
  String(Buffer.byteLength(JSON.stringify(filler(padding)), "utf8")));
ok("...and one byte more does not", !R.fitsInRscPayload(filler(padding + 1)));

// BYTES, NOT CHARACTERS, and this is the assertion that proves it. An Arabic
// tenant's rows are multi-byte, so `.length` would let a payload nearly twice
// the ceiling through — the studio is bilingual by design and this is not a
// corner case.
const arabic = { pad: "م".repeat(30000) }; // 30k characters, 60k bytes in UTF-8
ok("the measure is bytes, not characters",
  !R.fitsInRscPayload(arabic)
  && JSON.stringify(arabic).length < R.RSC_PAYLOAD_CEILING_BYTES,
  `${JSON.stringify(arabic).length} chars, ${Buffer.byteLength(JSON.stringify(arabic), "utf8")} bytes`);

// A VALUE THAT CANNOT BE SERIALISED IS NOT A PAYLOAD. JSON.stringify throws on a
// circular structure; the page must get `false` and fall back to fetch-on-mount,
// not take the screen down.
const circular = {};
circular.self = circular;
ok("an unserialisable value does not fit", !R.fitsInRscPayload(circular));

// `undefined` STRINGIFIES TO `undefined`, NOT TO A STRING, which is the one case
// where JSON.stringify neither throws nor returns text. A page that composed
// nothing must fall back rather than hand the screen a payload of `undefined`.
ok("undefined is not a payload", !R.fitsInRscPayload(undefined));

// A SOURCE-LEVEL ASSERTION, because the wrong version passes every test above.
//
// `Buffer.byteLength` gives the identical answer to `TextEncoder` on Node, so
// this whole file would stay green with a Node-only global in a module that
// src/shared's own contract says a CLIENT component may import. The failure is a
// browser ReferenceError that `tsc` cannot see (@types/node resolves it) and
// `next build` cannot see (it does not know which runtime the importer is in).
// So the guard has to read the source, and it names the reason so nobody
// "simplifies" it back.
// COMMENTS ARE STRIPPED FIRST, and the first version of this assertion failed
// because they were not: the module's own note explaining WHY `Buffer` is wrong
// contains the word, so the guard flagged the fix as the bug. A rule that cannot
// tell code from the comment warning against it would force the reason to be
// deleted to make the test pass, which is the opposite of what this repo wants.
//
// NOTE FOR THE NEXT ONE OF THESE. `tests/restructure.mjs` has several assertions
// in the same family, built on `git grep`. They have not hit this because they
// guard PATHS — a path does not appear in the prose arguing against it. The first
// one that guards an IDENTIFIER will trip exactly as this did, and the fix is
// here rather than in a commit message so it is found by whoever writes it.
const source = await readFile(new URL("../src/shared/rscPayload.ts", import.meta.url), "utf8");
const code = source.replace(/\/\/.*$/gm, "");
ok("the ceiling is measured with no Node-only global",
  !/\bBuffer\b/.test(code) && code.includes("TextEncoder"),
  /\bBuffer\b/.test(code) ? "Buffer is Node-only and src/shared is client-importable" : "");

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
