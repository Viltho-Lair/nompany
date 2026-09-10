import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// PROJECTS — the list, one project's board and info, and the sheet viewer.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  closure: string;
  closureSub: string;
  loadingClosure: string;
  punchListHeading: string;
  punchOpen: string;
  punchClosed: string;
  punchClear: string;
  oldestOpenSnag: (n: number) => string;
  practicalCompletion: string;
  practicalCompletionHint: string;
  handoverDate: string;
  handoverHint: string;
  supportPeriod: string;
  supportPeriodHint: string;
  finalAccount: string;
  warrantyHeading: string;
  warrantyEnds: string;
  warrantyUnknown: string;
  warrantyNone: string;
  warrantyRunning: (n: number) => string;
  warrantyExpiring: (n: number) => string;
  warrantyExpired: (n: number) => string;
  closeProject: string;
  projectClosed: string;
  closedByOn: (who: string, when: string) => string;
  cannotCloseYet: string;
  blockerNoCompletion: string;
  blockerOpenSnags: string;
  refuseClosed: string;
  refuseHandoverBefore: string;
  refuseWarrantyNegative: string;
  refuseWarrantyFraction: string;
  refuseWarrantyRange: string;
  siteReports: string;
  siteReportsSub: string;
  loadingReports: string;
  noReports: string;
  noReportsBody: string;
  newReport: string;
  reportFor: (date: string) => string;
  reportDate: string;
  reportDateHint: string;
  weatherLabel: string;
  workStoppedLabel: string;
  labourLabel: string;
  tradeLabel: string;
  headcountLabel: string;
  plantLabel: string;
  plantDescription: string;
  plantCount: string;
  plantIdle: string;
  delaysLabel: string;
  delayWhat: string;
  delayHours: string;
  delayCause: string;
  progressLabel: string;
  visitorsLabel: string;
  photosLabel: string;
  photoAlt: (reference: string, n: number) => string;
  addPhoto: string;
  photoUploading: string;
  photoFailed: string;
  removeLabel: string;
  addLine: string;
  submitReport: string;
  submittedBadge: string;
  submittedByOn: (who: string, when: string) => string;
  onSiteCount: (n: number) => string;
  hoursLostCount: (n: number) => string;
  observedVsBooked: string;
  observedLabel: string;
  bookedLabel: string;
  noTimesheetYet: string;
  labourAgrees: string;
  labourDiffers: (n: number) => string;
  diaryHeading: string;
  diaryGaps: (n: number) => string;
  diaryGapRange: (from: string, to: string, days: number) => string;
  diaryComplete: string;
  daysSinceLast: (n: number) => string;
  totalHoursLost: string;
  weatherHoursLost: string;
  daysStopped: string;
  causeWeather: string;
  causeAccess: string;
  causeInformation: string;
  causeMaterials: string;
  causeLabour: string;
  causeOther: string;
  refuseDuplicateDay: string;
  refuseSubmittedEdit: string;
  refuseNegativeHours: string;
  refuseIdleExceeds: string;
  refuseNoDate: string;
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

  // The cost breakdown.
  costBreakdown: string;
  costBreakdownSub: string;
  loadingBilling: string;
  paymentSchedule: string;
  paymentScheduleSub: string;
  totalScheduled: string;
  unscheduled: string;
  overScheduled: string;
  totalInvoiced: string;
  outstanding: string;
  claimable: string;
  claimableHint: string;
  retention: string;
  retentionSub: string;
  editRetention: string;
  noRetentionAgreed: string;
  retentionHeld: string;
  ofInvoiced: string;
  retentionNet: string;
  retentionNetHint: string;
  retentionReleasable: string;
  noReleaseDate: string;
  releaseDue: string;
  retentionPercent: string;
  retentionReleaseDate: string;
  retentionReleaseHint: string;
  unattributedBilling: string;
  unattributedBillingHint: string;
  addMilestone: string;
  editMilestone: string;
  noMilestones: string;
  noMilestonesHint: string;
  milestoneCode: string;
  milestoneName: string;
  milestoneDue: string;
  milestoneAmount: string;
  milestoneInvoiced: string;
  milestoneRemaining: string;
  milestoneReady: string;
  milestonePending: string;
  milestoneOverdue: string;
  billedInFull: string;
  billedInPart: string;
  markReady: string;
  markPending: string;
  percentOfValue: string;
  percentOfValueHint: string;
  refuseDuplicateMilestone: string;
  refuseRetentionPercent: string;
  refuseMilestoneStatus: string;
  loadingCosts: string;
  noCostCodesYet: string;
  noCostCodesBody: string;
  addCostCode: string;
  editCostCode: string;
  seedFromBill: string;
  seedFromBillHint: string;
  costCode: string;
  costName: string;
  costBudget: string;
  costActual: string;
  costRemaining: string;
  totalBudget: string;
  totalActual: string;
  unallocated: string;
  overAllocated: string;
  uncodedSpend: string;
  uncodedSpendHint: string;
  overBudget: string;
  noBudgetSet: string;
  backToProject: string;
  refuseDuplicateCode: string;
  refuseAlreadySeeded: string;
  refuseNoBill: string;
  refuseNoTenderBehind: string;
  costCommitted: string;
  costForecast: string;
  costVariance: string;
  totalCommitted: string;
  totalForecast: string;
  willOverrun: string;
  uncommittedSpend: string;
  uncommittedSpendHint: string;
  forecastNote: string;

  // Earned value.
  earnedValue: string;
  earnedValueSub: string;
  evEarned: string;
  evPlanned: string;
  evSpent: string;
  evScheduleIndex: string;
  evCostIndex: string;
  evScheduleVariance: string;
  evCostVariance: string;
  evAtCompletion: string;
  evVarianceAtCompletion: string;
  evAhead: string;
  evBehind: string;
  evUnderCost: string;
  evOverCost: string;
  evNoBudget: string;
  evNoPlan: string;
  evNoDates: string;
  evStraightLine: string;
  evTwoForecasts: string;
  evElapsed: (pct: number) => string;
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
  // The dashboards' richer half (10/09/2026).
  dashValueVsProgress: string;
  dashValueVsProgressHint: string;
  dashScheduleHealth: string;
  dashScheduleHealthHint: string;
  dashOnTrack: string;
  dashDueSoon: string;
  dashOverdue: string;
  dashNoEndDate: string;
  dashOvertimeTrend: string;
  dashOvertimeTrendHint: string;
  dashSeriesHours: string;
  dashValueByClient: string;
  dashValueByClientHint: string;
  dashNoClient: string;
  dashOther: string;
  dashNoHistory: string;
};

const en: Strings = {
  ...commonEn,
  closure: "Closing out",
  closureSub: "The punch list, practical completion, and how long this job is still supported.",
  loadingClosure: "Loading…",
  punchListHeading: "Punch list",
  punchOpen: "Open",
  punchClosed: "Cleared",
  punchClear: "Nothing outstanding.",
  oldestOpenSnag: (n) => (n === 1 ? "Oldest open 1 day" : `Oldest open ${n} days`),
  practicalCompletion: "Practical completion",
  practicalCompletionHint: "The day the works became usable. A job cannot be closed without it.",
  handoverDate: "Handed over",
  handoverHint: "The support period is counted from this day.",
  supportPeriod: "Support period (days)",
  supportPeriodHint: "How long this job is supported after handover. Set per project; the studio default applies until you change it.",
  finalAccount: "Final account agreed",
  warrantyHeading: "Support",
  warrantyEnds: "Ends",
  warrantyUnknown: "Not handed over yet, so the support period has not started.",
  warrantyNone: "This job carries no support period.",
  warrantyRunning: (n) => `${n} days left`,
  warrantyExpiring: (n) => (n === 0 ? "Ends today" : n === 1 ? "Ends tomorrow" : `Ends in ${n} days`),
  warrantyExpired: (n) => `Ended ${Math.abs(n)} days ago`,
  closeProject: "Close the project",
  projectClosed: "Closed",
  closedByOn: (who, when) => `Closed by ${who} on ${when}`,
  cannotCloseYet: "Not ready to close:",
  blockerNoCompletion: "practical completion has not been recorded",
  blockerOpenSnags: "the punch list still has open items",
  refuseClosed: "That project is closed. Closing is a statement about the whole job, and it is not un-said quietly.",
  refuseHandoverBefore: "Handover cannot be earlier than practical completion.",
  refuseWarrantyNegative: "A support period cannot be negative.",
  refuseWarrantyFraction: "A support period is a whole number of days.",
  refuseWarrantyRange: "That support period is longer than ten years — check the number.",
  siteReports: "Site reports",
  siteReportsSub: "What happened on site each day — and where the diary is missing days.",
  loadingReports: "Loading site reports…",
  noReports: "No site reports yet",
  noReportsBody: "A daily report is the site’s own record of a day: who was there, what plant, the weather, what got done and what stopped. It is the evidence an extension of time is argued from, so it is worth writing on the day.",
  newReport: "New report",
  reportFor: (date) => `Report for ${date}`,
  reportDate: "Day reported on",
  reportDateHint: "The day this is about, not the day you are writing it. A report typed on Monday for Friday belongs on Friday.",
  weatherLabel: "Weather",
  workStoppedLabel: "Work stopped",
  labourLabel: "Labour on site",
  tradeLabel: "Trade",
  headcountLabel: "On site",
  plantLabel: "Plant",
  plantDescription: "Plant",
  plantCount: "On site",
  plantIdle: "Idle",
  delaysLabel: "Delays and disruption",
  delayWhat: "What happened",
  delayHours: "Hours lost",
  delayCause: "Cause",
  progressLabel: "Progress",
  visitorsLabel: "Visitors",
  photosLabel: "Photographs",
  photoAlt: (reference, n) => `Photograph ${n} on site report ${reference}`,
  addPhoto: "Add photograph",
  photoUploading: "Uploading…",
  photoFailed: "That photograph could not be stored.",
  removeLabel: "Remove",
  addLine: "Add",
  submitReport: "Submit",
  submittedBadge: "Submitted",
  submittedByOn: (who, when) => `Submitted by ${who} on ${when}`,
  onSiteCount: (n) => (n === 1 ? "1 on site" : `${n} on site`),
  hoursLostCount: (n) => (n === 1 ? "1 hour lost" : `${n} hours lost`),
  observedVsBooked: "Observed against timesheets",
  observedLabel: "Observed",
  bookedLabel: "On timesheets",
  noTimesheetYet: "No timesheet covers this day yet.",
  labourAgrees: "Agrees with the timesheets.",
  labourDiffers: (n) => (n > 0
    ? `${n} more on site than booked to this project.`
    : `${Math.abs(n)} more booked than were observed on site.`),
  diaryHeading: "The diary",
  diaryGaps: (n) => (n === 1 ? "1 gap in the diary" : `${n} gaps in the diary`),
  diaryGapRange: (from, to, days) => `${days} day${days === 1 ? "" : "s"} missing between ${from} and ${to}`,
  diaryComplete: "No missing days.",
  daysSinceLast: (n) => (n === 0 ? "Reported today" : n === 1 ? "1 day since the last report" : `${n} days since the last report`),
  totalHoursLost: "Hours lost",
  weatherHoursLost: "To weather",
  daysStopped: "Days work stopped",
  causeWeather: "Weather",
  causeAccess: "Access",
  causeInformation: "Information",
  causeMaterials: "Materials",
  causeLabour: "Labour",
  causeOther: "Other",
  refuseDuplicateDay: "There is already a report for that day. Edit it rather than writing a second one — a day with two reports has two answers.",
  refuseSubmittedEdit: "That report has been submitted. It is a record of the day as it was written, so it no longer edits.",
  refuseNegativeHours: "Hours lost cannot be negative.",
  refuseIdleExceeds: "More plant is marked idle than is on site.",
  refuseNoDate: "A report needs the day it is about.",
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

  costBreakdown: "Cost breakdown",
  costBreakdownSub: "What this job is allowed to cost, and what it has.",
  loadingBilling: "Loading the schedule…",
  paymentSchedule: "Payment schedule",
  paymentScheduleSub: "What may be billed, and when it is earned.",
  totalScheduled: "Scheduled",
  unscheduled: "Not yet scheduled",
  overScheduled: "Scheduled above the project value",
  totalInvoiced: "Invoiced",
  outstanding: "Outstanding",
  claimable: "Ready to claim",
  claimableHint: "Marked done and not yet billed",
  retention: "Retention",
  retentionSub: "What the client withholds from each claim, and when the last of it is due.",
  editRetention: "Retention terms",
  noRetentionAgreed: "No retention on this contract — every claim is payable in full.",
  retentionHeld: "Held",
  ofInvoiced: "of invoiced",
  retentionNet: "Net of retention",
  retentionNetHint: "What you can expect to be paid",
  retentionReleasable: "Releasable now",
  noReleaseDate: "No release date set — nobody has said when this is due.",
  releaseDue: "Due",
  retentionPercent: "Retention %",
  retentionReleaseDate: "Release date",
  retentionReleaseHint: "The defects-liability end. Releasing retention means raising an invoice for it, which is done in Finance — this screen only says what is held and when it falls due.",
  unattributedBilling: "Billed against no milestone",
  unattributedBillingHint: "Invoices raised on this project that name no schedule line, or name one since deleted. Real money, counted in the totals above — file them against a line to see where they belong.",
  addMilestone: "Add a milestone",
  editMilestone: "Edit milestone",
  noMilestones: "No payment schedule yet",
  noMilestonesHint: "A project has one number — what you will be paid. Break it into what you may claim and when, and every invoice raised against a line tells you what is left to bill.",
  milestoneCode: "Code",
  milestoneName: "Milestone",
  milestoneDue: "Due",
  milestoneAmount: "Amount",
  milestoneInvoiced: "Invoiced",
  milestoneRemaining: "Left to bill",
  milestoneReady: "Ready",
  milestonePending: "Pending",
  milestoneOverdue: "Overdue",
  billedInFull: "billed in full",
  billedInPart: "part billed",
  markReady: "Mark ready",
  markPending: "Mark pending",
  percentOfValue: "% of value",
  percentOfValueHint: "A shortcut that fills the amount. Nothing is stored as a percentage — the amount is what is kept.",
  refuseDuplicateMilestone: "Another line on this project already uses that code.",
  refuseRetentionPercent: "Retention must be between 0 and 100 per cent.",
  refuseMilestoneStatus: "A milestone is Pending or Ready. Whether it has been billed comes from the invoices themselves.",
  loadingCosts: "Loading the breakdown…",
  noCostCodesYet: "No cost codes yet",
  noCostCodesBody: "A project has one number — what you will be paid. Break it into the parts you buy separately, and every bill filed against one of them tells you where you stand.",
  addCostCode: "Add a cost code",
  editCostCode: "Edit cost code",
  seedFromBill: "Start from the bill of quantities",
  seedFromBillHint: "One code per section of the bill, budgeted at what that section was SOLD for. That is a starting point and not a cost — edit each one down to what you expect to spend.",
  costCode: "Code",
  costName: "Description",
  costBudget: "Budget",
  costActual: "Actual",
  costRemaining: "Remaining",
  totalBudget: "Budgeted",
  totalActual: "Spent",
  unallocated: "Not yet budgeted",
  overAllocated: "Budgeted above the project’s value",
  uncodedSpend: "Spend with no cost code",
  uncodedSpendHint: "Bills on this project that name no code, or one that has since been deleted. It is counted in the total — dropping it would make the job look cheaper than it is.",
  overBudget: "Over",
  noBudgetSet: "No budget",
  backToProject: "Back to the project",
  refuseDuplicateCode: "A cost code with that reference already exists on this project.",
  refuseAlreadySeeded: "This project already has a breakdown. Starting from the bill is a first step, not a merge.",
  refuseNoBill: "That tender has no bill of quantities to start from.",
  refuseNoTenderBehind: "This project was not handed over from a tender, so there is no bill to start from.",
  costCommitted: "Committed",
  costForecast: "Forecast",
  costVariance: "Variance",
  totalCommitted: "Committed",
  totalForecast: "Forecast",
  willOverrun: "Heading over",
  uncommittedSpend: "Orders with no cost code",
  uncommittedSpendHint: "Purchase orders on this project that name no code, or one that has since been deleted. Counted in the forecast — leaving them out would show the job finishing cheaper than it will.",
  forecastNote: "Forecast is what has been spent plus what is still ordered, or the budget — whichever is larger. A code inside its allowance is expected to spend it, because the work is not done.",

  earnedValue: "Earned value",
  earnedValueSub: "What the work done is worth, against what it cost and what it should have cost by now.",
  evEarned: "Earned",
  evPlanned: "Planned",
  evSpent: "Spent",
  evScheduleIndex: "Schedule index",
  evCostIndex: "Cost index",
  evScheduleVariance: "Schedule variance",
  evCostVariance: "Cost variance",
  evAtCompletion: "At this rate",
  evVarianceAtCompletion: "Against budget",
  evAhead: "Ahead of schedule",
  evBehind: "Behind schedule",
  evUnderCost: "Costing less than it earns",
  evOverCost: "Costing more than it earns",
  evNoBudget: "Nothing is budgeted yet, so there is no value to earn. Add cost codes below.",
  evNoPlan: "This project has no plan, so how far the work has got cannot be measured. Draw one in the planner.",
  evNoDates: "This project has no start and end date, so there is nothing to measure the schedule against. The cost half is below.",
  evStraightLine: "Planned value assumes the budget is spread evenly across the calendar. The plan’s own curve needs task dates the planner does not store.",
  evTwoForecasts: "Two forecasts, and they answer different questions: “At this rate” projects the budget at the cost performance so far; “Forecast” above is the ledger — what is spent plus what is ordered.",
  evElapsed: (pct) => `${pct}% of the schedule has gone`,
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
  // THE DASHBOARDS' RICHER HALF (10/09/2026).
  dashValueVsProgress: "Value against progress",
  dashValueVsProgressHint: "Each open project: plan completion across, value up",
  dashScheduleHealth: "Schedule health",
  dashScheduleHealthHint: "Open projects against their end dates",
  dashOnTrack: "On track",
  dashDueSoon: "Due within 30 days",
  dashOverdue: "Overdue",
  dashNoEndDate: "No end date",
  dashOvertimeTrend: "Overtime by month",
  dashOvertimeTrendHint: "Hours logged, last 12 months",
  dashSeriesHours: "Hours",
  dashValueByClient: "Value by client",
  dashValueByClientHint: "Project value per client, largest first",
  dashNoClient: "No client",
  dashOther: "Other",
  dashNoHistory: "Not enough history yet.",
};

const ar: Strings = {
  ...commonAr,
  closure: "الإغلاق",
  closureSub: "قائمة الملاحظات، والإنجاز الفعلي، ومدة الدعم المتبقية.",
  loadingClosure: "جار التحميل…",
  punchListHeading: "قائمة الملاحظات",
  punchOpen: "مفتوح",
  punchClosed: "معالج",
  punchClear: "لا شيء عالق.",
  oldestOpenSnag: (n) => (n === 1 ? "أقدم مفتوح منذ يوم" : `أقدم مفتوح منذ ${n} يوما`),
  practicalCompletion: "الإنجاز الفعلي",
  practicalCompletionHint: "يوم صارت فيه الأعمال قابلة للاستعمال. لا يغلق المشروع بدونه.",
  handoverDate: "تاريخ التسليم",
  handoverHint: "تحسب مدة الدعم من هذا اليوم.",
  supportPeriod: "مدة الدعم (أيام)",
  supportPeriodHint: "مدة دعم هذا المشروع بعد التسليم. تضبط لكل مشروع، ويسري افتراض الاستوديو حتى تغيره.",
  finalAccount: "اعتمد الحساب الختامي",
  warrantyHeading: "الدعم",
  warrantyEnds: "ينتهي",
  warrantyUnknown: "لم يسلم بعد، فلم تبدأ مدة الدعم.",
  warrantyNone: "لا مدة دعم لهذا المشروع.",
  warrantyRunning: (n) => `متبق ${n} يوما`,
  warrantyExpiring: (n) => (n === 0 ? "ينتهي اليوم" : n === 1 ? "ينتهي غدا" : `ينتهي بعد ${n} يوما`),
  warrantyExpired: (n) => `انتهى منذ ${Math.abs(n)} يوما`,
  closeProject: "إغلاق المشروع",
  projectClosed: "مغلق",
  closedByOn: (who, when) => `أغلقه ${who} في ${when}`,
  cannotCloseYet: "غير جاهز للإغلاق:",
  blockerNoCompletion: "لم يسجل الإنجاز الفعلي",
  blockerOpenSnags: "ما زالت في القائمة بنود مفتوحة",
  refuseClosed: "هذا المشروع مغلق. والإغلاق حكم على العمل كله، لا يراجع بصمت.",
  refuseHandoverBefore: "لا يكون التسليم قبل الإنجاز الفعلي.",
  refuseWarrantyNegative: "لا تكون مدة الدعم سالبة.",
  refuseWarrantyFraction: "مدة الدعم عدد صحيح من الأيام.",
  refuseWarrantyRange: "مدة الدعم تتجاوز عشر سنوات — راجع الرقم.",
  siteReports: "التقارير اليومية",
  siteReportsSub: "ما جرى في الموقع كل يوم — وأين تنقص الأيام من السجل.",
  loadingReports: "جار تحميل التقارير…",
  noReports: "لا توجد تقارير يومية بعد",
  noReportsBody: "التقرير اليومي هو سجل الموقع ليومه: من حضر، وأي معدات، والطقس، وما أنجز وما توقف. وهو الدليل الذي تطلب به المدة الإضافية، فيكتب في يومه.",
  newReport: "تقرير جديد",
  reportFor: (date) => `تقرير ${date}`,
  reportDate: "اليوم المشمول",
  reportDateHint: "اليوم الذي يتحدث عنه التقرير، لا يوم كتابته.",
  weatherLabel: "الطقس",
  workStoppedLabel: "توقف العمل",
  labourLabel: "العمالة في الموقع",
  tradeLabel: "المهنة",
  headcountLabel: "العدد",
  plantLabel: "المعدات",
  plantDescription: "المعدة",
  plantCount: "العدد",
  plantIdle: "متوقفة",
  delaysLabel: "التأخير والتعطل",
  delayWhat: "ما حدث",
  delayHours: "الساعات الضائعة",
  delayCause: "السبب",
  progressLabel: "الإنجاز",
  visitorsLabel: "الزوار",
  photosLabel: "الصور",
  photoAlt: (reference, n) => `صورة ${n} في تقرير الموقع ${reference}`,
  addPhoto: "إضافة صورة",
  photoUploading: "جار الرفع…",
  photoFailed: "تعذر حفظ الصورة.",
  removeLabel: "حذف",
  addLine: "إضافة",
  submitReport: "اعتماد",
  submittedBadge: "معتمد",
  submittedByOn: (who, when) => `اعتمده ${who} في ${when}`,
  onSiteCount: (n) => (n === 1 ? "واحد في الموقع" : `${n} في الموقع`),
  hoursLostCount: (n) => (n === 1 ? "ساعة ضائعة" : `${n} ساعات ضائعة`),
  observedVsBooked: "المرصود مقابل الكشوف",
  observedLabel: "المرصود",
  bookedLabel: "في الكشوف",
  noTimesheetYet: "لا يغطي هذا اليوم كشف بعد.",
  labourAgrees: "مطابق للكشوف.",
  labourDiffers: (n) => (n > 0
    ? `${n} في الموقع أكثر مما قيد على المشروع.`
    : `${Math.abs(n)} مقيدون أكثر مما رصد في الموقع.`),
  diaryHeading: "السجل",
  diaryGaps: (n) => (n === 1 ? "فجوة واحدة في السجل" : `${n} فجوات في السجل`),
  diaryGapRange: (from, to, days) => `${days} يوما ناقصا بين ${from} و${to}`,
  diaryComplete: "لا أيام ناقصة.",
  daysSinceLast: (n) => (n === 0 ? "جرى التقرير اليوم" : n === 1 ? "يوم منذ آخر تقرير" : `${n} يوما منذ آخر تقرير`),
  totalHoursLost: "الساعات الضائعة",
  weatherHoursLost: "بسبب الطقس",
  daysStopped: "أيام توقف العمل",
  causeWeather: "الطقس",
  causeAccess: "الوصول",
  causeInformation: "المعلومات",
  causeMaterials: "المواد",
  causeLabour: "العمالة",
  causeOther: "أخرى",
  refuseDuplicateDay: "يوجد تقرير لهذا اليوم بالفعل. عدله بدل كتابة ثان — فاليوم بتقريرين له جوابان.",
  refuseSubmittedEdit: "اعتمد هذا التقرير. وهو سجل اليوم كما كتب، فلم يعد يعدل.",
  refuseNegativeHours: "لا تكون الساعات الضائعة سالبة.",
  refuseIdleExceeds: "المعدات المتوقفة أكثر مما في الموقع.",
  refuseNoDate: "التقرير يحتاج إلى اليوم الذي يخصه.",
  acrossProjects: (n) => `عبر ${n === 1 ? "مشروع واحد" : n === 2 ? "مشروعين" : n <= 10 ? `${n} مشاريع` : `${n} مشروعا`}`,
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
  approvedQuotationsReadyOpen: "لديك عروض أسعار معتمدة جاهزة — افتح واحدا كمشروع لتبدأ التنفيذ.",
  averagePlanCompletion: "متوسط إنجاز الخطط",
  boardCouldNotLoad: "تعذر تحميل لوحة هذا المشروع — قد لا تملك الوصول إليها.",
  bulk: "دفعة",
  cancel: "إلغاء",
  client: "العميل",
  close: "إغلاق",
  closestVisit: "أقرب زيارة",
  completed: "مكتمل",
  contactPerson: "جهة الاتصال",
  contract: "العقد",
  contractCoversDeliveredProject: "يغطي العقد مشروعا مسلما لفترة محددة، بعدد مقرر من الزيارات المخططة ومخصص من الزيارات الطارئة.",
  contractName: "اسم العقد",
  contractNoEmergencyVisits: "لا يتضمن هذا العقد زيارات طارئة.",
  createProject: "إنشاء المشروع",
  createProjectPlan: "إنشاء خطة المشروع",
  createsScheduleProjectCarrying: "ينشئ جدولا لهذا المشروع، ناقلا تفاصيله معه.",
  creating: "جار الإنشاء…",
  dashboardIsnYoursSee: "لوحة المعلومات ليست من صلاحياتك",
  date: "التاريخ",
  decisions: "القرارات",
  defaultDepartment: "القسم الافتراضي",
  defaultSupportPeriodDays: "فترة الدعم الافتراضية (بالأيام)",
  delete: "حذف",
  deleteProject: "حذف المشروع",
  department: "القسم",
  departmentPreSelected: "القسم المحدد مسبقا في",
  derivedWhatAllocatedAgainst: "مشتق مما خصص مقابل ما بيع",
  descriptionOfTheWork: "وصف العمل",
  didnSave: "لم يحفظ ذلك.",
  direct: "مباشر",
  discard: "تجاهل",
  due30Days: "مستحق خلال 30 يوما",
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
  giveName: "أعطه اسما.",
  handler: "المتولي",
  hours: "الساعات",
  howCompletionSplits: "كيف تتوزع نسبة إنجاز المشروع على متطلباته — أي إجراءات الخدمة في استوديوك. أعط كلا منها نصيبا؛ ومجموعها يجب أن يكون 100%. ولا تحتسب إلا الإجراءات التي يحملها المشروع فعلا، ويعاد تحجيم أنصبتها لملء الشريط.",
  howLongProjectStays: "كم يبقى المشروع تحت الدعم بعد تاريخ انتهائه. يبدأ المشروع الجديد بهذه المدة، ويمكن تغييرها له وحده.",
  item: "الصنف",
  loadingProject: "جار تحميل المشروع…",
  loadingProjects: "جار تحميل المشاريع",
  loadingProjects2: "جار تحميل المشاريع…",
  loadingProjectsAria: "جار تحميل المشاريع",
  loadingSheet: "جار تحميل الكشف…",
  location: "الموقع",
  logHoursWorkedProject: "سجل الساعات المبذولة على مشروع خارج الخطة. وتجمع هنا لكل مشروع ولكل شخص.",
  main: "الرئيسية",
  manager: "المدير",
  model: "الطراز",
  nEmergencyVisitsAllowed: (n: number) => `يسمح هذا العقد بـ${n === 1 ? "زيارة طارئة واحدة" : n === 2 ? "زيارتين طارئتين" : n <= 10 ? `${n} زيارات طارئة` : `${n} زيارة طارئة`}.`,
  nHours: (n: number) => `${n === 1 ? "ساعة واحدة" : n === 2 ? "ساعتان" : n <= 10 ? `${n} ساعات` : `${n} ساعة`}.`,
  nHoursPerPerson: (n: number) => `${n === 1 ? "ساعة واحدة" : n === 2 ? "ساعتان" : n <= 10 ? `${n} ساعات` : `${n} ساعة`} لكل شخص.`,
  nOvertimeHoursLogged: (n: number) => `${n} ساعة إضافية مسجلة`,
  nVisitsScheduled: (n: number) => `إجمالا ${n === 1 ? "زيارة واحدة مجدولة" : n === 2 ? "زيارتان مجدولتان" : n <= 10 ? `${n} زيارات مجدولة` : `${n} زيارة مجدولة`}`,
  nameIsnListCreatesClient: "هذا الاسم ليس في القائمة — سينشأ عميل جديد.",
  newClientWork: "عمل جديد لعميل",
  newProject: "مشروع جديد",
  noApprovedQuotationsWaiting: "لا توجد عروض أسعار معتمدة بالانتظار. اعتمد واحدا في القسم الفني ليصبح قابلا للاختيار هنا.",
  noClientsListHere: "لا توجد قائمة عملاء في هذا الاستوديو، فلا يوجد عميل يسجل المشروع عليه. فعل قسم عملاء المبيعات أولا.",
  noDataYet: "لا توجد بيانات بعد",
  noDepartmentsDepartmentSection: "لا توجد أقسام — القسم هو قطاع، ولا يوجد أي قطاع مفعل في هذا الاستوديو.",
  noEmergencyVisitsRegistered: "لم تسجل زيارات طارئة بعد.",
  noHiddenProjectMatches: "لا يوجد مشروع مخفي يطابق ذلك.",
  noNumberYet: "بلا رقم بعد",
  noOpenProjects: "لا توجد مشاريع مفتوحة.",
  noOvertimeRecordedYet: "لم يسجل عمل إضافي بعد",
  noProjectDatesYet: "لا توجد تواريخ مشاريع بعد.",
  noProjectMatches: "لا يوجد مشروع يطابق ذلك.",
  noProjectNumberYet: "لا يوجد رقم مشروع بعد",
  noProjectValuesYet: "لا توجد قيم مشاريع بعد.",
  noProjectsMatchSearch: "لا توجد مشاريع تطابق هذا البحث.",
  noProjectsSigned: "لم توقع أي مشاريع بعد — تعد كشوف المشروع عند فتحه من عرض سعر معتمد.",
  noProjectsSignedYet: "لم توقع أي مشاريع بعد.",
  noProjectsYet: "لا توجد مشاريع بعد",
  noQuotationBehindProject: "لا يوجد عرض سعر خلف هذا المشروع، فليست هناك بنود للعمل عليها. تمتلئ الجداول من البنود المسعرة في عرض سعر معتمد.",
  billHasNoLines: "سلم هذا المشروع من مناقصة لم يكتب لها جدول كميات بعد. تمتلئ الجداول من جدول الكميات، ويكتب في قسم المناقصات.",

  costBreakdown: "توزيع التكلفة",
  costBreakdownSub: "ما يسمح لهذا العمل أن يكلف، وما كلف فعلا.",
  loadingBilling: "جار تحميل جدول الدفعات…",
  paymentSchedule: "جدول الدفعات",
  paymentScheduleSub: "ما يجوز إصدار فاتورة به، ومتى يستحق.",
  totalScheduled: "المجدول",
  unscheduled: "غير مجدول بعد",
  overScheduled: "المجدول يتجاوز قيمة المشروع",
  totalInvoiced: "المفوتر",
  outstanding: "المستحق القائم",
  claimable: "جاهز للمطالبة",
  claimableHint: "معلم كمنجز ولم تصدر به فاتورة",
  retention: "المحتجز",
  retentionSub: "ما يحجزه العميل من كل مطالبة، ومتى يستحق آخره.",
  editRetention: "شروط الاحتجاز",
  noRetentionAgreed: "لا احتجاز في هذا العقد — كل مطالبة مستحقة بالكامل.",
  retentionHeld: "المحتجز",
  ofInvoiced: "من المفوتر",
  retentionNet: "الصافي بعد الاحتجاز",
  retentionNetHint: "ما يمكن توقع قبضه",
  retentionReleasable: "قابل للإفراج الآن",
  noReleaseDate: "لم يحدد تاريخ إفراج — لم يقل أحد متى يستحق هذا.",
  releaseDue: "يستحق",
  retentionPercent: "نسبة الاحتجاز %",
  retentionReleaseDate: "تاريخ الإفراج",
  retentionReleaseHint: "نهاية فترة ضمان العيوب. الإفراج عن المحتجز يعني إصدار فاتورة به، وذلك يجري في المالية — هذه الشاشة تقول فقط كم المحتجز ومتى يستحق.",
  unattributedBilling: "مفوتر دون بند",
  unattributedBillingHint: "فواتير صدرت على هذا المشروع ولا تسمي بند جدول، أو تسمي بندا حذف. مال حقيقي، محسوب في الإجماليات أعلاه — قيدها على بند لتعرف أين مكانها.",
  addMilestone: "إضافة بند",
  editMilestone: "تعديل البند",
  noMilestones: "لا يوجد جدول دفعات بعد",
  noMilestonesHint: "للمشروع رقم واحد — ما ستقبض. قسمه إلى ما يجوز لك المطالبة به ومتى، وكل فاتورة تصدر على بند تقول لك كم بقي.",
  milestoneCode: "الرمز",
  milestoneName: "البند",
  milestoneDue: "الاستحقاق",
  milestoneAmount: "المبلغ",
  milestoneInvoiced: "المفوتر",
  milestoneRemaining: "المتبقي للفوترة",
  milestoneReady: "جاهز",
  milestonePending: "معلق",
  milestoneOverdue: "متأخر",
  billedInFull: "مفوتر بالكامل",
  billedInPart: "مفوتر جزئيا",
  markReady: "تعليم كجاهز",
  markPending: "إعادة إلى معلق",
  percentOfValue: "% من القيمة",
  percentOfValueHint: "اختصار يملأ المبلغ. لا يخزن شيء كنسبة — المبلغ هو ما يحفظ.",
  refuseDuplicateMilestone: "يوجد بند آخر في هذا المشروع يستخدم هذا الرمز.",
  refuseRetentionPercent: "يجب أن تكون نسبة الاحتجاز بين 0 و100 بالمئة.",
  refuseMilestoneStatus: "البند إما معلق أو جاهز. أما هل صدرت به فاتورة فتقوله الفواتير نفسها.",
  loadingCosts: "جار تحميل التوزيع…",
  noCostCodesYet: "لا توجد بنود تكلفة بعد",
  noCostCodesBody: "للمشروع رقم واحد — ما ستقبض. قسمه إلى الأجزاء التي تشتريها منفصلة، وكل فاتورة تقيد على أحدها تقول لك أين أنت.",
  addCostCode: "إضافة بند تكلفة",
  editCostCode: "تعديل بند التكلفة",
  seedFromBill: "البدء من جدول الكميات",
  seedFromBillHint: "بند لكل قسم من جدول الكميات، بميزانية ما بيع به ذلك القسم. هذه نقطة بداية وليست تكلفة — عدل كل بند إلى ما تتوقع إنفاقه.",
  costCode: "الرمز",
  costName: "الوصف",
  costBudget: "الميزانية",
  costActual: "المنصرف",
  costRemaining: "المتبقي",
  totalBudget: "إجمالي الميزانية",
  totalActual: "المنصرف",
  unallocated: "غير موزع بعد",
  overAllocated: "الميزانية تتجاوز قيمة المشروع",
  uncodedSpend: "منصرف بلا بند تكلفة",
  uncodedSpendHint: "فواتير على هذا المشروع لا تذكر بندا، أو تذكر بندا حذف. تحسب ضمن الإجمالي — إسقاطها يظهر العمل أرخص مما هو.",
  overBudget: "تجاوز",
  noBudgetSet: "بلا ميزانية",
  backToProject: "العودة إلى المشروع",
  refuseDuplicateCode: "يوجد بند تكلفة بهذا الرمز في هذا المشروع.",
  refuseAlreadySeeded: "لهذا المشروع توزيع بالفعل. البدء من الجدول خطوة أولى وليس دمجا.",
  refuseNoBill: "لا يوجد جدول كميات لتلك المناقصة.",
  refuseNoTenderBehind: "لم يسلم هذا المشروع من مناقصة، فلا جدول يبدأ منه.",
  costCommitted: "ملتزم به",
  costForecast: "المتوقع",
  costVariance: "الفرق",
  totalCommitted: "ملتزم به",
  totalForecast: "المتوقع",
  willOverrun: "متجه للتجاوز",
  uncommittedSpend: "أوامر شراء بلا بند تكلفة",
  uncommittedSpendHint: "أوامر شراء على هذا المشروع لا تذكر بندا، أو تذكر بندا حذف. تحسب ضمن المتوقع — إسقاطها يظهر العمل منتهيا أرخص مما سيكون.",
  forecastNote: "المتوقع هو ما صرف زائد ما لا يزال مطلوبا، أو الميزانية، أيهما أكبر. البند داخل ميزانيته يتوقع أن ينفقها، لأن العمل لم ينته.",

  earnedValue: "القيمة المكتسبة",
  earnedValueSub: "ما يساويه العمل المنجز، مقابل ما كلف وما كان ينبغي أن يكلف حتى الآن.",
  evEarned: "المكتسب",
  evPlanned: "المخطط",
  evSpent: "المنصرف",
  evScheduleIndex: "مؤشر الجدول الزمني",
  evCostIndex: "مؤشر التكلفة",
  evScheduleVariance: "فرق الجدول",
  evCostVariance: "فرق التكلفة",
  evAtCompletion: "على هذا المعدل",
  evVarianceAtCompletion: "مقابل الميزانية",
  evAhead: "متقدم عن الجدول",
  evBehind: "متأخر عن الجدول",
  evUnderCost: "يكلف أقل مما يكسب",
  evOverCost: "يكلف أكثر مما يكسب",
  evNoBudget: "لا توجد ميزانية بعد، فلا قيمة تكتسب. أضف بنود التكلفة أدناه.",
  evNoPlan: "لا خطة لهذا المشروع، فلا يمكن قياس ما أنجز من العمل. ارسم خطة في المخطط.",
  evNoDates: "لا تاريخ بداية ونهاية لهذا المشروع، فلا شيء يقاس عليه الجدول. الشق المالي أدناه.",
  evStraightLine: "القيمة المخططة تفترض توزيع الميزانية بالتساوي على المدة. منحنى الخطة نفسها يحتاج تواريخ مهام لا يحفظها المخطط.",
  evTwoForecasts: "توقعان يجيبان سؤالين مختلفين: «على هذا المعدل» يسقط الميزانية على أداء التكلفة حتى الآن؛ و«المتوقع» أعلاه هو الدفتر: ما صرف زائد ما طلب.",
  evElapsed: (pct) => `مضى ${pct}% من المدة`,
  noServiceActionsYet: "لا إجراءات خدمة بعد — أضفها في إعدادات الاستوديو ثم وزع أوزانها هنا.",
  noSlaContractsYet: "لا توجد عقود مستوى خدمة بعد",
  noSlaContractsYet2: "لا توجد عقود مستوى خدمة بعد.",
  nobodyDepartment: "لا أحد في هذا القسم.",
  noneStock: "لا شيء في المخزون",
  notIssuedYet: "لم يصدر بعد",
  notes: "ملاحظات",
  nothingAllocated: "لم يخصص شيء",
  nothingHidden: "لا شيء مخفي.",
  nothingStockAllocate: "لا شيء في المخزون لتخصيصه.",
  nothingToShowQuotationLines: "لا شيء لعرضه بعد — تظهر بنود عرض السعر هنا متى فتح مشروع من عرض سعر معتمد.",
  number: "الرقم",
  oneRecordWrittenPer: "يكتب سجل واحد لكل شخص محدد.",
  onlyApprovedQuotationsCan: "عروض الأسعار المعتمدة وحدها هي التي يمكن أن تصير مشاريع.",
  onlyProjectEditorsCan: "لا يمكن بدء خطة إلا لمحرري المشاريع.",
  open: "فتح",
  openProject: "فتح المشروع",
  openProjectFirst: "افتح مشروعا أولا",
  openProjectPlan: "افتح خطة المشروع",
  openProjectsPerManager: "المشاريع المفتوحة لكل مدير",
  openQuotationViewer: "افتح عارض عرض السعر",
  opening: "جار الفتح…",
  opensProjectSchedulePlanner: "يفتح جدول هذا المشروع في المخطط.",
  overdue: "متأخر",
  overtime: "العمل الإضافي",
  peopleListOpensFiltered: "، فتفتح قائمة الأشخاص مصفاة عليه.",
  person: "الشخص",
  pickDate: "اختر تاريخا.",
  pickDateFirst: "اختر تاريخا أولا.",
  pickLeastOnePerson: "اختر شخصا واحدا على الأقل.",
  pickProject: "اختر مشروعا.",
  plannedVisits: "الزيارات المخططة",
  progress: "التقدم",
  project: "المشروع",
  project2: "← المشروع",
  projectAlreadyExistsQuotation: "يوجد مشروع بالفعل لعرض السعر ذاك.",
  projectBoard: "لوحة المشروع",
  projectManager: "مدير المشروع",
  projectNoLongerExists: "لم يعد هذا المشروع موجودا.",
  projectNoSheetYet: "لا يوجد كشف لهذا المشروع بعد.",
  projectPlan: "خطة المشروع",
  projectProgress: "تقدم المشاريع",
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
  projectsEmptySummary: "يفتح المشروع من عرض سعر معتمد، أو ينشأ مباشرة من عمل أسند إلى الاستوديو. ومتى سجل مشروع، لخصت هنا مراحله وقيمته وتقدمه.",
  projectsOpenApprovedQuotation: "تفتح المشاريع من عرض سعر معتمد، أو تنشأ مباشرة لعمل أسند إليك.",
  projectsStage: "المشاريع حسب المرحلة",
  qty: "الكمية",
  quotation: "عرض السعر",
  quotationHasnApprovedYet: "لم يعتمد عرض السعر ذاك بعد.",
  quotationNoPricedLines: "عرض السعر خلف هذه الورقة لا يحمل بنودا مسعرة بعد. أضفها في المنشئ لتظهر هنا.",
  received: "مستلم",
  registerEmergencyVisit: "سجل زيارة طارئة",
  registeredProjectValue: "قيمة المشاريع المسجلة",
  releaseUnit: "تحرير هذه الوحدة",
  remove: "إزالة",
  requirementWeights: "أوزان المتطلبات",
  reservedLine: "محجوزة لهذا السطر",
  save: "حفظ",
  saveContract: "حفظ العقد",
  saveSettings: "حفظ الإعدادات",
  saved: "تم الحفظ",
  saving: "جار الحفظ…",
  schedule: "الجدول",
  searchTitleNumberClient: "ابحث بالعنوان أو الرقم أو العميل أو الموقع",
  seriesEnded: "انتهت",
  seriesStarted: "بدأت",
  setStartDateDuration: "حدد تاريخ بداية ومدة وعدد زيارات لتوليد الزيارات.",
  sheet: "الكشف",
  sheetSettings: "إعدادات الكشف",
  signed: "موقع",
  site: "الموقع",
  siteCity: "الموقع أو المدينة",
  slaContract: "عقد مستوى الخدمة",
  someChangesDidnSave: "لم تحفظ بعض التغييرات — ولم يرسل أي شيء بعد الصف الذي أخفق.",
  stage: "المرحلة",
  stages: "المراحل",
  stagesProjectMovesThrough: "المراحل التي يمر بها المشروع. وهي ثابتة حاليا — تقرأها اللوحة والقائمة معا.",
  start: "البداية",
  startDateRequiredVisit: "تاريخ البداية مطلوب — فجدول الزيارات يحسب منه.",
  startedEndedMonth: "البدء والانتهاء حسب الشهر",
  starts: "يبدأ",
  status: "الحالة",
  studioKeepsModuleDashboards: "يبقي هذا الاستوديو لوحات معلومات الوحدات خلف صلاحية خاصة بها. الشاشات التي تحتها غير متأثرة — اختر واحدة من الشريط الجانبي.",
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
  unassigned: "غير مسند",
  unassigned2: "غير مسند",
  unnumbered: "بلا رقم",
  untitled: "بلا عنوان",
  value: "القيمة",
  valueStage: "القيمة حسب المرحلة",
  viewList: "قائمة",
  viewMatrix: "مصفوفة",
  viewOnly: "للعرض فقط",
  viewOnlyAccessPart: "لديك صلاحية عرض فقط على هذا الجزء من المشاريع.",
  viewOnlyAccessProjects: "لديك صلاحية عرض فقط على إعدادات المشاريع.",
  visitScheduleGeneratedStart: "يولد جدول الزيارات من تاريخ البداية والمدة وعدد الزيارات.",
  visits: "الزيارات",
  weightsMustTotal100: "يجب أن يكون مجموع الأوزان 100٪.",
  whatSold: "ما تم بيعه",
  whereWorkSits: "أين يقف العمل",
  workloadManager: "عبء العمل حسب المدير",
  // THE DASHBOARDS' RICHER HALF (10/09/2026).
  dashValueVsProgress: "القيمة مقابل التقدم",
  dashValueVsProgressHint: "كل مشروع مفتوح: إنجاز الخطة أفقياً والقيمة عمودياً",
  dashScheduleHealth: "سلامة الجدول الزمني",
  dashScheduleHealthHint: "المشاريع المفتوحة مقارنة بتواريخ انتهائها",
  dashOnTrack: "ضمن الموعد",
  dashDueSoon: "تنتهي خلال 30 يوماً",
  dashOverdue: "متأخرة",
  dashNoEndDate: "بلا تاريخ انتهاء",
  dashOvertimeTrend: "العمل الإضافي شهرياً",
  dashOvertimeTrendHint: "الساعات المسجلة خلال آخر 12 شهراً",
  dashSeriesHours: "الساعات",
  dashValueByClient: "القيمة حسب العميل",
  dashValueByClientHint: "قيمة المشاريع لكل عميل، الأكبر أولاً",
  dashNoClient: "بلا عميل",
  dashOther: "أخرى",
  dashNoHistory: "لا يوجد سجل كافٍ بعد.",
};

const projects = { en, ar };

export function projectsDict(locale: string): Strings {
  return projects[locale as Locale] || projects[defaultLocale];
}
