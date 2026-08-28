import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// HR — employees, employment, certifications and leave.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  accessHumanResourcesStudio: string;
  addCertification: string;
  addRole: string;
  approve: string;
  approvedNotYetStarted: string;
  cancel: string;
  certificationsHeld: string;
  dashboardIsnYoursSee: string;
  dateJoining: string;
  decline: string;
  defineQualificationsPeopleHold: string;
  delete: string;
  department: string;
  departments: string;
  description: string;
  eGEmp014: string;
  edit: string;
  employeeCode: string;
  employmentDetailsApplyInside: string;
  expiringDocuments: string;
  from: string;
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
  namingJobHrWhat: string;
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
  passportExpiry: string;
  passportNumber: string;
  people: string;
  peopleArriveJoiningStudio: string;
  person: string;
  reason: string;
  rename: string;
  requestLeave: string;
  requestsKindLeave: string;
  role: string;
  searchNameCodeDepartment: string;
  studioKeepsModuleDashboards: string;
  studioSectionsWhereThey: string;
  to: string;
  type: string;
  unassigned: string;
  upcomingLeave: string;
  validMonths: string;
  viewOnly: string;
  wherePeopleSit: string;
  whereRequestsStand: string;
};

const en: Strings = {
  ...commonEn,
  accessHumanResourcesStudio: "You don't have access to Human Resources in this studio.",
  addCertification: "Add certification",
  addRole: "Add role",
  approve: "Approve",
  approvedNotYetStarted: "Approved and not yet started",
  cancel: "Cancel",
  certificationsHeld: "Certifications held",
  dashboardIsnYoursSee: "The dashboard isn't yours to see",
  dateJoining: "Date of joining",
  decline: "Decline",
  defineQualificationsPeopleHold: "Define the qualifications your people hold, then tick them off on each person.",
  delete: "Delete",
  department: "Department",
  departments: "Departments",
  description: "Description",
  eGEmp014: "e.g. EMP-014",
  edit: "Edit",
  employeeCode: "Employee code",
  employmentDetailsApplyInside: "Employment details apply inside this studio only.",
  expiringDocuments: "Expiring documents",
  from: "From",
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
  namingJobHrWhat: "Naming the job is HR's. What it may do is set on the access screen.",
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
  passportExpiry: "Passport expiry",
  passportNumber: "Passport number",
  people: "People",
  peopleArriveJoiningStudio: "People arrive by joining the studio and being approved. HR describes who they are once they're in.",
  person: "Person",
  reason: "Reason",
  rename: "Rename",
  requestLeave: "Request leave",
  requestsKindLeave: "Requests by kind of leave",
  role: "Role",
  searchNameCodeDepartment: "Search name, code, department or role",
  studioKeepsModuleDashboards: "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  studioSectionsWhereThey: "The studio's sections, so this is where they work.",
  to: "To",
  type: "Type",
  unassigned: "Unassigned",
  upcomingLeave: "Upcoming leave",
  validMonths: "Valid for (months)",
  viewOnly: "View only",
  wherePeopleSit: "Where people sit",
  whereRequestsStand: "Where requests stand",
};

const ar: Strings = {
  ...commonAr,
  accessHumanResourcesStudio: "لا تملك صلاحية الوصول إلى الموارد البشرية في هذا الاستوديو.",
  addCertification: "إضافة شهادة",
  addRole: "إضافة دور",
  approve: "اعتماد",
  approvedNotYetStarted: "معتمدة ولم تبدأ بعد",
  cancel: "إلغاء",
  certificationsHeld: "الشهادات المُحرَزة",
  dashboardIsnYoursSee: "لوحة المعلومات ليست من صلاحياتك",
  dateJoining: "تاريخ الالتحاق",
  decline: "رفض",
  defineQualificationsPeopleHold: "عرّف المؤهلات التي يحملها موظفوك، ثم علّم عليها لدى كل شخص.",
  delete: "حذف",
  department: "القسم",
  departments: "الأقسام",
  description: "الوصف",
  eGEmp014: "مثال: EMP-014",
  edit: "تعديل",
  employeeCode: "الرقم الوظيفي",
  employmentDetailsApplyInside: "تسري بيانات التوظيف داخل هذا الاستوديو فقط.",
  expiringDocuments: "وثائق توشك على الانتهاء",
  from: "من",
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
  namingJobHrWhat: "تسمية الوظيفة من شأن الموارد البشرية. أما ما يُسمح لها بفعله فيُضبط في شاشة الصلاحيات.",
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
  passportExpiry: "انتهاء جواز السفر",
  passportNumber: "رقم جواز السفر",
  people: "الأشخاص",
  peopleArriveJoiningStudio: "يصل الأشخاص بالانضمام إلى الاستوديو والموافقة عليهم. وتصف الموارد البشرية من هم بعد دخولهم.",
  person: "الشخص",
  reason: "السبب",
  rename: "إعادة تسمية",
  requestLeave: "طلب إجازة",
  requestsKindLeave: "الطلبات حسب نوع الإجازة",
  role: "الدور",
  searchNameCodeDepartment: "ابحث بالاسم أو الرقم الوظيفي أو القسم أو الدور",
  studioKeepsModuleDashboards: "يُبقي هذا الاستوديو لوحات معلومات الوحدات خلف صلاحية خاصة بها. الشاشات التي تحتها غير متأثرة — اختر واحدة من الشريط الجانبي.",
  studioSectionsWhereThey: "أقسام الاستوديو، وهي مكان عملهم.",
  to: "إلى",
  type: "النوع",
  unassigned: "غير مُسند",
  upcomingLeave: "الإجازات القادمة",
  validMonths: "صالحة لمدة (بالأشهر)",
  viewOnly: "للعرض فقط",
  wherePeopleSit: "أين يعمل الأشخاص",
  whereRequestsStand: "وضع الطلبات",
};

const hr = { en, ar };

export function hrDict(locale: string): Strings {
  return hr[locale as Locale] || hr[defaultLocale];
}
