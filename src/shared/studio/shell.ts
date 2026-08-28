import { defaultLocale, type Locale } from "../locale";

// THE STUDIO'S DICTIONARIES, ONE FILE PER SURFACE — AND THAT IS THE POINT.
//
// `shared/i18n.ts` holds the public site's copy in a single object because the
// public site is server-rendered: the dictionary is resolved in a layout and
// handed down as a prop, so it never enters a client bundle no matter how large
// it grows.
//
// The studio cannot do that. Its chrome and its screens are client components,
// and threading a dictionary prop through twenty department screens is how you
// end up with one object every screen imports and every chunk carries. So the
// studio's copy is split the way the studio's CODE is split: this file is the
// shell's, `settings.ts` is Studio Settings', and each department gets its own
// as it is translated. StudioSettings is already `nextDynamic()`, so its words
// land in its own chunk and an English tenant that never opens Settings never
// downloads either language of it.
//
// The rule that keeps that true: NOTHING ENUMERATES THESE FILES. No barrel, no
// registry, no `import * as dicts`. A bundler drops the branch it can prove is
// unreachable; the moment something loops over every surface's dictionary, all
// of them are reachable from every screen and the split silently stops paying.
//
// WHAT IS NOT HERE, deliberately: section names, role names, and every other
// word a tenant has typed. Those are DATA — stored once, in whichever language
// they were written — and a dictionary that tried to translate them would be
// guessing at a company's own vocabulary. The sidebar reads section names
// straight off the studio record and always will.

type ShellStrings = {
  language: string;
  theme: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  skipToContent: string;
  departments: string;
  openMenu: string;
  closeMenu: string;
  expand: string;
  collapse: string;
  documentation: string;
  studioSettings: string;
  engagements: string;
  people: string;
  peopleAndRequests: string;
  access: string;
  packageLabel: string;
  tierLabel: string;
  member: string;
  you: string;
  signedIn: string;
  myAccount: string;
  goToAccount: string;
  signOut: string;
  adminsOnly: string;
  // The bell lives in the header, so its words are the shell's.
  notifications: string;
  notificationsUnread: (n: number) => string;
  markAllRead: string;
  offlineTitle: string;
  offlineBanner: string;
  nothingYet: string;
  loading: string;
  // The four screens that stand in for a department when there is nothing to
  // show. They are the shell's, not any module's: which one you get is decided
  // by membership and access, before a department is ever chosen.
  deniedAccessBody: string;
  noSectionAccess: string;
  noSectionAccessBody: string;
  nothingGranted: string;
  nothingGrantedBody: string;
  openAccess: string;
  notAMember: string;
  // Split around the slug rather than interpolated, because the slug is rendered
  // in mono type — it is an address, and it has to look like one.
  notAMemberBefore: string;
  notAMemberAfter: string;
  backToAccount: string;
};

const en: ShellStrings = {
  language: "Language",
  theme: "Theme",
  themeLight: "Light",
  themeDark: "Dark",
  themeSystem: "Device",
  skipToContent: "Skip to content",
  departments: "Departments",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  // Prefixed onto a section's own name — "Expand Sales" — so they are verbs on
  // their own rather than sentences with a hole in them.
  expand: "Expand",
  collapse: "Collapse",
  documentation: "Documentation",
  studioSettings: "Studio settings",
  engagements: "Engagements",
  people: "People",
  peopleAndRequests: "People & requests",
  access: "Access",
  packageLabel: "Package",
  tierLabel: "Tier",
  member: "Member",
  you: "You",
  signedIn: "Signed in",
  myAccount: "My account",
  goToAccount: "Go to account",
  signOut: "Sign out",
  adminsOnly: "Admins only",
  notifications: "Notifications",
  notificationsUnread: (n) => `Notifications, ${n} unread`,
  markAllRead: "Mark all read",
  offlineTitle: "Not receiving live updates — reconnecting",
  offlineBanner: "Not receiving live updates. Reconnecting…",
  nothingYet: "Nothing yet.",
  loading: "Loading…",
  deniedAccessBody: "You need to be an admin of this studio to manage access.",
  noSectionAccess: "You don't have access to that section",
  noSectionAccessBody: "Ask an admin of this studio to grant it to you.",
  nothingGranted: "Nothing has been shared with you yet",
  nothingGrantedBody:
    "You're a member of this studio, but no sections have been granted to you. An admin can do that from Access.",
  openAccess: "Open Access",
  notAMember: "You're not in this studio",
  notAMemberBefore: "Ask an admin of ",
  notAMemberAfter: " to approve your request, then try again.",
  backToAccount: "Back to your account",
};

const ar: ShellStrings = {
  language: "اللغة",
  theme: "المظهر",
  themeLight: "فاتح",
  themeDark: "داكن",
  themeSystem: "الجهاز",
  skipToContent: "تخطٍ إلى المحتوى",
  departments: "الأقسام",
  openMenu: "فتح القائمة",
  closeMenu: "إغلاق القائمة",
  expand: "توسيع",
  collapse: "طي",
  documentation: "دليل الاستخدام",
  studioSettings: "إعدادات الاستوديو",
  // THE DOMAIN WORD, NOT THE DICTIONARY ONE. An "engagement" here is the whole
  // spine of one piece of business — ticket, RFQ, quotation, project — which is
  // what an Arabic-reading salesperson calls a صفقة. The literal "ارتباطات"
  // means an obligation or a commitment and would send them looking for
  // something else entirely.
  engagements: "الصفقات",
  people: "الأشخاص",
  peopleAndRequests: "الأشخاص والطلبات",
  // "الوصول" is the literal word and the wrong one: this screen grants rights,
  // so it is صلاحيات — the word every Arabic admin console uses for them.
  access: "الصلاحيات",
  packageLabel: "الباقة",
  tierLabel: "المستوى",
  member: "عضو",
  you: "أنت",
  signedIn: "تم تسجيل الدخول",
  myAccount: "حسابي",
  goToAccount: "الذهاب إلى الحساب",
  signOut: "تسجيل الخروج",
  adminsOnly: "للمسؤولين فقط",
  notifications: "الإشعارات",
  notificationsUnread: (n) => {
    // Same four-way count Arabic needs everywhere else; see the note in
    // ./settings on why a template with a hole in it cannot be right here.
    const what =
      n === 1 ? "إشعار واحد غير مقروء"
      : n === 2 ? "إشعاران غير مقروءين"
      : n <= 10 ? `${n} إشعارات غير مقروءة`
      : `${n} إشعارًا غير مقروء`;
    return `الإشعارات، ${what}`;
  },
  markAllRead: "تعليم الكل كمقروء",
  offlineTitle: "لا تصل التحديثات المباشرة — جارٍ إعادة الاتصال",
  offlineBanner: "لا تصل التحديثات المباشرة. جارٍ إعادة الاتصال…",
  nothingYet: "لا شيء بعد.",
  loading: "جارٍ التحميل…",
  deniedAccessBody: "يلزم أن تكون مسؤولًا في هذا الاستوديو لإدارة الصلاحيات.",
  noSectionAccess: "لا تملك صلاحية الوصول إلى ذلك القسم",
  noSectionAccessBody: "اطلب من مسؤول في هذا الاستوديو منحك إياها.",
  nothingGranted: "لم تتم مشاركة أي شيء معك بعد",
  nothingGrantedBody:
    "أنت عضو في هذا الاستوديو، لكن لم يُمنح لك أي قسم. يمكن لمسؤول فعل ذلك من شاشة الصلاحيات.",
  openAccess: "فتح الصلاحيات",
  notAMember: "أنت لست في هذا الاستوديو",
  notAMemberBefore: "اطلب من مسؤول ",
  notAMemberAfter: " الموافقة على طلبك، ثم حاول مرة أخرى.",
  backToAccount: "العودة إلى حسابك",
};

const shell = { en, ar };

export function shellDict(locale: string): ShellStrings {
  return shell[locale as Locale] || shell[defaultLocale];
}
