// MARKETING'S TYPES — the department's context. Stored records live in
// `schema.ts`.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type { Campaign } from "./schema";

// Generated from the spec in ./campaigns: `sub` becomes `<name>Section`, `flags`
// become `canView<Name>`/`canManage<Name>`. A SUB-SECTION FALLS BACK TO THE ROOT
// and is always present.
export type MarketingContext = ModuleContext & {
  campaignsSection: Section;
  /** Forms and their answers (19/09/2026). */
  formsSection: Section;
  /** Budget & spend (21/09/2026). Owns nothing: the costs are Finance's. */
  budgetSection: Section;
  /** Audiences & consent (21/09/2026), which owns the consent ledger. */
  audiencesSection: Section;
  /** Planning & calendar (22/09/2026). The bars are campaigns; the PLANS are its own. */
  planningSection: Section;
  /** Events & webinars (22/09/2026). It owns the events; the sign-ups are Forms'. */
  eventsSection: Section;
  /** Content & brand assets (22/09/2026). It owns the records; the files are in Blob. */
  contentSection: Section;
  /** Partners & influencers (22/09/2026). Measured by the tag on their links. */
  partnersSection: Section;
  /** Sales' tickets and clients — where a lead is written, and what a campaign's results read. */
  ticketsSection: Section | null;
  clientsSection: Section | null;
  quotationsSection: Section | null;
  /** Finance's: bills are filed under Payables, expenses under Cash & Bank. */
  payablesSection: Section | null;
  cashSection: Section | null;
  canViewCampaigns: boolean;
  canManageCampaigns: boolean;
  canViewForms: boolean;
  canManageForms: boolean;
  canViewBudget: boolean;
  canManageBudget: boolean;
  canViewAudiences: boolean;
  canManageAudiences: boolean;
  canViewPlanning: boolean;
  canManagePlanning: boolean;
  canViewEvents: boolean;
  canManageEvents: boolean;
  canViewContent: boolean;
  canManageContent: boolean;
  canViewPartners: boolean;
  canManagePartners: boolean;
};
