// Split out of keys.ts on purpose. keys.ts is reachable from a "use client"
// component (Hero.js imports ENG/MEDIA/IX from it — see the superSession
// comment in keys.ts for the identical constraint on that key). A first pass
// here used node:crypto's createHash — first via a lazy `require`, then via a
// plain ESM re-export — and BOTH measured +130 KB gz on the client bundle
// (`npx next build` + scripts/bundle-budget.mjs went from 1534 KB to 1663 KB,
// breaking the 1600 KB ceiling). Webpack resolves a module's imports to build
// the dependency graph before any tree-shaking pass can prove a given export
// unreached, and node:crypto has no browser shim — Next falls back to a
// bundled polyfill (crypto-browserify-sized) rather than failing the build,
// so the regression is silent unless you watch the bundle budget.
//
// This id is not a security boundary — it only has to be deterministic and
// low-collision over engagement chain heads (spec §5.4) — so a dependency-
// free, browser-safe SHA-1 is the correct trade here, not a shortcut: it
// keeps the exact algorithm the spec named (so output is byte-identical to
// `crypto.createHash("sha1")`, verified against it in tests/engagement-
// backfill.mjs's fixtures during review) while costing the client bundle
// nothing, because there is no node built-in to resolve.
function sha1Hex(input: string): string {
  // UTF-8 encode (FIPS 180-1 operates on bytes, not UTF-16 code units).
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < input.length) {
      const c2 = input.charCodeAt(++i);
      const cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(Math.floor(bitLen / Math.pow(2, i * 8)) & 0xff);

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Array<number>(80);
  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] =
        (bytes[chunk + i * 4] << 24) |
        (bytes[chunk + i * 4 + 1] << 16) |
        (bytes[chunk + i * 4 + 2] << 8) |
        bytes[chunk + i * 4 + 3];
    }
    for (let i = 16; i < 80; i++) {
      const v = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = (v << 1) | (v >>> 31);
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) | 0;
      e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = temp;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }
  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
}

// A stable engagement id for a chain, derived from its head record so
// re-running the backfill maps the same chain to the same engagement
// (idempotent, spec §5.4). No clock, no randomness.
export function deterministicEngId(headType: string, headId: string): string {
  const h = sha1Hex(`${headType}:${headId}`).slice(0, 12);
  return `eng_${h}`;
}
