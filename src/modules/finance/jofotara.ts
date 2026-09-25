// JORDAN'S ADAPTER — the invoice as the file JoFotara takes, prepared and
// nothing else.
//
// THE STUDIO SUBMITS IT, NOT NOMPANY — the owner's rule, 26/09/2026 (see
// ./einvoice). This file called JoFotara's API with the studio's Client-Id and
// Secret-Key from 22/09/2026 until that day; the call, the credentials and the
// settings panel that collected them were removed together. What is left is
// the document: the studio downloads it, submits it through JoFotara itself,
// and records JoFotara's answer — including the QR, which JoFotara issues and
// nobody else can build.
//
// THE DIVISION OF LABOUR. `./jofotaraDocument` decides WHAT the document says
// and is pure; `./ublXml` writes ISTD's XML; this file joins them to the
// studio's own registration.
//
// SOURCED FROM ISTD'S OWN TECHNICAL GUIDE — *الدليل التقني للربط مع نظام
// الفوترة الوطني*, 107 pages, istd.gov.jo, read 22/09/2026. It corrected a
// third-party tutorial in eight ways, each listed in ./ublXml.

import { jofotaraDocument, jofotaraProblem, isJoTypeCode } from "./jofotaraDocument";
import { ublInvoiceXml } from "./ublXml";
import type { EInvoiceAdapter } from "./einvoice";
import { official } from "@/shared/compliance/resolve";

type StudioLike = Parameters<typeof official>[0] & { name?: unknown };

/**
 * THE ADAPTER. Composes the document, refuses what the studio must fix first,
 * and writes the XML.
 *
 * THE SELLER'S OWN REGISTRATION comes from the official values JO.json asks
 * for — the tax number, the income source sequence and the invoice code. They
 * are facts about the taxpayer rather than about any invoice, and they were a
 * credentials panel's fields until 26/09/2026; they are official values now,
 * because they are printed INSIDE the document, not used to reach anybody.
 */
export const jofotaraAdapter: EInvoiceAdapter = {
  key: "jofotara",
  async prepare({ invoice, studio }) {
    const s = studio as StudioLike;
    const doc = jofotaraDocument({
      invoice: invoice as Parameters<typeof jofotaraDocument>[0]["invoice"],
      supplier: {
        name: String(s.name || ""),
        taxNumber: official(s, "tax_number"),
        countryCode: "JO",
      },
      uuid: String((invoice as { id?: unknown }).id || ""),
    });

    const problem = jofotaraProblem(doc);
    if (problem) return { problem };
    // BOTH ARE IN EVERY EXAMPLE IN ISTD'S GUIDE; a file without them would be
    // refused at JoFotara, so it is refused here with the setting named.
    const incomeSource = official(s, "jofotara_income_source");
    if (!incomeSource) return { problem: "income-source" };
    const typeCode = official(s, "jofotara_invoice_type");
    if (!isJoTypeCode(typeCode)) return { problem: "invoice-code" };

    return {
      xml: ublInvoiceXml(doc, { typeCode, incomeSource }),
      filename: `${doc.id || "invoice"}-jofotara.xml`,
    };
  },
};
