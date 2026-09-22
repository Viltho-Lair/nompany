// A STUDIO'S OWN E-INVOICING CREDENTIALS — cleaning them, sealing them, and
// saying what a screen may see of them.
//
// WHY THEY LIVE ON THE STUDIO AND NOT IN FINANCE'S SETTINGS. They are facts
// about the COMPANY'S REGISTRATION with its tax authority, in the same family
// as the country and its official values (the TIN this very adapter reads), and
// they are entered once when a company is set up rather than while running the
// books. `docs/functionality/einvoicing.md` is the file.
//
// THE SECRET IS SEALED AT REST AND NEVER LEAVES THE SERVER. `encryptField`
// takes a purpose subkey of `NOMPANY_DATA_KEY` (invariant 18), and the read
// below returns whether a secret is SET — never the secret, never a prefix of
// it. A credential a screen can display is a credential in a browser's memory,
// in a screenshot and in a support ticket.
//
// AND A BLANK DOES NOT ERASE ONE. A settings form that posts every field would
// otherwise wipe the secret every time somebody changed the client id, because
// the form never had the secret to send back.

import { encryptField } from "@/platform/auth/fieldCrypto";
import { isJoTypeCode, JO_TYPE_CODES, type JoTypeCode } from "./jofotaraDocument";

const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

/** What is stored. `secretKey` is ciphertext; nothing here is ever a plain secret. */
export type StoredEInvoiceSettings = {
  clientId?: string;
  /** Sealed. Absent until somebody enters one. */
  secretKey?: string;
  incomeSource?: string;
  typeCode?: JoTypeCode;
  /** A sandbox host, while testing. Empty means the authority's own. */
  endpoint?: string;
};

/** What a SCREEN is told. The secret is a yes or a no. */
export type EInvoiceSettingsView = {
  clientId: string;
  hasSecret: boolean;
  incomeSource: string;
  typeCode: string;
  endpoint: string;
  /** The codes a studio may choose from, so the screen offers no invented one. */
  typeCodes: readonly string[];
};

export function einvoiceSettingsView(stored: unknown): EInvoiceSettingsView {
  const s = (stored || {}) as StoredEInvoiceSettings;
  return {
    clientId: str(s.clientId),
    // WHETHER, NOT WHAT.
    hasSecret: Boolean(str(s.secretKey, 10_000)),
    incomeSource: str(s.incomeSource),
    typeCode: isJoTypeCode(s.typeCode) ? s.typeCode : "",
    endpoint: str(s.endpoint, 300),
    typeCodes: JO_TYPE_CODES,
  };
}

/**
 * WHY THESE SETTINGS CANNOT BE SAVED AS ASKED, or "". Refused on WRITE with the
 * field named, the shape numbering and the approval chains already use: a
 * studio hears about its own edit while it is still their edit.
 */
export function einvoiceSettingsProblem(body: Record<string, unknown>): string {
  if (body.typeCode !== undefined && str(body.typeCode) && !isJoTypeCode(body.typeCode)) return "type-code";
  const endpoint = str(body.endpoint, 300);
  // A SANDBOX HOST IS A URL OR NOTHING. A half-typed one would send every
  // invoice to a host that does not exist and read as the authority being down.
  if (endpoint && !/^https:\/\/[^\s]+$/.test(endpoint)) return "endpoint";
  return "";
}

/**
 * THE SETTINGS AS THEY WILL BE STORED, merged over what is there.
 *
 * A FIELD THAT IS NOT SENT IS NOT CHANGED, and an EMPTY SECRET IS NOT A
 * DELETION — the form cannot send back a secret it was never shown, so a blank
 * means "leave it". Clearing one is its own act (`clearSecret`), because
 * silently erasing a credential and silently keeping one are both wrong and
 * only one of them is recoverable.
 */
export function cleanEInvoiceSettings(
  current: unknown,
  body: Record<string, unknown>,
): StoredEInvoiceSettings {
  const now = { ...((current || {}) as StoredEInvoiceSettings) };
  if (body.clientId !== undefined) now.clientId = str(body.clientId);
  if (body.incomeSource !== undefined) now.incomeSource = str(body.incomeSource, 60);
  if (body.typeCode !== undefined) {
    const code = str(body.typeCode);
    if (isJoTypeCode(code)) now.typeCode = code;
    else delete now.typeCode;
  }
  if (body.endpoint !== undefined) now.endpoint = str(body.endpoint, 300);

  if (body.clearSecret === true) delete now.secretKey;
  else if (str(body.secretKey, 10_000)) now.secretKey = encryptField(str(body.secretKey, 10_000));

  return now;
}
