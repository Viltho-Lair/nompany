import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// HR — employees, employment, certifications and leave.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  docsExpiringDays: (days: number) => string;
  idPassportWithin: (days: number) => string;
  roleHeldBy: (n: number) => string;
  accessHumanResourcesStudio: string;
  addCertification: string;
  addRole: string;
  adminComesStudioCan: string;
  approve: string;
  approvedNotYetStarted: string;
  bookYourselfSomebodyManage: string;
  can: string;
  canOnlyGiveSomebody: string;
  cancel: string;
  certificationsHeld: string;
  dashboardIsnYoursSee: string;
  dateJoining: string;
  days: string;
  decline: string;
  defineQualificationsPeopleHold: string;
  delete: string;
  deleteGood: string;
  department: string;
  departments: string;
  description: string;
  didnSave: string;
  eGEmp014: string;
  edit: string;
  employeeCode: string;
  employmentDetailsApplyInside: string;
  endDateBeforeStart: string;
  endDateCanBefore: string;
  expiringDocuments: string;
  file: string;
  from: string;
  goesWhoeverManagesHr: string;
  headcountDepartment: string;
  idExpiry: string;
  idNumber: string;
  identityDocuments: string;
  issuer: string;
  keep: string;
  leaveNow: string;
  leavePending: string;
  leaveStatus: string;
  leaveType: string;
  loadingHumanResources: string;
  mobile: string;
  name: string;
  nameAlreadyUse: string;
  namingJobHrWhat: string;
  newCertification: string;
  newRole: string;
  noAccessGrantedYet: string;
  noCertificationsYet: string;
  noDocumentsFile: string;
  noLeaveBooked: string;
  noLeaveBookedYet: string;
  noOneHereMatches: string;
  noRolesDefinedYet: string;
  nobodyBookedAway: string;
  nobodyHereYet: string;
  nobodyMatches: string;
  nobodyPlacedDepartmentYet: string;
  notPlacedYet: string;
  notes: string;
  nothingExpiringAllClear: string;
  open: string;
  ownLeaveRequestsAppear: string;
  passport: string;
  passportExpiry: string;
  passportNumber: string;
  people: string;
  peopleArriveJoiningStudio: string;
  peopleHold: string;
  peopleLose: string;
  person: string;
  personHolds: string;
  personHolds2: string;
  personLoses: string;
  puttingSomebodyRoleAccess: string;
  reason: string;
  rename: string;
  requestLeave: string;
  requestsKindLeave: string;
  requestsPeopleArriveHere: string;
  role: string;
  roleIsAccessChange: string;
  rolesShownHereBut: string;
  save: string;
  saving: string;
  searchNameCodeDepartment: string;
  sectionIsnPartStudio: string;
  sending: string;
  status: string;
  studioKeepsModuleDashboards: string;
  studioSectionsWhereThey: string;
  submit: string;
  to: string;
  type: string;
  unassigned: string;
  upcomingLeave: string;
  validMonths: string;
  viewOnly: string;
  viewOnlyAccessHuman: string;
  whatPersonWhatLets: string;
  wherePeopleSit: string;
  whereRequestsStand: string;
};

const en: Strings = {
  ...commonEn,
  docsExpiringDays: (days) => `Docs expiring · ${days}d`,
  idPassportWithin: (days) => `ID and passport within ${days} days, or lapsed`,
  roleHeldBy: (n) => `${n} ${n === 1 ? "person holds" : "people hold"} that role, so deleting it would take their access away — that's set on the access screen.`,
  accessHumanResourcesStudio: "You don't have access to Human Resources in this studio.",
  addCertification: "Add certification",
  addRole: "Add role",
  adminComesStudioCan: "Admin comes with the studio — it can't be renamed or deleted.",
  approve: "Approve",
  approvedNotYetStarted: "Approved and not yet started",
  bookYourselfSomebodyManage: "Book it for yourself, or for somebody you manage.",
  can: "You can't do that.",
  canOnlyGiveSomebody: "You can only give somebody a role whose permissions you hold yourself.",
  cancel: "Cancel",
  certificationsHeld: "Certifications held",
  dashboardIsnYoursSee: "The dashboard isn't yours to see",
  dateJoining: "Date of joining",
  days: "Days",
  decline: "Decline",
  defineQualificationsPeopleHold: "Define the qualifications your people hold, then tick them off on each person.",
  delete: "Delete",
  deleteGood: "Delete for good",
  department: "Department",
  departments: "Departments",
  description: "Description",
  didnSave: "That didn't save.",
  eGEmp014: "e.g. EMP-014",
  edit: "Edit",
  employeeCode: "Employee code",
  employmentDetailsApplyInside: "Employment details apply inside this studio only.",
  endDateBeforeStart: "The end date is before the start date.",
  endDateCanBefore: "The end date can't be before the start date.",
  expiringDocuments: "Expiring documents",
  file: "on file",
  from: "From",
  goesWhoeverManagesHr: "It goes to whoever manages HR for approval.",
  headcountDepartment: "Headcount by department",
  idExpiry: "ID expiry",
  idNumber: "ID number",
  identityDocuments: "Identity documents",
  issuer: "Issuer",
  keep: "Keep",
  leaveNow: "On leave now",
  leavePending: "Leave pending",
  leaveStatus: "Leave by status",
  leaveType: "Leave by type",
  loadingHumanResources: "Loading Human Resources…",
  mobile: "Mobile",
  name: "Name",
  nameAlreadyUse: "That name is already in use.",
  namingJobHrWhat: "Naming the job is HR's. What it may do is set on the access screen.",
  newCertification: "New certification",
  newRole: "New role",
  noAccessGrantedYet: "No access granted yet",
  noCertificationsYet: "No certifications yet",
  noDocumentsFile: "No documents on file",
  noLeaveBooked: "No leave booked",
  noLeaveBookedYet: "No leave booked yet.",
  noOneHereMatches: "No one here matches that search.",
  noRolesDefinedYet: "No roles defined yet.",
  nobodyBookedAway: "Nobody is booked to be away.",
  nobodyHereYet: "Nobody here yet",
  nobodyMatches: "Nobody matches",
  nobodyPlacedDepartmentYet: "Nobody placed in a department yet.",
  notPlacedYet: "Not placed yet",
  notes: "Notes",
  nothingExpiringAllClear: "Nothing expiring — all clear.",
  open: "open it",
  ownLeaveRequestsAppear: "Your own leave requests appear here.",
  passport: "Passport",
  passportExpiry: "Passport expiry",
  passportNumber: "Passport number",
  people: "People",
  peopleArriveJoiningStudio: "People arrive by joining the studio and being approved. HR describes who they are once they're in.",
  peopleHold: "people hold",
  peopleLose: "people lose",
  person: "Person",
  personHolds: "person holds",
  personHolds2: "person holds",
  personLoses: "person loses",
  puttingSomebodyRoleAccess: "Putting somebody in a role is an access change, and that's set on the access screen.",
  reason: "Reason",
  rename: "Rename",
  requestLeave: "Request leave",
  requestsKindLeave: "Requests by kind of leave",
  requestsPeopleArriveHere: "Requests from your people arrive here for approval.",
  role: "Role",
  roleIsAccessChange: "Putting somebody in a role is an access change, and that's set on the access screen.",
  rolesShownHereBut: "Roles are shown here but assigned on the access screen: handing somebody a role hands them permissions, which is a right of its own.",
  save: "Save",
  saving: "Saving…",
  searchNameCodeDepartment: "Search name, code, department or role",
  sectionIsnPartStudio: "That section isn't part of this studio any more.",
  sending: "Sending…",
  status: "Status",
  studioKeepsModuleDashboards: "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  studioSectionsWhereThey: "The studio's sections, so this is where they work.",
  submit: "Submit",
  to: "To",
  type: "Type",
  unassigned: "Unassigned",
  upcomingLeave: "Upcoming leave",
  validMonths: "Valid for (months)",
  viewOnly: "View only",
  viewOnlyAccessHuman: "You have view-only access to Human Resources.",
  whatPersonWhatLets: "What this person is, and what that lets them do — the same role Access grants against. Somebody can hold more than one.",
  wherePeopleSit: "Where people sit",
  whereRequestsStand: "Where requests stand",
};

const ar: Strings = {
  ...commonAr,
  docsExpiringDays: (days) => `وثائق توشك على الانتهاء · ${days} يومًا`,
  idPassportWithin: (days) => `الهوية وجواز السفر خلال ${days} يومًا، أو منتهيان`,
  roleHeldBy: (n) => `${n === 1 ? "شخص واحد يحمل" : n === 2 ? "شخصان يحملان" : n <= 10 ? `${n} أشخاص يحملون` : `${n} شخصًا يحمل`} هذا الدور، فحذفه سيسلبهم صلاحياتهم — وذلك يُضبط في شاشة الصلاحيات.`,
  accessHumanResourcesStudio: "لا تملك صلاحية الوصول إلى الموارد البشرية في هذا الاستوديو.",
  addCertification: "إضافة شهادة",
  addRole: "إضافة دور",
  adminComesStudioCan: "دور المسؤول يأتي مع الاستوديو — لا يمكن إعادة تسميته أو حذفه.",
  approve: "اعتماد",
  approvedNotYetStarted: "معتمدة ولم تبدأ بعد",
  bookYourselfSomebodyManage: "احجزها لنفسك، أو لشخص تديره.",
  can: "لا يمكنك فعل ذلك.",
  canOnlyGiveSomebody: "لا يمكنك منح شخص دورًا إلا إن كنت تملك صلاحياته بنفسك.",
  cancel: "إلغاء",
  certificationsHeld: "الشهادات المُحرَزة",
  dashboardIsnYoursSee: "لوحة المعلومات ليست من صلاحياتك",
  dateJoining: "تاريخ الالتحاق",
  days: "الأيام",
  decline: "رفض",
  defineQualificationsPeopleHold: "عرّف المؤهلات التي يحملها موظفوك، ثم علّم عليها لدى كل شخص.",
  delete: "حذف",
  deleteGood: "حذف نهائي",
  department: "القسم",
  departments: "الأقسام",
  description: "الوصف",
  didnSave: "لم يُحفظ ذلك.",
  eGEmp014: "مثال: EMP-014",
  edit: "تعديل",
  employeeCode: "الرقم الوظيفي",
  employmentDetailsApplyInside: "تسري بيانات التوظيف داخل هذا الاستوديو فقط.",
  endDateBeforeStart: "تاريخ النهاية قبل تاريخ البداية.",
  endDateCanBefore: "لا يمكن أن يسبق تاريخ النهاية تاريخ البداية.",
  expiringDocuments: "وثائق توشك على الانتهاء",
  file: "مسجّلة",
  from: "من",
  goesWhoeverManagesHr: "يذهب إلى من يدير الموارد البشرية للاعتماد.",
  headcountDepartment: "عدد الموظفين حسب القسم",
  idExpiry: "انتهاء الهوية",
  idNumber: "رقم الهوية",
  identityDocuments: "وثائق الهوية",
  issuer: "جهة الإصدار",
  keep: "إبقاء",
  leaveNow: "في إجازة الآن",
  leavePending: "إجازات قيد الانتظار",
  leaveStatus: "الإجازات حسب الحالة",
  leaveType: "الإجازات حسب النوع",
  loadingHumanResources: "جارٍ تحميل الموارد البشرية…",
  mobile: "الجوال",
  name: "الاسم",
  nameAlreadyUse: "هذا الاسم مستخدم بالفعل.",
  namingJobHrWhat: "تسمية الوظيفة من شأن الموارد البشرية. أما ما يُسمح لها بفعله فيُضبط في شاشة الصلاحيات.",
  newCertification: "شهادة جديدة",
  newRole: "دور جديد",
  noAccessGrantedYet: "لم تُمنح أي صلاحيات بعد",
  noCertificationsYet: "لا توجد شهادات بعد",
  noDocumentsFile: "لا توجد وثائق مسجّلة",
  noLeaveBooked: "لا توجد إجازات محجوزة",
  noLeaveBookedYet: "لم تُحجز أي إجازة بعد.",
  noOneHereMatches: "لا أحد هنا يطابق هذا البحث.",
  noRolesDefinedYet: "لم تُعرَّف أي أدوار بعد.",
  nobodyBookedAway: "لا أحد محجوز للغياب.",
  nobodyHereYet: "لا أحد هنا بعد",
  nobodyMatches: "لا أحد يطابق",
  nobodyPlacedDepartmentYet: "لم يُوضع أحد في قسم بعد.",
  notPlacedYet: "لم يُوضع بعد",
  notes: "ملاحظات",
  nothingExpiringAllClear: "لا شيء يوشك على الانتهاء — كل شيء على ما يرام.",
  open: "افتحها",
  ownLeaveRequestsAppear: "تظهر هنا طلبات إجازتك.",
  passport: "جواز السفر",
  passportExpiry: "انتهاء جواز السفر",
  passportNumber: "رقم جواز السفر",
  people: "الأشخاص",
  peopleArriveJoiningStudio: "يصل الأشخاص بالانضمام إلى الاستوديو والموافقة عليهم. وتصف الموارد البشرية من هم بعد دخولهم.",
  peopleHold: "أشخاص يحملونها",
  peopleLose: "أشخاص يفقدونها",
  person: "الشخص",
  personHolds: "شخص يحملها",
  personHolds2: "شخص يحملها",
  personLoses: "شخص يفقدها",
  puttingSomebodyRoleAccess: "وضع شخص في دور تغييرٌ للصلاحيات، وهذا يُضبط في شاشة الصلاحيات.",
  reason: "السبب",
  rename: "إعادة تسمية",
  requestLeave: "طلب إجازة",
  requestsKindLeave: "الطلبات حسب نوع الإجازة",
  requestsPeopleArriveHere: "تصل هنا طلبات موظفيك للاعتماد.",
  role: "الدور",
  roleIsAccessChange: "وضع شخص في دور تغييرٌ للصلاحيات، وهذا يُضبط في شاشة الصلاحيات.",
  rolesShownHereBut: "تُعرض الأدوار هنا لكنها تُسنَد في شاشة الصلاحيات: فمنح شخص دورًا هو منحه صلاحيات، وذلك حق قائم بذاته.",
  save: "حفظ",
  saving: "جارٍ الحفظ…",
  searchNameCodeDepartment: "ابحث بالاسم أو الرقم الوظيفي أو القسم أو الدور",
  sectionIsnPartStudio: "لم يعد هذا القسم جزءًا من هذا الاستوديو.",
  sending: "جارٍ الإرسال…",
  status: "الحالة",
  studioKeepsModuleDashboards: "يُبقي هذا الاستوديو لوحات معلومات الوحدات خلف صلاحية خاصة بها. الشاشات التي تحتها غير متأثرة — اختر واحدة من الشريط الجانبي.",
  studioSectionsWhereThey: "أقسام الاستوديو، وهي مكان عملهم.",
  submit: "إرسال",
  to: "إلى",
  type: "النوع",
  unassigned: "غير مُسند",
  upcomingLeave: "الإجازات القادمة",
  validMonths: "صالحة لمدة (بالأشهر)",
  viewOnly: "للعرض فقط",
  viewOnlyAccessHuman: "لديك صلاحية عرض فقط على الموارد البشرية.",
  whatPersonWhatLets: "ما هذا الشخص، وما الذي يتيحه له ذلك — الدور نفسه الذي تمنح عليه الصلاحيات. ويمكن أن يحمل أكثر من دور.",
  wherePeopleSit: "أين يعمل الأشخاص",
  whereRequestsStand: "وضع الطلبات",
};

const hr = { en, ar };

export function hrDict(locale: string): Strings {
  return hr[locale as Locale] || hr[defaultLocale];
}
