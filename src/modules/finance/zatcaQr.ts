// ZATCA'S QR, as tag–length–value bytes, base64.
//
// FIVE TAGS THE SELLER WRITES: seller name, VAT number, time, total with VAT,
// VAT (ZATCA's QR guide, and BR-KSA-27). FOUR MORE FROM THE STAMP (./zatcaSign):
// the invoice hash, the stamp's signature, its public key, and ZATCA's own
// signature over the certificate. A document is only ever stamped with all
// nine; the five alone are what an unstamped download carries.

/**
 * TAG, LENGTH, VALUE — one byte each for tag and length, then the value's
 * UTF-8 bytes. A value over 255 bytes cannot be written in this format at all,
 * so it throws rather than silently truncating a length byte into a different
 * QR.
 */
export function tlvEncode(values: (string | Buffer)[]): Buffer {
  return Buffer.concat(values.map((v, i) => {
    const bytes = Buffer.isBuffer(v) ? v : Buffer.from(String(v), "utf8");
    if (bytes.length > 255) throw new Error(`zatca-qr: tag ${i + 1} is ${bytes.length} bytes`);
    return Buffer.concat([Buffer.from([i + 1, bytes.length]), bytes]);
  }));
}

/** Reads a QR back into its tags — for the test, and for anybody checking a printed code. */
export function tlvDecode(base64: string): Buffer[] {
  const buf = Buffer.from(base64, "base64");
  const out: Buffer[] = [];
  for (let at = 0; at < buf.length;) {
    const len = buf[at + 1];
    out.push(buf.subarray(at + 2, at + 2 + len));
    at += 2 + len;
  }
  return out;
}

export function zatcaQr(p: { sellerName: string; vatNumber: string; timestamp: string; total: string; vat: string }): string {
  return tlvEncode([p.sellerName, p.vatNumber, p.timestamp, p.total, p.vat]).toString("base64");
}

/** ALL NINE: the seller's five, then the stamp's — 6 and 7 as their base64 TEXT, 8 and 9 as raw bytes. */
export function zatcaStampedQr(p: Parameters<typeof zatcaQr>[0] & {
  hash: string; signature: string; publicKey: Buffer; certificateSignature: Buffer;
}): string {
  return tlvEncode([p.sellerName, p.vatNumber, p.timestamp, p.total, p.vat, p.hash, p.signature, p.publicKey, p.certificateSignature]).toString("base64");
}
