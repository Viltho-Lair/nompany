// SALES'S TYPES — the department's context, and the shapes only its screens
// use. Stored records live in `schema.ts`; see the note there.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type { Client, Service, SalesTicket, Contact, Site, ServiceRequirement } from "./schema";

// ---- this department's context ---------------------------------------------
// Generated from the spec in the service file: `sub` and `foreign` become
// `<name>Section`, `flags` become `canView<Name>`/`canManage<Name>`, and
// whatever `extend` adds is listed last. A SUB-SECTION FALLS BACK TO THE ROOT
// and is therefore always present; a FOREIGN one never does, so it is nullable —
// "this studio has no Technical section" is a real answer the screens handle.
export type SalesContext = ModuleContext & {
  ticketsSection: Section;
  clientsSection: Section;
  settingsSection: Section;
  technicalSection: Section | null;
  rfqSection: Section | null;
  quotationsSection: Section | null;
  tasksSection: Section | null;
  tasksSettingsSection: Section | null;
  projectsSection: Section | null;
  canViewTickets: boolean;
  canManageTickets: boolean;
  canViewClients: boolean;
  canManageClients: boolean;
  canViewSettings: boolean;
  canManageSettings: boolean;
  taskAssignees: unknown;
};
