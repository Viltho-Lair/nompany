// ZATCA'S CRYPTOGRAPHIC STAMP — what turns a prepared document into one ZATCA
// accepts. PURE: the key, the certificate and the moment are handed in.
//
// The owner's decision A, 03/10/2026: nompany submits (./einvoice says what it
// reversed). A stamp is four things, each over the one before:
//
//   1. the INVOICE HASH — SHA-256 of the canonical document without the three
//      parts ZATCA cuts (./zatcaXml `zatcaHashInput`), base64 of the raw digest;
//   2. the SIGNATURE — ECDSA over the 32 bytes of that digest, with the key
//      whose certificate ZATCA issued to this studio's unit;
//   3. the SIGNED PROPERTIES — when, and with which certificate — hashed too;
//   4. the QR's last four tags, from the three above and the certificate.
//
// TWO OF THE HASHES ARE WRITTEN DIFFERENTLY FROM THE FIRST, and it is the
// standard's own way rather than a slip: the certificate's and the signed
// properties' digests are base64 of the HEX TEXT of the SHA-256, where the
// invoice hash is base64 of the raw digest. The same quirk as the chain's
// first PIH (./zatcaDocument), and written the standard's way for the same
// reason: any other spelling is refused.

import { createHash } from "node:crypto";
import { ecdsaSign, type ZatcaCertificate } from "./zatcaCrypto";
import type { ZatcaDocument } from "./zatcaDocument";
import { zatcaInvoiceHash, zatcaSignedXml, c14nText, c14nAttr } from "./zatcaXml";
import { zatcaStampedQr } from "./zatcaQr";

const hexHash = (text: string) => Buffer.from(createHash("sha256").update(text, "utf8").digest("hex"), "utf8").toString("base64");

const DS = "http://www.w3.org/2000/09/xmldsig#";
const XADES = "http://uri.etsi.org/01903/v1.3.2#";
const SHA256 = "http://www.w3.org/2001/04/xmlenc#sha256";
const C14N11 = "http://www.w3.org/2006/12/xml-c14n11";

/** The QR's five seller tags, read off the document — shared by the stamped and the unstamped QR. */
export function qrFieldsOf(doc: ZatcaDocument) {
  return {
    sellerName: doc.seller.name,
    vatNumber: doc.seller.vatNumber,
    // NO ZONE: with a "Z", ZATCA's validator warned KSA-25 on every document
    // (measured against its developer portal, 25/09/2026).
    timestamp: `${doc.issueDate}T${doc.issueTime}`,
    total: doc.taxInclusiveAmount.toFixed(2),
    vat: doc.taxAmount.toFixed(2),
  };
}

/**
 * THE SIGNED PROPERTIES, in the form that is HASHED: each element carrying the
 * namespace it uses, the way a canonicaliser renders a subtree cut out of the
 * document. The document carries the same element with its namespaces declared
 * further up; the two read the same to a validator, which hashes the subtree.
 */
function signedProperties(signingTime: string, certificate: ZatcaCertificate, inDocument: boolean): string {
  const ds = inDocument ? "" : ` xmlns:ds="${DS}"`;
  const xades = inDocument ? "" : ` xmlns:xades="${XADES}"`;
  return `<xades:SignedProperties${xades} Id="xadesSignedProperties">`
    + "<xades:SignedSignatureProperties>"
    + `<xades:SigningTime>${c14nText(signingTime)}</xades:SigningTime>`
    + "<xades:SigningCertificate><xades:Cert><xades:CertDigest>"
    + `<ds:DigestMethod${ds} Algorithm="${SHA256}"/>`
    + `<ds:DigestValue${ds}>${hexHash(certificate.base64)}</ds:DigestValue>`
    + "</xades:CertDigest><xades:IssuerSerial>"
    + `<ds:X509IssuerName${ds}>${c14nText(certificate.issuer)}</ds:X509IssuerName>`
    + `<ds:X509SerialNumber${ds}>${c14nText(certificate.serial)}</ds:X509SerialNumber>`
    + "</xades:IssuerSerial></xades:Cert></xades:SigningCertificate>"
    + "</xades:SignedSignatureProperties>"
    + "</xades:SignedProperties>";
}

export type ZatcaStamp = {
  xml: string;
  /** The invoice hash — also the NEXT document's PIH. */
  hash: string;
  qr: string;
  signature: string;
};

/**
 * STAMP A DOCUMENT. `signingTime` is "yyyy-mm-ddTHH:mm:ss" in UTC, handed in
 * so this stays pure (and a test can pin it).
 */
export function stampZatca(doc: ZatcaDocument, p: {
  privateKeyPem: string;
  certificate: ZatcaCertificate;
  signingTime: string;
}): ZatcaStamp {
  const hash = zatcaInvoiceHash(doc);
  const signature = ecdsaSign(p.privateKeyPem, Buffer.from(hash, "base64")).toString("base64");
  const propsHash = hexHash(signedProperties(p.signingTime, p.certificate, false));

  const xpath = (expr: string) =>
    `<ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"><ds:XPath>${c14nText(expr)}</ds:XPath></ds:Transform>`;
  const extensions = "<ext:UBLExtensions><ext:UBLExtension>"
    + "<ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>"
    + "<ext:ExtensionContent>"
    + '<sig:UBLDocumentSignatures xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2"'
    + ' xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2"'
    + ' xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2">'
    + "<sac:SignatureInformation>"
    + "<cbc:ID>urn:oasis:names:specification:ubl:signature:1</cbc:ID>"
    + "<sbc:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID>"
    + `<ds:Signature xmlns:ds="${DS}" Id="signature">`
    + "<ds:SignedInfo>"
    + `<ds:CanonicalizationMethod Algorithm="${C14N11}"></ds:CanonicalizationMethod>`
    + '<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"></ds:SignatureMethod>'
    + '<ds:Reference Id="invoiceSignedData" URI="">'
    + "<ds:Transforms>"
    + xpath("not(//ancestor-or-self::ext:UBLExtensions)")
    + xpath("not(//ancestor-or-self::cac:Signature)")
    + xpath("not(//ancestor-or-self::cac:AdditionalDocumentReference[cbc:ID='QR'])")
    + `<ds:Transform Algorithm="${C14N11}"></ds:Transform>`
    + "</ds:Transforms>"
    + `<ds:DigestMethod Algorithm="${SHA256}"></ds:DigestMethod>`
    + `<ds:DigestValue>${hash}</ds:DigestValue>`
    + "</ds:Reference>"
    + `<ds:Reference Type="${c14nAttr("http://www.w3.org/2000/09/xmldsig#SignatureProperties")}" URI="#xadesSignedProperties">`
    + `<ds:DigestMethod Algorithm="${SHA256}"></ds:DigestMethod>`
    + `<ds:DigestValue>${propsHash}</ds:DigestValue>`
    + "</ds:Reference>"
    + "</ds:SignedInfo>"
    + `<ds:SignatureValue>${signature}</ds:SignatureValue>`
    + `<ds:KeyInfo><ds:X509Data><ds:X509Certificate>${p.certificate.base64}</ds:X509Certificate></ds:X509Data></ds:KeyInfo>`
    + "<ds:Object>"
    + `<xades:QualifyingProperties xmlns:xades="${XADES}" Target="signature">`
    + signedProperties(p.signingTime, p.certificate, true)
    + "</xades:QualifyingProperties>"
    + "</ds:Object>"
    + "</ds:Signature>"
    + "</sac:SignatureInformation>"
    + "</sig:UBLDocumentSignatures>"
    + "</ext:ExtensionContent>"
    + "</ext:UBLExtension></ext:UBLExtensions>";

  const qr = zatcaStampedQr({
    ...qrFieldsOf(doc),
    hash,
    signature,
    publicKey: p.certificate.publicKeyDer,
    certificateSignature: p.certificate.signature,
  });
  return { xml: zatcaSignedXml(doc, qr, extensions), hash, qr, signature };
}
