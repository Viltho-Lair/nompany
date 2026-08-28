import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// PROJECTS — the list, one project's board and info, and the sheet viewer.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  accessProjectsStudio: string;
  acrossEverySlaContract: string;
  actions: string;
  activeProjects: string;
  addOvertime: string;
  addSla: string;
  addSlaContract: string;
  allDepartments: string;
  allocate: string;
  approvedQuotation: string;
  averagePlanCompletion: string;
  bulk: string;
  cancel: string;
  client: string;
  close: string;
  completed: string;
  contactPerson: string;
  contractCoversDeliveredProject: string;
  contractName: string;
  contractNoEmergencyVisits: string;
  dashboardIsnYoursSee: string;
  date: string;
  defaultDepartment: string;
  defaultSupportPeriodDays: string;
  delete: string;
  deleteProject: string;
  departmentPreSelected: string;
  derivedWhatAllocatedAgainst: string;
  discard: string;
  due30Days: string;
  durationDays: string;
  edit: string;
  editOvertime: string;
  email: string;
  emergencyAllowance: string;
  emergencyVisits: string;
  end: string;
  exportCsv: string;
  findHiddenProject: string;
  from: string;
  handler: string;
  hours: string;
  howLongProjectStays: string;
  item: string;
  loadingProject: string;
  loadingProjects: string;
  loadingProjects2: string;
  loadingSheet: string;
  location: string;
  logHoursWorkedProject: string;
  main: string;
  manager: string;
  model: string;
  noDataYet: string;
  noDepartmentsDepartmentSection: string;
  noEmergencyVisitsRegistered: string;
  noNumberYet: string;
  noOpenProjects: string;
  noOvertimeRecordedYet: string;
  noProjectDatesYet: string;
  noProjectValuesYet: string;
  noProjectsMatchSearch: string;
  noProjectsYet: string;
  noSlaContractsYet: string;
  noSlaContractsYet2: string;
  nobodyDepartment: string;
  noneStock: string;
  notIssuedYet: string;
  notes: string;
  nothingStockAllocate: string;
  number: string;
  oneRecordWrittenPer: string;
  onlyApprovedQuotationsCan: string;
  openProject: string;
  openProject2: string;
  openProjectsPerManager: string;
  openQuotationViewer: string;
  overdue: string;
  overtime: string;
  peopleListOpensFiltered: string;
  person: string;
  plannedVisits: string;
  progress: string;
  project: string;
  projectManager: string;
  projectNoLongerExists: string;
  projectNoSheetYet: string;
  projectProgress: string;
  projectQuotationPoSerial: string;
  projectTimeline: string;
  projects: string;
  projectsStage: string;
  qty: string;
  received: string;
  registeredProjectValue: string;
  releaseUnit: string;
  remove: string;
  requirementWeights: string;
  reservedLine: string;
  saved: string;
  schedule: string;
  searchTitleNumberClient: string;
  setStartDateDuration: string;
  sheet: string;
  sheetSettings: string;
  signed: string;
  site: string;
  siteCity: string;
  stage: string;
  stages: string;
  stagesProjectMovesThrough: string;
  start: string;
  startedEndedMonth: string;
  starts: string;
  status: string;
  studioKeepsModuleDashboards: string;
  support: string;
  supportEnded: string;
  supportNotSet: string;
  supportPeriodDays: string;
  supportVisits: string;
  targetEnd: string;
  thatIs: string;
  ticket: string;
  title: string;
  to: string;
  total: string;
  totalValue: string;
  unassigned: string;
  value: string;
  valueStage: string;
  viewOnly: string;
  viewOnlyAccessProjects: string;
  visitScheduleGeneratedStart: string;
  visits: string;
  weightsMustTotal100: string;
  whatSold: string;
  whereWorkSits: string;
  workloadManager: string;
};

const en: Strings = {
  ...commonEn,
  accessProjectsStudio: "You don't have access to Projects in this studio.",
  acrossEverySlaContract: "Across every SLA contract",
  actions: "Actions",
  activeProjects: "Active projects",
  addOvertime: "Add overtime",
  addSla: "Add SLA",
  addSlaContract: "Add SLA contract",
  allDepartments: "All departments",
  allocate: "Allocate…",
  approvedQuotation: "Approved quotation",
  averagePlanCompletion: "Average plan completion",
  bulk: "Bulk",
  cancel: "Cancel",
  client: "Client",
  close: "Close",
  completed: "Completed",
  contactPerson: "Contact person",
  contractCoversDeliveredProject: "A contract covers a delivered project for a period, with a set number of planned visits and an allowance of emergency ones.",
  contractName: "Contract name",
  contractNoEmergencyVisits: "This contract has no emergency visits.",
  dashboardIsnYoursSee: "The dashboard isn't yours to see",
  date: "Date",
  defaultDepartment: "Default department",
  defaultSupportPeriodDays: "Default support period (days)",
  delete: "Delete",
  deleteProject: "Delete project",
  departmentPreSelected: "The department pre-selected in",
  derivedWhatAllocatedAgainst: "Derived from what is allocated against what was sold",
  discard: "Discard",
  due30Days: "due in 30 days",
  durationDays: "Duration (days)",
  edit: "Edit",
  editOvertime: "Edit overtime",
  email: "Email",
  emergencyAllowance: "Emergency allowance",
  emergencyVisits: "Emergency visits",
  end: "End",
  exportCsv: "Export CSV",
  findHiddenProject: "Find a hidden project…",
  from: "From",
  handler: "Handler",
  hours: "Hours",
  howLongProjectStays: "How long a project stays in support after its end date. A new project starts with this, and can be changed on its own.",
  item: "Item",
  loadingProject: "Loading project…",
  loadingProjects: "Loading projects",
  loadingProjects2: "Loading Projects…",
  loadingSheet: "Loading sheet…",
  location: "Location",
  logHoursWorkedProject: "Log the hours worked on a project outside the plan. They add up per project and per person here.",
  main: "Main",
  manager: "Manager",
  model: "Model",
  noDataYet: "No data yet",
  noDepartmentsDepartmentSection: "No departments — a department is a section, and this studio has none switched on.",
  noEmergencyVisitsRegistered: "No emergency visits registered yet.",
  noNumberYet: "no number yet",
  noOpenProjects: "No open projects.",
  noOvertimeRecordedYet: "No overtime recorded yet",
  noProjectDatesYet: "No project dates yet.",
  noProjectValuesYet: "No project values yet.",
  noProjectsMatchSearch: "No projects match that search.",
  noProjectsYet: "No projects yet",
  noSlaContractsYet: "No SLA contracts yet",
  noSlaContractsYet2: "No SLA contracts yet.",
  nobodyDepartment: "Nobody in this department.",
  noneStock: "none in stock",
  notIssuedYet: "Not issued yet",
  notes: "Notes",
  nothingStockAllocate: "Nothing in stock to allocate.",
  number: "Number",
  oneRecordWrittenPer: "One record is written per person selected.",
  onlyApprovedQuotationsCan: "Only approved quotations can become projects.",
  openProject: "Open project",
  openProject2: "Open a project",
  openProjectsPerManager: "Open projects per manager",
  openQuotationViewer: "Open the quotation viewer",
  overdue: "Overdue",
  overtime: "Overtime",
  peopleListOpensFiltered: ", so the people list opens filtered to it.",
  person: "Person",
  plannedVisits: "Planned visits",
  progress: "Progress",
  project: "Project",
  projectManager: "Project manager",
  projectNoLongerExists: "That project no longer exists.",
  projectNoSheetYet: "This project has no sheet yet.",
  projectProgress: "Project progress",
  projectQuotationPoSerial: "Project, quotation, PO, serial…",
  projectTimeline: "Project timeline",
  projects: "Projects",
  projectsStage: "Projects by stage",
  qty: "Qty",
  received: "Received",
  registeredProjectValue: "Registered project value",
  releaseUnit: "Release this unit",
  remove: "Remove",
  requirementWeights: "Requirement weights",
  reservedLine: "Reserved to this line",
  saved: "Saved",
  schedule: "Schedule",
  searchTitleNumberClient: "Search title, number, client or location",
  setStartDateDuration: "Set a start date, duration and visit count to generate visits.",
  sheet: "Sheet",
  sheetSettings: "Sheet settings",
  signed: "Signed",
  site: "Site",
  siteCity: "Site or city",
  stage: "Stage",
  stages: "Stages",
  stagesProjectMovesThrough: "The stages a project moves through. These are fixed for now — the board and the list both read them.",
  start: "Start",
  startedEndedMonth: "Started and ended by month",
  starts: "Starts",
  status: "Status",
  studioKeepsModuleDashboards: "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  support: "Support",
  supportEnded: "Support ended",
  supportNotSet: "Support not set",
  supportPeriodDays: "Support period (days)",
  supportVisits: "Support visits",
  targetEnd: "Target end",
  thatIs: "That is",
  ticket: "Ticket",
  title: "Title",
  to: "To",
  total: "Total",
  totalValue: "Total value",
  unassigned: "Unassigned",
  value: "Value",
  valueStage: "Value by stage",
  viewOnly: "View only",
  viewOnlyAccessProjects: "You have view-only access to Projects settings.",
  visitScheduleGeneratedStart: "The visit schedule is generated from the start date, duration and visit count.",
  visits: "Visits",
  weightsMustTotal100: "Weights must total 100%.",
  whatSold: "What was sold",
  whereWorkSits: "Where the work sits",
  workloadManager: "Workload by manager",
};

const ar: Strings = {
  ...commonAr,
  accessProjectsStudio: "لا تملك صلاحية الوصول إلى المشاريع في هذا الاستوديو.",
  acrossEverySlaContract: "عبر كل عقد مستوى خدمة",
  actions: "الإجراءات",
  activeProjects: "المشاريع النشطة",
  addOvertime: "إضافة عمل إضافي",
  addSla: "إضافة عقد مستوى خدمة",
  addSlaContract: "إضافة عقد مستوى خدمة",
  allDepartments: "كل الأقسام",
  allocate: "تخصيص…",
  approvedQuotation: "عرض السعر المعتمد",
  averagePlanCompletion: "متوسط إنجاز الخطط",
  bulk: "دفعة",
  cancel: "إلغاء",
  client: "العميل",
  close: "إغلاق",
  completed: "مكتمل",
  contactPerson: "جهة الاتصال",
  contractCoversDeliveredProject: "يغطي العقد مشروعًا مُسلَّمًا لفترة محددة، بعدد مقرر من الزيارات المخططة ومخصص من الزيارات الطارئة.",
  contractName: "اسم العقد",
  contractNoEmergencyVisits: "لا يتضمن هذا العقد زيارات طارئة.",
  dashboardIsnYoursSee: "لوحة المعلومات ليست من صلاحياتك",
  date: "التاريخ",
  defaultDepartment: "القسم الافتراضي",
  defaultSupportPeriodDays: "فترة الدعم الافتراضية (بالأيام)",
  delete: "حذف",
  deleteProject: "حذف المشروع",
  departmentPreSelected: "القسم المحدد مسبقًا في",
  derivedWhatAllocatedAgainst: "مشتق مما خُصص مقابل ما بيع",
  discard: "تجاهل",
  due30Days: "مستحق خلال 30 يومًا",
  durationDays: "المدة (بالأيام)",
  edit: "تعديل",
  editOvertime: "تعديل العمل الإضافي",
  email: "البريد الإلكتروني",
  emergencyAllowance: "مخصص الطوارئ",
  emergencyVisits: "الزيارات الطارئة",
  end: "النهاية",
  exportCsv: "تصدير CSV",
  findHiddenProject: "ابحث عن مشروع مخفي…",
  from: "من",
  handler: "المتولّي",
  hours: "الساعات",
  howLongProjectStays: "كم يبقى المشروع تحت الدعم بعد تاريخ انتهائه. يبدأ المشروع الجديد بهذه المدة، ويمكن تغييرها له وحده.",
  item: "الصنف",
  loadingProject: "جارٍ تحميل المشروع…",
  loadingProjects: "جارٍ تحميل المشاريع",
  loadingProjects2: "جارٍ تحميل المشاريع…",
  loadingSheet: "جارٍ تحميل الكشف…",
  location: "الموقع",
  logHoursWorkedProject: "سجّل الساعات المبذولة على مشروع خارج الخطة. وتُجمع هنا لكل مشروع ولكل شخص.",
  main: "الرئيسية",
  manager: "المدير",
  model: "الطراز",
  noDataYet: "لا توجد بيانات بعد",
  noDepartmentsDepartmentSection: "لا توجد أقسام — القسم هو قطاع، ولا يوجد أي قطاع مفعّل في هذا الاستوديو.",
  noEmergencyVisitsRegistered: "لم تُسجَّل زيارات طارئة بعد.",
  noNumberYet: "بلا رقم بعد",
  noOpenProjects: "لا توجد مشاريع مفتوحة.",
  noOvertimeRecordedYet: "لم يُسجَّل عمل إضافي بعد",
  noProjectDatesYet: "لا توجد تواريخ مشاريع بعد.",
  noProjectValuesYet: "لا توجد قيم مشاريع بعد.",
  noProjectsMatchSearch: "لا توجد مشاريع تطابق هذا البحث.",
  noProjectsYet: "لا توجد مشاريع بعد",
  noSlaContractsYet: "لا توجد عقود مستوى خدمة بعد",
  noSlaContractsYet2: "لا توجد عقود مستوى خدمة بعد.",
  nobodyDepartment: "لا أحد في هذا القسم.",
  noneStock: "لا شيء في المخزون",
  notIssuedYet: "لم يُصدر بعد",
  notes: "ملاحظات",
  nothingStockAllocate: "لا شيء في المخزون لتخصيصه.",
  number: "الرقم",
  oneRecordWrittenPer: "يُكتب سجل واحد لكل شخص محدد.",
  onlyApprovedQuotationsCan: "عروض الأسعار المعتمدة وحدها هي التي يمكن أن تصير مشاريع.",
  openProject: "فتح المشروع",
  openProject2: "افتح مشروعًا",
  openProjectsPerManager: "المشاريع المفتوحة لكل مدير",
  openQuotationViewer: "افتح عارض عرض السعر",
  overdue: "متأخر",
  overtime: "العمل الإضافي",
  peopleListOpensFiltered: "، فتُفتح قائمة الأشخاص مصفّاة عليه.",
  person: "الشخص",
  plannedVisits: "الزيارات المخططة",
  progress: "التقدّم",
  project: "المشروع",
  projectManager: "مدير المشروع",
  projectNoLongerExists: "لم يعد هذا المشروع موجودًا.",
  projectNoSheetYet: "لا يوجد كشف لهذا المشروع بعد.",
  projectProgress: "تقدّم المشاريع",
  projectQuotationPoSerial: "المشروع، عرض السعر، أمر الشراء، الرقم التسلسلي…",
  projectTimeline: "المسار الزمني للمشاريع",
  projects: "المشاريع",
  projectsStage: "المشاريع حسب المرحلة",
  qty: "الكمية",
  received: "مستلم",
  registeredProjectValue: "قيمة المشاريع المسجّلة",
  releaseUnit: "تحرير هذه الوحدة",
  remove: "إزالة",
  requirementWeights: "أوزان المتطلبات",
  reservedLine: "محجوزة لهذا السطر",
  saved: "تم الحفظ",
  schedule: "الجدول",
  searchTitleNumberClient: "ابحث بالعنوان أو الرقم أو العميل أو الموقع",
  setStartDateDuration: "حدّد تاريخ بداية ومدة وعدد زيارات لتوليد الزيارات.",
  sheet: "الكشف",
  sheetSettings: "إعدادات الكشف",
  signed: "موقّع",
  site: "الموقع",
  siteCity: "الموقع أو المدينة",
  stage: "المرحلة",
  stages: "المراحل",
  stagesProjectMovesThrough: "المراحل التي يمر بها المشروع. وهي ثابتة حاليًا — تقرأها اللوحة والقائمة معًا.",
  start: "البداية",
  startedEndedMonth: "البدء والانتهاء حسب الشهر",
  starts: "يبدأ",
  status: "الحالة",
  studioKeepsModuleDashboards: "يُبقي هذا الاستوديو لوحات معلومات الوحدات خلف صلاحية خاصة بها. الشاشات التي تحتها غير متأثرة — اختر واحدة من الشريط الجانبي.",
  support: "الدعم",
  supportEnded: "انتهى الدعم",
  supportNotSet: "الدعم غير محدد",
  supportPeriodDays: "فترة الدعم (بالأيام)",
  supportVisits: "زيارات الدعم",
  targetEnd: "النهاية المستهدفة",
  thatIs: "أي",
  ticket: "التذكرة",
  title: "العنوان",
  to: "إلى",
  total: "الإجمالي",
  totalValue: "القيمة الإجمالية",
  unassigned: "غير مُسند",
  value: "القيمة",
  valueStage: "القيمة حسب المرحلة",
  viewOnly: "للعرض فقط",
  viewOnlyAccessProjects: "لديك صلاحية عرض فقط على إعدادات المشاريع.",
  visitScheduleGeneratedStart: "يُولَّد جدول الزيارات من تاريخ البداية والمدة وعدد الزيارات.",
  visits: "الزيارات",
  weightsMustTotal100: "يجب أن يكون مجموع الأوزان 100٪.",
  whatSold: "ما تم بيعه",
  whereWorkSits: "أين يقف العمل",
  workloadManager: "عبء العمل حسب المدير",
};

const projects = { en, ar };

export function projectsDict(locale: string): Strings {
  return projects[locale as Locale] || projects[defaultLocale];
}
