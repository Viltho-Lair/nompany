// JORDAN'S ADAPTER — what actually reaches ISTD's JoFotara.
//
// THE DIVISION OF LABOUR. `./jofotaraDocument` decides WHAT is sent and is
// pure; `./ublXml` turns that into the standard's own XML and knows no country;
// this file does the one thing that reaches outside the process. Everything
// testable is in the first two, which is why this one is short.
//
// THE CREDENTIALS ARE THE STUDIO'S, NEVER THE PLATFORM'S — and that is the
// whole shape of the integration rather than a detail. A taxpayer registers
// with ISTD, creates an application in the JoFotara portal's API Settings, and
// is issued a Client-Id, a Secret-Key and an Activity code. nompany is
// software; it is not a taxpayer on anybody's behalf and cannot register for
// them. So one studio's credentials are entered by that studio, stored sealed
// on its own settings, and never reach another's document.
//
// SOURCED FROM ISTD'S OWN TECHNICAL GUIDE — *الدليل التقني للربط مع نظام
// الفوترة الوطني*, 107 pages, istd.gov.jo, read 22/09/2026. The endpoint and
// headers below were first taken from a third-party tutorial and the guide
// confirmed them; the DOCUMENT it also corrected in eight ways, each listed in
// ./ublXml. A tutorial was enough to get the shape and not enough to get it
// right, which is why the source of each fact is written down.
//
// NOTHING HERE HAS BEEN RUN AGAINST AN ENDPOINT, sandbox or otherwise. A studio
// must enter its own credentials before anything is submitted at all, and that
// gate is what keeps an unproven adapter out of somebody's books.

import { jofotaraDocument, jofotaraProblem, isJoTypeCode, type JoInvoiceType, type JoTypeCode } from "./jofotaraDocument";
import { ublInvoiceXml } from "./ublXml";
import type { EInvoiceAdapter } from "./einvoice";
import { official } from "@/shared/compliance/resolve";
import { decryptField } from "@/platform/auth/fieldCrypto";

/** Where a submission goes. The sandbox is a different host the studio is given. */
export const JOFOTARA_ENDPOINT = "https://backend.jofotara.gov.jo/core/invoices/";

/** What a studio stores so its invoices can be submitted. The secret is sealed at rest. */
export type JofotaraCredentials = {
  clientId: string;
  /** Sealed with a purpose subkey of NOMPANY_DATA_KEY — never stored in the clear. */
  secretKey: string;
  /** Jordan's invoice code, the `name` on cbc:InvoiceTypeCode. One of JO_TYPE_CODES. */
  typeCode: JoTypeCode;
  /** The income source sequence the portal issued this taxpayer. */
  incomeSource: string;
  /** How the studio's own prices are quoted — what decides the tax treatment. */
  activity: JoInvoiceType;
  /** Set while testing, so a sandbox submission cannot reach production by accident. */
  endpoint?: string;
};

/**
 * THE STUDIO'S OWN CREDENTIALS, or null. Read from Finance's settings, where
 * the studio entered them; the secret is unsealed here and nowhere else.
 */
export function jofotaraCredentials(settings: unknown): JofotaraCredentials | null {
  const c = ((settings || {}) as { jofotara?: Record<string, unknown> }).jofotara;
  if (!c) return null;
  const clientId = String(c.clientId || "").trim();
  const sealed = String(c.secretKey || "");
  if (!clientId || !sealed) return null;
  return {
    clientId,
    secretKey: decryptField(sealed),
    // NO DEFAULT THAT COULD BE WRONG ON THE WIRE: an unrecognised code would
    // be refused by ISTD with a message the studio cannot act on, so the
    // commonest registration is used and the settings screen makes them choose.
    typeCode: isJoTypeCode(c.typeCode) ? c.typeCode : "011",
    incomeSource: String(c.incomeSource || "").trim(),
    activity: (["income", "general-sales", "special-sales"].includes(String(c.activity))
      ? c.activity : "general-sales") as JoInvoiceType,
    endpoint: String(c.endpoint || "").trim() || undefined,
  };
}

/**
 * THE ADAPTER. Composes the document, refuses what it can refuse locally,
 * serialises, base64s and posts.
 *
 * WHAT IS REFUSED BEFORE THE NETWORK: a studio with no credentials, and the
 * four things `jofotaraProblem` names. ISTD answers a bad document with a code
 * the studio cannot act on; these are things they can fix in their own
 * settings, and telling them so costs nothing and saves a round trip.
 *
 * A REJECTION IS NOT A FAILURE. `rejected` is the authority saying no to this
 * document — the studio must change something. `failed` is the transport: a
 * timeout, a 500, a DNS error, and the right answer to it is to try again. The
 * queue draws them differently for that reason.
 */
export const jofotaraAdapter: EInvoiceAdapter = {
  key: "jofotara",
  async submit({ invoice, studio }) {
    const settings = (studio as { einvoiceSettings?: unknown }).einvoiceSettings;
    const creds = jofotaraCredentials(settings);
    if (!creds) return { status: "rejected", message: "no-credentials" };

    const doc = jofotaraDocument({
      invoice: invoice as Parameters<typeof jofotaraDocument>[0]["invoice"],
      supplier: {
        name: String((studio as { name?: unknown }).name || ""),
        // THE STUDIO'S OWN TIN, from the country's official values — the one
        // place a Jordanian studio has already been asked for it.
        taxNumber: official(studio as Parameters<typeof official>[0], "tax_number"),
        countryCode: "JO",
      },
      invoiceType: creds.activity,
      uuid: String((invoice as { id?: unknown }).id || ""),
    });

    const problem = jofotaraProblem(doc);
    if (problem) return { status: "rejected", message: problem };
    // ISTD'S GUIDE CARRIES THIS ON EVERY EXAMPLE. Sending a blank would be
    // refused by the authority; refusing here names the setting to fix.
    if (!creds.incomeSource) return { status: "rejected", message: "no-income-source" };

    // THE SELLER'S OWN REGISTRATION travels beside the document: Jordan's
    // invoice code and the income source sequence are facts about the taxpayer,
    // not about the invoice, and neither can be derived from one.
    const xml = ublInvoiceXml(doc, { typeCode: creds.typeCode, incomeSource: creds.incomeSource });
    const res = await fetch(creds.endpoint || JOFOTARA_ENDPOINT, {
      method: "POST",
      headers: {
        "Client-Id": creds.clientId,
        "Secret-Key": creds.secretKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invoice: Buffer.from(xml, "utf8").toString("base64") }),
    });

    // THE BODY IS READ AS TEXT FIRST. An authority under load answers with an
    // HTML error page often enough that `res.json()` throwing would turn a
    // readable refusal into "Unexpected token <", which tells a studio nothing.
    const text = await res.text();
    let body: Record<string, unknown> = {};
    try { body = JSON.parse(text) as Record<string, unknown>; } catch { /* left as {} */ }

    if (!res.ok) {
      return {
        status: res.status >= 500 ? "failed" : "rejected",
        message: String(body.message || body.error || text || res.status).slice(0, 300),
      };
    }

    // THE AUTHORITY'S OWN FIELD NAMES, kept verbatim rather than renamed on the
    // way in: EINV_INV_UUID is the identifier it will quote back, EINV_QR is
    // what the printed invoice must carry, EINV_NUM is the national approval
    // number. Mapping them to prettier names would cost the ability to compare
    // what we hold with what the portal shows.
    return {
      status: "accepted",
      uuid: String(body.EINV_INV_UUID || body.EINV_NUM || ""),
      qr: String(body.EINV_QR || ""),
      message: String(body.EINV_NUM || ""),
    };
  },
};
