// ZATCA'S CRYPTOGRAPHY — the studio's key, the certificate request ZATCA's
// onboarding takes, and what is read back out of the certificate it issues.
//
// WHY THIS EXISTS NOW: the owner's decision A, 03/10/2026 — nompany SUBMITS a
// Saudi studio's invoices to ZATCA (reversing "prepare, never submit" of
// 26/09/2026, see ./einvoice). Phase 2 requires every invoice to carry a stamp
// signed with a key whose certificate ZATCA issued to that studio's solution,
// so the studio needs a key pair and a certificate.
//
// THE KEY IS secp256k1, ECDSA WITH SHA-256 — ZATCA's specification, not a
// choice. Node's own crypto does the curve, the signing and the certificate
// parsing; what it cannot do is WRITE a certificate request, so the few DER
// structures a PKCS#10 request needs are encoded here by hand, and the one
// field the QR needs from the issued certificate (its signature) is read back
// the same way.
//
// SERVER-ONLY: it holds a private key in memory while it signs.

import { createPrivateKey, createPublicKey, generateKeyPairSync, createSign, X509Certificate, type KeyObject } from "node:crypto";

// ---- DER, the small part of it a certificate request needs -----------------------------------

const len = (n: number): Buffer => {
  if (n < 0x80) return Buffer.from([n]);
  const bytes: number[] = [];
  for (let v = n; v > 0; v >>= 8) bytes.unshift(v & 0xff);
  return Buffer.from([0x80 | bytes.length, ...bytes]);
};
const tlv = (tag: number, body: Buffer) => Buffer.concat([Buffer.from([tag]), len(body.length), body]);
export const der = {
  seq: (...parts: Buffer[]) => tlv(0x30, Buffer.concat(parts)),
  set: (...parts: Buffer[]) => tlv(0x31, Buffer.concat(parts)),
  int: (n: number) => tlv(0x02, Buffer.from([n])),
  utf8: (s: string) => tlv(0x0c, Buffer.from(s, "utf8")),
  printable: (s: string) => tlv(0x13, Buffer.from(s, "ascii")),
  octets: (b: Buffer) => tlv(0x04, b),
  bits: (b: Buffer) => tlv(0x03, Buffer.concat([Buffer.from([0]), b])),
  /** A context-specific constructed tag, [n]. */
  ctx: (n: number, body: Buffer) => tlv(0xa0 | n, body),
  oid: (dotted: string) => {
    const [a, b, ...rest] = dotted.split(".").map(Number);
    const out: number[] = [40 * a + b];
    for (const v of rest) {
      const chunk: number[] = [v & 0x7f];
      for (let x = v >>> 7; x > 0; x >>>= 7) chunk.unshift(0x80 | (x & 0x7f));
      out.push(...chunk);
    }
    return tlv(0x06, Buffer.from(out));
  },
};

/** Read one DER element at `at`: its tag, where its content starts and ends. */
export function derRead(buf: Buffer, at = 0): { tag: number; start: number; end: number } {
  const tag = buf[at];
  let n = buf[at + 1];
  let start = at + 2;
  if (n & 0x80) {
    const bytes = n & 0x7f;
    n = 0;
    for (let i = 0; i < bytes; i++) n = (n << 8) | buf[start + i];
    start += bytes;
  }
  return { tag, start, end: start + n };
}

const OID = {
  country: "2.5.4.6",
  orgUnit: "2.5.4.11",
  org: "2.5.4.10",
  commonName: "2.5.4.3",
  // THE SUBJECT ALTERNATIVE NAME'S FIELDS, as ZATCA's onboarding guide names
  // them: "SN" is the SURNAME attribute carrying the solution's serial number,
  // "UID" the VAT number, "title" the invoice types, "registeredAddress" the
  // branch's address, "businessCategory" the industry.
  surname: "2.5.4.4",
  uid: "0.9.2342.19200300.100.1.1",
  title: "2.5.4.12",
  registeredAddress: "2.5.4.26",
  businessCategory: "2.5.4.15",
  extensionRequest: "1.2.840.113549.1.9.14",
  subjectAltName: "2.5.29.17",
  certificateTemplateName: "1.3.6.1.4.1.311.20.2",
  ecdsaWithSha256: "1.2.840.10045.4.3.2",
};

const rdn = (oid: string, value: Buffer) => der.set(der.seq(der.oid(oid), value));

// ---- the key ---------------------------------------------------------------------------------

/** A new key pair on ZATCA's curve, as PEM. */
export function newZatcaKey(): { privateKeyPem: string; publicKeyDer: Buffer } {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "secp256k1" });
  return {
    privateKeyPem: privateKey.export({ type: "sec1", format: "pem" }).toString(),
    publicKeyDer: publicKey.export({ type: "spki", format: "der" }) as Buffer,
  };
}

/** ECDSA-SHA256 over `data`, DER-encoded — the form ZATCA verifies. */
export function ecdsaSign(privateKeyPem: string | KeyObject, data: Buffer | string): Buffer {
  const signer = createSign("sha256");
  signer.update(data);
  signer.end();
  return signer.sign(typeof privateKeyPem === "string" ? createPrivateKey(privateKeyPem) : privateKeyPem);
}

// ---- the certificate request ------------------------------------------------------------------

/**
 * WHICH ZATCA ENVIRONMENT A REQUEST IS FOR. Each has its own certificate
 * template name in the request, and its own address (./zatcaApi).
 *   developer  — ZATCA's public developer portal: anybody, test data only
 *   simulation — a studio's own rehearsal against its real registration
 *   production — the real thing
 */
export const ZATCA_ENVIRONMENTS = ["developer", "simulation", "production"] as const;
export type ZatcaEnvironment = (typeof ZATCA_ENVIRONMENTS)[number];

const TEMPLATE: Record<ZatcaEnvironment, string> = {
  developer: "TSTZATCA-Code-Signing",
  simulation: "PREZATCA-Code-Signing",
  production: "ZATCA-Code-Signing",
};

export type ZatcaCsrInput = {
  environment: ZatcaEnvironment;
  /** The solution's own name for this unit — "nompany-<studio>". */
  commonName: string;
  /** "1-<maker>|2-<model or version>|3-<unit serial>" — ZATCA's format for the solution serial. */
  serialNumber: string;
  /** The taxpayer's VAT number: 15 digits, starting and ending with 3. */
  vatNumber: string;
  /** The organisation unit: a branch name, or for a VAT group the member's TIN. */
  orgUnit: string;
  /** The taxpayer's legal name. */
  orgName: string;
  /**
   * The invoice types this unit issues, four digits: standard, simplified,
   * then two reserved zeros. "0100" is simplified only, "1100" both.
   */
  invoiceTypes: string;
  /** The branch's address — a short line. */
  location: string;
  /** The industry, a short word. */
  industry: string;
};

/**
 * THE CERTIFICATE SIGNING REQUEST, as ZATCA's compliance API takes it: the PEM
 * text, base64-encoded once more. Subject C, OU, O, CN; an extension request
 * carrying the certificate template name for the environment and a subject
 * alternative name holding the solution's identity fields.
 */
export function zatcaCsr(input: ZatcaCsrInput, privateKeyPem: string): string {
  const key = createPrivateKey(privateKeyPem);
  const spki = createPublicKey(key).export({ type: "spki", format: "der" }) as Buffer;

  const subject = der.seq(
    rdn(OID.country, der.printable("SA")),
    rdn(OID.orgUnit, der.utf8(input.orgUnit)),
    rdn(OID.org, der.utf8(input.orgName)),
    rdn(OID.commonName, der.utf8(input.commonName)),
  );
  const directoryName = der.seq(
    rdn(OID.surname, der.utf8(input.serialNumber)),
    rdn(OID.uid, der.utf8(input.vatNumber)),
    rdn(OID.title, der.utf8(input.invoiceTypes)),
    rdn(OID.registeredAddress, der.utf8(input.location)),
    rdn(OID.businessCategory, der.utf8(input.industry)),
  );
  const extensions = der.seq(
    der.seq(der.oid(OID.certificateTemplateName), der.octets(der.printable(TEMPLATE[input.environment]))),
    // GeneralNames, holding one directoryName ([4], explicitly tagged: a Name is a CHOICE).
    der.seq(der.oid(OID.subjectAltName), der.octets(der.seq(der.ctx(4, directoryName)))),
  );
  const attributes = der.ctx(0, der.seq(der.oid(OID.extensionRequest), der.set(extensions)));
  const info = der.seq(der.int(0), subject, spki, attributes);
  const signature = ecdsaSign(key, info);
  const csr = der.seq(info, der.seq(der.oid(OID.ecdsaWithSha256)), der.bits(signature));
  const pem = `-----BEGIN CERTIFICATE REQUEST-----\n${csr.toString("base64").replace(/.{1,64}/g, "$&\n")}-----END CERTIFICATE REQUEST-----\n`;
  return Buffer.from(pem, "utf8").toString("base64");
}

// ---- what is read out of an issued certificate ------------------------------------------------

export type ZatcaCertificate = {
  /** The certificate's DER, base64 — what goes in the signature's X509Certificate. */
  base64: string;
  /** Issuer as XAdES wants it: most specific first, comma-separated ("CN=…, DC=…"). */
  issuer: string;
  /** The serial number in decimal. */
  serial: string;
  /** The public key's SubjectPublicKeyInfo, DER — QR tag 8. */
  publicKeyDer: Buffer;
  /** The issuer's signature over the certificate — QR tag 9 (simplified invoices). */
  signature: Buffer;
};

/**
 * ZATCA'S `binarySecurityToken` IS THE CERTIFICATE'S BASE64, base64-encoded
 * again. Unwrap it once to the certificate's own base64, then read it.
 */
export function readZatcaCertificate(binarySecurityToken: string): ZatcaCertificate {
  const base64 = Buffer.from(binarySecurityToken, "base64").toString("utf8").trim();
  const derBytes = Buffer.from(base64, "base64");
  const cert = new X509Certificate(derBytes);
  // The certificate's own signature: the third element of the outer SEQUENCE,
  // a BIT STRING whose first content byte counts unused bits (always 0 here).
  const outer = derRead(derBytes, 0);
  const tbs = derRead(derBytes, outer.start);
  const alg = derRead(derBytes, tbs.end);
  const sig = derRead(derBytes, alg.end);
  return {
    base64,
    issuer: cert.issuer.split("\n").reverse().join(", "),
    serial: BigInt(`0x${cert.serialNumber}`).toString(10),
    publicKeyDer: cert.publicKey.export({ type: "spki", format: "der" }) as Buffer,
    signature: derBytes.subarray(sig.start + 1, sig.end),
  };
}
