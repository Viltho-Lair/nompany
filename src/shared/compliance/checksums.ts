// CHECK-DIGIT ALGORITHMS, BY WHAT THEY ARE — never by which country uses them.
//
// A country definition names an algorithm (`"checksum": "mod97-9755"`) and this
// file knows how to run it. That split is the constraint the package was built
// under: no country's rules in shared code. An algorithm is not a rule — ISO
// 7064 MOD 11,10 is used by Germany's VAT ID today and could be named by any
// country's file tomorrow without this file changing.
//
// A CLOSED SET, deliberately. A definition naming an algorithm this file does
// not know fails `definitionProblems` (./definition) and the model test, rather
// than quietly accepting every value because nothing could check it.
//
// Each was tested against a PUBLISHED valid number rather than one this code
// generated (tests/official-values-model.mjs): an implementation that both
// produced and checked its own examples would agree with itself however wrong
// it was.

const digitsOf = (v: string) => v.replace(/\D/g, "").split("").map(Number);

/**
 * HMRC'S MODULUS 97 AND 9755. The first seven digits weighted 8 down to 2, the
 * last two digits added as a number; the total must divide by 97 (older
 * numbers) or leave 97 after adding 55 (numbers issued since 2010). Branch
 * numbers carry three more digits, which the check ignores.
 *
 * Checked against HMRC's long-published example 123 4567 82.
 */
function mod97_9755(value: string): boolean {
  const d = digitsOf(value).slice(0, 9);
  if (d.length !== 9) return false;
  const weights = [8, 7, 6, 5, 4, 3, 2];
  const total = weights.reduce((sum, w, i) => sum + w * d[i], 0) + d[7] * 10 + d[8];
  return total % 97 === 0 || (total + 55) % 97 === 0;
}

/**
 * ISO/IEC 7064 MOD 11,10 over every digit but the last, which is the check.
 * Checked against DE 136 695 976, the most widely published real German VAT ID.
 */
function iso7064_mod11_10(value: string): boolean {
  const d = digitsOf(value);
  if (d.length < 2) return false;
  let product = 10;
  for (const digit of d.slice(0, -1)) {
    let sum = (digit + product) % 10;
    if (sum === 0) sum = 10;
    product = (sum * 2) % 11;
  }
  let check = 11 - product;
  if (check === 10) check = 0;
  return check === d[d.length - 1];
}

/** Luhn, for identifiers that use it (the UAE's Emirates ID, among others). */
function luhn(value: string): boolean {
  const d = digitsOf(value);
  if (d.length < 2) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let x = d[d.length - 1 - i];
    if (i % 2 === 1) { x *= 2; if (x > 9) x -= 9; }
    sum += x;
  }
  return sum % 10 === 0;
}

export const CHECKSUMS: Readonly<Record<string, (value: string) => boolean>> = Object.freeze({
  "mod97-9755": mod97_9755,
  "iso7064-mod11-10": iso7064_mod11_10,
  "luhn": luhn,
});

export type ChecksumName = keyof typeof CHECKSUMS;

export const isChecksumName = (v: unknown): v is ChecksumName =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(CHECKSUMS, v);
