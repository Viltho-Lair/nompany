import { defaultLocale, type Locale } from "../locale";

// OFFICIAL STUDIO VALUES' OWN WORDS. See the header of ./shell for why each
// surface keeps its own dictionary and why nothing may enumerate them.
//
// THE FIELD LABELS ARE NOT HERE. Each country's file carries its own fields'
// labels and hints in both languages (shared/compliance/countries), because a
// field exists only for the countries that define it — a dictionary entry here
// for "Commercial registration (Unified National Number)" would be a Saudi rule
// written into shared words.

type Strings = {
  heading: string;
  lead: (country: string) => string;
  leadNoCountry: string;
  noCountry: string;
  noDefinition: (country: string) => string;
  researched: (date: string) => string;
  department: (key: string) => string;
  required: (level: string) => string;
  notApplicableVat: string;
  notApplicableSection: (section: string) => string;
  keptInvalid: string;
  problem: (code: string) => string;
  save: string;
  saving: string;
  saved: string;
  nothingChanged: string;
  failed: string;
  readOnly: string;
  history: string;
  noHistory: string;
  changedBy: (who: string) => string;
  country: string;
  cleared: string;
  set: string;
  ownerChoosesCountry: string;
};

const EN_DEPARTMENTS: Record<string, string> = {
  company: "Company and legal", finance: "Finance and tax", hr: "People and payroll",
  sales: "Sales and invoicing", logistics: "Logistics and fleet",
};
const EN_REQUIRED: Record<string, string> = {
  mandatory: "Required", conditional: "If it applies", optional: "Optional",
};
const EN_PROBLEMS: Record<string, string> = {
  format: "That does not match the format shown.",
  checksum: "The check digits do not add up — a digit is probably mistyped.",
  "too-long": "That is longer than this field allows.",
  "unknown-field": "This field belongs to another country. Reload the page.",
};

const en: Strings = {
  heading: "Official values",
  lead: (country) => `The tax, registration and address details ${country} requires of a company. They appear on official documents only once filled in, and only where they apply.`,
  leadNoCountry: "The tax, registration and address details your country requires of a company.",
  noCountry: "Choose the Studio's country above to see which official values it needs.",
  noDefinition: (country) => `No official values are defined for ${country} yet. Nothing prints until they are.`,
  researched: (date) => `Requirements researched ${date}.`,
  department: (k) => EN_DEPARTMENTS[k] || k,
  required: (l) => EN_REQUIRED[l] || l,
  notApplicableVat: "Does not apply until a VAT rate is set — it will not print before then.",
  notApplicableSection: (s) => `Does not apply while ${s} is switched off — it will not print.`,
  keptInvalid: "Kept from before the country changed, and does not match this country's format. It will not print until it is corrected.",
  problem: (code) => EN_PROBLEMS[code] || "That value was refused.",
  save: "Save",
  saving: "Saving…",
  saved: "Saved.",
  nothingChanged: "Nothing had changed.",
  failed: "Not saved. Fix the fields marked below — nothing was stored.",
  readOnly: "You can see these values but not change them.",
  history: "Change history",
  noHistory: "No changes yet.",
  changedBy: (who) => (who ? `by ${who}` : ""),
  country: "Country",
  cleared: "cleared",
  set: "set",
  ownerChoosesCountry: "Only the Studio's owner can change its country.",
};

// HAND-WRITTEN. NO DIACRITICS.
const AR_DEPARTMENTS: Record<string, string> = {
  company: "الشركة والشؤون القانونية", finance: "المالية والضرائب", hr: "الموظفون والرواتب",
  sales: "المبيعات والفوترة", logistics: "الخدمات اللوجستية والأسطول",
};
const AR_REQUIRED: Record<string, string> = {
  mandatory: "مطلوب", conditional: "عند الانطباق", optional: "اختياري",
};
const AR_PROBLEMS: Record<string, string> = {
  format: "لا يطابق الشكل المبين.",
  checksum: "أرقام التحقق غير صحيحة — غالبا هناك رقم مكتوب خطأ.",
  "too-long": "أطول مما يسمح به هذا الحقل.",
  "unknown-field": "هذا الحقل يخص دولة أخرى. أعيدوا تحميل الصفحة.",
};

const ar: Strings = {
  heading: "البيانات الرسمية",
  lead: (country) => `بيانات الضرائب والتسجيل والعنوان التي تطلبها ${country} من الشركات. تظهر في المستندات الرسمية فقط بعد تعبئتها، وحيث تنطبق.`,
  leadNoCountry: "بيانات الضرائب والتسجيل والعنوان التي تطلبها دولتكم من الشركات.",
  noCountry: "اختاروا دولة المنشأة أعلاه لتظهر البيانات الرسمية المطلوبة.",
  noDefinition: (country) => `لم تحدد بيانات رسمية لـ${country} بعد. لن يطبع شيء قبل تحديدها.`,
  researched: (date) => `بحثت المتطلبات في ${date}.`,
  department: (k) => AR_DEPARTMENTS[k] || k,
  required: (l) => AR_REQUIRED[l] || l,
  notApplicableVat: "لا ينطبق قبل تحديد نسبة ضريبة القيمة المضافة — ولن يطبع قبل ذلك.",
  notApplicableSection: (s) => `لا ينطبق ما دام قسم ${s} متوقفا — ولن يطبع.`,
  keptInvalid: "محفوظ من قبل تغيير الدولة ولا يطابق شكل هذه الدولة. لن يطبع حتى يصحح.",
  problem: (code) => AR_PROBLEMS[code] || "رفضت هذه القيمة.",
  save: "حفظ",
  saving: "جار الحفظ…",
  saved: "حفظ.",
  nothingChanged: "لم يتغير شيء.",
  failed: "لم يحفظ. صححوا الحقول المشار اليها — لم يخزن شيء.",
  readOnly: "يمكنكم الاطلاع على هذه البيانات دون تعديلها.",
  history: "سجل التغييرات",
  noHistory: "لا تغييرات بعد.",
  changedBy: (who) => (who ? `بواسطة ${who}` : ""),
  country: "الدولة",
  cleared: "حذف",
  set: "تعيين",
  ownerChoosesCountry: "مالك المنشأة وحده يستطيع تغيير دولتها.",
};

const dict = { en, ar };

export function officialValuesDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as OfficialValuesStrings };
