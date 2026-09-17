// AN EMPLOYEE'S IDENTITY DOCUMENT — what kind it is, in both languages.
//
// The owner's instruction, 17/09/2026: HR no longer keeps ID or passport
// NUMBERS. It keeps which document a person holds, when it expires (required
// once a type is chosen, because the expiry is what HR acts on) and, if
// somebody uploads one, a picture of it.
//
// Stored as a TOKEN and translated on display, like every other status, so the
// stored value does not change with the reader's language. Pure and client-safe:
// the screen offers exactly the list the server accepts.

export const IDENTITY_DOCUMENT_TYPES = [
  "nationalId", "residencePermit", "passport", "drivingLicence", "workPermit", "other",
] as const;
export type IdentityDocumentType = (typeof IDENTITY_DOCUMENT_TYPES)[number];

export const isIdentityDocumentType = (v: unknown): v is IdentityDocumentType =>
  (IDENTITY_DOCUMENT_TYPES as readonly unknown[]).includes(v);

const LABELS: Record<"en" | "ar", Record<IdentityDocumentType, string>> = {
  en: {
    nationalId: "National ID",
    residencePermit: "Residence permit",
    passport: "Passport",
    drivingLicence: "Driving licence",
    workPermit: "Work permit",
    other: "Other document",
  },
  ar: {
    nationalId: "الهوية الوطنية",
    residencePermit: "الإقامة",
    passport: "جواز السفر",
    drivingLicence: "رخصة القيادة",
    workPermit: "تصريح العمل",
    other: "وثيقة أخرى",
  },
};

// Mid-sentence in English ("Sara's passport expires"), where a capital reads
// as a mistake. ID keeps its capitals.
const IN_SENTENCE_EN: Record<IdentityDocumentType, string> = {
  nationalId: "national ID",
  residencePermit: "residence permit",
  passport: "passport",
  drivingLicence: "driving licence",
  workPermit: "work permit",
  other: "document",
};

/** The label a person reads. An unknown token is shown as stored rather than hidden. */
export function identityDocumentLabel(type: unknown, lang: string, { inSentence = false } = {}): string {
  if (!isIdentityDocumentType(type)) return String(type ?? "");
  if (lang === "ar") return LABELS.ar[type];
  return inSentence ? IN_SENTENCE_EN[type] : LABELS.en[type];
}

// WHERE AN UPLOADED IMAGE MAY POINT: the app's own media route and nothing
// else, so a stored value can never make the screen fetch from somewhere else.
export const MEDIA_PATH = /^\/api\/media\/[a-f0-9]{32}$/;
