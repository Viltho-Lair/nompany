// A CUSTOMER'S TAX REGISTRATION — what a business-to-business invoice must
// name about its buyer: the VAT number, the commercial registration, and the
// registered address in its parts. PURE, and shared with the screens so a form
// offers exactly what the server keeps.
//
// WHY IT EXISTS (04/10/2026, ZATCA slice 2): a Saudi standard (B2B) invoice is
// CLEARED by ZATCA before it is valid, and ZATCA refuses one that does not name
// the buyer's VAT number and national address (BR-KSA-63). An invoice here
// recorded the buyer's NAME alone, so every Saudi file was simplified.
//
// ON THE CLIENT AS `taxRegistration`, ON THE INVOICE AS `buyerTax` — the second
// is a SNAPSHOT, exactly as `clientName` is: an issued invoice must still say
// who it was issued to after the client's record changes. Both are a client's
// details and both are sealed at rest (invariant 18) — the client whole, the
// invoice's copy by name in platform/db/sealCipher.
//
// COUNTRY-NEUTRAL BY DESIGN: the fields are what every VAT system asks of a
// buyer. Whether a value is a VALID Saudi VAT number, a four-digit building
// number and a five-digit postal code is ZATCA's question and is asked there
// (modules/finance/zatcaDocument `zatcaProblem`), not here.

export type TaxAddress = {
  street: string;
  building: string;
  /** Saudi Arabia's four-digit additional number. Optional everywhere. */
  additional: string;
  district: string;
  city: string;
  postal: string;
};

export type TaxRegistration = {
  vatNumber: string;
  /** The commercial registration number. */
  crn: string;
  address: TaxAddress;
};

export const ADDRESS_PARTS = ["street", "building", "additional", "district", "city", "postal"] as const;

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * THE REGISTRATION AS A FORM SENT IT — bounded, trimmed, and NULL when nothing
 * was filled, so "no registration" is one value rather than an object of blanks
 * that every reader has to inspect.
 */
export function cleanTaxRegistration(v: unknown): TaxRegistration | null {
  const r = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const a = (r.address && typeof r.address === "object" ? r.address : {}) as Record<string, unknown>;
  const out: TaxRegistration = {
    // DIGITS AS TYPED, spaces dropped: "3000 0000 0000 003" is a common way to
    // write the number and the same number.
    vatNumber: str(r.vatNumber, 40).replace(/\s+/g, ""),
    crn: str(r.crn, 40).replace(/\s+/g, ""),
    address: {
      street: str(a.street, 120),
      building: str(a.building, 20),
      additional: str(a.additional, 20),
      district: str(a.district, 120),
      city: str(a.city, 80),
      postal: str(a.postal, 20),
    },
  };
  const filled = out.vatNumber || out.crn || ADDRESS_PARTS.some((k) => out.address[k]);
  return filled ? out : null;
}

/** Whether a registration names a VAT-registered business — what makes an invoice B2B. */
export const isBusinessBuyer = (r: TaxRegistration | null | undefined): boolean => Boolean(r?.vatNumber);
