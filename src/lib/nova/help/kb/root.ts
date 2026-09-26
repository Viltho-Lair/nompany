import type { HelpModule } from "../types";

// THE TOP OF THE TREE — the five doors a person is offered before they have
// typed anything. Every other module hangs its topics under one of these ids,
// and `tests/help-model.mjs` refuses a topic whose parent does not exist, so a
// branch cannot be written that nobody can click down to.
export const root: HelpModule = {
  topics: [
    { id: "root", parent: null, order: 0,
      label: { en: "What can I help with?", ar: "كيف يمكنني المساعدة؟" } },
    { id: "start", parent: "root", order: 1,
      label: { en: "Getting started", ar: "البداية" },
      blurb: { en: "What nompany is, finding your way around, first steps", ar: "ما هو nompany، والتنقل فيه، والخطوات الأولى" } },
    { id: "departments", parent: "root", order: 2,
      label: { en: "Departments", ar: "الأقسام" },
      blurb: { en: "What each section does and how to use it", ar: "ما يفعله كل قسم وكيف تستخدمه" } },
    { id: "admin", parent: "root", order: 3, sectionKey: "administration",
      label: { en: "Studio settings & access", ar: "إعدادات الاستوديو والصلاحيات" },
      blurb: { en: "People, roles, master data, currency, time zone, approvals", ar: "الأشخاص والأدوار والبيانات الأساسية والعملة والمنطقة الزمنية والموافقات" } },
    { id: "account", parent: "root", order: 4,
      label: { en: "Your account & plan", ar: "حسابك وباقتك" },
      blurb: { en: "Profile, sign-in security, packages and payments", ar: "الملف الشخصي وأمان الدخول والباقات والمدفوعات" } },
    { id: "trouble", parent: "root", order: 5,
      label: { en: "Something isn't working", ar: "شيء لا يعمل" },
      blurb: { en: "A screen is missing, a button is greyed out, an action is refused", ar: "شاشة مفقودة، أو زر معطّل، أو إجراء مرفوض" } },
  ],
  entries: [],
};
