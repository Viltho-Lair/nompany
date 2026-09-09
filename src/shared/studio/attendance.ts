import { defaultLocale, type Locale } from "../locale";

// ATTENDANCE'S OWN WORDS. See the header of ./shell for why each surface keeps
// its own dictionary and why nothing may enumerate them.
//
// A STATUS IS A STORED TOKEN translated on DISPLAY, the rule every status in
// the product follows — so what the API returns is unchanged by the reader's
// language, and a payroll run reading `present` reads it the same either way.

type Strings = {
  tab: string;
  title: string;
  lead: string;
  day: string;
  statusLabel: string;
  hours: string;
  unmarked: string;
  save: string;
  saving: string;
  person: string;
  worked: string;
  absent: string;
  leave: string;
  unrecorded: string;
  status: (token: string) => string;
  month: (period: string) => string;
  savedN: (n: number) => string;
  someRefused: (n: number, detail: string) => string;
};

const EN: Record<string, string> = {
  present: "In", remote: "Remote", absent: "Absent", leave: "On leave", holiday: "Holiday",
};

const en: Strings = {
  tab: "Attendance",
  title: "Who was there",
  lead: "Mark the whole team for a day in one go. Marking the same day again corrects it rather than adding a second row.",
  day: "Day",
  statusLabel: "Status",
  hours: "Hours",
  // NOT "absent". Nothing has been said about this person today, and the two
  // are different facts — one of which docks pay.
  unmarked: "Not marked",
  save: "Save the sheet",
  saving: "Saving…",
  person: "Person",
  worked: "Worked",
  absent: "Absent",
  leave: "Leave",
  unrecorded: "Not marked",
  status: (t) => EN[t] || t,
  month: (period) => `The month so far — ${period}`,
  savedN: (n) => `${n} ${n === 1 ? "person" : "people"} marked.`,
  someRefused: (n, detail) => `${n} not saved${detail ? `: ${detail}` : ""}. The rest were.`,
};

// HAND-WRITTEN. NO DIACRITICS.
const AR: Record<string, string> = {
  present: "حاضر", remote: "عن بعد", absent: "غائب", leave: "في اجازة", holiday: "عطلة",
};

const ar: Strings = {
  tab: "الحضور",
  title: "من كان حاضرا",
  lead: "سجلوا الفريق كله ليوم واحد دفعة واحدة. اعادة تسجيل اليوم نفسه تصحح ولا تضيف سطرا ثانيا.",
  day: "اليوم",
  statusLabel: "الحالة",
  hours: "الساعات",
  unmarked: "لم يسجل",
  save: "حفظ الكشف",
  saving: "جار الحفظ…",
  person: "الموظف",
  worked: "أيام العمل",
  absent: "الغياب",
  leave: "الاجازات",
  unrecorded: "لم يسجل",
  status: (t) => AR[t] || t,
  month: (period) => `الشهر حتى الآن — ${period}`,
  savedN: (n) => `سجل ${n} ${n === 1 ? "موظف" : n === 2 ? "موظفان" : n <= 10 ? "موظفين" : "موظفا"}.`,
  someRefused: (n, detail) => `${n} لم يحفظ${detail ? `: ${detail}` : ""}. وحفظ الباقي.`,
};

const dict = { en, ar };

export function attendanceDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as AttendanceStrings };
