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
  access: /* TR */ "Access",
  action: /* TR */ "Action",
  admin: /* TR */ "Admin",
  approvingCreatesProfileInside: /* TR */ "Approving creates their profile inside this studio.",
  cancel: /* TR */ "Cancel",
  checkWhatSomeoneCan: /* TR */ "Check what someone can do",
  couldnLoadRoles: /* TR */ "Couldn't load roles.",
  couldnSaveChange: /* TR */ "We couldn't save that change.",
  decline: /* TR */ "Decline",
  description: /* TR */ "Description",
  edit: /* TR */ "Edit",
  editAccess: /* TR */ "Edit access",
  everythingJobMayAreas: /* TR */ "Everything this job may do. Areas are collapsed — open the ones you need.",
  invitePeople: /* TR */ "Invite people",
  loadingPeople: /* TR */ "Loading people…",
  loadingRoles: /* TR */ "Loading roles…",
  member: /* TR */ "Member",
  nameStudio: /* TR */ "Name in this studio",
  noAccessYet: /* TR */ "No access yet",
  noOneWaiting: /* TR */ "No one is waiting.",
  noRoleNoAccess: /* TR */ "No role — no access",
  noRolesYet: /* TR */ "No roles yet",
  nothingMatchesRolesNamed: /* TR */ "Nothing matches. Roles are named in Human Resources.",
  nothingYet: /* TR */ "Nothing yet.",
  peopleStudio: /* TR */ "People in this studio",
  person: /* TR */ "Person",
  raisesWorksTickets: /* TR */ "Raises and works tickets.",
  remove: /* TR */ "Remove",
  requestsJoin: /* TR */ "Requests to join",
  role: /* TR */ "Role",
  save: /* TR */ "Save",
  searchRoles: /* TR */ "Search roles",
  shareCompanyCodeThey: /* TR */ "Share your company code. They enter it on their account page and you approve the request — no links or tokens to pass around.",
  studiosStartAdminManager: /* TR */ "Studios start with Admin, Manager, Team Lead, Member and Viewer. If yours has none, name one in Human Resources → Roles.",
  what: /* TR */ "Do what…",
  who: /* TR */ "Who…",
};

const people = { en, ar };

export function peopleDict(locale: string): Strings {
  return people[locale as Locale] || people[defaultLocale];
}
