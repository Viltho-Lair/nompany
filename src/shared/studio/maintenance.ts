import { defaultLocale, type Locale } from "../locale";

// MAINTENANCE'S OWN WORDS — work requests and work orders. See the header of
// ./shell for why each surface keeps its own dictionary and why nothing may
// enumerate them.
//
// STATUSES, PRIORITIES, TYPES AND HOLD REASONS ARE TOKENS on the record and
// translate on DISPLAY only, so what the API returns is the same in both
// languages. What a tenant TYPED — a title, a machine's name, a place — is data
// and is never translated.

type Strings = {
  requests: string;
  requestsSub: string;
  orders: string;
  ordersSub: string;
  loading: string;
  reportFault: string;
  newRequest: string;
  editRequest: string;
  newOrder: string;
  editOrder: string;
  title: string;
  description: string;
  priority: string;
  type: string;
  asset: string;
  location: string;
  assignedTo: string;
  assignedHint: string;
  due: string;
  estimatedHours: string;
  photos: string;
  addPhoto: string;
  uploading: string;
  photoFailed: string;
  removePhoto: string;
  photoAlt: (ref: string, n: number) => string;
  noAsset: string;
  noLocation: string;
  nobody: string;
  assetHidden: string;
  assetDeleted: string;
  locationDeleted: string;
  reportedBy: (who: string, when: string) => string;
  accept: string;
  acceptTitle: string;
  acceptHint: string;
  createOrder: string;
  decline: string;
  declineReason: string;
  declineHint: string;
  declinedBecause: (reason: string) => string;
  declinedNoReason: string;
  becameOrder: (ref: string, status: string) => string;
  becameOrderHidden: string;
  fromRequest: (ref: string) => string;
  edit: string;
  save: string;
  saving: string;
  cancel: string;
  remove: string;
  filterOpen: string;
  filterAll: string;
  filterDone: string;
  filterAccepted: string;
  filterDeclined: string;
  noRequests: string;
  noRequestsBody: string;
  noOrders: string;
  noOrdersBody: string;
  nothingHere: string;
  start: string;
  resume: string;
  reopen: string;
  hold: string;
  complete: string;
  close: string;
  cancelWork: string;
  holdTitle: string;
  holdReason: string;
  completeTitle: string;
  resolution: string;
  resolutionHint: string;
  overdue: string;
  dueOn: (date: string) => string;
  openCount: (n: number) => string;
  overdueCount: (n: number) => string;
  status: (token: string) => string;
  state: (token: string) => string;
  priorityName: (token: string) => string;
  typeName: (token: string) => string;
  holdName: (token: string) => string;
  viewList: string;
  viewMap: string;
  mapSub: string;
  filterMine: string;
  notOnMap: (n: number) => string;
  noOpenOnMap: string;
  logTime: string;
  logTimeTitle: (ref: string) => string;
  who: string;
  workedOn: string;
  hours: string;
  labourKindLabel: string;
  labourKind: (token: string) => string;
  note: string;
  hoursLogged: (h: number, estimate: number | null) => string;
  timeEntries: (n: number) => string;
  plans: string;
  plansSub: string;
  newPlan: string;
  editPlan: string;
  frequency: string;
  frequencyName: (token: string) => string;
  scheduleMode: string;
  modeName: (token: string) => string;
  modeHint: string;
  firstDue: string;
  nextDue: string;
  leadDays: string;
  leadDaysHint: string;
  checklist: string;
  checklistHint: string;
  checklistProgress: (done: number, total: number) => string;
  planStatus: (token: string) => string;
  pause: string;
  retire: string;
  openNow: (ref: string, status: string) => string;
  lastDone: (day: string) => string;
  neverDone: string;
  complianceOf: (percent: number, n: number) => string;
  complianceNone: string;
  studioCompliance: (percent: number, n: number) => string;
  fromPlan: (ref: string) => string;
  noPlans: string;
  noPlansBody: string;
  machineDown: string;
  machineStopped: string;
  downSince: string;
  upAt: string;
  downNow: (when: string) => string;
  downFor: (hours: number) => string;
  failure: string;
  problem: string;
  cause: string;
  remedy: string;
  machines: string;
  machinesSub: string;
  statusCol: string;
  failures: string;
  mtbf: string;
  mttr: string;
  availability: string;
  openWorkCol: string;
  commonest: string;
  noMachines: string;
  noMachinesBody: string;
  cannotSeeMachines: string;
  duration: (hours: number) => string;
  parts: string;
  issueParts: string;
  partsTitle: (ref: string) => string;
  partsHint: string;
  item: string;
  quantity: string;
  onHand: (n: number, unit: string) => string;
  issue: string;
  giveBack: string;
  movement: string;
  kept: (qty: number, unit: string) => string;
  partsCost: string;
  noStockItems: string;
  hoursCol: string;
  trigger: string;
  triggerName: (token: string) => string;
  meterUnit: string;
  unitName: (token: string) => string;
  unitShort: (token: string) => string;
  meterEvery: string;
  nextDueReading: string;
  everyMeter: (n: number, unit: string) => string;
  nextAt: (n: number, unit: string) => string;
  nowAt: (n: number, unit: string) => string;
  noReading: string;
  meters: string;
  recordReading: string;
  readingTitle: (name: string) => string;
  readingValue: string;
  readAt: string;
  meterReset: string;
  lastReading: (n: number, unit: string, when: string) => string;
  conditionLabel: string;
  conditionUnit: string;
  conditionUnitHint: string;
  limitLow: string;
  limitHigh: string;
  limitHint: string;
  conditionPoints: string;
  recordCondition: string;
  conditionTitle: (label: string, name: string) => string;
  conditionValue: string;
  bandOf: (low: number | null, high: number | null, unit: string) => string;
  pointAt: (n: number, unit: string) => string;
  inRange: string;
  breachName: (b: string) => string;
  noPointReading: string;
  lastCondition: (n: number, unit: string, when: string) => string;
  removeLast: string;
  contracts: string;
  contractsSub: string;
  newContract: string;
  editContract: string;
  contractTitle: string;
  customer: string;
  project: string;
  noProject: string;
  cover: string;
  noCover: string;
  coverName: (token: string) => string;
  value: string;
  signingDate: string;
  startDate: string;
  durationDays: string;
  visitCount: string;
  allowance: string;
  endsOn: (date: string) => string;
  units: string;
  unitsHint: string;
  noUnits: string;
  contractState: (token: string) => string;
  visitState: (token: string) => string;
  visitsProgress: (done: number, total: number) => string;
  missedCount: (n: number) => string;
  nextVisit: (date: string) => string;
  noNextVisit: string;
  callOutsOf: (used: number, allowance: number) => string;
  visitsTitle: (name: string) => string;
  visitLine: (i: number, n: number) => string;
  tickDone: string;
  callOut: string;
  callOutTitle: (name: string) => string;
  callOutHint: string;
  callOutsHeading: string;
  noCallOuts: string;
  legacyCallOut: (date: string) => string;
  cancelContract: string;
  reinstate: string;
  visits: string;
  noContracts: string;
  noContractsBody: string;
  notFiled: string;
  schedulePreview: (first: string, last: string, n: number) => string;
  scheduleHint: string;
  installed: string;
  noInstalled: string;
  installedHidden: string;
  installedDeleted: string;
  contract: string;
  noContract: string;
  contractHidden: string;
  contractDeleted: string;
  callOutChip: string;
  keptByPlans: (refs: string) => string;
  legacyCost: string;
  dashboard: string;
  dashboardSub: (asOf: string) => string;
  openWork: string;
  waitingTriage: string;
  machinesDown: string;
  backlogByPriority: string;
  backlogHint: string;
  unassignedCount: (n: number) => string;
  mineCount: (n: number) => string;
  nothingOpen: string;
  compliance: string;
  complianceHint: string;
  activePlansCount: (n: number) => string;
  contractsHint: string;
  activeContracts: string;
  endingSoon: string;
  missedVisits: string;
  worstMachines: string;
  worstHint: string;
  failuresAndAvailability: (failures: number, availability: number | null) => string;
  noFailures: string;
  costTitle: string;
  costHint: string;
  costFootnote: string;
  refuse: Record<string, string>;
};

const EN_COVER: Record<string, string> = {
  "parts-labour": "Parts and labour", labour: "Labour only", inspection: "Inspection only", full: "Full cover",
};
const AR_COVER: Record<string, string> = {
  "parts-labour": "القطع والعمالة", labour: "العمالة فقط", inspection: "الفحص فقط", full: "تغطية كاملة",
};

const EN_FREQ: Record<string, string> = {
  Weekly: "Every week", Monthly: "Every month", Quarterly: "Every quarter", "Half-yearly": "Every six months", Yearly: "Every year",
};
const AR_FREQ: Record<string, string> = {
  Weekly: "كل أسبوع", Monthly: "كل شهر", Quarterly: "كل ثلاثة أشهر", "Half-yearly": "كل ستة أشهر", Yearly: "كل سنة",
};

const EN_STATUS: Record<string, string> = {
  Open: "Open", "In progress": "In progress", "On hold": "On hold",
  Completed: "Completed", Closed: "Closed", Cancelled: "Cancelled",
};
const EN_STATE: Record<string, string> = { Open: "Open", Accepted: "Accepted", Declined: "Declined" };
const EN_PRIORITY: Record<string, string> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };
const EN_TYPE: Record<string, string> = { corrective: "Corrective", preventive: "Preventive", inspection: "Inspection" };
const EN_HOLD: Record<string, string> = {
  parts: "Waiting on parts", access: "Waiting on access", vendor: "Waiting on a vendor", other: "Other",
};

const en: Strings = {
  requests: "Work requests",
  requestsSub: "Anybody's report that something is wrong. Accept one to turn it into a work order, or decline it with a reason.",
  orders: "Work orders",
  ordersSub: "Authorised work — assigned, due, and moved along until somebody closes it.",
  loading: "Loading maintenance…",
  reportFault: "Report a fault",
  newRequest: "Report a fault",
  editRequest: "Edit the report",
  newOrder: "New work order",
  editOrder: "Edit work order",
  title: "What is wrong",
  description: "Details",
  priority: "Priority",
  type: "Type of work",
  asset: "Machine",
  location: "Place",
  assignedTo: "Assigned to",
  assignedHint: "Everyone chosen is notified.",
  due: "Due",
  estimatedHours: "Estimated hours",
  photos: "Photos",
  addPhoto: "Add a photo",
  uploading: "Uploading…",
  photoFailed: "The photo could not be uploaded.",
  removePhoto: "Remove",
  photoAlt: (ref, n) => `${ref}, photo ${n}`,
  noAsset: "No machine",
  noLocation: "No place",
  nobody: "Nobody yet",
  assetHidden: "A machine you cannot open",
  assetDeleted: "A machine since deleted",
  locationDeleted: "A place since deleted",
  reportedBy: (who, when) => `Reported by ${who || "—"} · ${when}`,
  accept: "Accept",
  acceptTitle: "Turn it into a work order",
  acceptHint: "The report is copied onto a corrective work order. Choose who does it and by when.",
  createOrder: "Create work order",
  decline: "Decline",
  declineReason: "Why",
  declineHint: "A reason teaches the reporter something — a duplicate, already fixed, not ours to fix.",
  declinedBecause: (reason) => `Declined: ${reason}`,
  declinedNoReason: "Declined",
  becameOrder: (ref, status) => `Work order ${ref} · ${status}`,
  becameOrderHidden: "A work order exists for this",
  fromRequest: (ref) => `From ${ref}`,
  edit: "Edit",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  remove: "Delete",
  filterOpen: "Open",
  filterAll: "All",
  filterDone: "Finished",
  filterAccepted: "Accepted",
  filterDeclined: "Declined",
  noRequests: "No work requests",
  noRequestsBody: "When somebody reports a fault, it appears here for somebody to accept or decline.",
  noOrders: "No work orders",
  noOrdersBody: "Raise one here, or accept a work request.",
  nothingHere: "Nothing matches this filter.",
  start: "Start",
  resume: "Resume",
  reopen: "Reopen",
  hold: "Put on hold",
  complete: "Complete",
  close: "Close",
  cancelWork: "Cancel the work",
  holdTitle: "Why is it waiting?",
  holdReason: "Reason",
  completeTitle: "What was done?",
  resolution: "What was done",
  resolutionHint: "The next failure of this machine starts from what is written here.",
  overdue: "Overdue",
  dueOn: (date) => `Due ${date}`,
  openCount: (n) => `${n} open`,
  overdueCount: (n) => `${n} overdue`,
  status: (t) => EN_STATUS[t] || t,
  state: (t) => EN_STATE[t] || t,
  priorityName: (t) => EN_PRIORITY[t] || t,
  typeName: (t) => EN_TYPE[t] || t,
  holdName: (t) => EN_HOLD[t] || t,
  viewList: "List",
  viewMap: "Map",
  mapSub: "Open work at places that have a pin. Each pin opens directions.",
  filterMine: "Assigned to me",
  notOnMap: (n) => `${n} open ${n === 1 ? "order has" : "orders have"} no pinned place and ${n === 1 ? "is" : "are"} not on the map.`,
  noOpenOnMap: "No open work is at a place with a pin. Add coordinates to a location in Master data to see it here.",
  logTime: "Log time",
  logTimeTitle: (ref) => `Log time on ${ref}`,
  who: "Who",
  workedOn: "Date",
  hours: "Hours",
  labourKindLabel: "Time spent",
  labourKind: (t) => ({ work: "On the job", travel: "Travel", wait: "Waiting" }[t] || t),
  note: "Note",
  hoursLogged: (h, est) => (est != null ? `${h} h booked of ${est} h estimated` : `${h} h booked`),
  timeEntries: (n) => `Time booked (${n})`,
  plans: "Preventive plans",
  plansSub: "Work that comes round on a calendar. Each plan raises a work order when it falls due — one open at a time — and the order carries the plan's checklist.",
  newPlan: "New plan",
  editPlan: "Edit plan",
  frequency: "How often",
  frequencyName: (t) => EN_FREQ[t] || t,
  scheduleMode: "The next date counts from",
  modeName: (t) => ({ fixed: "The calendar (fixed)", floating: "When it was last done (floating)" }[t] || t),
  modeHint: "Fixed keeps to the calendar whenever the work is done — for inspections due on a date. Floating counts from the day it was completed — for wear items.",
  firstDue: "First due",
  nextDue: "Next due",
  leadDays: "Raise it days early",
  leadDaysHint: "0 raises the work order on the day it is due.",
  checklist: "Checklist",
  checklistHint: "One step per line. Every work order gets its own copy to tick, and cannot be completed with a step unticked.",
  checklistProgress: (d, n) => `${d} of ${n} checked`,
  planStatus: (t) => ({ Active: "Active", Paused: "Paused", Retired: "Retired" }[t] || t),
  pause: "Pause",
  retire: "Retire",
  openNow: (ref, status) => `Open now: ${ref ? `${ref} · ` : ""}${status}`,
  lastDone: (d) => `Last done ${d}`,
  neverDone: "Not done yet",
  complianceOf: (p, n) => `${p}% on time over ${n}`,
  complianceNone: "No history yet",
  studioCompliance: (p, n) => `${p}% of planned work done on time — ${n} fallen due so far`,
  fromPlan: (ref) => `From plan ${ref}`,
  noPlans: "No preventive plans",
  noPlansBody: "Add one for anything that needs doing on a schedule — a monthly service, an annual inspection.",
  machineDown: "The machine has stopped",
  machineStopped: "Machine stopped",
  downSince: "Machine down since",
  upAt: "Back in service",
  downNow: (when) => `Down since ${when}`,
  downFor: (h) => `Was down ${h} h`,
  failure: "Failure",
  problem: "Problem",
  cause: "Cause",
  remedy: "Remedy",
  machines: "Machines",
  machinesSub: "Each machine's record over the last 12 months: how often it failed, how long it took to put right, and how much of the time it was available. A dash means there is nothing yet to count.",
  statusCol: "Status",
  failures: "Failures",
  mtbf: "Between failures",
  mttr: "To repair",
  availability: "Available",
  openWorkCol: "Open work",
  commonest: "Commonest problem",
  noMachines: "No machines in the register",
  noMachinesBody: "Add equipment under Assets & Equipment to see its record here.",
  cannotSeeMachines: "You cannot open the equipment register, so machines are not listed here.",
  duration: (h) => (h < 48 ? `${h} h` : `${Math.round((h / 24) * 10) / 10} d`),
  parts: "Parts",
  issueParts: "Parts",
  partsTitle: (ref) => `Parts for ${ref}`,
  partsHint: "Issuing takes the part out of stock now, at the item's recorded cost. A return puts it back at what it was issued at.",
  item: "Item",
  quantity: "Quantity",
  onHand: (n, unit) => `${n} ${unit} in stock`,
  issue: "Issue from stock",
  giveBack: "Return to stock",
  movement: "Movement",
  kept: (q, unit) => `${q} ${unit}`,
  partsCost: "Parts cost",
  noStockItems: "Inventory has no items to issue.",
  hoursCol: "Hours booked",
  trigger: "Runs on",
  triggerName: (t) => ({ calendar: "The calendar", meter: "A meter", condition: "A measurement" }[t] || t),
  meterUnit: "Meter",
  unitName: (t) => ({ hours: "Running hours", km: "Kilometres", cycles: "Cycles" }[t] || t),
  unitShort: (t) => ({ hours: "h", km: "km", cycles: "cycles" }[t] || t),
  meterEvery: "Every",
  nextDueReading: "Next due at",
  everyMeter: (n, u) => `Every ${n} ${({ hours: "h", km: "km", cycles: "cycles" })[u] || u}`,
  nextAt: (n, u) => `Next at ${n} ${({ hours: "h", km: "km", cycles: "cycles" })[u] || u}`,
  nowAt: (n, u) => `Now ${n} ${({ hours: "h", km: "km", cycles: "cycles" })[u] || u}`,
  noReading: "No reading yet",
  meters: "Meters",
  recordReading: "Reading",
  readingTitle: (name) => `Meter reading for ${name}`,
  readingValue: "Reading",
  readAt: "Read at",
  meterReset: "The meter was replaced or reset",
  lastReading: (n, u, when) => `Last: ${n} ${({ hours: "h", km: "km", cycles: "cycles" })[u] || u} on ${when}`,
  conditionLabel: "What is measured",
  conditionUnit: "Unit",
  conditionUnitHint: "°C, bar, mm/s — whatever the gauge reads in.",
  limitLow: "Low limit",
  limitHigh: "High limit",
  limitHint: "Leave one blank where only the other matters.",
  conditionPoints: "Condition",
  recordCondition: "Reading",
  conditionTitle: (label, name) => `${label} — ${name}`,
  conditionValue: "Reading",
  bandOf: (low, high, u) => {
    if (low != null && high != null) return `${low}–${high} ${u}`;
    if (high != null) return `at most ${high} ${u}`;
    if (low != null) return `at least ${low} ${u}`;
    return "";
  },
  pointAt: (n, u) => `${n} ${u}`,
  inRange: "In range",
  breachName: (b) => ({ low: "Below the low limit", high: "Above the high limit" }[b] || b),
  noPointReading: "Not read yet",
  lastCondition: (n, u, when) => `Last: ${n} ${u} on ${when}`,
  removeLast: "Remove it",
  contracts: "Service contracts (SLA)",
  contractsSub: "The maintenance you sell: a term, planned visits spread across it, and an allowance of call-outs. Each visit becomes a work order by itself when it falls due.",
  newContract: "New contract",
  editContract: "Edit contract",
  contractTitle: "Contract name",
  customer: "Customer",
  project: "Project",
  noProject: "No project",
  cover: "Cover",
  noCover: "Not stated",
  coverName: (t) => EN_COVER[t] || t,
  value: "Contract value",
  signingDate: "Signed",
  startDate: "Starts",
  durationDays: "Length (days)",
  visitCount: "Planned visits",
  allowance: "Call-outs allowed",
  endsOn: (d) => `Ends ${d}`,
  units: "Customer's units covered",
  unitsHint: "Equipment you installed for the customer that the contract covers, from Field Service's installed base.",
  noUnits: "No units named",
  contractState: (t) => ({ active: "Active", upcoming: "Not started", ended: "Ended", cancelled: "Cancelled" }[t] || t),
  visitState: (t) => ({
    done: "Done", open: "Work order open", due: "Due", upcoming: "Upcoming", missed: "Missed", cancelled: "Cancelled",
  }[t] || t),
  visitsProgress: (d, n) => `${d} of ${n} ${n === 1 ? "visit" : "visits"} done`,
  missedCount: (n) => `${n} missed`,
  nextVisit: (d) => `Next visit ${d}`,
  noNextVisit: "No visits left",
  callOutsOf: (u, a) => `${u} of ${a} call-outs used`,
  visitsTitle: (name) => `Visits — ${name}`,
  visitLine: (i, n) => `Visit ${i} of ${n}`,
  tickDone: "Done outside the system",
  callOut: "Log a call-out",
  callOutTitle: (name) => `Call-out under ${name}`,
  callOutHint: "A corrective work order under this contract, counted against its allowance.",
  callOutsHeading: "Call-outs",
  noCallOuts: "No call-outs yet.",
  legacyCallOut: (d) => `Recorded call-out · ${d}`,
  cancelContract: "Cancel contract",
  reinstate: "Reinstate",
  visits: "Visits",
  noContracts: "No service contracts",
  noContractsBody: "Add one for each customer you sell regular maintenance to — planned visits over a term, and an allowance of call-outs.",
  notFiled: "This studio has nowhere to file a contract.",
  schedulePreview: (first, last, n) => (n === 1 ? `One visit, on ${first}.` : `${n} visits, the first on ${first} and the last on ${last}.`),
  scheduleHint: "Changing the start, the length or the number of visits reschedules every visit.",
  installed: "Customer's unit",
  noInstalled: "No customer unit",
  installedHidden: "A unit you cannot open",
  installedDeleted: "A unit since deleted",
  contract: "Service contract",
  noContract: "No contract",
  contractHidden: "A contract you cannot open",
  contractDeleted: "A contract since deleted",
  callOutChip: "Call-out",
  keptByPlans: (refs) => `Its visits are raised by its preventive ${refs ? `plans: ${refs}` : "plans"}.`,
  legacyCost: "Cost recorded in the old register",
  dashboard: "Maintenance",
  dashboardSub: (asOf) => `Where the work stands on ${asOf}: what is open, what is late, and what it is costing.`,
  openWork: "Open work",
  waitingTriage: "Waiting on triage",
  machinesDown: "Machines stopped",
  backlogByPriority: "Backlog by priority",
  backlogHint: "Open work orders — on hold included",
  unassignedCount: (n) => `${n} with nobody on ${n === 1 ? "it" : "them"}`,
  mineCount: (n) => `${n} assigned to you`,
  nothingOpen: "No open work orders.",
  compliance: "Planned work done on time",
  complianceHint: "Across every preventive plan",
  activePlansCount: (n) => `${n} active ${n === 1 ? "plan" : "plans"}`,
  contractsHint: "What the studio sells, and what it owes",
  activeContracts: "active",
  endingSoon: "ending in 60 days",
  missedVisits: "missed visits",
  worstMachines: "Machines needing most attention",
  worstHint: "Failures over the last twelve months, worst first",
  failuresAndAvailability: (failures, availability) =>
    `${failures} ${failures === 1 ? "failure" : "failures"}${availability == null ? "" : ` · ${availability}% available`}`,
  noFailures: "No failures recorded in the last twelve months.",
  costTitle: "Parts and hours",
  costHint: "Charged to work orders over the last twelve months",
  costFootnote: "Hours stay hours: nothing yet says what one costs.",
  refuse: {
    title: "Say what is wrong.",
    asset: "That machine is not in this studio's equipment register.",
    location: "That place is not in Master data.",
    assignee: "Somebody chosen is not a member of this studio.",
    transition: "That move is not allowed from where the work is now.",
    already: "It is already there.",
    status: "That is not a status.",
    "hold-reason": "Say why the work is waiting.",
    resolution: "Write what was done before completing it.",
    closed: "Closed and cancelled work is not edited.",
    started: "Work that was started is not deleted — cancel it or close it.",
    accepted: "This request already has a work order.",
    declined: "This request was declined.",
    notfound: "It no longer exists.",
    forbidden: "You do not have the right to do that.",
    hours: "Hours must be more than nought and at most 24 in one entry.",
    date: "The date must be today or earlier.",
    "has-labour": "Time has been booked against this work — cancel it instead of deleting it.",
    "not-yours": "Only the person who booked the time, or somebody who may delete work orders, can remove it.",
    checklist: "Tick every checklist step before completing — or put the work on hold.",
    "checklist-long": "A checklist holds at most 40 steps.",
    frequency: "Choose how often.",
    "next-due": "Give the date it is first due.",
    "lead-days": "Days early must be a whole number from 0 to 60.",
    retired: "A retired plan is not edited.",
    "has-orders": "This plan has raised work orders — retire it instead of deleting it.",
    failure: "Say what the problem was before completing corrective work.",
    downtime: "'Back in service' needs a time the machine went down.",
    "downtime-order": "Back in service must be after the machine went down.",
    "downtime-future": "Downtime cannot be in the future.",
    insufficient: "There is not enough of that in stock.",
    "over-return": "More cannot be returned than this work order was given.",
    item: "Choose an item Inventory holds.",
    qty: "Enter a quantity above nought.",
    "has-parts": "Parts have been issued to this work — cancel it instead of deleting it.",
    "no-section": "This studio has no Maintenance work orders for Inventory to issue against.",
    "reading-unit": "Choose a meter.",
    "reading-value": "Enter the reading.",
    "reading-future": "A reading cannot be in the future.",
    "reading-back": "That is lower than the last reading. If the meter was replaced or reset, tick that box.",
    "reading-before": "That is earlier than the last reading.",
    "not-latest": "Only the latest reading on a meter can be removed.",
    "meter-asset": "A meter plan needs its machine.",
    "meter-unit": "Choose which meter the plan runs on.",
    "meter-every": "Every how many? Enter a number above nought.",
    "meter-next": "Enter the reading it is next due at.",
    "condition-asset": "A condition point needs its machine.",
    "condition-label": "Say what is measured.",
    "condition-unit": "Enter the unit the gauge reads in.",
    "condition-limits": "Set a low limit, a high limit, or both — a point with neither can never be out of range.",
    "condition-order": "The low limit must be below the high one.",
    "condition-value": "Enter the reading.",
    "condition-future": "A reading cannot be in the future.",
    "condition-plan": "That condition point no longer exists.",
    installed: "That unit is not in Field Service's installed base.",
    contract: "That service contract does not exist.",
    "not-covered": "This contract does not cover that unit.",
    "contract-has-orders": "This contract has raised work orders — cancel it instead of deleting it.",
    "contract-has-plans": "A preventive plan runs under this contract — retire the plan, or cancel the contract.",
    "visit-has-order": "This visit has a work order — it is done when that order is.",
    "contract-cancelled": "This contract is cancelled. Reinstate it first.",
    "outside-term": "Today is outside this contract's term — raise an ordinary work order instead.",
    "emergency-cap": "This contract's call-out allowance is used up.",
    "contract-title": "Give the contract a name.",
    startDate: "Give the date the contract starts.",
    duration: "The length is a whole number of days, from 1 to 3650.",
    visits: "Planned visits is a whole number from 1, and no more than the days in the term.",
    emergency: "Call-outs allowed is a whole number, 0 or more.",
    cover: "Choose what the contract covers.",
    value: "The value is a number, 0 or more — or leave it blank.",
    visit: "That visit is not on this contract.",
    "no-contract-section": "This studio has nowhere to file a contract.",
  },
};

// HAND-WRITTEN. NO DIACRITICS.
const AR_STATUS: Record<string, string> = {
  Open: "مفتوح", "In progress": "قيد التنفيذ", "On hold": "معلق",
  Completed: "منجز", Closed: "مغلق", Cancelled: "ملغى",
};
const AR_STATE: Record<string, string> = { Open: "مفتوح", Accepted: "مقبول", Declined: "مرفوض" };
const AR_PRIORITY: Record<string, string> = { low: "منخفضة", normal: "عادية", high: "عالية", urgent: "عاجلة" };
const AR_TYPE: Record<string, string> = { corrective: "تصحيحية", preventive: "وقائية", inspection: "فحص" };
const AR_HOLD: Record<string, string> = {
  parts: "بانتظار قطع", access: "بانتظار إذن دخول", vendor: "بانتظار مورد", other: "سبب آخر",
};

const ar: Strings = {
  requests: "طلبات الصيانة",
  requestsSub: "بلاغ أي شخص عن عطل. اقبله ليصبح أمر عمل، أو ارفضه مع ذكر السبب.",
  orders: "أوامر العمل",
  ordersSub: "عمل معتمد — مسند وله موعد، ويتقدم حتى يغلقه أحد.",
  loading: "جار تحميل الصيانة…",
  reportFault: "الإبلاغ عن عطل",
  newRequest: "الإبلاغ عن عطل",
  editRequest: "تعديل البلاغ",
  newOrder: "أمر عمل جديد",
  editOrder: "تعديل أمر العمل",
  title: "ما المشكلة",
  description: "التفاصيل",
  priority: "الأولوية",
  type: "نوع العمل",
  asset: "الآلة",
  location: "المكان",
  assignedTo: "مسند إلى",
  assignedHint: "يبلغ كل من يختار.",
  due: "الموعد",
  estimatedHours: "الساعات المقدرة",
  photos: "الصور",
  addPhoto: "إضافة صورة",
  uploading: "جار الرفع…",
  photoFailed: "تعذر رفع الصورة.",
  removePhoto: "حذف",
  photoAlt: (ref, n) => `${ref}، الصورة ${n}`,
  noAsset: "بلا آلة",
  noLocation: "بلا مكان",
  nobody: "لم يسند بعد",
  assetHidden: "آلة لا تملك صلاحية فتحها",
  assetDeleted: "آلة حذفت",
  locationDeleted: "مكان حذف",
  reportedBy: (who, when) => `أبلغ عنه ${who || "—"} · ${when}`,
  accept: "قبول",
  acceptTitle: "تحويله إلى أمر عمل",
  acceptHint: "ينسخ البلاغ إلى أمر عمل تصحيحي. اختر من ينفذه وموعده.",
  createOrder: "إنشاء أمر العمل",
  decline: "رفض",
  declineReason: "السبب",
  declineHint: "السبب يفيد المبلغ — بلاغ مكرر، أو أصلح من قبل، أو ليس من اختصاصنا.",
  declinedBecause: (reason) => `مرفوض: ${reason}`,
  declinedNoReason: "مرفوض",
  becameOrder: (ref, status) => `أمر العمل ${ref} · ${status}`,
  becameOrderHidden: "يوجد أمر عمل لهذا البلاغ",
  fromRequest: (ref) => `من ${ref}`,
  edit: "تعديل",
  save: "حفظ",
  saving: "جار الحفظ…",
  cancel: "إلغاء",
  remove: "حذف",
  filterOpen: "المفتوحة",
  filterAll: "الكل",
  filterDone: "المنتهية",
  filterAccepted: "المقبولة",
  filterDeclined: "المرفوضة",
  noRequests: "لا توجد طلبات صيانة",
  noRequestsBody: "حين يبلغ أحد عن عطل يظهر هنا ليقبله أحد أو يرفضه.",
  noOrders: "لا توجد أوامر عمل",
  noOrdersBody: "أنشئ أمرا هنا، أو اقبل طلب صيانة.",
  nothingHere: "لا شيء يطابق هذا التصفية.",
  start: "بدء",
  resume: "استئناف",
  reopen: "إعادة فتح",
  hold: "تعليق",
  complete: "إنجاز",
  close: "إغلاق",
  cancelWork: "إلغاء العمل",
  holdTitle: "لماذا العمل متوقف؟",
  holdReason: "السبب",
  completeTitle: "ما الذي أنجز؟",
  resolution: "ما أنجز",
  resolutionHint: "العطل التالي لهذه الآلة يبدأ مما يكتب هنا.",
  overdue: "متأخر",
  dueOn: (date) => `الموعد ${date}`,
  openCount: (n) => `${n} مفتوح`,
  overdueCount: (n) => `${n} متأخر`,
  status: (t) => AR_STATUS[t] || t,
  state: (t) => AR_STATE[t] || t,
  priorityName: (t) => AR_PRIORITY[t] || t,
  typeName: (t) => AR_TYPE[t] || t,
  holdName: (t) => AR_HOLD[t] || t,
  viewList: "قائمة",
  viewMap: "خريطة",
  mapSub: "العمل المفتوح في الأماكن التي عليها دبوس. كل دبوس يفتح الاتجاهات.",
  filterMine: "المسندة إلي",
  notOnMap: (n) => `${n} من الأوامر المفتوحة بلا مكان عليه دبوس، فلا تظهر على الخريطة.`,
  noOpenOnMap: "لا يوجد عمل مفتوح في مكان عليه دبوس. أضف إحداثيات لموقع في البيانات الأساسية ليظهر هنا.",
  logTime: "تسجيل وقت",
  logTimeTitle: (ref) => `تسجيل وقت على ${ref}`,
  who: "من",
  workedOn: "التاريخ",
  hours: "الساعات",
  labourKindLabel: "نوع الوقت",
  labourKind: (t) => ({ work: "في العمل", travel: "تنقل", wait: "انتظار" }[t] || t),
  note: "ملاحظة",
  hoursLogged: (h, est) => (est != null ? `${h} س مسجلة من ${est} س مقدرة` : `${h} س مسجلة`),
  timeEntries: (n) => `الوقت المسجل (${n})`,
  plans: "الخطط الوقائية",
  plansSub: "عمل يتكرر حسب جدول. كل خطة تنشئ أمر عمل عند استحقاقها — أمر مفتوح واحد في كل مرة — ويحمل الأمر قائمة تحقق الخطة.",
  newPlan: "خطة جديدة",
  editPlan: "تعديل الخطة",
  frequency: "التكرار",
  frequencyName: (t) => AR_FREQ[t] || t,
  scheduleMode: "الموعد التالي يحسب من",
  modeName: (t) => ({ fixed: "التقويم (ثابت)", floating: "آخر تنفيذ (متحرك)" }[t] || t),
  modeHint: "الثابت يلتزم بالتقويم مهما كان وقت التنفيذ — للفحوص المستحقة بتاريخ. والمتحرك يحسب من يوم الإنجاز — لقطع التآكل.",
  firstDue: "أول استحقاق",
  nextDue: "الاستحقاق التالي",
  leadDays: "إنشاؤه قبل الموعد بأيام",
  leadDaysHint: "صفر ينشئ أمر العمل يوم استحقاقه.",
  checklist: "قائمة التحقق",
  checklistHint: "خطوة في كل سطر. كل أمر عمل يأخذ نسخته ليعلمها، ولا ينجز وفيه خطوة غير معلمة.",
  checklistProgress: (d, n) => `${d} من ${n} مكتمل`,
  planStatus: (t) => ({ Active: "نشطة", Paused: "موقوفة", Retired: "منتهية" }[t] || t),
  pause: "إيقاف",
  retire: "إنهاء",
  openNow: (ref, status) => `مفتوح الآن: ${ref ? `${ref} · ` : ""}${status}`,
  lastDone: (d) => `آخر تنفيذ ${d}`,
  neverDone: "لم ينفذ بعد",
  complianceOf: (p, n) => `${p}% في الموعد من ${n}`,
  complianceNone: "لا يوجد سجل بعد",
  studioCompliance: (p, n) => `${p}% من العمل المخطط أنجز في موعده — ${n} استحق حتى الآن`,
  fromPlan: (ref) => `من الخطة ${ref}`,
  noPlans: "لا توجد خطط وقائية",
  noPlansBody: "أضف خطة لكل ما يحتاج تنفيذا حسب جدول — صيانة شهرية أو فحص سنوي.",
  machineDown: "توقفت الآلة",
  machineStopped: "الآلة متوقفة",
  downSince: "الآلة متوقفة منذ",
  upAt: "عادت للعمل",
  downNow: (when) => `متوقفة منذ ${when}`,
  downFor: (h) => `توقفت ${h} س`,
  failure: "العطل",
  problem: "المشكلة",
  cause: "السبب",
  remedy: "المعالجة",
  machines: "الآلات",
  machinesSub: "سجل كل آلة خلال آخر 12 شهرا: كم مرة تعطلت، وكم استغرق إصلاحها، وكم من الوقت كانت متاحة. الشرطة تعني أنه لا يوجد ما يحسب بعد.",
  statusCol: "الحالة",
  failures: "الأعطال",
  mtbf: "بين الأعطال",
  mttr: "للإصلاح",
  availability: "الإتاحة",
  openWorkCol: "عمل مفتوح",
  commonest: "المشكلة الأكثر تكرارا",
  noMachines: "لا توجد آلات في السجل",
  noMachinesBody: "أضف معدات في قسم الأصول والمعدات ليظهر سجلها هنا.",
  cannotSeeMachines: "لا تملك صلاحية فتح سجل المعدات، فلا تعرض الآلات هنا.",
  duration: (h) => (h < 48 ? `${h} س` : `${Math.round((h / 24) * 10) / 10} ي`),
  parts: "القطع",
  issueParts: "القطع",
  partsTitle: (ref) => `قطع ${ref}`,
  partsHint: "الصرف يخرج القطعة من المخزون الآن بتكلفة الصنف المسجلة. والإرجاع يعيدها بالتكلفة التي صرفت بها.",
  item: "الصنف",
  quantity: "الكمية",
  onHand: (n, unit) => `${n} ${unit} في المخزون`,
  issue: "صرف من المخزون",
  giveBack: "إرجاع إلى المخزون",
  movement: "الحركة",
  kept: (q, unit) => `${q} ${unit}`,
  partsCost: "تكلفة القطع",
  noStockItems: "لا توجد أصناف في المخزون للصرف.",
  hoursCol: "الساعات المسجلة",
  trigger: "تعمل حسب",
  triggerName: (t) => ({ calendar: "التقويم", meter: "عداد", condition: "قياس" }[t] || t),
  meterUnit: "العداد",
  unitName: (t) => ({ hours: "ساعات التشغيل", km: "الكيلومترات", cycles: "الدورات" }[t] || t),
  unitShort: (t) => ({ hours: "س", km: "كم", cycles: "دورة" }[t] || t),
  meterEvery: "كل",
  nextDueReading: "الاستحقاق التالي عند",
  everyMeter: (n, u) => `كل ${n} ${({ hours: "س", km: "كم", cycles: "دورة" })[u] || u}`,
  nextAt: (n, u) => `التالي عند ${n} ${({ hours: "س", km: "كم", cycles: "دورة" })[u] || u}`,
  nowAt: (n, u) => `الآن ${n} ${({ hours: "س", km: "كم", cycles: "دورة" })[u] || u}`,
  noReading: "لا توجد قراءة بعد",
  meters: "العدادات",
  recordReading: "قراءة",
  readingTitle: (name) => `قراءة عداد ${name}`,
  readingValue: "القراءة",
  readAt: "وقت القراءة",
  meterReset: "استبدل العداد أو أعيد ضبطه",
  lastReading: (n, u, when) => `الأخيرة: ${n} ${({ hours: "س", km: "كم", cycles: "دورة" })[u] || u} في ${when}`,
  conditionLabel: "ما الذي يقاس",
  conditionUnit: "الوحدة",
  conditionUnitHint: "درجة مئوية، بار، مم/ث — وحدة القياس التي يقرأ بها المقياس.",
  limitLow: "الحد الأدنى",
  limitHigh: "الحد الأعلى",
  limitHint: "اترك احدهما فارغا اذا كان الاخر وحده هو المهم.",
  conditionPoints: "القياس",
  recordCondition: "قراءة",
  conditionTitle: (label, name) => `${label} — ${name}`,
  conditionValue: "القراءة",
  bandOf: (low, high, u) => {
    if (low != null && high != null) return `${low}–${high} ${u}`;
    if (high != null) return `${high} ${u} على الاكثر`;
    if (low != null) return `${low} ${u} على الاقل`;
    return "";
  },
  pointAt: (n, u) => `${n} ${u}`,
  inRange: "ضمن المدى",
  breachName: (b) => ({ low: "دون الحد الأدنى", high: "فوق الحد الأعلى" }[b] || b),
  noPointReading: "لم تؤخذ قراءة بعد",
  lastCondition: (n, u, when) => `الأخيرة: ${n} ${u} في ${when}`,
  removeLast: "حذفها",
  contracts: "عقود الخدمة",
  contractsSub: "الصيانة التي تبيعها: مدة، وزيارات مخططة موزعة عليها، وعدد مسموح من البلاغات الطارئة. كل زيارة تصبح أمر عمل تلقائيا عند استحقاقها.",
  newContract: "عقد جديد",
  editContract: "تعديل العقد",
  contractTitle: "اسم العقد",
  customer: "العميل",
  project: "المشروع",
  noProject: "بلا مشروع",
  cover: "التغطية",
  noCover: "غير محددة",
  coverName: (t) => AR_COVER[t] || t,
  value: "قيمة العقد",
  signingDate: "تاريخ التوقيع",
  startDate: "يبدأ",
  durationDays: "المدة (بالأيام)",
  visitCount: "الزيارات المخططة",
  allowance: "البلاغات الطارئة المسموحة",
  endsOn: (d) => `ينتهي ${d}`,
  units: "وحدات العميل المشمولة",
  unitsHint: "المعدات التي ركبتها لدى العميل ويغطيها العقد، من قاعدة المعدات المركبة في الخدمة الميدانية.",
  noUnits: "لم تحدد وحدات",
  contractState: (t) => ({ active: "ساري", upcoming: "لم يبدأ", ended: "منتهي", cancelled: "ملغى" }[t] || t),
  visitState: (t) => ({
    done: "منجزة", open: "أمر العمل مفتوح", due: "مستحقة", upcoming: "قادمة", missed: "فائتة", cancelled: "ملغاة",
  }[t] || t),
  visitsProgress: (d, n) => `${d} من ${n} زيارات منجزة`,
  missedCount: (n) => `${n} فائتة`,
  nextVisit: (d) => `الزيارة التالية ${d}`,
  noNextVisit: "لا توجد زيارات متبقية",
  callOutsOf: (u, a) => `${u} من ${a} بلاغات طارئة مستخدمة`,
  visitsTitle: (name) => `الزيارات — ${name}`,
  visitLine: (i, n) => `الزيارة ${i} من ${n}`,
  tickDone: "نفذت خارج النظام",
  callOut: "تسجيل بلاغ طارئ",
  callOutTitle: (name) => `بلاغ طارئ ضمن ${name}`,
  callOutHint: "أمر عمل تصحيحي ضمن هذا العقد، يحسب من العدد المسموح.",
  callOutsHeading: "البلاغات الطارئة",
  noCallOuts: "لا توجد بلاغات طارئة بعد.",
  legacyCallOut: (d) => `بلاغ مسجل · ${d}`,
  cancelContract: "إلغاء العقد",
  reinstate: "إعادة تفعيل",
  visits: "الزيارات",
  noContracts: "لا توجد عقود خدمة",
  noContractsBody: "أضف عقدا لكل عميل تبيعه صيانة دورية — زيارات مخططة خلال مدة، وعدد مسموح من البلاغات الطارئة.",
  notFiled: "لا يوجد في هذا الحساب مكان لحفظ العقود.",
  schedulePreview: (first, last, n) => (n === 1 ? `زيارة واحدة في ${first}.` : `${n} زيارات، الأولى في ${first} والأخيرة في ${last}.`),
  scheduleHint: "تغيير البداية أو المدة أو عدد الزيارات يعيد جدولة كل الزيارات.",
  installed: "وحدة العميل",
  noInstalled: "بلا وحدة عميل",
  installedHidden: "وحدة لا تملك صلاحية فتحها",
  installedDeleted: "وحدة حذفت",
  contract: "عقد الخدمة",
  noContract: "بلا عقد",
  contractHidden: "عقد لا تملك صلاحية فتحه",
  contractDeleted: "عقد حذف",
  callOutChip: "بلاغ طارئ",
  keptByPlans: (refs) => `زياراته تنشئها خططه الوقائية${refs ? `: ${refs}` : ""}.`,
  legacyCost: "التكلفة المسجلة في السجل القديم",
  dashboard: "الصيانة",
  dashboardSub: (asOf) => `حال العمل في ${asOf}: ما هو مفتوح، وما تأخر، وكم يكلف.`,
  openWork: "عمل مفتوح",
  waitingTriage: "بانتظار الفرز",
  machinesDown: "آلات متوقفة",
  backlogByPriority: "العمل المفتوح حسب الأولوية",
  backlogHint: "أوامر العمل المفتوحة، ومنها المعلقة",
  unassignedCount: (n) => `${n} بلا مسؤول`,
  mineCount: (n) => `${n} مسندة إليك`,
  nothingOpen: "لا توجد أوامر عمل مفتوحة.",
  compliance: "العمل المخطط المنجز في موعده",
  complianceHint: "عبر كل الخطط الوقائية",
  activePlansCount: (n) => `${n} خطة نشطة`,
  contractsHint: "ما تبيعه من صيانة، وما يترتب عليه",
  activeContracts: "سارية",
  endingSoon: "تنتهي خلال 60 يوما",
  missedVisits: "زيارات فائتة",
  worstMachines: "الآلات الأكثر حاجة للمتابعة",
  worstHint: "الأعطال خلال آخر 12 شهرا، الأكثر أولا",
  failuresAndAvailability: (failures, availability) =>
    `${failures} عطل${availability == null ? "" : ` · إتاحة ${availability}%`}`,
  noFailures: "لا أعطال مسجلة خلال آخر 12 شهرا.",
  costTitle: "القطع والساعات",
  costHint: "المحملة على أوامر العمل خلال آخر 12 شهرا",
  costFootnote: "الساعات تبقى ساعات: لا شيء يحدد بعد تكلفة الساعة.",
  refuse: {
    title: "اذكر ما المشكلة.",
    asset: "هذه الآلة ليست في سجل معدات هذا الحساب.",
    location: "هذا المكان ليس في البيانات الأساسية.",
    assignee: "أحد المختارين ليس عضوا في هذا الحساب.",
    transition: "هذه الخطوة غير مسموحة من حالة العمل الحالية.",
    already: "هو في هذه الحالة أصلا.",
    status: "هذه ليست حالة.",
    "hold-reason": "اذكر سبب توقف العمل.",
    resolution: "اكتب ما أنجز قبل إنجاز الأمر.",
    closed: "العمل المغلق أو الملغى لا يعدل.",
    started: "العمل الذي بدأ لا يحذف — ألغه أو أغلقه.",
    accepted: "لهذا الطلب أمر عمل بالفعل.",
    declined: "رفض هذا الطلب.",
    notfound: "لم يعد موجودا.",
    forbidden: "لا تملك صلاحية ذلك.",
    hours: "الساعات أكثر من صفر وحتى 24 في القيد الواحد.",
    date: "التاريخ اليوم أو قبله.",
    "has-labour": "سجل وقت على هذا العمل — ألغه بدل حذفه.",
    "not-yours": "لا يحذف الوقت إلا من سجله أو من يملك صلاحية حذف أوامر العمل.",
    checklist: "علم كل خطوات قائمة التحقق قبل الإنجاز — أو علق العمل.",
    "checklist-long": "قائمة التحقق 40 خطوة على الأكثر.",
    frequency: "اختر التكرار.",
    "next-due": "حدد تاريخ أول استحقاق.",
    "lead-days": "أيام التقديم عدد صحيح من 0 إلى 60.",
    retired: "الخطة المنتهية لا تعدل.",
    "has-orders": "أنشأت هذه الخطة أوامر عمل — أنهها بدل حذفها.",
    failure: "اذكر المشكلة قبل إنجاز العمل التصحيحي.",
    downtime: "وقت العودة للعمل يحتاج وقت توقف الآلة.",
    "downtime-order": "العودة للعمل تكون بعد التوقف لا قبله.",
    "downtime-future": "لا يسجل توقف في المستقبل.",
    insufficient: "لا يوجد ما يكفي من هذا الصنف في المخزون.",
    "over-return": "لا يرجع أكثر مما صرف لهذا الأمر.",
    item: "اختر صنفا موجودا في المخزون.",
    qty: "أدخل كمية أكبر من صفر.",
    "has-parts": "صرفت قطع لهذا العمل — ألغه بدل حذفه.",
    "no-section": "لا توجد أوامر عمل صيانة ليصرف المخزون عليها.",
    "reading-unit": "اختر العداد.",
    "reading-value": "أدخل القراءة.",
    "reading-future": "لا تسجل قراءة في المستقبل.",
    "reading-back": "هذه أقل من القراءة الأخيرة. إن استبدل العداد أو أعيد ضبطه فعلم ذلك.",
    "reading-before": "هذه أقدم من القراءة الأخيرة.",
    "not-latest": "لا يحذف إلا آخر قراءة على العداد.",
    "meter-asset": "خطة العداد تحتاج آلتها.",
    "meter-unit": "اختر العداد الذي تعمل عليه الخطة.",
    "meter-every": "كل كم؟ أدخل رقما أكبر من صفر.",
    "meter-next": "أدخل القراءة التي تستحق عندها الخطة.",
    "condition-asset": "نقطة القياس تحتاج آلتها.",
    "condition-label": "حدد ما الذي يقاس.",
    "condition-unit": "أدخل وحدة القياس.",
    "condition-limits": "حدد حدا أدنى أو أعلى أو كليهما — نقطة بلا حد لا تخرج عن المدى أبدا.",
    "condition-order": "الحد الأدنى يجب أن يكون دون الأعلى.",
    "condition-value": "أدخل القراءة.",
    "condition-future": "لا تسجل قراءة في المستقبل.",
    "condition-plan": "نقطة القياس هذه لم تعد موجودة.",
    installed: "هذه الوحدة ليست في قاعدة المعدات المركبة.",
    contract: "عقد الخدمة هذا غير موجود.",
    "not-covered": "هذا العقد لا يغطي تلك الوحدة.",
    "contract-has-orders": "أنشأ هذا العقد أوامر عمل — ألغه بدل حذفه.",
    "contract-has-plans": "توجد خطة وقائية ضمن هذا العقد — أنه الخطة أو ألغ العقد.",
    "visit-has-order": "لهذه الزيارة أمر عمل — تنجز حين ينجز.",
    "contract-cancelled": "هذا العقد ملغى. أعد تفعيله أولا.",
    "outside-term": "اليوم خارج مدة هذا العقد — أنشئ أمر عمل عاديا بدلا من ذلك.",
    "emergency-cap": "استنفد العدد المسموح من البلاغات الطارئة في هذا العقد.",
    "contract-title": "أعط العقد اسما.",
    startDate: "حدد تاريخ بداية العقد.",
    duration: "المدة عدد صحيح من الأيام بين 1 و3650.",
    visits: "عدد الزيارات عدد صحيح من 1 ولا يزيد على أيام المدة.",
    emergency: "البلاغات المسموحة عدد صحيح، صفر أو أكثر.",
    cover: "اختر ما يغطيه العقد.",
    value: "القيمة رقم، صفر أو أكثر — أو اتركها فارغة.",
    visit: "هذه الزيارة ليست ضمن هذا العقد.",
    "no-contract-section": "لا يوجد في هذا الحساب مكان لحفظ العقود.",
  },
};

const dict = { en, ar };

export function maintenanceDict(locale: string): Strings {
  return dict[locale as Locale] || dict[defaultLocale];
}

export type { Strings as MaintenanceStrings };
