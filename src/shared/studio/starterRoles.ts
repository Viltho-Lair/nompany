import { defaultLocale, type Locale } from "../locale";

// THE FIVE STARTER ROLES, IN THE STUDIO'S LANGUAGE.
//
// A role is a job title the studio owns and renames — the People screen says so
// out loud — so its name and description are STORED data. Translating them on
// display would overwrite a rename, which is why they take the studio's
// language once, when the roles are seeded on first read.
//
// Keyed by the English string because `STARTER_ROLES` is a flat literal list in
// `modules/people/roles` with no separate label ids, and a miss falls through to
// the English it was given: a role added there shows untranslated rather than
// blank.
const ar: Record<string, string> = {
  Admin: "مدير النظام",
  "Everything, including capabilities added in future releases.":
    "كل شيء، بما في ذلك القدرات التي تُضاف في الإصدارات المقبلة.",
  Manager: "مدير",
  "Runs a department: full control of its work, sight of the rest.":
    "يدير قسمًا: تحكم كامل في عمله، واطلاع على البقية.",
  "Team Lead": "قائد فريق",
  "Does the work and assigns it, without settings or deletion.":
    "ينفّذ العمل ويسنده، بلا إعدادات ولا حذف.",
  Member: "عضو",
  "Does the work: raises and edits records, deletes nothing.":
    "ينفّذ العمل: يرفع السجلات ويعدّلها، ولا يحذف شيئًا.",
  Viewer: "مطّلع",
  "Reads, changes nothing.": "يقرأ، ولا يغيّر شيئًا.",
};

const words: Record<Locale, Record<string, string>> = { en: {}, ar };

/** The studio's words for one starter-role string. */
export function starterRoleWord(locale: string, english: string): string {
  const map = words[locale as Locale] ?? words[defaultLocale];
  return map[english] ?? english;
}
