import { defaultLocale, type Locale } from "../locale";

// WHAT A STAGE IS CALLED, in the reader's language.
//
// The engagement registry (`platform/engagement/registry.ts`) gives every stage
// a `label` — "Sales ticket", "RFQ", "Material order" — and the API sends it
// down with the record. That label is CODE, not tenant data: nobody typed it,
// the registry defines it, and the goldens pin it. So it can be translated for
// display while the stored `type` and everything the server returns stay
// exactly as they are.
//
// Keyed by the stage TYPE, which travels beside the label in every payload, for
// the same reason ./statuses is keyed by the stored token: the key is stable and
// the words are not. A type this file does not know falls back to the label the
// server sent, so a stage added to the registry before it is added here reads as
// English rather than disappearing.

type StageMap = Record<string, string>;

const ar: StageMap = {
  ticket: "تذكرة مبيعات",
  rfq: "طلب عرض سعر",
  quotation: "عرض سعر",
  project: "مشروع",
  sheet: "كشف مشروع",
  order: "أمر مواد",
  delivery: "تسليم",
  shipment: "شحنة",
  overtime: "عمل إضافي",
  invoice: "فاتورة",
  task: "مهمة",
  expense: "مصروف",
  bill: "فاتورة مورّد",
  asset: "أصل ثابت",
};

const maps: Partial<Record<Locale, StageMap>> = { ar };

/** The stage's name to SHOW. Falls back to whatever the server called it. */
export function stageLabel(type: unknown, fallback: string, locale: string): string {
  const key = type == null ? "" : String(type);
  return maps[locale as Locale]?.[key] || fallback;
}
