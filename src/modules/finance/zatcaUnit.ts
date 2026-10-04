// A SAUDI STUDIO'S ZATCA UNIT — what ZATCA calls an EGS unit: the key nompany
// signs the studio's invoices with, the certificates ZATCA issued for it, and
// when the studio wants its invoices reported. SERVER-ONLY.
//
// The owner's decision A, 03/10/2026: nompany submits, and the studio chooses
// when — B2C invoices reported as each is issued, or in a daily batch, inside
// ZATCA's 24 hours. Onboarding is the studio's act: somebody generates a
// one-time password on ZATCA's Fatoora portal and types it here, which is
// ZATCA's own proof that the taxpayer asked for this unit.
//
// THE KEY AND BOTH SECRETS ARE SEALED before they are written (invariant 18:
// `encryptField`, a purpose subkey of NOMPANY_DATA_KEY). The certificate tokens
// are not secret — a certificate is public by design — and stay readable so a
// screen can say whose they are without opening anything.
//
// ONBOARDING IS ALL OR NOTHING. ZATCA issues a compliance certificate, checks a
// sample of every document kind the unit declared, and only then issues the
// production one. A unit is written once that last step answers, so a studio
// never holds half a unit that signs with a certificate nothing will accept.

import { randomUUID } from "node:crypto";
import { editJSON, getJSON } from "@/platform/db/store";
import { S } from "@/platform/db/keys";
import { encryptField, decryptField } from "@/platform/auth/fieldCrypto";
import { dayIn, studioTimezone } from "@/shared/timezone";
import { newZatcaKey, zatcaCsr, readZatcaCertificate, type ZatcaEnvironment, ZATCA_ENVIRONMENTS } from "./zatcaCrypto";
import { requestComplianceCsid, checkCompliance, requestProductionCsid, zatcaMessages, ZATCA_OPEN_ENVIRONMENTS } from "./zatcaApi";
import { zatcaDocument, zatcaProblem, ZATCA_FIRST_PIH, type ZatcaDocumentKind, type ZatcaSeller } from "./zatcaDocument";
import { stampZatca } from "./zatcaSign";
import { zatcaInvoiceHash } from "./zatcaXml";

/** When a studio's invoices are reported: as each is issued, or together once a day. */
export const ZATCA_TIMINGS = ["immediate", "daily"] as const;
export type ZatcaTiming = (typeof ZATCA_TIMINGS)[number];

type Certificate = { token: string; secret: string; requestId: string };

export type ZatcaUnitRecord = {
  /** New on every onboarding — the chain restarts with a new unit (./zatca). */
  id: string;
  environment: ZatcaEnvironment;
  commonName: string;
  serialNumber: string;
  /** ZATCA's four positions: standard, simplified, then two reserved. "0100" is simplified only. */
  invoiceTypes: string;
  privateKey: string;
  compliance: Certificate;
  production: Certificate;
  onboardedAt: string;
  onboardedBy: string;
  timing: ZatcaTiming;
};

/** The unit with its key and secrets opened — for signing and reporting, never for a screen. */
export type ZatcaUnit = ZatcaUnitRecord;

/** What a screen may know: no key, no secret. */
export type ZatcaUnitSummary = {
  onboarded: boolean;
  environment: ZatcaEnvironment | null;
  onboardedAt: string;
  timing: ZatcaTiming;
  /** Which environments may be onboarded to today — ./zatcaApi decides. */
  environments: ZatcaEnvironment[];
};

const cleanTiming = (v: unknown): ZatcaTiming => (v === "daily" ? "daily" : "immediate");

export async function readZatcaUnit(studioId: string): Promise<ZatcaUnit | null> {
  const r = await getJSON<ZatcaUnitRecord>(S.zatcaUnit(studioId));
  if (!r?.production?.token) return null;
  return {
    ...r,
    timing: cleanTiming(r.timing),
    privateKey: decryptField(r.privateKey),
    compliance: { ...r.compliance, secret: decryptField(r.compliance.secret) },
    production: { ...r.production, secret: decryptField(r.production.secret) },
  };
}

export async function zatcaUnitSummary(studioId: string): Promise<ZatcaUnitSummary> {
  const r = await getJSON<ZatcaUnitRecord>(S.zatcaUnit(studioId));
  return {
    onboarded: Boolean(r?.production?.token),
    environment: r?.environment || null,
    onboardedAt: r?.onboardedAt || "",
    timing: cleanTiming(r?.timing),
    environments: [...ZATCA_OPEN_ENVIRONMENTS],
  };
}

/** The studio's choice of when to report. Kept with the unit, and kept across a re-onboarding. */
export async function setZatcaTiming(studioId: string, timing: unknown) {
  if (!(ZATCA_TIMINGS as readonly string[]).includes(String(timing))) return { error: "timing" as const };
  return editJSON<ZatcaUnitRecord, { timing: ZatcaTiming } | { error: "not-onboarded" }>(S.zatcaUnit(studioId), (current) => {
    if (!current?.production?.token) return { result: { error: "not-onboarded" as const } };
    return { next: { ...current, timing: timing as ZatcaTiming }, result: { timing: timing as ZatcaTiming } };
  });
}

// ---- onboarding -------------------------------------------------------------------------------

/**
 * THE SAMPLE ZATCA CHECKS, one per document kind a simplified-only unit
 * declares: an invoice, a credit note and a debit note, on a chain of their
 * own — they are onboarding's documents, not the studio's, and taking links
 * from the studio's chain would put three invoices in it nobody issued.
 */
function sampleDocuments(seller: ZatcaSeller, today: string, time: string) {
  const kinds: ZatcaDocumentKind[] = ["invoice", "creditNote", "debitNote"];
  let previousHash = ZATCA_FIRST_PIH;
  return kinds.map((kind, i) => {
    const doc = zatcaDocument({
      invoice: {
        reference: `ONBOARD-${i + 1}`, issueDate: today, currency: "SAR", vatRate: 15,
        lines: [{ description: "Onboarding check", qty: 1, unitPrice: 100, taxCategory: "standard" }],
      },
      seller, buyer: null, uuid: randomUUID(), issueTime: time, counter: i + 1, previousHash, kind,
      ...(kind === "invoice" ? {} : { billingReference: "ONBOARD-1", reason: "Onboarding check" }),
    });
    previousHash = zatcaInvoiceHash(doc);
    return doc;
  });
}

export type OnboardRefusal = { error: string; detail?: string[] };

/**
 * ONBOARD THE STUDIO'S UNIT: a key, a certificate request, the compliance
 * certificate, ZATCA's checks on the three samples, the production certificate
 * — then, and only then, the unit is written.
 */
export async function onboardZatcaUnit(input: {
  studio: { id: string; slug?: unknown; name?: unknown; fieldOfWork?: unknown; timezone?: unknown };
  seller: ZatcaSeller;
  collaboratorId: string;
  otp: unknown;
  environment: unknown;
}): Promise<{ unit: ZatcaUnitSummary } | OnboardRefusal> {
  const environment = String(input.environment || "") as ZatcaEnvironment;
  if (!(ZATCA_ENVIRONMENTS as readonly string[]).includes(environment)) return { error: "environment" };
  if (!ZATCA_OPEN_ENVIRONMENTS.includes(environment)) return { error: "environment-closed" };
  const otp = String(input.otp ?? "").trim();
  if (!/^\d{6}$/.test(otp)) return { error: "otp" };

  const { studio, seller } = input;
  const now = new Date();
  const today = dayIn(now, studioTimezone(studio));
  const time = now.toISOString().slice(11, 19);
  const samples = sampleDocuments(seller, today, time);
  // THE STUDIO'S OWN SETTINGS FIRST: a seller ZATCA will refuse is named here,
  // before an OTP is spent on it.
  const problem = zatcaProblem(samples[0]);
  if (problem) return { error: "einvoice-problem", detail: [problem] };

  const id = randomUUID();
  const key = newZatcaKey();
  const commonName = `nompany-${String(studio.slug || studio.id).slice(0, 40)}`;
  const serialNumber = `1-nompany|2-erp|3-${id}`;
  const invoiceTypes = "0100";
  const csr = zatcaCsr({
    environment, commonName, serialNumber, invoiceTypes,
    vatNumber: seller.vatNumber,
    orgUnit: seller.address.city || "Main",
    orgName: seller.name,
    location: [seller.address.building, seller.address.street, seller.address.city].filter(Boolean).join(" ").slice(0, 120),
    industry: String(studio.fieldOfWork || "Services").slice(0, 60) || "Services",
  }, key.privateKeyPem);

  const issued = await requestComplianceCsid(environment, otp, csr);
  const cBody = issued.body || {};
  if (issued.status !== 200 || !cBody.binarySecurityToken) {
    return { error: issued.status ? "zatca-refused" : "zatca-unreachable", detail: zatcaMessages(issued.body).errors };
  }
  const compliance = { token: String(cBody.binarySecurityToken), secret: String(cBody.secret || ""), requestId: String(cBody.requestID || "") };
  const certificate = readZatcaCertificate(compliance.token);

  for (const doc of samples) {
    const stamp = stampZatca(doc, { privateKeyPem: key.privateKeyPem, certificate, signingTime: new Date().toISOString().slice(0, 19) });
    const checked = await checkCompliance(environment, compliance, { hash: stamp.hash, uuid: doc.uuid, xml: stamp.xml });
    const words = zatcaMessages(checked.body);
    if (checked.status !== 200 || checked.body?.reportingStatus !== "REPORTED") {
      return { error: checked.status ? "zatca-check-failed" : "zatca-unreachable", detail: words.errors };
    }
  }

  const prod = await requestProductionCsid(environment, compliance, compliance.requestId);
  const pBody = prod.body || {};
  if (prod.status !== 200 || !pBody.binarySecurityToken) {
    return { error: prod.status ? "zatca-refused" : "zatca-unreachable", detail: zatcaMessages(prod.body).errors };
  }
  const production = { token: String(pBody.binarySecurityToken), secret: String(pBody.secret || ""), requestId: String(pBody.requestID || "") };

  await editJSON<ZatcaUnitRecord, null>(S.zatcaUnit(studio.id), (current) => ({
    next: {
      id, environment, commonName, serialNumber, invoiceTypes,
      privateKey: encryptField(key.privateKeyPem),
      compliance: { ...compliance, secret: encryptField(compliance.secret) },
      production: { ...production, secret: encryptField(production.secret) },
      onboardedAt: new Date().toISOString(),
      onboardedBy: input.collaboratorId,
      // A RE-ONBOARDED STUDIO KEEPS ITS CHOICE of when to report.
      timing: cleanTiming(current?.timing),
    },
    result: null,
  }));
  return { unit: await zatcaUnitSummary(studio.id) };
}
