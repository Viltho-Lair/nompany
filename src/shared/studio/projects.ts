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
  accessProjectsStudio: /* TR */ "You don't have access to Projects in this studio.",
  acrossEverySlaContract: /* TR */ "Across every SLA contract",
  actions: /* TR */ "Actions",
  activeProjects: /* TR */ "Active projects",
  addOvertime: /* TR */ "Add overtime",
  addSla: /* TR */ "Add SLA",
  addSlaContract: /* TR */ "Add SLA contract",
  allDepartments: /* TR */ "All departments",
  allocate: /* TR */ "Allocate…",
  approvedQuotation: /* TR */ "Approved quotation",
  averagePlanCompletion: /* TR */ "Average plan completion",
  bulk: /* TR */ "Bulk",
  cancel: /* TR */ "Cancel",
  client: /* TR */ "Client",
  close: /* TR */ "Close",
  completed: /* TR */ "Completed",
  contactPerson: /* TR */ "Contact person",
  contractCoversDeliveredProject: /* TR */ "A contract covers a delivered project for a period, with a set number of planned visits and an allowance of emergency ones.",
  contractName: /* TR */ "Contract name",
  contractNoEmergencyVisits: /* TR */ "This contract has no emergency visits.",
  dashboardIsnYoursSee: /* TR */ "The dashboard isn't yours to see",
  date: /* TR */ "Date",
  defaultDepartment: /* TR */ "Default department",
  defaultSupportPeriodDays: /* TR */ "Default support period (days)",
  delete: /* TR */ "Delete",
  deleteProject: /* TR */ "Delete project",
  departmentPreSelected: /* TR */ "The department pre-selected in",
  derivedWhatAllocatedAgainst: /* TR */ "Derived from what is allocated against what was sold",
  discard: /* TR */ "Discard",
  due30Days: /* TR */ "due in 30 days",
  durationDays: /* TR */ "Duration (days)",
  edit: /* TR */ "Edit",
  editOvertime: /* TR */ "Edit overtime",
  email: /* TR */ "Email",
  emergencyAllowance: /* TR */ "Emergency allowance",
  emergencyVisits: /* TR */ "Emergency visits",
  end: /* TR */ "End",
  exportCsv: /* TR */ "Export CSV",
  findHiddenProject: /* TR */ "Find a hidden project…",
  from: /* TR */ "From",
  handler: /* TR */ "Handler",
  hours: /* TR */ "Hours",
  howLongProjectStays: /* TR */ "How long a project stays in support after its end date. A new project starts with this, and can be changed on its own.",
  item: /* TR */ "Item",
  loadingProject: /* TR */ "Loading project…",
  loadingProjects: /* TR */ "Loading projects",
  loadingProjects2: /* TR */ "Loading Projects…",
  loadingSheet: /* TR */ "Loading sheet…",
  location: /* TR */ "Location",
  logHoursWorkedProject: /* TR */ "Log the hours worked on a project outside the plan. They add up per project and per person here.",
  main: /* TR */ "Main",
  manager: /* TR */ "Manager",
  model: /* TR */ "Model",
  noDataYet: /* TR */ "No data yet",
  noDepartmentsDepartmentSection: /* TR */ "No departments — a department is a section, and this studio has none switched on.",
  noEmergencyVisitsRegistered: /* TR */ "No emergency visits registered yet.",
  noNumberYet: /* TR */ "no number yet",
  noOpenProjects: /* TR */ "No open projects.",
  noOvertimeRecordedYet: /* TR */ "No overtime recorded yet",
  noProjectDatesYet: /* TR */ "No project dates yet.",
  noProjectValuesYet: /* TR */ "No project values yet.",
  noProjectsMatchSearch: /* TR */ "No projects match that search.",
  noProjectsYet: /* TR */ "No projects yet",
  noSlaContractsYet: /* TR */ "No SLA contracts yet",
  noSlaContractsYet2: /* TR */ "No SLA contracts yet.",
  nobodyDepartment: /* TR */ "Nobody in this department.",
  noneStock: /* TR */ "none in stock",
  notIssuedYet: /* TR */ "Not issued yet",
  notes: /* TR */ "Notes",
  nothingStockAllocate: /* TR */ "Nothing in stock to allocate.",
  number: /* TR */ "Number",
  oneRecordWrittenPer: /* TR */ "One record is written per person selected.",
  onlyApprovedQuotationsCan: /* TR */ "Only approved quotations can become projects.",
  openProject: /* TR */ "Open project",
  openProject2: /* TR */ "Open a project",
  openProjectsPerManager: /* TR */ "Open projects per manager",
  openQuotationViewer: /* TR */ "Open the quotation viewer",
  overdue: /* TR */ "Overdue",
  overtime: /* TR */ "Overtime",
  peopleListOpensFiltered: /* TR */ ", so the people list opens filtered to it.",
  person: /* TR */ "Person",
  plannedVisits: /* TR */ "Planned visits",
  progress: /* TR */ "Progress",
  project: /* TR */ "Project",
  projectManager: /* TR */ "Project manager",
  projectNoLongerExists: /* TR */ "That project no longer exists.",
  projectNoSheetYet: /* TR */ "This project has no sheet yet.",
  projectProgress: /* TR */ "Project progress",
  projectQuotationPoSerial: /* TR */ "Project, quotation, PO, serial…",
  projectTimeline: /* TR */ "Project timeline",
  projects: /* TR */ "Projects",
  projectsStage: /* TR */ "Projects by stage",
  qty: /* TR */ "Qty",
  received: /* TR */ "Received",
  registeredProjectValue: /* TR */ "Registered project value",
  releaseUnit: /* TR */ "Release this unit",
  remove: /* TR */ "Remove",
  requirementWeights: /* TR */ "Requirement weights",
  reservedLine: /* TR */ "Reserved to this line",
  saved: /* TR */ "Saved",
  schedule: /* TR */ "Schedule",
  searchTitleNumberClient: /* TR */ "Search title, number, client or location",
  setStartDateDuration: /* TR */ "Set a start date, duration and visit count to generate visits.",
  sheet: /* TR */ "Sheet",
  sheetSettings: /* TR */ "Sheet settings",
  signed: /* TR */ "Signed",
  site: /* TR */ "Site",
  siteCity: /* TR */ "Site or city",
  stage: /* TR */ "Stage",
  stages: /* TR */ "Stages",
  stagesProjectMovesThrough: /* TR */ "The stages a project moves through. These are fixed for now — the board and the list both read them.",
  start: /* TR */ "Start",
  startedEndedMonth: /* TR */ "Started and ended by month",
  starts: /* TR */ "Starts",
  status: /* TR */ "Status",
  studioKeepsModuleDashboards: /* TR */ "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  support: /* TR */ "Support",
  supportEnded: /* TR */ "Support ended",
  supportNotSet: /* TR */ "Support not set",
  supportPeriodDays: /* TR */ "Support period (days)",
  supportVisits: /* TR */ "Support visits",
  targetEnd: /* TR */ "Target end",
  thatIs: /* TR */ "That is",
  ticket: /* TR */ "Ticket",
  title: /* TR */ "Title",
  to: /* TR */ "To",
  total: /* TR */ "Total",
  totalValue: /* TR */ "Total value",
  unassigned: /* TR */ "Unassigned",
  value: /* TR */ "Value",
  valueStage: /* TR */ "Value by stage",
  viewOnly: /* TR */ "View only",
  viewOnlyAccessProjects: /* TR */ "You have view-only access to Projects settings.",
  visitScheduleGeneratedStart: /* TR */ "The visit schedule is generated from the start date, duration and visit count.",
  visits: /* TR */ "Visits",
  weightsMustTotal100: /* TR */ "Weights must total 100%.",
  whatSold: /* TR */ "What was sold",
  whereWorkSits: /* TR */ "Where the work sits",
  workloadManager: /* TR */ "Workload by manager",
};

const projects = { en, ar };

export function projectsDict(locale: string): Strings {
  return projects[locale as Locale] || projects[defaultLocale];
}
