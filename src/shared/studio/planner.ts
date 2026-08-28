import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// PLANNER — plans, the WBS, templates and presets.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  assign: string;
  assignee: string;
  contextLinksAcceptanceCriteria: string;
  criticalPath: string;
  days: string;
  defaultColour: string;
  defaultZoom: string;
  defaultsCouldNotSaved: string;
  details: string;
  duration: string;
  effortCost: string;
  end: string;
  filterTasks: string;
  fitTasks: string;
  float: string;
  gridColumns: string;
  highlightLongestPathThrough: string;
  hold: string;
  hours: string;
  howNewPlanOpens: string;
  howNewPlanOpens2: string;
  link: string;
  links: string;
  loadingTemplates: string;
  new: string;
  newPlan: string;
  newPlanDefaults: string;
  noTemplatesYet: string;
  notes: string;
  offTrack: string;
  priority: string;
  projectPlan: string;
  redo: string;
  risk: string;
  scheduling: string;
  showDependencyArrows: string;
  start: string;
  status: string;
  team: string;
  track: string;
  trimWaterfallOneDay: string;
  unassigned: string;
  undo: string;
  untitledPlan: string;
  updated: string;
};

const en: Strings = {
  ...commonEn,
  assign: "Assign to",
  assignee: "Assignee",
  contextLinksAcceptanceCriteria: "Context, links, acceptance criteria…",
  criticalPath: "Critical path",
  days: "Days",
  defaultColour: "Default colour-by",
  defaultZoom: "Default zoom",
  defaultsCouldNotSaved: "The defaults could not be saved. Please try again.",
  details: "Details",
  duration: "Duration",
  effortCost: "Effort / cost",
  end: "End",
  filterTasks: "Filter tasks",
  fitTasks: "Fit to tasks",
  float: "Float",
  gridColumns: "Grid columns",
  highlightLongestPathThrough: "Highlight the longest path through the plan",
  hold: "On hold",
  hours: "Hours",
  howNewPlanOpens: "How a new plan opens the first time it is viewed. Its working week and people come from the studio itself.",
  howNewPlanOpens2: "How a new plan opens the first time it is viewed.",
  link: "Link from",
  links: "Links",
  loadingTemplates: "Loading templates…",
  new: "New",
  newPlan: "New plan",
  newPlanDefaults: "New-plan defaults",
  noTemplatesYet: "No templates yet.",
  notes: "Notes",
  offTrack: "Off track",
  priority: "Priority",
  projectPlan: "Project plan",
  redo: "Redo",
  risk: "At risk",
  scheduling: "Scheduling",
  showDependencyArrows: "Show dependency arrows",
  start: "Start",
  status: "Status",
  team: "Team",
  track: "On track",
  trimWaterfallOneDay: "Trim the waterfall to one day either side of the work",
  unassigned: "Unassigned",
  undo: "Undo",
  untitledPlan: "Untitled plan",
  updated: "Updated",
};

const ar: Strings = {
  ...commonAr,
  assign: /* TR */ "Assign to",
  assignee: /* TR */ "Assignee",
  contextLinksAcceptanceCriteria: /* TR */ "Context, links, acceptance criteria…",
  criticalPath: /* TR */ "Critical path",
  days: /* TR */ "Days",
  defaultColour: /* TR */ "Default colour-by",
  defaultZoom: /* TR */ "Default zoom",
  defaultsCouldNotSaved: /* TR */ "The defaults could not be saved. Please try again.",
  details: /* TR */ "Details",
  duration: /* TR */ "Duration",
  effortCost: /* TR */ "Effort / cost",
  end: /* TR */ "End",
  filterTasks: /* TR */ "Filter tasks",
  fitTasks: /* TR */ "Fit to tasks",
  float: /* TR */ "Float",
  gridColumns: /* TR */ "Grid columns",
  highlightLongestPathThrough: /* TR */ "Highlight the longest path through the plan",
  hold: /* TR */ "On hold",
  hours: /* TR */ "Hours",
  howNewPlanOpens: /* TR */ "How a new plan opens the first time it is viewed. Its working week and people come from the studio itself.",
  howNewPlanOpens2: /* TR */ "How a new plan opens the first time it is viewed.",
  link: /* TR */ "Link from",
  links: /* TR */ "Links",
  loadingTemplates: /* TR */ "Loading templates…",
  new: /* TR */ "New",
  newPlan: /* TR */ "New plan",
  newPlanDefaults: /* TR */ "New-plan defaults",
  noTemplatesYet: /* TR */ "No templates yet.",
  notes: /* TR */ "Notes",
  offTrack: /* TR */ "Off track",
  priority: /* TR */ "Priority",
  projectPlan: /* TR */ "Project plan",
  redo: /* TR */ "Redo",
  risk: /* TR */ "At risk",
  scheduling: /* TR */ "Scheduling",
  showDependencyArrows: /* TR */ "Show dependency arrows",
  start: /* TR */ "Start",
  status: /* TR */ "Status",
  team: /* TR */ "Team",
  track: /* TR */ "On track",
  trimWaterfallOneDay: /* TR */ "Trim the waterfall to one day either side of the work",
  unassigned: /* TR */ "Unassigned",
  undo: /* TR */ "Undo",
  untitledPlan: /* TR */ "Untitled plan",
  updated: /* TR */ "Updated",
};

const planner = { en, ar };

export function plannerDict(locale: string): Strings {
  return planner[locale as Locale] || planner[defaultLocale];
}
