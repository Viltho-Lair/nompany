import { defaultLocale, type Locale } from "../locale";

// THE NOTIFICATION-WORDING SCREEN'S OWN WORDS. See the header of ./shell for
// why each surface keeps its own dictionary and why nothing may enumerate them.
//
// THE NOTIFICATION NAMES ARE NOT HERE. They come from the shipped template
// itself, which the register already carries in both languages — restating
// them would be a second copy free to disagree with the one the bell renders.

type Strings = {
  tab: string;
  lead: string;
  shippedWording: string;
  yourWording: string;
  title: string;
  body: string;
  placeholders: string;
  noPlaceholders: string;
  edited: string;
  reset: string;
  english: string;
  arabic: string;
  save: string;
  saving: string;
  saved: string;
};

const en: Strings = {
  tab: "Notifications",
  // WHAT THE PLACEHOLDERS ARE, said before somebody deletes one. A template
  // that drops {who} is not refused — it is simply a notice that no longer
  // names anybody.
  lead: "What each notification says, in both languages. The words in braces are filled in when the notice is sent — leave one out and that fact is not shown. Anything you do not change here follows the product, so a later improvement still reaches you.",
  shippedWording: "Comes with the product",
  yourWording: "Your wording",
  title: "Title",
  body: "Body",
  placeholders: "Fills in:",
  noPlaceholders: "No fields to fill in.",
  edited: "edited",
  reset: "Use the product's wording",
  english: "English",
  arabic: "Arabic",
  save: "Save wording",
  saving: "Saving…",
  saved: "Saved",
};

// HAND-WRITTEN. NO DIACRITICS.
const ar: Strings = {
  tab: "الإشعارات",
  lead: "ما يقوله كل إشعار، باللغتين. الكلمات بين الأقواس تُملأ عند الإرسال — واذا حذفتم واحدة لا تظهر تلك المعلومة. وما لا تغيرونه هنا يتبع النظام، فيصلكم أي تحسين لاحق.",
  shippedWording: "يأتي مع النظام",
  yourWording: "صياغتكم",
  title: "العنوان",
  body: "النص",
  placeholders: "يُملأ بـ:",
  noPlaceholders: "لا توجد حقول تُملأ.",
  edited: "معدّل",
  reset: "استخدام صياغة النظام",
  english: "الإنجليزية",
  arabic: "العربية",
  save: "حفظ الصياغة",
  saving: "جار الحفظ…",
  saved: "حُفظ",
};

const dict = { en, ar };

export const noticesDict = (locale: Locale = defaultLocale): Strings =>
  dict[locale] || dict[defaultLocale];
