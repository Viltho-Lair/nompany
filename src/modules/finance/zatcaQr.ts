// ZATCA'S QR — the tags the SELLER writes, as tag–length–value bytes, base64.
//
// FIVE TAGS: seller name, VAT number, time, total with VAT, VAT (ZATCA's QR
// guide, and BR-KSA-27). Tags 6 to 9 — the hash, the stamp's signature, its
// public key and ZATCA's signature over the certificate — belong to the
// cryptographic stamp, which the company's own certified solution adds; nompany
// holds no certificate and asks for none (./zatca, the owner's rule of
// 26/09/2026).

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
