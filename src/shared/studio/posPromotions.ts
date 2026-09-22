import { defaultLocale, type Locale } from "../locale";

// THE PROMOTIONS SCREEN'S WORDS (Point of Sale → Promotions, 22/09/2026). Its
// own module, for the reason ./shell's header gives: one dictionary per surface.
//
// WHAT A STUDIO TYPED IS NOT HERE. An offer's name and its description are the
// studio's own words and print as typed — on this screen, on the till and on the
// receipt. Only what the PRODUCT says is translated.

type Strings = {
  loading: string;
  refused: string;
  title: string;
  lead: string;
  empty: string;
  emptyLead: string;
  status: (s: string) => string;
  refusal: (code: string, extra?: Record<string, unknown>) => string;
};

const en: Strings = {
  loading: "Loading offers…",
  refused: "You do not have the right to see the offers.",
  title: "Promotions",
  lead: "What takes money off a sale at the till, and when. An offer prices a basket only while it is active and inside its dates.",
  empty: "No offer yet",
  emptyLead: "An offer here is applied by the till itself, or chosen by a cashier — nothing is taken off a sale until one is active.",
  status: (s) => (s === "active" ? "Active"
    : s === "paused" ? "Paused"
      : s === "ended" ? "Ended"
        : s === "archived" ? "Archived" : "Draft"),
  refusal: (code) => {
    switch (code) {
      case "forbidden": return "You do not have the right to do that.";
      case "notfound": return "That offer no longer exists.";
      default: return "That did not work. Try again.";
    }
  },
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  loading: "جار تحميل العروض…",
  refused: "لا تملك صلاحية الاطلاع على العروض.",
  title: "العروض",
  lead: "ما يخصم من البيع عند الصندوق ومتى. لا يسعر العرض سلة إلا وهو مفعل وضمن تواريخه.",
  empty: "لا يوجد عرض بعد",
  emptyLead: "العرض هنا يطبقه الصندوق نفسه أو يختاره الكاشير، ولا يخصم شيء من بيع حتى يفعل عرض.",
  status: (s) => (s === "active" ? "مفعل"
    : s === "paused" ? "موقوف مؤقتا"
      : s === "ended" ? "منته"
        : s === "archived" ? "مؤرشف" : "مسودة"),
  refusal: (code) => {
    switch (code) {
      case "forbidden": return "لا تملك صلاحية القيام بذلك.";
      case "notfound": return "هذا العرض لم يعد موجودا.";
      default: return "لم تنجح العملية. حاول مرة أخرى.";
    }
  },
};

const dict = { en, ar };

export function posPromotionsDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}
