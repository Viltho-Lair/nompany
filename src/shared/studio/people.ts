import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// PEOPLE AND ACCESS — the member list, join requests and the role editor.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  access: string;
  action: string;
  admin: string;
  allowed: string;
  approvingCreatesProfileInside: string;
  canOnlyPutThings: string;
  cancel: string;
  checkWhatSomeoneCan: string;
  checking: string;
  copied: string;
  couldnComplete: string;
  couldnLoadRoles: string;
  couldnSaveChange: string;
  decline: string;
  department: string;
  description: string;
  didnSave: string;
  edit: string;
  editAccess: string;
  everyRoleAlreadyAccess: string;
  everythingJobMayAreas: string;
  invitePeople: string;
  loadingPeople: string;
  loadingRoles: string;
  member: string;
  nameStudio: string;
  namesRolesHereApply: string;
  noAccessYet: string;
  noOneWaiting: string;
  noRoleNoAccess: string;
  noRolesYet: string;
  nothingMatchesRolesNamed: string;
  nothingYet: string;
  ownRecords: string;
  owner: string;
  ownerCanRemoved: string;
  peopleStudio: string;
  person: string;
  raisesWorksTickets: string;
  remove: string;
  requestAlreadyHandled: string;
  requestsJoin: string;
  role: string;
  save: string;
  saving: string;
  searchRoles: string;
  shareCompanyCodeThey: string;
  studiosStartAdminManager: string;
  what: string;
  who: string;
  working: string;
};

const en: Strings = {
  ...commonEn,
  access: "Access",
  action: "Action",
  admin: "Admin",
  allowed: "Allowed.",
  approvingCreatesProfileInside: "Approving creates their profile inside this studio.",
  canOnlyPutThings: "You can only put things in a role that you can do yourself.",
  cancel: "Cancel",
  checkWhatSomeoneCan: "Check what someone can do",
  checking: "Checking…",
  copied: "Copied",
  couldnComplete: "We couldn't complete that.",
  couldnLoadRoles: "Couldn't load roles.",
  couldnSaveChange: "We couldn't save that change.",
  decline: "Decline",
  department: "Their department",
  description: "Description",
  didnSave: "That didn't save.",
  edit: "Edit",
  editAccess: "Edit access",
  everyRoleAlreadyAccess: "Every role already has its access set. New roles are named in Human Resources.",
  everythingJobMayAreas: "Everything this job may do. Areas are collapsed — open the ones you need.",
  invitePeople: "Invite people",
  loadingPeople: "Loading people…",
  loadingRoles: "Loading roles…",
  member: "Member",
  nameStudio: "Name in this studio",
  namesRolesHereApply: "Names and roles here apply only inside this studio.",
  noAccessYet: "No access yet",
  noOneWaiting: "No one is waiting.",
  noRoleNoAccess: "No role — no access",
  noRolesYet: "No roles yet",
  nothingMatchesRolesNamed: "Nothing matches. Roles are named in Human Resources.",
  nothingYet: "Nothing yet.",
  ownRecords: "Own records",
  owner: "Owner",
  ownerCanRemoved: "The owner can't be removed.",
  peopleStudio: "People in this studio",
  person: "Person",
  raisesWorksTickets: "Raises and works tickets.",
  remove: "Remove",
  requestAlreadyHandled: "That request was already handled.",
  requestsJoin: "Requests to join",
  role: "Role",
  save: "Save",
  saving: "Saving…",
  searchRoles: "Search roles",
  shareCompanyCodeThey: "Share your company code. They enter it on their account page and you approve the request — no links or tokens to pass around.",
  studiosStartAdminManager: "Studios start with Admin, Manager, Team Lead, Member and Viewer. If yours has none, name one in Human Resources → Roles.",
  what: "Do what…",
  who: "Who…",
  working: "Working…",
};

const ar: Strings = {
  ...commonAr,
  access: "الصلاحيات",
  action: "الإجراء",
  admin: "مسؤول",
  allowed: "مسموح.",
  approvingCreatesProfileInside: "الموافقة تُنشئ ملفه داخل هذا الاستوديو.",
  canOnlyPutThings: "لا يمكنك وضع صلاحيات في دور إلا إن كنت تملكها بنفسك.",
  cancel: "إلغاء",
  checkWhatSomeoneCan: "تحقّق مما يستطيع شخص ما فعله",
  checking: "جارٍ التحقق…",
  copied: "تم النسخ",
  couldnComplete: "تعذّر إتمام ذلك.",
  couldnLoadRoles: "تعذّر تحميل الأدوار.",
  couldnSaveChange: "تعذّر حفظ ذلك التغيير.",
  decline: "رفض",
  department: "قسمه",
  description: "الوصف",
  didnSave: "لم يُحفظ ذلك.",
  edit: "تعديل",
  editAccess: "تعديل الصلاحيات",
  everyRoleAlreadyAccess: "كل دور لديه صلاحياته المضبوطة بالفعل. وتُسمّى الأدوار الجديدة في الموارد البشرية.",
  everythingJobMayAreas: "كل ما يُسمح لهذه الوظيفة بفعله. المجالات مطوية — افتح ما تحتاجه منها.",
  invitePeople: "دعوة أشخاص",
  loadingPeople: "جارٍ تحميل الأشخاص…",
  loadingRoles: "جارٍ تحميل الأدوار…",
  member: "عضو",
  nameStudio: "الاسم في هذا الاستوديو",
  namesRolesHereApply: "تسري الأسماء والأدوار هنا داخل هذا الاستوديو فقط.",
  noAccessYet: "لا توجد صلاحيات بعد",
  noOneWaiting: "لا أحد في الانتظار.",
  noRoleNoAccess: "بلا دور — بلا صلاحيات",
  noRolesYet: "لا توجد أدوار بعد",
  nothingMatchesRolesNamed: "لا شيء يطابق. تُسمّى الأدوار في الموارد البشرية.",
  nothingYet: "لا شيء بعد.",
  ownRecords: "سجلاته الخاصة",
  owner: "المالك",
  ownerCanRemoved: "لا يمكن إزالة المالك.",
  peopleStudio: "الأشخاص في هذا الاستوديو",
  person: "الشخص",
  raisesWorksTickets: "يرفع التذاكر ويعمل عليها.",
  remove: "إزالة",
  requestAlreadyHandled: "سبق التعامل مع هذا الطلب.",
  requestsJoin: "طلبات الانضمام",
  role: "الدور",
  save: "حفظ",
  saving: "جارٍ الحفظ…",
  searchRoles: "ابحث في الأدوار",
  shareCompanyCodeThey: "شارك رمز شركتك. يُدخله الشخص في صفحة حسابه وتوافق أنت على الطلب — بلا روابط أو رموز تُتداول.",
  studiosStartAdminManager: "تبدأ الاستوديوهات بأدوار: مسؤول، مدير، قائد فريق، عضو ومشاهد. إن لم يكن لديك أي منها، فسمِّ دورًا في الموارد البشرية ← الأدوار.",
  what: "يفعل ماذا…",
  who: "من…",
  working: "جارٍ العمل…",
};

const people = { en, ar };

export function peopleDict(locale: string): Strings {
  return people[locale as Locale] || people[defaultLocale];
}
