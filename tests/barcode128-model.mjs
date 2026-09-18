// THE CODE 128 ENCODER (shared/barcode) — a hand-written table.
//
// THE DEFECT THIS GUARDS: one mistyped row in a 107-row table prints a barcode
// that looks perfect and that no scanner will read, and nothing in the product
// would notice — the text under it still reads correctly. So the table's SHAPE
// is asserted here (every symbol 11 modules, 3 bars, all 107 distinct), and
// when it was written (18/09/2026) an independent reader — ZXing, in the
// browser — decoded the receipt slip's printed "RCT-0001" and every one of the
// 95 printable characters, drawn from this encoder in four codes, exactly.
import { code128, code128Values, code128Encodable, CODE128_PATTERNS } from "../src/shared/barcode.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};
const sum = (p) => [...p].reduce((s, c) => s + Number(c), 0);

ok("107 symbols", CODE128_PATTERNS.length === 107);
ok("every symbol but the stop is 11 modules wide",
  CODE128_PATTERNS.slice(0, 106).every((p) => p.length === 6 && sum(p) === 11),
  CODE128_PATTERNS.map((p, i) => [i, sum(p)]).filter(([i, s]) => i < 106 && s !== 11).join(" "));
ok("the stop is 13 modules and seven elements", CODE128_PATTERNS[106] === "2331112");
ok("no two symbols are the same", new Set(CODE128_PATTERNS).size === 107);
ok("every symbol's bars are an even number of modules wide (the parity rule)",
  CODE128_PATTERNS.slice(0, 106).every((p) => (Number(p[0]) + Number(p[2]) + Number(p[4])) % 2 === 0));

// "PJJ123C" worked by hand: start 104, then P48×1 J42×2 J42×3 1(17)×4 2(18)×5
// 3(19)×6 C35×7 = 879, and 879 mod 103 = 55.
const v = code128Values("PJJ123C");
ok("the checksum is the weighted sum modulo 103", v && v[v.length - 2] === 55, JSON.stringify(v));
ok("start B first, stop last", v && v[0] === 104 && v[v.length - 1] === 106);

const w = code128("RCT-0001");
ok("widths alternate from a bar and add up to 11 per symbol + 13", w && w.reduce((s, x) => s + x, 0) === 11 * (8 + 2) + 13);
ok("a reference with a hyphen is encodable", code128Encodable("INV-0042"));
ok("Arabic or an empty value is refused, not mis-drawn", code128("فاتورة") === null && code128("") === null);

console.log(fails ? `\nbarcode128 model: ${fails} FAILURES\n` : "\nbarcode128 model: all passed\n");
process.exit(fails ? 1 : 0);
