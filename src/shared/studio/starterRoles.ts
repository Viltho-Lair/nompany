import { defaultLocale, type Locale } from "../locale";

// THE STARTER ROLE, IN THE STUDIO'S LANGUAGE.
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
//
// THERE IS ONE ENTRY NOW, AND THE FALLTHROUGH IS DOING MORE WORK THAN IT WAS.
// Manager, Team Lead, Member and Viewer left when departments began seeding
// their own roles, and their eight strings left with them rather than sitting
// here keyed to names nothing seeds. The roles a department brings are job
// titles out of the role library — "Site Engineer", "Estimator" — and those are
// deliberately NOT translated: a role is a title the studio owns and renames,
// and the library is English-only until somebody decides otherwise. They fall
// through, which is the behaviour this map was already built to give them.
const ar: Record<string, string> = {
  Admin: "مدير النظام",
  "Everything, including capabilities added in future releases.":
    "كل شيء، بما في ذلك القدرات التي تضاف في الإصدارات المقبلة.",
};

const words: Record<Locale, Record<string, string>> = { en: {}, ar };

/** The studio's words for one starter-role string. */
export function starterRoleWord(locale: string, english: string): string {
  const map = words[locale as Locale] ?? words[defaultLocale];
  return map[english] ?? english;
}
