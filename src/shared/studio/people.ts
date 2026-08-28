import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// PEOPLE AND ACCESS — the member list, join requests and the role editor.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  aRole: string;
  access: string;
  accessFor: string;
  action: string;
  admin: string;
  allowed: string;
  alsoAllow: string;
  approve: string;
  approvingCreatesProfileInside: string;
  canOnlyPutThings: string;
  canSuffix: string;
  cancel: string;
  check: string;
  checkWhatSomeoneCan: string;
  checking: string;
  copied: string;
  copyCode: string;
  couldnCheck: string;
  couldnComplete: string;
  couldnLoadRoles: string;
  couldnRemovePerson: string;
  couldnSaveChange: string;
  decline: string;
  denied: string;
  department: string;
  description: string;
  didnSave: string;
  edit: string;
  editAccess: string;
  everyRoleAlreadyAccess: string;
  everyone: string;
  everyoneAccessStudio: string;
  everythingJobMayAreas: string;
  invitePeople: string;
  joinedSuffix: string;
  joinedSuffix2: string;
  ladderEdit: string;
  ladderFull: string;
  ladderNone: string;
  ladderView: string;
  loadingPeople: string;
  loadingRoles: string;
  makeAdmin: string;
  member: string;
  nameStudio: string;
  namesRolesHereApply: string;
  noAccessYet: string;
  noOneWaiting: string;
  noRole: string;
  noRoleNoAccess: string;
  noRolesYet: string;
  nothingMatchesRolesNamed: string;
  nothingYet: string;
  ownRecords: string;
  owner: string;
  ownerCanRemoved: string;
  peopleStudio: string;
  person: string;
  pickRole: string;
  raisesWorksTickets: string;
  remove: string;
  rename: string;
  requestAlreadyHandled: string;
  requestsJoin: string;
  role: string;
  save: string;
  saveAccess: string;
  saving: string;
  searchRoles: string;
  shareCompanyCodeThey: string;
  someone: string;
  someone2: string;
  studiosStartAdminManager: string;
  thisRole: string;
  unnamed: string;
  unnamedMember: string;
  unnamedMember2: string;
  what: string;
  who: string;
  working: string;
  you: string;
};

const en: Strings = {
  ...commonEn,
  aRole: "a role",
  access: "Access",
  accessFor: "Access for",
  action: "Action",
  admin: "Admin",
  allowed: "Allowed.",
  alsoAllow: "Also allow:",
  approve: "Approve",
  approvingCreatesProfileInside: "Approving creates their profile inside this studio.",
  canOnlyPutThings: "You can only put things in a role that you can do yourself.",
  canSuffix: "can",
  cancel: "Cancel",
  check: "Check",
  checkWhatSomeoneCan: "Check what someone can do",
  checking: "Checking…",
  copied: "Copied",
  copyCode: "Copy code",
  couldnCheck: "Couldn't check that.",
  couldnComplete: "We couldn't complete that.",
  couldnLoadRoles: "Couldn't load roles.",
  couldnRemovePerson: "We couldn't remove that person.",
  couldnSaveChange: "We couldn't save that change.",
  decline: "Decline",
  denied: "Denied.",
  department: "Their department",
  description: "Description",
  didnSave: "That didn't save.",
  edit: "Edit",
  editAccess: "Edit access",
  everyRoleAlreadyAccess: "Every role already has its access set. New roles are named in Human Resources.",
  everyone: "Everyone",
  everyoneAccessStudio: "Everyone with access to this studio.",
  everythingJobMayAreas: "Everything this job may do. Areas are collapsed — open the ones you need.",
  invitePeople: "Invite people",
  joinedSuffix: " · joined",
  joinedSuffix2: " · joined ",
  ladderEdit: "Edit",
  ladderFull: "Full",
  ladderNone: "None",
  ladderView: "View",
  loadingPeople: "Loading people…",
  loadingRoles: "Loading roles…",
  makeAdmin: "Make admin",
  member: "Member",
  nameStudio: "Name in this studio",
  namesRolesHereApply: "Names and roles here apply only inside this studio.",
  noAccessYet: "No access yet",
  noOneWaiting: "No one is waiting.",
  noRole: "No role",
  noRoleNoAccess: "No role — no access",
  noRolesYet: "No roles yet",
  nothingMatchesRolesNamed: "Nothing matches. Roles are named in Human Resources.",
  nothingYet: "Nothing yet.",
  ownRecords: "Own records",
  owner: "Owner",
  ownerCanRemoved: "The owner can't be removed.",
  peopleStudio: "People in this studio",
  person: "Person",
  pickRole: "Pick a role…",
  raisesWorksTickets: "Raises and works tickets.",
  remove: "Remove",
  rename: "Rename",
  requestAlreadyHandled: "That request was already handled.",
  requestsJoin: "Requests to join",
  role: "Role",
  save: "Save",
  saveAccess: "Save access",
  saving: "Saving…",
  searchRoles: "Search roles",
  shareCompanyCodeThey: "Share your company code. They enter it on their account page and you approve the request — no links or tokens to pass around.",
  someone: "Someone",
  someone2: "Someone",
  studiosStartAdminManager: "Studios start with Admin, Manager, Team Lead, Member and Viewer. If yours has none, name one in Human Resources → Roles.",
  thisRole: "This role",
  unnamed: "Unnamed",
  unnamedMember: "Unnamed member",
  unnamedMember2: "Unnamed member",
  what: "Do what…",
  who: "Who…",
  working: "Working…",
  you: "(you)",
};

const ar: Strings = {
  ...commonAr,
  aRole: "دور",
  access: "الصلاحيات",
  accessFor: "صلاحيات",
  action: "الإجراء",
  admin: "مسؤول",
  allowed: "مسموح.",
  alsoAllow: "واسمح أيضًا بـ:",
  approve: "اعتماد",
  approvingCreatesProfileInside: "الموافقة تُنشئ ملفه داخل هذا الاستوديو.",
  canOnlyPutThings: "لا يمكنك وضع صلاحيات في دور إلا إن كنت تملكها بنفسك.",
  canSuffix: "يستطيع",
  cancel: "إلغاء",
  check: "تحقّق",
  checkWhatSomeoneCan: "تحقّق مما يستطيع شخص ما فعله",
  checking: "جارٍ التحقق…",
  copied: "تم النسخ",
  copyCode: "نسخ الرمز",
  couldnCheck: "تعذّر التحقق من ذلك.",
  couldnComplete: "تعذّر إتمام ذلك.",
  couldnLoadRoles: "تعذّر تحميل الأدوار.",
  couldnRemovePerson: "تعذّرت إزالة ذلك الشخص.",
  couldnSaveChange: "تعذّر حفظ ذلك التغيير.",
  decline: "رفض",
  denied: "مرفوض.",
  department: "قسمه",
  description: "الوصف",
  didnSave: "لم يُحفظ ذلك.",
  edit: "تعديل",
  editAccess: "تعديل الصلاحيات",
  everyRoleAlreadyAccess: "كل دور لديه صلاحياته المضبوطة بالفعل. وتُسمّى الأدوار الجديدة في الموارد البشرية.",
  everyone: "الجميع",
  everyoneAccessStudio: "كل من لديه صلاحية الوصول إلى هذا الاستوديو.",
  everythingJobMayAreas: "كل ما يُسمح لهذه الوظيفة بفعله. المجالات مطوية — افتح ما تحتاجه منها.",
  invitePeople: "دعوة أشخاص",
  joinedSuffix: " · انضم",
  joinedSuffix2: " · انضم في ",
  ladderEdit: "تعديل",
  ladderFull: "كامل",
  ladderNone: "لا شيء",
  ladderView: "عرض",
  loadingPeople: "جارٍ تحميل الأشخاص…",
  loadingRoles: "جارٍ تحميل الأدوار…",
  makeAdmin: "تعيينه مسؤولًا",
  member: "عضو",
  nameStudio: "الاسم في هذا الاستوديو",
  namesRolesHereApply: "تسري الأسماء والأدوار هنا داخل هذا الاستوديو فقط.",
  noAccessYet: "لا توجد صلاحيات بعد",
  noOneWaiting: "لا أحد في الانتظار.",
  noRole: "بلا دور",
  noRoleNoAccess: "بلا دور — بلا صلاحيات",
  noRolesYet: "لا توجد أدوار بعد",
  nothingMatchesRolesNamed: "لا شيء يطابق. تُسمّى الأدوار في الموارد البشرية.",
  nothingYet: "لا شيء بعد.",
  ownRecords: "سجلاته الخاصة",
  owner: "المالك",
  ownerCanRemoved: "لا يمكن إزالة المالك.",
  peopleStudio: "الأشخاص في هذا الاستوديو",
  person: "الشخص",
  pickRole: "اختر دورًا…",
  raisesWorksTickets: "يرفع التذاكر ويعمل عليها.",
  remove: "إزالة",
  rename: "إعادة تسمية",
  requestAlreadyHandled: "سبق التعامل مع هذا الطلب.",
  requestsJoin: "طلبات الانضمام",
  role: "الدور",
  save: "حفظ",
  saveAccess: "حفظ الصلاحيات",
  saving: "جارٍ الحفظ…",
  searchRoles: "ابحث في الأدوار",
  shareCompanyCodeThey: "شارك رمز شركتك. يُدخله الشخص في صفحة حسابه وتوافق أنت على الطلب — بلا روابط أو رموز تُتداول.",
  someone: "أحدهم",
  someone2: "أحدهم",
  studiosStartAdminManager: "تبدأ الاستوديوهات بأدوار: مسؤول، مدير، قائد فريق، عضو ومشاهد. إن لم يكن لديك أي منها، فسمِّ دورًا في الموارد البشرية ← الأدوار.",
  thisRole: "هذا الدور",
  unnamed: "بلا اسم",
  unnamedMember: "عضو بلا اسم",
  unnamedMember2: "عضو بلا اسم",
  what: "يفعل ماذا…",
  who: "من…",
  working: "جارٍ العمل…",
  you: "(أنت)",
};

const people = { en, ar };

export function peopleDict(locale: string): Strings {
  return people[locale as Locale] || people[defaultLocale];
}
