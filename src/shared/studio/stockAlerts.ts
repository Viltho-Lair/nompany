import { defaultLocale, type Locale } from "../locale";

// THE "STOCK TO REORDER" LIST'S WORDS (17/09/2026) — one surface, drawn on the
// Inventory and Point of Sale dashboards. An item's name and unit are data and
// are shown as typed.

type Strings = {
  title: string;
  hint: (percent: number) => string;
  none: string;
  item: string;
  onHand: string;
  reorderAt: string;
  state: Record<"below" | "near", string>;
};

const en: Strings = {
  title: "Stock to reorder",
  hint: (p) => `At or under the reorder level, and within ${p}% above it. You are told the moment an item reaches its level.`,
  none: "Nothing is at or near its reorder level.",
  item: "Item",
  onHand: "On hand",
  reorderAt: "Reorder at",
  state: { below: "At or under", near: "Close" },
};

const ar: Strings = {
  title: "مخزون يحتاج إعادة طلب",
  hint: (p) => `الأصناف عند حد إعادة الطلب أو دونه، وضمن ${p}% فوقه. يصلكم تنبيه لحظة وصول الصنف إلى حده.`,
  none: "لا يوجد صنف عند حد إعادة الطلب أو قريب منه.",
  item: "الصنف",
  onHand: "المتوفر",
  reorderAt: "حد إعادة الطلب",
  state: { below: "عند الحد أو دونه", near: "قريب" },
};

const words: Record<Locale, Strings> = { en, ar };

export function stockAlertsDict(locale: string): Strings {
  return words[locale as Locale] || words[defaultLocale];
}
