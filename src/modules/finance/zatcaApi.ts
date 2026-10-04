// ZATCA'S API — THE ONLY FILE THAT TALKS TO A TAX AUTHORITY.
//
// The owner's decision A, 03/10/2026: nompany submits a Saudi studio's invoices
// (./einvoice says what it reversed). Every call to ZATCA goes through here so
// there is one place to read for what leaves the product, and
// `tests/einvoice-model.mjs` holds the line: no other file names an
// authority's host, and no other e-invoicing file calls fetch.
//
// FOUR CALLS, as ZATCA's onboarding and reporting guide names them:
//   POST /compliance             — an OTP and a certificate request → a COMPLIANCE certificate
//   POST /compliance/invoices    — a sample document, checked and nothing more
//   POST /production/csids       — the compliance request id → the PRODUCTION certificate
//   POST /invoices/reporting/single — a simplified invoice, reported
// Authentication is HTTP Basic over the certificate token and its secret.
//
// ONLY THE DEVELOPER PORTAL IS OPEN — the owner, 03/10/2026: ZATCA is called
// from the developer portal with test data until the owner says otherwise.
// Simulation and production are declared so a studio's record can name them,
// and refused here, in the one place every call passes.

import type { ZatcaEnvironment } from "./zatcaCrypto";

const BASE: Record<ZatcaEnvironment, string> = {
  developer: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
  simulation: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
  production: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
};

/** WHICH ENVIRONMENTS MAY BE CALLED. Opening one is the owner's decision, made here. */
export const ZATCA_OPEN_ENVIRONMENTS: readonly ZatcaEnvironment[] = ["developer"];

/** A certificate's credentials: the token ZATCA issued and its secret. */
export type ZatcaCredentials = { token: string; secret: string };

/**
 * WHAT ZATCA ANSWERED. `status` is the HTTP status, or 0 when nothing came back
 * (a timeout, a refused connection) — the difference between "ZATCA said no"
 * and "ZATCA was not reached", which decide opposite things: a refusal is the
 * document's problem, an outage is retried.
 */
export type ZatcaAnswer = { status: number; body: Record<string, unknown> | null; error?: string };

async function call(
  environment: ZatcaEnvironment,
  path: string,
  payload: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<ZatcaAnswer> {
  if (!ZATCA_OPEN_ENVIRONMENTS.includes(environment)) return { status: 0, body: null, error: "environment-closed" };
  try {
    const res = await fetch(`${BASE[environment]}${path}`, {
      method: "POST",
      headers: { "Accept-Version": "V2", "Accept-Language": "en", "Content-Type": "application/json", Accept: "application/json", ...headers },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    let body: Record<string, unknown> | null = null;
    try { body = JSON.parse(text); } catch { body = null; }
    return { status: res.status, body, ...(body ? {} : { error: "not-json" }) };
  } catch (e) {
    return { status: 0, body: null, error: (e as Error).name === "TimeoutError" ? "timeout" : "unreachable" };
  }
}

const basic = (c: ZatcaCredentials) => ({ Authorization: `Basic ${Buffer.from(`${c.token}:${c.secret}`).toString("base64")}` });

/** The OTP the taxpayer generated on the Fatoora portal, and the request → a compliance certificate. */
export const requestComplianceCsid = (environment: ZatcaEnvironment, otp: string, csr: string) =>
  call(environment, "/compliance", { csr }, { OTP: otp });

/** One sample document, checked against ZATCA's rules and recorded as part of onboarding. */
export const checkCompliance = (environment: ZatcaEnvironment, credentials: ZatcaCredentials, doc: { hash: string; uuid: string; xml: string }) =>
  call(environment, "/compliance/invoices", { invoiceHash: doc.hash, uuid: doc.uuid, invoice: Buffer.from(doc.xml, "utf8").toString("base64") }, basic(credentials));

/** Once the checks passed: the production certificate. */
export const requestProductionCsid = (environment: ZatcaEnvironment, credentials: ZatcaCredentials, complianceRequestId: string) =>
  call(environment, "/production/csids", { compliance_request_id: complianceRequestId }, basic(credentials));

/** A simplified invoice (or note), reported. `Clearance-Status: 0` says it is not a clearance. */
export const reportInvoice = (environment: ZatcaEnvironment, credentials: ZatcaCredentials, doc: { hash: string; uuid: string; xml: string }) =>
  call(environment, "/invoices/reporting/single", { invoiceHash: doc.hash, uuid: doc.uuid, invoice: Buffer.from(doc.xml, "utf8").toString("base64") }, { ...basic(credentials), "Clearance-Status": "0" });

/** ZATCA's messages, flattened to their words — what a studio is shown. */
export function zatcaMessages(body: Record<string, unknown> | null): { errors: string[]; warnings: string[] } {
  const v = (body?.validationResults || {}) as Record<string, unknown>;
  const words = (list: unknown) => (Array.isArray(list) ? list : [])
    .map((m) => { const r = m as Record<string, unknown>; return [r.code, r.message].filter(Boolean).join(": "); })
    .filter(Boolean)
    .slice(0, 20);
  // A refused CERTIFICATE request answers with `errors` at the top level instead.
  const top = Array.isArray(body?.errors) ? words(body?.errors) : [];
  return { errors: [...words(v.errorMessages), ...top], warnings: words(v.warningMessages) };
}
