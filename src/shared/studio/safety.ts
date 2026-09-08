import { defaultLocale, type Locale } from "../locale";

// SAFETY PERFORMANCE'S OWN WORDS. See the header of ./shell for why each
// surface's dictionary is a separate module and why nothing may enumerate them.
//
// THE ABBREVIATIONS ARE NOT TRANSLATED. LTIFR and TRIFR are the terms an
// auditor, an insurer and a client prequalification form all use, in both
// languages — an Arabic studio filling in a tender's HSE annexe is looking for
// those five letters. The EXPLANATION beside them is translated; the term is
// the term.

type Strings = {
  heading: string;
  ltifr: string;
  trifr: string;
  daysLost: string;
  incidents: string;
  reason: Record<"no-hours-access" | "no-hours" | "no-incidents-yet", string>;
};

const en: Strings = {
  heading: "Safety performance",
  ltifr: "LTIFR",
  trifr: "TRIFR",
  daysLost: "Days lost",
  incidents: "Incidents",
  reason: {
    // Each names the thing to DO about it. "No data" would be true and useless.
    "no-hours-access": "Rates need hours worked, which come from timesheets — ask for access to Projects to see them.",
    "no-hours": "No hours have been booked in this period, so a rate cannot be worked out.",
    "no-incidents-yet": "No incidents recorded in this period.",
  },
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  heading: "أداء السلامة",
  ltifr: "LTIFR",
  trifr: "TRIFR",
  daysLost: "أيام ضائعة",
  incidents: "الحوادث",
  reason: {
    "no-hours-access": "المعدلات تحتاج ساعات العمل، ومصدرها كشوف الدوام — اطلب صلاحية المشاريع لعرضها.",
    "no-hours": "لم تسجل أي ساعات عمل في هذه الفترة، فلا يمكن احتساب معدل.",
    "no-incidents-yet": "لا حوادث مسجلة في هذه الفترة.",
  },
};

const dict = { en, ar };

export function safetyDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as SafetyStrings };
