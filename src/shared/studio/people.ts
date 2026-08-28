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
  approvingCreatesProfileInside: string;
  cancel: string;
  checkWhatSomeoneCan: string;
  couldnLoadRoles: string;
  couldnSaveChange: string;
  decline: string;
  description: string;
  edit: string;
  editAccess: string;
  everythingJobMayAreas: string;
  invitePeople: string;
  loadingPeople: string;
  loadingRoles: string;
  member: string;
  nameStudio: string;
  noAccessYet: string;
  noOneWaiting: string;
  noRoleNoAccess: string;
  noRolesYet: string;
  nothingMatchesRolesNamed: string;
  nothingYet: string;
  peopleStudio: string;
  person: string;
  raisesWorksTickets: string;
  remove: string;
  requestsJoin: string;
  role: string;
  save: string;
  searchRoles: string;
  shareCompanyCodeThey: string;
  studiosStartAdminManager: string;
  what: string;
  who: string;
};

const en: Strings = {
  ...commonEn,
  access: "Access",
  action: "Action",
  admin: "Admin",
  approvingCreatesProfileInside: "Approving creates their profile inside this studio.",
  cancel: "Cancel",
  checkWhatSomeoneCan: "Check what someone can do",
  couldnLoadRoles: "Couldn't load roles.",
  couldnSaveChange: "We couldn't save that change.",
  decline: "Decline",
  description: "Description",
  edit: "Edit",
  editAccess: "Edit access",
  everythingJobMayAreas: "Everything this job may do. Areas are collapsed — open the ones you need.",
  invitePeople: "Invite people",
  loadingPeople: "Loading people…",
  loadingRoles: "Loading roles…",
  member: "Member",
  nameStudio: "Name in this studio",
  noAccessYet: "No access yet",
  noOneWaiting: "No one is waiting.",
  noRoleNoAccess: "No role — no access",
  noRolesYet: "No roles yet",
  nothingMatchesRolesNamed: "Nothing matches. Roles are named in Human Resources.",
  nothingYet: "Nothing yet.",
  peopleStudio: "People in this studio",
  person: "Person",
  raisesWorksTickets: "Raises and works tickets.",
  remove: "Remove",
  requestsJoin: "Requests to join",
  role: "Role",
  save: "Save",
  searchRoles: "Search roles",
  shareCompanyCodeThey: "Share your company code. They enter it on their account page and you approve the request — no links or tokens to pass around.",
  studiosStartAdminManager: "Studios start with Admin, Manager, Team Lead, Member and Viewer. If yours has none, name one in Human Resources → Roles.",
  what: "Do what…",
  who: "Who…",
};

const ar: Strings = {
  ...commonAr,
  access: "الصلاحيات",
  action: "الإجراء",
  admin: "مسؤول",
  approvingCreatesProfileInside: "الموافقة تُنشئ ملفه داخل هذا الاستوديو.",
  cancel: "إلغاء",
  checkWhatSomeoneCan: "تحقّق مما يستطيع شخص ما فعله",
  couldnLoadRoles: "تعذّر تحميل الأدوار.",
  couldnSaveChange: "تعذّر حفظ ذلك التغيير.",
  decline: "رفض",
  description: "الوصف",
  edit: "تعديل",
  editAccess: "تعديل الصلاحيات",
  everythingJobMayAreas: "كل ما يُسمح لهذه الوظيفة بفعله. المجالات مطوية — افتح ما تحتاجه منها.",
  invitePeople: "دعوة أشخاص",
  loadingPeople: "جارٍ تحميل الأشخاص…",
  loadingRoles: "جارٍ تحميل الأدوار…",
  member: "عضو",
  nameStudio: "الاسم في هذا الاستوديو",
  noAccessYet: "لا توجد صلاحيات بعد",
  noOneWaiting: "لا أحد في الانتظار.",
  noRoleNoAccess: "بلا دور — بلا صلاحيات",
  noRolesYet: "لا توجد أدوار بعد",
  nothingMatchesRolesNamed: "لا شيء يطابق. تُسمّى الأدوار في الموارد البشرية.",
  nothingYet: "لا شيء بعد.",
  peopleStudio: "الأشخاص في هذا الاستوديو",
  person: "الشخص",
  raisesWorksTickets: "يرفع التذاكر ويعمل عليها.",
  remove: "إزالة",
  requestsJoin: "طلبات الانضمام",
  role: "الدور",
  save: "حفظ",
  searchRoles: "ابحث في الأدوار",
  shareCompanyCodeThey: "شارك رمز شركتك. يُدخله الشخص في صفحة حسابه وتوافق أنت على الطلب — بلا روابط أو رموز تُتداول.",
  studiosStartAdminManager: "تبدأ الاستوديوهات بأدوار: مسؤول، مدير، قائد فريق، عضو ومشاهد. إن لم يكن لديك أي منها، فسمِّ دورًا في الموارد البشرية ← الأدوار.",
  what: "يفعل ماذا…",
  who: "من…",
};

const people = { en, ar };

export function peopleDict(locale: string): Strings {
  return people[locale as Locale] || people[defaultLocale];
}
