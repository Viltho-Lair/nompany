// THE E-INVOICE QR AS A PICTURE — an SVG drawn on the SERVER from the QR text a
// document carries (ZATCA's base64 tags), for a printed slip or invoice.
//
// ON THE SERVER, deliberately: `qrcode` already ships server-side for two-factor
// setup, and drawing it in the browser would put the library on the till's
// first load for every studio, Saudi or not. DRAWN WHEN READ, never stored — a
// picture of a string is the string's, and keeping both would be two copies
// free to disagree.
//
// SERVER-ONLY.

import QRCode from "qrcode";

/** The QR text as an SVG, or "" when there is none or it cannot be drawn. */
export async function einvoiceQrSvg(qr: unknown): Promise<string> {
  const text = String(qr ?? "").trim();
  if (!text) return "";
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).catch(() => "");
}

/** A record with its e-invoice QR drawn beside it, when it has one. */
export async function withEinvoiceQr<T extends { einvoice?: { qr?: unknown } | null }>(row: T): Promise<T & { einvoiceQrSvg?: string }> {
  const svg = await einvoiceQrSvg(row.einvoice?.qr);
  return svg ? { ...row, einvoiceQrSvg: svg } : row;
}
