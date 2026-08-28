import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// OPERATIONS — locations, permits, shifts and tracking.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  accessOperationsStudio: string;
  acrossEveryScheduledShift: string;
  activePermits: string;
  addLocation: string;
  addPermit: string;
  address: string;
  calendarLegend: string;
  cancel: string;
  city: string;
  coverageAcrossRotaWindow: string;
  covers: string;
  date: string;
  dayRosterPrefix: string;
  delete: string;
  edit: string;
  end: string;
  issued: string;
  kind: string;
  listBelowStillWorks: string;
  loadingOperations: string;
  location: string;
  locations: string;
  locationsPlacesWorkHappens: string;
  mapLink: string;
  name: string;
  noLocationsYet: string;
  noMapConfigured: string;
  noOneScheduled: string;
  noPermitsCarryEnd: string;
  noPermitsRecordedYet: string;
  noPermitsYet: string;
  nobodySharingRightNow: string;
  notes: string;
  nothingScheduledYet: string;
  openProject: string;
  optionalTextAddedAbove: string;
  permitNumber: string;
  permitsExpiring: string;
  permitsRecordWhatStudio: string;
  permitsStatus: string;
  permitsType: string;
  placeWorkHappensSite: string;
  project: string;
  removeMyLastPosition: string;
  reportedPositions: string;
  role: string;
  roleShift: string;
  saved: string;
  scheduleShift: string;
  shareMyLocation: string;
  shiftsLocation: string;
  shiftsWeek: string;
  start: string;
  stopSharing: string;
  title: string;
  tracking: string;
  type: string;
  valid: string;
  valid2: string;
  validExpiringExpired: string;
  validityTimeline: string;
  viewOnlyAccessOperations: string;
  week: string;
  whatKindAuthorisation: string;
  whatPermittedWhereUntil: string;
  who: string;
  whoWorkingWhenWhere: string;
  workingHours: string;
};

const en: Strings = {
  ...commonEn,
  accessOperationsStudio: "You don't have access to Operations in this studio.",
  acrossEveryScheduledShift: "Across every scheduled shift",
  activePermits: "Active permits",
  addLocation: "Add location",
  addPermit: "Add permit",
  address: "Address",
  calendarLegend: "Calendar legend",
  cancel: "Cancel",
  city: "City",
  coverageAcrossRotaWindow: "Coverage across the rota window",
  covers: "Covers",
  date: "Date",
  dayRosterPrefix: "Day roster prefix",
  delete: "Delete",
  edit: "Edit",
  end: "End",
  issued: "Issued by",
  kind: "Kind",
  listBelowStillWorks: "The list below still works. A map needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to be set.",
  loadingOperations: "Loading Operations…",
  location: "Location",
  locations: "Locations",
  locationsPlacesWorkHappens: "Locations are the places work happens — sites, offices, warehouses. Shifts and permits point at them.",
  mapLink: "Map link",
  name: "Name",
  noLocationsYet: "No locations yet",
  noMapConfigured: "No map configured",
  noOneScheduled: "No one scheduled",
  noPermitsCarryEnd: "No permits carry an end date.",
  noPermitsRecordedYet: "No permits recorded yet.",
  noPermitsYet: "No permits yet",
  nobodySharingRightNow: "Nobody is sharing right now.",
  notes: "Notes",
  nothingScheduledYet: "Nothing scheduled yet.",
  openProject: "Open the project",
  optionalTextAddedAbove: "Optional text added above the copied roster for a day — a greeting, or a standing note.",
  permitNumber: "Permit number",
  permitsExpiring: "Permits expiring",
  permitsRecordWhatStudio: "Permits record what the studio is authorised to do, where, and until when.",
  permitsStatus: "Permits by status",
  permitsType: "Permits by type",
  placeWorkHappensSite: "A place work happens — a site, an office, a warehouse.",
  project: "Project",
  removeMyLastPosition: "Remove my last position",
  reportedPositions: "Reported positions",
  role: "Role",
  roleShift: "The role on this shift",
  saved: "Saved",
  scheduleShift: "Schedule a shift",
  shareMyLocation: "Share my location",
  shiftsLocation: "Shifts by location",
  shiftsWeek: "Shifts this week",
  start: "Start",
  stopSharing: "Stop sharing",
  title: "Title",
  tracking: "Tracking",
  type: "Type",
  valid: "Valid from",
  valid2: "Valid to",
  validExpiringExpired: "Valid, expiring, expired",
  validityTimeline: "Validity timeline",
  viewOnlyAccessOperations: "You have view-only access to Operations settings.",
  week: "This week",
  whatKindAuthorisation: "What kind of authorisation",
  whatPermittedWhereUntil: "What is permitted, where, and until when.",
  who: "Who",
  whoWorkingWhenWhere: "Who is working, when, and where.",
  workingHours: "Working hours",
};

const ar: Strings = {
  ...commonAr,
  accessOperationsStudio: /* TR */ "You don't have access to Operations in this studio.",
  acrossEveryScheduledShift: /* TR */ "Across every scheduled shift",
  activePermits: /* TR */ "Active permits",
  addLocation: /* TR */ "Add location",
  addPermit: /* TR */ "Add permit",
  address: /* TR */ "Address",
  calendarLegend: /* TR */ "Calendar legend",
  cancel: /* TR */ "Cancel",
  city: /* TR */ "City",
  coverageAcrossRotaWindow: /* TR */ "Coverage across the rota window",
  covers: /* TR */ "Covers",
  date: /* TR */ "Date",
  dayRosterPrefix: /* TR */ "Day roster prefix",
  delete: /* TR */ "Delete",
  edit: /* TR */ "Edit",
  end: /* TR */ "End",
  issued: /* TR */ "Issued by",
  kind: /* TR */ "Kind",
  listBelowStillWorks: /* TR */ "The list below still works. A map needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to be set.",
  loadingOperations: /* TR */ "Loading Operations…",
  location: /* TR */ "Location",
  locations: /* TR */ "Locations",
  locationsPlacesWorkHappens: /* TR */ "Locations are the places work happens — sites, offices, warehouses. Shifts and permits point at them.",
  mapLink: /* TR */ "Map link",
  name: /* TR */ "Name",
  noLocationsYet: /* TR */ "No locations yet",
  noMapConfigured: /* TR */ "No map configured",
  noOneScheduled: /* TR */ "No one scheduled",
  noPermitsCarryEnd: /* TR */ "No permits carry an end date.",
  noPermitsRecordedYet: /* TR */ "No permits recorded yet.",
  noPermitsYet: /* TR */ "No permits yet",
  nobodySharingRightNow: /* TR */ "Nobody is sharing right now.",
  notes: /* TR */ "Notes",
  nothingScheduledYet: /* TR */ "Nothing scheduled yet.",
  openProject: /* TR */ "Open the project",
  optionalTextAddedAbove: /* TR */ "Optional text added above the copied roster for a day — a greeting, or a standing note.",
  permitNumber: /* TR */ "Permit number",
  permitsExpiring: /* TR */ "Permits expiring",
  permitsRecordWhatStudio: /* TR */ "Permits record what the studio is authorised to do, where, and until when.",
  permitsStatus: /* TR */ "Permits by status",
  permitsType: /* TR */ "Permits by type",
  placeWorkHappensSite: /* TR */ "A place work happens — a site, an office, a warehouse.",
  project: /* TR */ "Project",
  removeMyLastPosition: /* TR */ "Remove my last position",
  reportedPositions: /* TR */ "Reported positions",
  role: /* TR */ "Role",
  roleShift: /* TR */ "The role on this shift",
  saved: /* TR */ "Saved",
  scheduleShift: /* TR */ "Schedule a shift",
  shareMyLocation: /* TR */ "Share my location",
  shiftsLocation: /* TR */ "Shifts by location",
  shiftsWeek: /* TR */ "Shifts this week",
  start: /* TR */ "Start",
  stopSharing: /* TR */ "Stop sharing",
  title: /* TR */ "Title",
  tracking: /* TR */ "Tracking",
  type: /* TR */ "Type",
  valid: /* TR */ "Valid from",
  valid2: /* TR */ "Valid to",
  validExpiringExpired: /* TR */ "Valid, expiring, expired",
  validityTimeline: /* TR */ "Validity timeline",
  viewOnlyAccessOperations: /* TR */ "You have view-only access to Operations settings.",
  week: /* TR */ "This week",
  whatKindAuthorisation: /* TR */ "What kind of authorisation",
  whatPermittedWhereUntil: /* TR */ "What is permitted, where, and until when.",
  who: /* TR */ "Who",
  whoWorkingWhenWhere: /* TR */ "Who is working, when, and where.",
  workingHours: /* TR */ "Working hours",
};

const operations = { en, ar };

export function operationsDict(locale: string): Strings {
  return operations[locale as Locale] || operations[defaultLocale];
}
