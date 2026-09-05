import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// PROJECTS — the list, one project's board and info, and the sheet viewer.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  acrossProjects: (n: number) => string;
  accessProjectsStudio: string;
  acrossEverySlaContract: string;
  actions: string;
  activeProjects: string;
  addContract: string;
  addOvertime: string;
  addSla: string;
  addSlaContract: string;
  allDepartments: string;
  allocate: string;
  approvedQuotation: string;
  approvedQuotationsReadyOpen: string;
  averagePlanCompletion: string;
  boardCouldNotLoad: string;
  bulk: string;
  cancel: string;
  client: string;
  close: string;
  closestVisit: string;
  completed: string;
  contactPerson: string;
  contract: string;
  contractCoversDeliveredProject: string;
  contractName: string;
  contractNoEmergencyVisits: string;
  createProject: string;
  createProjectPlan: string;
  createsScheduleProjectCarrying: string;
  creating: string;
  dashboardIsnYoursSee: string;
  date: string;
  decisions: string;
  defaultDepartment: string;
  defaultSupportPeriodDays: string;
  delete: string;
  deleteProject: string;
  department: string;
  departmentPreSelected: string;
  derivedWhatAllocatedAgainst: string;
  descriptionOfTheWork: string;
  didnSave: string;
  direct: string;
  discard: string;
  due30Days: string;
  durationDays: string;
  edit: string;
  editOvertime: string;
  email: string;
  emergencyAllowance: string;
  emergencyVisits: string;
  end: string;
  endTimeAfterStart: string;
  endTimeMustAfter: string;
  existingClient: string;
  exportCsv: string;
  findHiddenProject: string;
  from: string;
  fromApprovedQuotation: string;
  fromTo: string;
  giveName: string;
  handler: string;
  hours: string;
  howCompletionSplits: string;
  howLongProjectStays: string;
  item: string;
  loadingProject: string;
  loadingProjects: string;
  loadingProjects2: string;
  loadingProjectsAria: string;
  loadingSheet: string;
  location: string;
  logHoursWorkedProject: string;
  main: string;
  manager: string;
  model: string;
  nEmergencyVisitsAllowed: (n: number) => string;
  nHours: (n: number) => string;
  nHoursPerPerson: (n: number) => string;
  nOvertimeHoursLogged: (n: number) => string;
  nVisitsScheduled: (n: number) => string;
  nameIsnListCreatesClient: string;
  newClientWork: string;
  newProject: string;
  noApprovedQuotationsWaiting: string;
  noClientsListHere: string;
  noDataYet: string;
  noDepartmentsDepartmentSection: string;
  noEmergencyVisitsRegistered: string;
  noHiddenProjectMatches: string;
  noNumberYet: string;
  noOpenProjects: string;
  noOvertimeRecordedYet: string;
  noProjectDatesYet: string;
  noProjectMatches: string;
  noProjectNumberYet: string;
  noProjectValuesYet: string;
  noProjectsMatchSearch: string;
  noProjectsSigned: string;
  noProjectsSignedYet: string;
  noProjectsYet: string;
  // TWO KINDS OF EMPTY on a project's sheet, and they mean different things. A
  // sheet with no quotation behind it can never fill from this screen — the
  // project was raised directly — where a quotation with no priced lines is
  // waiting on somebody to price it. See quotationNoPricedLines below.
  noQuotationBehindProject: string;
  billHasNoLines: string;
  noServiceActionsYet: string;
  noSlaContractsYet: string;
  noSlaContractsYet2: string;
  nobodyDepartment: string;
  noneStock: string;
  notIssuedYet: string;
  notes: string;
  nothingAllocated: string;
  nothingHidden: string;
  nothingStockAllocate: string;
  nothingToShowQuotationLines: string;
  number: string;
  oneRecordWrittenPer: string;
  onlyApprovedQuotationsCan: string;
  onlyProjectEditorsCan: string;
  open: string;
  openProject: string;
  openProjectFirst: string;
  openProjectPlan: string;
  openProjectsPerManager: string;
  openQuotationViewer: string;
  opening: string;
  opensProjectSchedulePlanner: string;
  overdue: string;
  overtime: string;
  peopleListOpensFiltered: string;
  person: string;
  pickDate: string;
  pickDateFirst: string;
  pickLeastOnePerson: string;
  pickProject: string;
  plannedVisits: string;
  progress: string;
  project: string;
  project2: string;
  projectAlreadyExistsQuotation: string;
  projectBoard: string;
  projectManager: string;
  projectNoLongerExists: string;
  projectNoSheetYet: string;
  projectPlan: string;
  projectProgress: string;
  projectQuotationPoSerial: string;
  projectSheets: string;
  projectTimeline: string;
  projectValue: string;
  projectColumns: string;
  projectCount: (shown: number, total: number) => string;
  projects: string;
  projectsEmptySummary: string;
  projectsOpenApprovedQuotation: string;
  projectsStage: string;
  qty: string;
  quotation: string;
  quotationHasnApprovedYet: string;
  quotationNoPricedLines: string;
  received: string;
  registerEmergencyVisit: string;
  registeredProjectValue: string;
  releaseUnit: string;
  remove: string;
  requirementWeights: string;
  reservedLine: string;
  save: string;
  saveContract: string;
  saveSettings: string;
  saved: string;
  saving: string;
  schedule: string;
  searchTitleNumberClient: string;
  seriesEnded: string;
  seriesStarted: string;
  setStartDateDuration: string;
  sheet: string;
  sheetSettings: string;
  signed: string;
  site: string;
  siteCity: string;
  slaContract: string;
  someChangesDidnSave: string;
  stage: string;
  stages: string;
  stagesProjectMovesThrough: string;
  start: string;
  startDateRequiredVisit: string;
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
  theyTotal100: string;
  ticket: string;
  title: string;
  to: string;
  total: string;
  totalRow: string;
  totalValue: string;
  typeIndustry: string;
  unassigned: string;
  unassigned2: string;
  unnumbered: string;
  untitled: string;
  value: string;
  valueStage: string;
  viewList: string;
  viewMatrix: string;
  viewOnly: string;
  viewOnlyAccessPart: string;
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
  acrossProjects: (n) => `across ${n} ${n === 1 ? "project" : "projects"}`,
  accessProjectsStudio: "You don't have access to Projects in this studio.",
  acrossEverySlaContract: "Across every SLA contract",
  actions: "Actions",
  activeProjects: "Active projects",
  addContract: "Add contract",
  addOvertime: "Add overtime",
  addSla: "Add SLA",
  addSlaContract: "Add SLA contract",
  allDepartments: "All departments",
  allocate: "Allocate…",
  approvedQuotation: "Approved quotation",
  approvedQuotationsReadyOpen: "You have approved quotations ready — open one as a project to start delivering.",
  averagePlanCompletion: "Average plan completion",
  boardCouldNotLoad: "This project's board could not be loaded — you may not have access to it.",
  bulk: "Bulk",
  cancel: "Cancel",
  client: "Client",
  close: "Close",
  closestVisit: "Closest visit",
  completed: "Completed",
  contactPerson: "Contact person",
  contract: "Contract",
  contractCoversDeliveredProject: "A contract covers a delivered project for a period, with a set number of planned visits and an allowance of emergency ones.",
  contractName: "Contract name",
  contractNoEmergencyVisits: "This contract has no emergency visits.",
  createProject: "Create project",
  createProjectPlan: "Create project plan",
  createsScheduleProjectCarrying: "Creates a schedule for this project, carrying its details across.",
  creating: "Creating…",
  dashboardIsnYoursSee: "The dashboard isn't yours to see",
  date: "Date",
  decisions: "Decisions",
  defaultDepartment: "Default department",
  defaultSupportPeriodDays: "Default support period (days)",
  delete: "Delete",
  deleteProject: "Delete project",
  department: "Department",
  departmentPreSelected: "The department pre-selected in",
  derivedWhatAllocatedAgainst: "Derived from what is allocated against what was sold",
  descriptionOfTheWork: "Description of the work",
  didnSave: "That didn't save.",
  // The lineage strip's answer for a project with no chain behind it. A blank
  // strip reads as a missing record; "Direct" says the absence is the fact.
  direct: "Direct",
  discard: "Discard",
  due30Days: "due in 30 days",
  durationDays: "Duration (days)",
  edit: "Edit",
  editOvertime: "Edit overtime",
  email: "Email",
  emergencyAllowance: "Emergency allowance",
  emergencyVisits: "Emergency visits",
  end: "End",
  endTimeAfterStart: "The end time has to be after the start time.",
  endTimeMustAfter: "The end time must be after the start time.",
  existingClient: "Existing client.",
  exportCsv: "Export CSV",
  findHiddenProject: "Find a hidden project…",
  from: "From",
  fromApprovedQuotation: "From an approved quotation",
  fromTo: "From–To",
  giveName: "Give it a name.",
  handler: "Handler",
  hours: "Hours",
  howCompletionSplits: "How a project's completion percentage splits across its requirements — your studio's service actions. Give each a share; together they must total 100%. Only the actions a project actually carries are counted, and their shares are re-scaled to fill the bar.",
  howLongProjectStays: "How long a project stays in support after its end date. A new project starts with this, and can be changed on its own.",
  item: "Item",
  loadingProject: "Loading project…",
  loadingProjects: "Loading projects",
  loadingProjects2: "Loading Projects…",
  loadingProjectsAria: "Loading projects",
  loadingSheet: "Loading sheet…",
  location: "Location",
  logHoursWorkedProject: "Log the hours worked on a project outside the plan. They add up per project and per person here.",
  main: "Main",
  manager: "Manager",
  model: "Model",
  nEmergencyVisitsAllowed: (n: number) => `This contract allows ${n} emergency visit${n === 1 ? "" : "s"}.`,
  nHours: (n: number) => `${n} hour${n === 1 ? "" : "s"}.`,
  nHoursPerPerson: (n: number) => `${n} hour${n === 1 ? "" : "s"} per person.`,
  nOvertimeHoursLogged: (n: number) => `${n} overtime hours logged`,
  nVisitsScheduled: (n: number) => `${n} visit${n === 1 ? "" : "s"} scheduled in total`,
  nameIsnListCreatesClient: "That name isn't on the list — a new client will be created.",
  newClientWork: "New client work",
  newProject: "New project",
  noApprovedQuotationsWaiting: "There are no approved quotations waiting. Approve one in Technical and it will be selectable here.",
  noClientsListHere: "This studio has no clients list, so there is no client to file the project against. Switch the Sales clients section on first.",
  noDataYet: "No data yet",
  noDepartmentsDepartmentSection: "No departments — a department is a section, and this studio has none switched on.",
  noEmergencyVisitsRegistered: "No emergency visits registered yet.",
  noHiddenProjectMatches: "No hidden project matches that.",
  noNumberYet: "No number yet",
  noOpenProjects: "No open projects.",
  noOvertimeRecordedYet: "No overtime recorded yet",
  noProjectDatesYet: "No project dates yet.",
  noProjectMatches: "No project matches that.",
  noProjectNumberYet: "No project number yet",
  noProjectValuesYet: "No project values yet.",
  noProjectsMatchSearch: "No projects match that search.",
  noProjectsSigned: "No projects have been signed yet — a project's sheets are drawn up when it is opened from an approved quotation.",
  noProjectsSignedYet: "No projects signed yet.",
  noProjectsYet: "No projects yet",
  noQuotationBehindProject: "This project has no quotation behind it, so there are no lines to work. Sheets fill from an approved quotation's priced rows.",
  billHasNoLines: "This project was handed over from a tender whose bill of quantities has no lines yet. The sheet fills from the bill, which is written in Tendering.",
  noServiceActionsYet: "No service actions yet — add them in Studio Settings, then weight them here.",
  noSlaContractsYet: "No SLA contracts yet",
  noSlaContractsYet2: "No SLA contracts yet.",
  nobodyDepartment: "Nobody in this department.",
  noneStock: "none in stock",
  notIssuedYet: "Not issued yet",
  notes: "Notes",
  nothingAllocated: "Nothing allocated",
  nothingHidden: "Nothing is hidden.",
  nothingStockAllocate: "Nothing in stock to allocate.",
  nothingToShowQuotationLines: "Nothing to show yet — the quotation's lines appear here once a project is opened from an approved quotation.",
  number: "Number",
  oneRecordWrittenPer: "One record is written per person selected.",
  onlyApprovedQuotationsCan: "Only approved quotations can become projects.",
  onlyProjectEditorsCan: "Only project editors can start a plan.",
  open: "Open",
  openProject: "Open project",
  openProjectFirst: "Open a project first",
  openProjectPlan: "Open project plan",
  openProjectsPerManager: "Open projects per manager",
  openQuotationViewer: "Open the quotation viewer",
  opening: "Opening…",
  opensProjectSchedulePlanner: "Opens this project's schedule in the planner.",
  overdue: "Overdue",
  overtime: "Overtime",
  peopleListOpensFiltered: ", so the people list opens filtered to it.",
  person: "Person",
  pickDate: "Pick a date.",
  pickDateFirst: "Pick a date first.",
  pickLeastOnePerson: "Pick at least one person.",
  pickProject: "Pick a project.",
  plannedVisits: "Planned visits",
  progress: "Progress",
  project: "Project",
  project2: "← Project",
  projectAlreadyExistsQuotation: "A project already exists for that quotation.",
  projectBoard: "Project board",
  projectManager: "Project manager",
  projectNoLongerExists: "That project no longer exists.",
  projectNoSheetYet: "This project has no sheet yet.",
  projectPlan: "Project plan",
  projectProgress: "Project progress",
  projectQuotationPoSerial: "Project, quotation, PO, serial…",
  projectSheets: "← Project sheets",
  projectTimeline: "Project timeline",
  projectValue: "Project value",
  projectColumns: "Project columns",
  projectCount: (shown, total) => `${shown} of ${total} project${total === 1 ? "" : "s"}.`,
  projects: "Projects",
  projectsEmptySummary: "A project opens from an approved quotation, or is created directly from work handed to the studio. Once one is registered, its stages, value and progress are summarised here.",
  projectsOpenApprovedQuotation: "Projects open from an approved quotation, or are created directly for work handed to you.",
  projectsStage: "Projects by stage",
  qty: "Qty",
  quotation: "Quotation",
  quotationHasnApprovedYet: "That quotation hasn't been approved yet.",
  quotationNoPricedLines: "The quotation behind this sheet has no priced lines yet. Add them in the builder and they appear here.",
  received: "Received",
  registerEmergencyVisit: "Register emergency visit",
  registeredProjectValue: "Registered project value",
  releaseUnit: "Release this unit",
  remove: "Remove",
  requirementWeights: "Requirement weights",
  reservedLine: "Reserved to this line",
  save: "Save",
  saveContract: "Save contract",
  saveSettings: "Save settings",
  saved: "Saved",
  saving: "Saving…",
  schedule: "Schedule",
  searchTitleNumberClient: "Search title, number, client or location",
  seriesEnded: "Ended",
  seriesStarted: "Started",
  setStartDateDuration: "Set a start date, duration and visit count to generate visits.",
  sheet: "Sheet",
  sheetSettings: "Sheet settings",
  signed: "Signed",
  site: "Site",
  siteCity: "Site or city",
  slaContract: "SLA contract",
  someChangesDidnSave: "Some changes didn't save — nothing after the failed row was sent.",
  stage: "Stage",
  stages: "Stages",
  stagesProjectMovesThrough: "The stages a project moves through. These are fixed for now — the board and the list both read them.",
  start: "Start",
  startDateRequiredVisit: "A start date is required — the visit schedule is counted from it.",
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
  theyTotal100: "They total 100%.",
  ticket: "Ticket",
  title: "Title",
  to: "To",
  total: "Total",
  totalRow: "Total",
  totalValue: "Total value",
  typeIndustry: "Type of industry",
  unassigned: "Unassigned",
  unassigned2: "Unassigned",
  unnumbered: "Unnumbered",
  untitled: "Untitled",
  value: "Value",
  valueStage: "Value by stage",
  viewList: "List",
  viewMatrix: "Matrix",
  viewOnly: "View only",
  viewOnlyAccessPart: "You have view-only access to this part of Projects.",
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
  acrossProjects: (n) => `عبر ${n === 1 ? "مشروع واحد" : n === 2 ? "مشروعين" : n <= 10 ? `${n} مشاريع` : `${n} مشروعًا`}`,
  accessProjectsStudio: "لا تملك صلاحية الوصول إلى المشاريع في هذا الاستوديو.",
  acrossEverySlaContract: "عبر كل عقد مستوى خدمة",
  actions: "الإجراءات",
  activeProjects: "المشاريع النشطة",
  addContract: "إضافة عقد",
  addOvertime: "إضافة عمل إضافي",
  addSla: "إضافة عقد مستوى خدمة",
  addSlaContract: "إضافة عقد مستوى خدمة",
  allDepartments: "كل الأقسام",
  allocate: "تخصيص…",
  approvedQuotation: "عرض السعر المعتمد",
  approvedQuotationsReadyOpen: "لديك عروض أسعار معتمدة جاهزة — افتح واحدًا كمشروع لتبدأ التنفيذ.",
  averagePlanCompletion: "متوسط إنجاز الخطط",
  boardCouldNotLoad: "تعذّر تحميل لوحة هذا المشروع — قد لا تملك الوصول إليها.",
  bulk: "دفعة",
  cancel: "إلغاء",
  client: "العميل",
  close: "إغلاق",
  closestVisit: "أقرب زيارة",
  completed: "مكتمل",
  contactPerson: "جهة الاتصال",
  contract: "العقد",
  contractCoversDeliveredProject: "يغطي العقد مشروعًا مُسلَّمًا لفترة محددة، بعدد مقرر من الزيارات المخططة ومخصص من الزيارات الطارئة.",
  contractName: "اسم العقد",
  contractNoEmergencyVisits: "لا يتضمن هذا العقد زيارات طارئة.",
  createProject: "إنشاء المشروع",
  createProjectPlan: "إنشاء خطة المشروع",
  createsScheduleProjectCarrying: "يُنشئ جدولًا لهذا المشروع، ناقلًا تفاصيله معه.",
  creating: "جارٍ الإنشاء…",
  dashboardIsnYoursSee: "لوحة المعلومات ليست من صلاحياتك",
  date: "التاريخ",
  decisions: "القرارات",
  defaultDepartment: "القسم الافتراضي",
  defaultSupportPeriodDays: "فترة الدعم الافتراضية (بالأيام)",
  delete: "حذف",
  deleteProject: "حذف المشروع",
  department: "القسم",
  departmentPreSelected: "القسم المحدد مسبقًا في",
  derivedWhatAllocatedAgainst: "مشتق مما خُصص مقابل ما بيع",
  descriptionOfTheWork: "وصف العمل",
  didnSave: "لم يُحفظ ذلك.",
  direct: "مباشر",
  discard: "تجاهل",
  due30Days: "مستحق خلال 30 يومًا",
  durationDays: "المدة (بالأيام)",
  edit: "تعديل",
  editOvertime: "تعديل العمل الإضافي",
  email: "البريد الإلكتروني",
  emergencyAllowance: "مخصص الطوارئ",
  emergencyVisits: "الزيارات الطارئة",
  end: "النهاية",
  endTimeAfterStart: "يجب أن يكون وقت النهاية بعد وقت البداية.",
  endTimeMustAfter: "يجب أن يكون وقت النهاية بعد وقت البداية.",
  existingClient: "عميل قائم.",
  exportCsv: "تصدير CSV",
  findHiddenProject: "ابحث عن مشروع مخفي…",
  from: "من",
  fromApprovedQuotation: "من عرض سعر معتمد",
  fromTo: "من–إلى",
  giveName: "أعطِه اسمًا.",
  handler: "المتولّي",
  hours: "الساعات",
  howCompletionSplits: "كيف تتوزّع نسبة إنجاز المشروع على متطلباته — أي إجراءات الخدمة في استوديوك. أعطِ كلًّا منها نصيبًا؛ ومجموعها يجب أن يكون 100%. ولا تُحتسب إلا الإجراءات التي يحملها المشروع فعلًا، ويُعاد تحجيم أنصبتها لملء الشريط.",
  howLongProjectStays: "كم يبقى المشروع تحت الدعم بعد تاريخ انتهائه. يبدأ المشروع الجديد بهذه المدة، ويمكن تغييرها له وحده.",
  item: "الصنف",
  loadingProject: "جارٍ تحميل المشروع…",
  loadingProjects: "جارٍ تحميل المشاريع",
  loadingProjects2: "جارٍ تحميل المشاريع…",
  loadingProjectsAria: "جارٍ تحميل المشاريع",
  loadingSheet: "جارٍ تحميل الكشف…",
  location: "الموقع",
  logHoursWorkedProject: "سجّل الساعات المبذولة على مشروع خارج الخطة. وتُجمع هنا لكل مشروع ولكل شخص.",
  main: "الرئيسية",
  manager: "المدير",
  model: "الطراز",
  nEmergencyVisitsAllowed: (n: number) => `يسمح هذا العقد بـ${n === 1 ? "زيارة طارئة واحدة" : n === 2 ? "زيارتين طارئتين" : n <= 10 ? `${n} زيارات طارئة` : `${n} زيارة طارئة`}.`,
  nHours: (n: number) => `${n === 1 ? "ساعة واحدة" : n === 2 ? "ساعتان" : n <= 10 ? `${n} ساعات` : `${n} ساعة`}.`,
  nHoursPerPerson: (n: number) => `${n === 1 ? "ساعة واحدة" : n === 2 ? "ساعتان" : n <= 10 ? `${n} ساعات` : `${n} ساعة`} لكل شخص.`,
  nOvertimeHoursLogged: (n: number) => `${n} ساعة إضافية مسجّلة`,
  nVisitsScheduled: (n: number) => `إجمالًا ${n === 1 ? "زيارة واحدة مجدولة" : n === 2 ? "زيارتان مجدولتان" : n <= 10 ? `${n} زيارات مجدولة` : `${n} زيارة مجدولة`}`,
  nameIsnListCreatesClient: "هذا الاسم ليس في القائمة — سيُنشأ عميل جديد.",
  newClientWork: "عمل جديد لعميل",
  newProject: "مشروع جديد",
  noApprovedQuotationsWaiting: "لا توجد عروض أسعار معتمدة بالانتظار. اعتمد واحدًا في القسم الفني ليصبح قابلًا للاختيار هنا.",
  noClientsListHere: "لا توجد قائمة عملاء في هذا الاستوديو، فلا يوجد عميل يُسجَّل المشروع عليه. فعِّل قسم عملاء المبيعات أولًا.",
  noDataYet: "لا توجد بيانات بعد",
  noDepartmentsDepartmentSection: "لا توجد أقسام — القسم هو قطاع، ولا يوجد أي قطاع مفعّل في هذا الاستوديو.",
  noEmergencyVisitsRegistered: "لم تُسجَّل زيارات طارئة بعد.",
  noHiddenProjectMatches: "لا يوجد مشروع مخفي يطابق ذلك.",
  noNumberYet: "بلا رقم بعد",
  noOpenProjects: "لا توجد مشاريع مفتوحة.",
  noOvertimeRecordedYet: "لم يُسجَّل عمل إضافي بعد",
  noProjectDatesYet: "لا توجد تواريخ مشاريع بعد.",
  noProjectMatches: "لا يوجد مشروع يطابق ذلك.",
  noProjectNumberYet: "لا يوجد رقم مشروع بعد",
  noProjectValuesYet: "لا توجد قيم مشاريع بعد.",
  noProjectsMatchSearch: "لا توجد مشاريع تطابق هذا البحث.",
  noProjectsSigned: "لم تُوقَّع أي مشاريع بعد — تُعدّ كشوف المشروع عند فتحه من عرض سعر معتمد.",
  noProjectsSignedYet: "لم تُوقَّع أي مشاريع بعد.",
  noProjectsYet: "لا توجد مشاريع بعد",
  noQuotationBehindProject: "لا يوجد عرض سعر خلف هذا المشروع، فليست هناك بنود للعمل عليها. تمتلئ الجداول من البنود المسعّرة في عرض سعر معتمد.",
  billHasNoLines: "سُلّم هذا المشروع من مناقصة لم يُكتب لها جدول كميات بعد. تمتلئ الجداول من جدول الكميات، ويُكتب في قسم المناقصات.",
  noServiceActionsYet: "لا إجراءات خدمة بعد — أضفها في إعدادات الاستوديو ثم وزّع أوزانها هنا.",
  noSlaContractsYet: "لا توجد عقود مستوى خدمة بعد",
  noSlaContractsYet2: "لا توجد عقود مستوى خدمة بعد.",
  nobodyDepartment: "لا أحد في هذا القسم.",
  noneStock: "لا شيء في المخزون",
  notIssuedYet: "لم يُصدر بعد",
  notes: "ملاحظات",
  nothingAllocated: "لم يُخصَّص شيء",
  nothingHidden: "لا شيء مخفي.",
  nothingStockAllocate: "لا شيء في المخزون لتخصيصه.",
  nothingToShowQuotationLines: "لا شيء لعرضه بعد — تظهر بنود عرض السعر هنا متى فُتح مشروع من عرض سعر معتمد.",
  number: "الرقم",
  oneRecordWrittenPer: "يُكتب سجل واحد لكل شخص محدد.",
  onlyApprovedQuotationsCan: "عروض الأسعار المعتمدة وحدها هي التي يمكن أن تصير مشاريع.",
  onlyProjectEditorsCan: "لا يمكن بدء خطة إلا لمحرري المشاريع.",
  open: "فتح",
  openProject: "فتح المشروع",
  openProjectFirst: "افتح مشروعًا أولًا",
  openProjectPlan: "افتح خطة المشروع",
  openProjectsPerManager: "المشاريع المفتوحة لكل مدير",
  openQuotationViewer: "افتح عارض عرض السعر",
  opening: "جارٍ الفتح…",
  opensProjectSchedulePlanner: "يفتح جدول هذا المشروع في المخطِّط.",
  overdue: "متأخر",
  overtime: "العمل الإضافي",
  peopleListOpensFiltered: "، فتُفتح قائمة الأشخاص مصفّاة عليه.",
  person: "الشخص",
  pickDate: "اختر تاريخًا.",
  pickDateFirst: "اختر تاريخًا أولًا.",
  pickLeastOnePerson: "اختر شخصًا واحدًا على الأقل.",
  pickProject: "اختر مشروعًا.",
  plannedVisits: "الزيارات المخططة",
  progress: "التقدّم",
  project: "المشروع",
  project2: "← المشروع",
  projectAlreadyExistsQuotation: "يوجد مشروع بالفعل لعرض السعر ذاك.",
  projectBoard: "لوحة المشروع",
  projectManager: "مدير المشروع",
  projectNoLongerExists: "لم يعد هذا المشروع موجودًا.",
  projectNoSheetYet: "لا يوجد كشف لهذا المشروع بعد.",
  projectPlan: "خطة المشروع",
  projectProgress: "تقدّم المشاريع",
  projectQuotationPoSerial: "المشروع، عرض السعر، أمر الشراء، الرقم التسلسلي…",
  projectSheets: "← كشوف المشاريع",
  projectTimeline: "المسار الزمني للمشاريع",
  projectValue: "قيمة المشروع",
  projectColumns: "أعمدة المشاريع",
  projectCount: (shown, total) => {
    const what =
      total === 1 ? "مشروع"
      : total === 2 ? "مشروعين"
      : total <= 10 ? "مشاريع"
      : "مشروع";
    return `${shown} من ${total} ${what}.`;
  },
  projects: "المشاريع",
  projectsEmptySummary: "يُفتح المشروع من عرض سعر معتمد، أو يُنشأ مباشرةً من عمل أُسند إلى الاستوديو. ومتى سُجّل مشروع، لُخّصت هنا مراحله وقيمته وتقدّمه.",
  projectsOpenApprovedQuotation: "تُفتح المشاريع من عرض سعر معتمد، أو تُنشأ مباشرة لعمل أُسند إليك.",
  projectsStage: "المشاريع حسب المرحلة",
  qty: "الكمية",
  quotation: "عرض السعر",
  quotationHasnApprovedYet: "لم يُعتمد عرض السعر ذاك بعد.",
  quotationNoPricedLines: "عرض السعر خلف هذه الورقة لا يحمل بنودًا مسعّرة بعد. أضفها في المُنشئ لتظهر هنا.",
  received: "مستلم",
  registerEmergencyVisit: "سجّل زيارة طارئة",
  registeredProjectValue: "قيمة المشاريع المسجّلة",
  releaseUnit: "تحرير هذه الوحدة",
  remove: "إزالة",
  requirementWeights: "أوزان المتطلبات",
  reservedLine: "محجوزة لهذا السطر",
  save: "حفظ",
  saveContract: "حفظ العقد",
  saveSettings: "حفظ الإعدادات",
  saved: "تم الحفظ",
  saving: "جارٍ الحفظ…",
  schedule: "الجدول",
  searchTitleNumberClient: "ابحث بالعنوان أو الرقم أو العميل أو الموقع",
  seriesEnded: "انتهت",
  seriesStarted: "بدأت",
  setStartDateDuration: "حدّد تاريخ بداية ومدة وعدد زيارات لتوليد الزيارات.",
  sheet: "الكشف",
  sheetSettings: "إعدادات الكشف",
  signed: "موقّع",
  site: "الموقع",
  siteCity: "الموقع أو المدينة",
  slaContract: "عقد مستوى الخدمة",
  someChangesDidnSave: "لم تُحفظ بعض التغييرات — ولم يُرسل أي شيء بعد الصف الذي أخفق.",
  stage: "المرحلة",
  stages: "المراحل",
  stagesProjectMovesThrough: "المراحل التي يمر بها المشروع. وهي ثابتة حاليًا — تقرأها اللوحة والقائمة معًا.",
  start: "البداية",
  startDateRequiredVisit: "تاريخ البداية مطلوب — فجدول الزيارات يُحسب منه.",
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
  theyTotal100: "مجموعها 100٪.",
  ticket: "التذكرة",
  title: "العنوان",
  to: "إلى",
  total: "الإجمالي",
  totalRow: "الإجمالي",
  totalValue: "القيمة الإجمالية",
  typeIndustry: "نوع النشاط",
  unassigned: "غير مُسند",
  unassigned2: "غير مُسند",
  unnumbered: "بلا رقم",
  untitled: "بلا عنوان",
  value: "القيمة",
  valueStage: "القيمة حسب المرحلة",
  viewList: "قائمة",
  viewMatrix: "مصفوفة",
  viewOnly: "للعرض فقط",
  viewOnlyAccessPart: "لديك صلاحية عرض فقط على هذا الجزء من المشاريع.",
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
