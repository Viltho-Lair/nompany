// Air Waybill (AWB) number helpers — client-safe (no imports, no Node).
//
// An AWB number is 11 digits: PPP-SSSSSSSC
//   PPP       3-digit IATA airline prefix (identifies the carrier)
//   SSSSSSS   7-digit serial number
//   C         1-digit check digit = serial mod 7 (unweighted modulo-7)
// e.g. 176-12345675 → prefix 176 (Emirates), serial 1234567, check 1234567 % 7 = 5.

// Strip everything but digits so "176-1234567 5", "176 12345675" etc. all work.
export function awbDigits(raw: unknown) {
  return String(raw || "").replace(/\D/g, "");
}

// Parse + validate an AWB. Returns { valid, reason, prefix, serial, check,
// formatted, digits }. `valid` requires 11 digits AND a correct mod-7 check.
export function parseAwb(raw: unknown) {
  const digits = awbDigits(raw);
  if (digits.length === 0) return { valid: false, reason: "Enter an AWB number", digits };
  if (digits.length !== 11) {
    return { valid: false, reason: `AWB must be 11 digits (got ${digits.length})`, digits };
  }
  const prefix = digits.slice(0, 3);
  const serial = digits.slice(3, 10);
  const check = Number(digits.slice(10));
  const expected = Number(serial) % 7;
  const valid = check === expected;
  return {
    valid,
    reason: valid ? "" : `Invalid check digit — should be ${expected}, not ${check}`,
    prefix,
    serial,
    check,
    formatted: `${prefix}-${serial}${check}`,
    digits,
  };
}

// Format an 11-digit AWB (or a prefix + serial pair) as PPP-SSSSSSSC.
export function formatAwb(raw: unknown) {
  const d = awbDigits(raw);
  if (d.length !== 11) return String(raw || "");
  return `${d.slice(0, 3)}-${d.slice(3)}`;
}

// The correct check digit for a 7-digit serial (used to build/repair AWBs).
export function awbCheckDigit(serial: unknown) {
  const s = String(serial || "").replace(/\D/g, "").slice(0, 7);
  if (s.length !== 7) return null;
  return Number(s) % 7;
}

// Is this string a plausibly-complete, valid AWB? (convenience for guards)
export function isValidAwb(raw: unknown) {
  return parseAwb(raw).valid;
}
