// A CODE 128 BARCODE, for a number somebody will scan back in — a till
// receipt's, an invoice's, a quotation's. The owner, 18/09/2026: documents are
// found by a scanned code, and a barcode serves until the country packages
// decide where a QR may go (docs/progress.md, Open decisions: a regulatory QR
// already sits on a tax invoice in some countries, and a second one misleads).
//
// CODE 128 BECAUSE EVERY HANDHELD SCANNER READS IT out of the box and it holds
// the letters, digits and hyphens a reference is made of. Set B only: a
// reference is short, so the density set C would buy for runs of digits is not
// worth a second code path to get wrong.
//
// HAND-WRITTEN RATHER THAN A PACKAGE: it is one table and a checksum, pure, and
// it prints on the till's slip — a dependency here would be paid for on every
// page that can print one. `tests/barcode128-model.mjs` checks the table's
// shape, and the rendered code was decoded by an independent reader when it
// was written (see that test's header).

/**
 * THE 107 SYMBOLS, as the widths of their bars and spaces in modules, bar
 * first. Values 0–102 are data, 103–105 the three start codes, 106 the stop.
 * Every data symbol is eleven modules wide; the stop is thirteen.
 */
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
] as const;

export const CODE128_PATTERNS: readonly string[] = PATTERNS;

const START_B = 104;
const STOP = 106;

/** Can this text be written in Code 128 set B? Printable ASCII only, 1–40 characters. */
export const code128Encodable = (text: string): boolean =>
  text.length > 0 && text.length <= 40 && /^[\x20-\x7e]+$/.test(text);

/**
 * THE SYMBOL VALUES for this text — start, data, checksum, stop — or null when
 * it cannot be written. The checksum is the start value plus each data value
 * times its position, modulo 103.
 */
export function code128Values(text: string): number[] | null {
  if (!code128Encodable(text)) return null;
  const data = [...text].map((c) => c.charCodeAt(0) - 32);
  const check = data.reduce((sum, v, i) => sum + v * (i + 1), START_B) % 103;
  return [START_B, ...data, check, STOP];
}

/**
 * THE WIDTHS TO DRAW, in modules, alternating bar and space and starting with
 * a bar. A caller adds the quiet zone (ten modules each side) around them.
 */
export function code128(text: string): number[] | null {
  const values = code128Values(text);
  if (!values) return null;
  return values.flatMap((v) => [...PATTERNS[v]].map(Number));
}
